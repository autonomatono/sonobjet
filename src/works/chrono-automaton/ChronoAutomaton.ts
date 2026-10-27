import * as THREE from 'three/webgpu';
import type {
  AnticipationCue,
  BehaviorMapEntry,
  ImpulseEvent,
  PostFxState,
  RigJointDescriptor,
  TransportState,
} from '../../engine/core/types';
import {
  CamFollowerDriver,
  FourBarLinkageDriver,
  GearRatioDriver,
  GenevaIndexerDriver,
  KinematicRig,
  MagneticSlipRail,
  solveCrankSlider,
  type RigJoint,
  type RigUpdateContext,
} from '../../kit/mechanism/KinematicRig';
import {
  attachMesh,
  createCamLobeGeometry,
  createCeramicShellGeometry,
  createClevisRod,
  createHorologicalMaterials,
  createIrisValve,
  createPleatedBellowsGeometry,
  createSkeletonBridgeGeometry,
  createSpokedGearGeometry,
  createTorqueBeamGeometry,
  createTunedComb,
  disposeGeometryCache,
  type HorologicalMaterials,
} from '../../kit/mechanism/HorologicalMeshKit';
import {
  BEHAVIOR_PROFILES,
  clampArticulation,
  createDefaultArticulation,
  type ArticulationState,
  type BehaviorId,
} from '../../studio/articulation/ArticulationRig';
import {
  MechanismEcology,
  type EcologySnapshot,
} from '../../studio/articulation/MechanismEcology';

export interface ChronoAutomatonUpdateContext {
  dt: number;
  elapsed: number;
  transport: TransportState;
  scoreIntensity: number;
}

const TAU = Math.PI * 2;
const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * V5 flagship: a time-traveled, self-playing clockwork automaton.
 *
 * Every visible part is a child of a named RigJoint. Gear meshing, cam-follower
 * lift, four-bar striker kinematics, Geneva indexing and magnetic slip rails
 * are analytical drivers; the coupled ecology decides how strongly each organ
 * responds to score and live impulses.
 */
export class ChronoAutomaton {
  public readonly root = new THREE.Group();
  public readonly rig = new KinematicRig();

  private readonly materials: HorologicalMaterials = createHorologicalMaterials();
  private readonly ecology = new MechanismEcology();
  private articulation: ArticulationState = createDefaultArticulation();
  private behaviorId: BehaviorId = 'PRECISION_ESCAPEMENT';

  private readonly camFollowers: CamFollowerDriver[] = [];
  private readonly slipRails: MagneticSlipRail[] = [];
  private readonly fourBars: FourBarLinkageDriver[] = [];
  private readonly strikerInputJoints: RigJoint[] = [];
  private readonly strikerHammerJoints: RigJoint[] = [];
  private readonly combJoints: RigJoint[] = [];
  private readonly pluckerJoints: RigJoint[] = [];
  private readonly armorJoints: RigJoint[] = [];
  private readonly bellowsCranks: RigJoint[] = [];
  private readonly bellowsSliders: RigJoint[] = [];
  private readonly irisJoints: RigJoint[] = [];
  private readonly fluxJoints: RigJoint[] = [];
  private readonly tines: THREE.Mesh[] = [];
  private readonly irisBlades: THREE.Mesh[] = [];
  private readonly bellowsMeshes: THREE.Mesh[] = [];
  private readonly plasmaBeams: THREE.Mesh[] = [];
  private readonly opticalRings: THREE.Mesh[] = [];
  private readonly tineImpulses: number[] = [];

  private mainArborAngle = 0;
  private barrelAngle = 0;
  private pluckerAngle = 0;
  private pointerStrain = 0;
  private anticipationEnergy = 0;
  private armorPulse = 0;
  private irisPulse = 0;
  private bellowsPulse = 0;
  private fluxPulse = 0;
  private activeInstances = 0;
  private structuralStress = 0;
  private kineticEnergy = 0;
  private lastEcology: EcologySnapshot = this.ecology.getSnapshot();

  constructor() {
    this.root.name = 'chrono-automaton';
    this.root.add(this.rig.root);

    this.buildStage();
    this.buildChassis();
    this.buildProgrammeBarrel();
    this.buildEscapementTrain();
    this.buildTunedCombs();
    this.buildStrikerLinkages();
    this.buildBellowsAndResonators();
    this.buildFluxRails();
    this.buildDrivers();

    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) this.activeInstances++;
    });
  }

  // ---------------------------------------------------------------------------
  // Construction: every mesh below is attached to a RigJoint group.
  // ---------------------------------------------------------------------------

  private buildStage(): void {
    const stage = this.rig.createJoint({
      id: 'stage',
      label: 'HOROLOGICAL PLINTH',
      type: 'root',
      category: 'stage',
      position: [0, -2.25, 0],
    });

    attachMesh(
      stage.group,
      new THREE.CylinderGeometry(4.2, 4.55, 0.36, 64),
      this.materials.darkFloor,
      [0, -0.18, 0],
    );
    const inlay = attachMesh(
      stage.group,
      new THREE.TorusGeometry(3.25, 0.035, 8, 96),
      this.materials.brass,
      [0, 0.015, 0],
      [Math.PI / 2, 0, 0],
    );
    inlay.receiveShadow = false;

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const pillar = attachMesh(
        stage.group,
        new THREE.CylinderGeometry(0.055, 0.085, 2.1, 8),
        i % 2 === 0 ? this.materials.brass : this.materials.bluedSteel,
        [Math.cos(a) * 3.1, 1.05, Math.sin(a) * 3.1],
      );
      pillar.castShadow = true;
      attachMesh(
        stage.group,
        new THREE.TorusGeometry(0.11, 0.025, 6, 12),
        this.materials.jewel,
        [Math.cos(a) * 3.1, 2.08, Math.sin(a) * 3.1],
        [Math.PI / 2, 0, 0],
      );
    }

    const hemi = new THREE.HemisphereLight(0x9fc4e8, 0x10151c, 1.35);
    stage.group.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d2, 3.2);
    key.position.set(5, 8, 7);
    key.castShadow = true;
    stage.group.add(key);
    const rim = new THREE.PointLight(0x66b9ff, 24, 18, 1.7);
    rim.position.set(-5, 2.5, -4);
    stage.group.add(rim);
  }

  private buildChassis(): void {
    const chassis = this.rig.createJoint({
      id: 'chassis',
      label: 'SKELETONIZED MOVEMENT CHASSIS',
      type: 'revolute',
      category: 'chassis',
      axis: [0, 0, 1],
      min: -0.09,
      max: 0.09,
      springStiffness: 38,
      damping: 11,
    });
    chassis.group.userData.assembly = 'chassis-bridge-assembly';

    const bridgeGeometry = createSkeletonBridgeGeometry(5.4, 1.5, 0.14);
    for (const z of [-1.22, 1.22]) {
      attachMesh(chassis.group, bridgeGeometry, this.materials.gunmetal, [0, 0, z]);
      for (const x of [-1.67, 0, 1.67]) {
        attachMesh(
          chassis.group,
          new THREE.TorusGeometry(0.22, 0.045, 8, 24),
          this.materials.brass,
          [x, 0, z + (z > 0 ? 0.085 : -0.085)],
        );
        attachMesh(
          chassis.group,
          new THREE.SphereGeometry(0.09, 12, 8),
          this.materials.jewel,
          [x, 0, z + (z > 0 ? 0.13 : -0.13)],
        );
      }
    }

    for (const x of [-2.42, 2.42]) {
      for (const y of [-0.62, 0.62]) {
        attachMesh(
          chassis.group,
          new THREE.CylinderGeometry(0.075, 0.075, 2.44, 10),
          this.materials.paleBrass,
          [x, y, 0],
          [Math.PI / 2, 0, 0],
        );
      }
    }

    const shellGeometry = createCeramicShellGeometry(1.25, 2.35, 0.13);
    const right = this.rig.createJoint({
      id: 'armorRight',
      label: 'RIGHT CERAMIC CARAPACE',
      parent: 'chassis',
      category: 'armor',
      position: [1.25, 0, 1.48],
      axis: [0, 0, 1],
      min: -0.08,
      max: 1.35,
      springStiffness: 28,
      damping: 9,
    });
    attachMesh(right.group, shellGeometry, this.materials.ceramic, [0, 0, 0]);

    const left = this.rig.createJoint({
      id: 'armorLeft',
      label: 'LEFT CERAMIC CARAPACE',
      parent: 'chassis',
      category: 'armor',
      position: [-1.25, 0, 1.48],
      rotation: [0, 0, Math.PI],
      axis: [0, 0, 1],
      min: -1.35,
      max: 0.08,
      springStiffness: 28,
      damping: 9,
    });
    attachMesh(left.group, shellGeometry, this.materials.ceramic, [0, 0, 0]);
    this.armorJoints.push(right, left);

    for (const [side, sign] of [
      ['R', 1],
      ['L', -1],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        const bracket = this.rig.createJoint({
          id: `armorPantograph${side}${i}`,
          label: `${side} PANTOGRAPH HINGE ${i}`,
          parent: 'chassis',
          category: 'armor',
          position: [sign * 1.05, -0.75 + i * 0.75, 1.18],
          axis: [0, 0, 1],
          min: -0.7,
          max: 0.7,
          rotation: [0, 0, sign > 0 ? 0 : Math.PI],
        });
        const rod = createClevisRod(0.72, 0.045, this.materials.surgicalChrome, this.materials.brass);
        bracket.group.add(rod);
      }
    }
  }

  private buildProgrammeBarrel(): void {
    const carriage = this.rig.createJoint({
      id: 'barrelCarriage',
      label: 'PROGRAMME BARREL CARRIAGE',
      parent: 'chassis',
      type: 'prismatic',
      category: 'barrel',
      position: [0, 0, -0.15],
      axis: [0, 0, 1],
      min: 0,
      max: 0.5,
      springStiffness: 34,
      damping: 10,
    });

    const barrel = this.rig.createJoint({
      id: 'chronoBarrel',
      label: 'PINNED CHRONO PROGRAMME CYLINDER',
      parent: carriage,
      category: 'barrel',
      axis: [0, 0, 1],
    });
    attachMesh(
      barrel.group,
      new THREE.CylinderGeometry(0.82, 0.82, 1.95, 48),
      this.materials.brass,
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    for (const z of [-0.99, 0.99]) {
      attachMesh(
        barrel.group,
        new THREE.TorusGeometry(0.86, 0.075, 10, 48),
        this.materials.paleBrass,
        [0, 0, z],
      );
      attachMesh(
        barrel.group,
        createCamLobeGeometry(5, 0.66, 0.12, 0.075),
        this.materials.bluedSteel,
        [0, 0, z + (z > 0 ? 0.09 : -0.09)],
      );
    }

    const pinGeometry = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6);
    const pins = new THREE.InstancedMesh(pinGeometry, this.materials.paleBrass, 80);
    const dummy = new THREE.Object3D();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 80; i++) {
      const ring = i % 8;
      const slot = Math.floor(i / 8);
      const a = (slot / 10) * TAU + (ring % 2) * 0.12;
      const radial = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      dummy.position.copy(radial).multiplyScalar(0.86);
      dummy.position.z = -0.78 + ring * 0.22;
      dummy.quaternion.setFromUnitVectors(yAxis, radial);
      dummy.scale.setScalar(0.8 + (i % 3) * 0.22);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    }
    pins.instanceMatrix.needsUpdate = true;
    pins.castShadow = true;
    barrel.group.add(pins);

    const optical = this.rig.createJoint({
      id: 'opticalReadRing',
      label: 'SUPERCONDUCTING OPTICAL READ-RING',
      parent: 'chassis',
      category: 'future',
      position: [0, 0, 1.15],
      axis: [0, 0, 1],
    });
    for (let i = 0; i < 3; i++) {
      const ring = attachMesh(
        optical.group,
        new THREE.TorusGeometry(0.98 + i * 0.08, 0.018, 8, 64),
        i === 1 ? this.materials.plasma : this.materials.glass,
        [0, 0, i * 0.055],
      );
      this.opticalRings.push(ring);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      attachMesh(
        optical.group,
        new THREE.BoxGeometry(0.05, 0.2, 0.07),
        this.materials.jewel,
        [Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0],
        [0, 0, a],
      );
    }

    const profiles = [
      [0, 1, 0.1, 0.55, 0, 0.8, 0.2, 0.4],
      [0.2, 0, 0.9, 0.1, 0.6, 0, 0.35, 1],
      [0, 0.45, 0, 1, 0.15, 0.7, 0, 0.3],
      [1, 0.15, 0.35, 0, 0.8, 0.1, 0.6, 0],
      [0.1, 0.6, 0.2, 0, 1, 0.25, 0.4, 0],
      [0.35, 0, 0.7, 0.1, 0, 1, 0.15, 0.45],
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 12;
      const axis: [number, number, number] = [Math.cos(a), Math.sin(a), 0];
      const follower = this.rig.createJoint({
        id: `camFollower${i}`,
        label: `SPRING CAM FOLLOWER ${i}`,
        parent: 'chassis',
        type: 'prismatic',
        category: 'cam',
        position: [Math.cos(a) * 1.05, Math.sin(a) * 1.05, -0.9],
        axis,
        min: 0,
        max: 0.28,
        springStiffness: 68,
        damping: 12,
      });
      attachMesh(
        follower.group,
        new THREE.BoxGeometry(0.09, 0.32, 0.09),
        this.materials.surgicalChrome,
        [0, 0.12, 0],
        [0, 0, a - Math.PI / 2],
      );
      attachMesh(
        follower.group,
        new THREE.SphereGeometry(0.07, 10, 8),
        this.materials.jewel,
        [0, 0.31, 0],
      );
      this.camFollowers.push(
        new CamFollowerDriver(follower.id, profiles[i], {
          amplitude: 0.18,
          beatsPerStep: 0.25,
          anticipationBeats: 0.5,
          phaseSteps: i,
        }),
      );
    }
  }

  private buildEscapementTrain(): void {
    const gearSpecs: Array<{
      id: string;
      label: string;
      pos: [number, number, number];
      teeth: number;
      radius: number;
    }> = [
      { id: 'mainArbor', label: 'MAIN ARBOR DRIVE', pos: [1.4, 0, -1.18], teeth: 24, radius: 0.45 },
      { id: 'innerGear', label: 'INNER CHRONO TRAIN', pos: [2.25, 0, -1.18], teeth: 16, radius: 0.36 },
      { id: 'outerGear', label: 'OUTER CHRONO TRAIN', pos: [0.55, 0, -1.18], teeth: 20, radius: 0.38 },
      { id: 'transferGear', label: 'ESCAPEMENT TRANSFER', pos: [1.4, 0.75, -1.18], teeth: 18, radius: 0.3 },
      { id: 'escapementWheel', label: 'ESCAPEMENT WHEEL', pos: [1.4, 1.35, -1.18], teeth: 30, radius: 0.34 },
    ];
    for (const spec of gearSpecs) {
      const joint = this.rig.createJoint({
        id: spec.id,
        label: spec.label,
        parent: 'chassis',
        category: 'gear-train',
        position: spec.pos,
        axis: [0, 0, 1],
        min: -Infinity,
        max: Infinity,
      });
      attachMesh(
        joint.group,
        createSpokedGearGeometry(spec.teeth, 0.07, spec.radius, 0.11, 6),
        spec.id === 'escapementWheel' ? this.materials.paleBrass : this.materials.brass,
      );
      attachMesh(
        joint.group,
        new THREE.SphereGeometry(0.055, 10, 8),
        this.materials.jewel,
        [0, 0, 0.08],
      );
    }

    const balance = this.rig.createJoint({
      id: 'balanceWheel',
      label: 'BALANCE WHEEL & HAIRSPRING',
      parent: 'chassis',
      category: 'escapement',
      position: [2.35, 1.35, -1.05],
      axis: [0, 0, 1],
      min: -1.1,
      max: 1.1,
      springStiffness: 42,
      damping: 7,
    });
    attachMesh(
      balance.group,
      new THREE.TorusGeometry(0.42, 0.045, 10, 40),
      this.materials.bluedSteel,
    );
    for (let i = 0; i < 6; i++) {
      attachMesh(
        balance.group,
        new THREE.BoxGeometry(0.78, 0.025, 0.025),
        this.materials.surgicalChrome,
        [0, 0, 0],
        [0, 0, (i / 6) * Math.PI],
      );
    }
    for (let i = 0; i < 4; i++) {
      attachMesh(
        balance.group,
        new THREE.TorusGeometry(0.09 + i * 0.045, 0.008, 5, 28),
        this.materials.paleBrass,
        [0, 0, 0.04 + i * 0.01],
      );
    }

    const geneva = this.rig.createJoint({
      id: 'genevaWheel',
      label: '16TH-NOTE GENEVA INDEXER',
      parent: 'chassis',
      category: 'escapement',
      position: [-0.85, 1.35, -1.05],
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    attachMesh(
      geneva.group,
      createSpokedGearGeometry(16, 0.06, 0.34, 0.09, 4),
      this.materials.paleBrass,
    );
    for (let i = 0; i < 4; i++) {
      attachMesh(
        geneva.group,
        new THREE.BoxGeometry(0.1, 0.34, 0.06),
        this.materials.bluedSteel,
        [0, 0, 0.07],
        [0, 0, (i / 4) * Math.PI],
      );
    }

    const cage = this.rig.createJoint({
      id: 'chronoCage',
      label: 'TEMPORAL DIFFERENTIAL CAGE',
      parent: 'chassis',
      category: 'future',
      position: [0, 0, -1.45],
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    attachMesh(
      cage.group,
      new THREE.TorusGeometry(1.55, 0.028, 8, 72),
      this.materials.plasma,
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      attachMesh(
        cage.group,
        new THREE.BoxGeometry(0.025, 0.16, 0.025),
        this.materials.jewel,
        [Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0],
        [0, 0, a],
      );
    }
  }

  private buildTunedCombs(): void {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const radius = 1.78;
      const comb = this.rig.createJoint({
        id: `combBank${i}`,
        label: `TUNED STEEL/QUARTZ COMB ${i}`,
        parent: 'chassis',
        category: 'acoustic',
        position: [Math.cos(a) * radius, Math.sin(a) * radius, 0.55],
        rotation: [0, 0, a - Math.PI / 2],
        axis: [0, 0, 1],
        min: -0.62,
        max: 0.62,
        springStiffness: 30,
        damping: 9,
      });
      const assembly = createTunedComb(
        9,
        0.095,
        0.92,
        i % 2 === 0 ? this.materials.bluedSteel : this.materials.glass,
        this.materials.gunmetal,
      );
      comb.group.add(assembly.group);
      for (const tine of assembly.tines) {
        this.tines.push(tine);
        this.tineImpulses.push(0);
      }
      this.combJoints.push(comb);

      const plucker = this.rig.createJoint({
        id: `starWheel${i}`,
        label: `COMB STAR-WHEEL PLUCKER ${i}`,
        parent: comb,
        category: 'acoustic',
        position: [0, 0.08, 0.16],
        axis: [0, 0, 1],
        min: -Infinity,
        max: Infinity,
      });
      attachMesh(
        plucker.group,
        createSpokedGearGeometry(9, 0.035, 0.2, 0.045, 3),
        this.materials.paleBrass,
      );
      this.pluckerJoints.push(plucker);
    }
  }

  private buildStrikerLinkages(): void {
    const lengths = { ground: 1.05, crank: 0.36, coupler: 0.92, rocker: 0.72 };
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const z = i % 2 === 0 ? 0.72 : -0.72;
      const mount = this.rig.createJoint({
        id: `strikerMount${i}`,
        label: `STRIKER LINKAGE MOUNT ${i}`,
        parent: 'chassis',
        type: 'root',
        category: 'striker',
        position: [Math.cos(a) * 1.35, Math.sin(a) * 1.35, z],
        rotation: [0, 0, a],
      });

      const input = this.rig.createJoint({
        id: `strikerCrank${i}`,
        label: `STRIKER CRANK ${i}`,
        parent: mount,
        category: 'striker',
        axis: [0, 0, 1],
        min: -Math.PI,
        max: Math.PI,
      });
      const coupler = this.rig.createJoint({
        id: `strikerCoupler${i}`,
        label: `STRIKER COUPLER PIN ${i}`,
        parent: input,
        category: 'striker',
        position: [lengths.crank, 0, 0],
        axis: [0, 0, 1],
        min: -Math.PI,
        max: Math.PI,
      });
      const output = this.rig.createJoint({
        id: `strikerRocker${i}`,
        label: `STRIKER ROCKER ${i}`,
        parent: mount,
        category: 'striker',
        position: [lengths.ground, 0, 0],
        axis: [0, 0, 1],
        min: -Math.PI,
        max: Math.PI,
      });
      const hammer = this.rig.createJoint({
        id: `hammerHead${i}`,
        label: `ANVIL HAMMER HEAD ${i}`,
        parent: output,
        type: 'root',
        category: 'striker',
        position: [lengths.rocker, 0, 0],
      });

      input.group.add(
        createClevisRod(lengths.crank, 0.045, this.materials.surgicalChrome, this.materials.brass),
      );
      coupler.group.add(
        createClevisRod(lengths.coupler, 0.04, this.materials.bluedSteel, this.materials.brass),
      );
      output.group.add(
        createClevisRod(lengths.rocker, 0.048, this.materials.surgicalChrome, this.materials.brass),
      );
      attachMesh(
        hammer.group,
        new THREE.BoxGeometry(0.24, 0.18, 0.28),
        this.materials.gunmetal,
      );
      attachMesh(
        hammer.group,
        new THREE.SphereGeometry(0.07, 10, 8),
        this.materials.jewel,
        [0.14, 0, 0],
      );

      this.strikerInputJoints.push(input);
      this.strikerHammerJoints.push(hammer);
      const linkage = this.rig.addDriver(
        new FourBarLinkageDriver({
          inputJointId: input.id,
          couplerJointId: coupler.id,
          outputJointId: output.id,
          lengths,
        }),
      );
      this.fourBars.push(linkage);
    }
  }

  private buildBellowsAndResonators(): void {
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      const crank = this.rig.createJoint({
        id: `bellowsCrank${i}`,
        label: `BELLOWS ECCENTRIC CRANK ${i}`,
        parent: 'chassis',
        category: 'pneumatic',
        position: [sign * 2.45, -1.15, 0.25],
        axis: [0, 0, 1],
        min: -Infinity,
        max: Infinity,
      });
      attachMesh(
        crank.group,
        new THREE.CylinderGeometry(0.18, 0.18, 0.09, 20),
        this.materials.brass,
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
      );
      attachMesh(
        crank.group,
        new THREE.BoxGeometry(0.28, 0.035, 0.035),
        this.materials.surgicalChrome,
        [0.1, 0, 0.06],
      );
      this.bellowsCranks.push(crank);

      const slider = this.rig.createJoint({
        id: `bellowsSlider${i}`,
        label: `PLEATED BELLOWS SLIDER ${i}`,
        parent: 'chassis',
        type: 'prismatic',
        category: 'pneumatic',
        position: [sign * 1.45, -1.15, 0.25],
        axis: [sign, 0, 0],
        min: -0.05,
        max: 0.55,
        springStiffness: 46,
        damping: 10,
      });
      const bellows = attachMesh(
        slider.group,
        createPleatedBellowsGeometry(7, 0.33, 1.25),
        this.materials.bluedSteel,
        [sign * 0.6, 0, 0],
      );
      this.bellowsMeshes.push(bellows);
      this.bellowsSliders.push(slider);

      const pipe = this.rig.createJoint({
        id: `resonatorPipe${i}`,
        label: `FORMANT RESONATOR PIPE ${i}`,
        parent: 'chassis',
        type: 'root',
        category: 'pneumatic',
        position: [sign * 2.55, -0.2, 0.5],
      });
      attachMesh(
        pipe.group,
        new THREE.CylinderGeometry(0.19, 0.24, 1.45, 20, 1, true),
        this.materials.glass,
      );
      attachMesh(
        pipe.group,
        new THREE.TorusGeometry(0.2, 0.035, 8, 24),
        this.materials.brass,
        [0, 0.74, 0],
        [Math.PI / 2, 0, 0],
      );

      const iris = this.rig.createJoint({
        id: `irisValve${i}`,
        label: `MECHANICAL FORMANT IRIS ${i}`,
        parent: pipe,
        category: 'pneumatic',
        position: [0, 0.78, 0],
        axis: [0, 0, 1],
        min: -0.5,
        max: 0.5,
        springStiffness: 50,
        damping: 11,
      });
      const irisAssembly = createIrisValve(
        8,
        0.2,
        this.materials.surgicalChrome,
        this.materials.paleBrass,
      );
      iris.group.add(irisAssembly.group);
      for (const blade of irisAssembly.blades) this.irisBlades.push(blade);
      this.irisJoints.push(iris);
    }
  }

  private buildFluxRails(): void {
    const chassis = this.rig.requireJoint('chassis').group;
    const positions: Array<[number, number]> = [
      [-1.95, 1.1],
      [1.95, 1.1],
      [-1.95, -1.05],
      [1.95, -1.05],
    ];
    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[i];
      const joint = this.rig.createJoint({
        id: `fluxRail${i}`,
        label: `MAGNETIC FLUX SLIP RAIL ${i}`,
        parent: 'chassis',
        type: 'prismatic',
        category: 'future',
        position: [x, y, -0.25],
        axis: [0, 0, 1],
        min: 0,
        max: 1.8,
        springStiffness: 24,
        damping: 8,
      });
      attachMesh(
        joint.group,
        new THREE.TorusGeometry(0.2, 0.05, 8, 20),
        this.materials.gunmetal,
      );
      attachMesh(
        joint.group,
        createSpokedGearGeometry(12, 0.045, 0.16, 0.055, 4),
        this.materials.brass,
        [0, 0, 0.04],
      );
      this.fluxJoints.push(joint);

      const anchor = new THREE.Object3D();
      anchor.position.set(x, y, -0.25);
      chassis.add(anchor);

      const beam = new THREE.Mesh(
        createTorqueBeamGeometry(0.025),
        this.materials.plasma.clone(),
      );
      beam.name = `plasma-torque-axle-${i}`;
      beam.scale.set(1, 0.001, 1);
      beam.visible = false;
      chassis.add(beam);
      this.plasmaBeams.push(beam);

      this.slipRails.push(
        new MagneticSlipRail({
          jointId: joint.id,
          anchor,
          beam,
          beamParent: chassis,
          maxDistance: 1.75,
        }),
      );
    }
  }

  private buildDrivers(): void {
    this.rig.addDriver(new GearRatioDriver('mainArbor', 'innerGear', -24 / 16));
    this.rig.addDriver(new GearRatioDriver('mainArbor', 'outerGear', -24 / 20));
    this.rig.addDriver(new GearRatioDriver('mainArbor', 'transferGear', -24 / 18));
    this.rig.addDriver(new GearRatioDriver('transferGear', 'escapementWheel', -18 / 30));
    for (const follower of this.camFollowers) this.rig.addDriver(follower);
    this.rig.addDriver(new GenevaIndexerDriver('genevaWheel', 16, 4, 0.18));
  }

  // ---------------------------------------------------------------------------
  // Live input, director hooks and simulation.
  // ---------------------------------------------------------------------------

  setArticulationState(state: Record<string, number>): void {
    this.articulation = clampArticulation(state, this.articulation);
  }

  getArticulationState(): ArticulationState {
    return { ...this.articulation };
  }

  setBehaviorId(id: string): void {
    if (id in BEHAVIOR_PROFILES) {
      this.behaviorId = id as BehaviorId;
      this.ecology.setBehavior(id);
    }
  }

  getBehaviorId(): BehaviorId {
    return this.behaviorId;
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.ecology.setMaps(maps);
  }

  getBehaviorMaps(): BehaviorMapEntry[] {
    return this.ecology.getMaps();
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.rig.getJointDescriptors();
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    return this.rig.getJointWorldPosition(id);
  }

  getEcologySnapshot(): Record<string, number> {
    return this.ecology.getFlatSnapshot();
  }

  setPointerStrain(_x: number, _y: number, tension: number, active: boolean): void {
    this.pointerStrain = active ? clamp(tension, 0, 1.4) : 0;
  }

  applyAnticipation(cue: AnticipationCue): void {
    this.anticipationEnergy = Math.min(
      2.2,
      this.anticipationEnergy + cue.intensity * 0.6,
    );
    for (const follower of this.camFollowers) {
      follower.triggerCue(cue.intensity * 0.75);
    }
    if (
      cue.targetSubsystem === 'sub-rupture' ||
      cue.targetSubsystem === 'break-shred' ||
      cue.targetSubsystem === 'windup-inhale'
    ) {
      this.bellowsPulse += cue.intensity * 0.35;
    }
  }

  applyImpulse(event: ImpulseEvent): void {
    this.ecology.stimulate(event);
    const energy = event.velocity;
    switch (event.subsystem) {
      case 'sub-rupture':
      case 'spine-shear':
      case 'break-shred':
      case 'piston-snap':
        this.armorPulse += energy * 0.28;
        for (const follower of this.camFollowers) follower.triggerCue(energy * 0.18);
        break;
      case 'modal-clang':
      case 'glass-armonica':
      case 'fin-cascade': {
        const idx = Math.abs(event.sliceIndex ?? event.midiNote ?? 0) % this.tineImpulses.length;
        this.tineImpulses[idx] += energy * 1.3;
        break;
      }
      case 'larynx-lead':
      case 'bellows-choir':
      case 'windup-inhale':
        this.irisPulse += energy * 0.45;
        this.bellowsPulse += energy * 0.32;
        break;
      case 'core-implode':
      case 'arc-discharge':
      case 'glitch-chirp':
        this.fluxPulse += energy * 0.55;
        break;
      case 'acid-squelch':
        this.barrelAngle += energy * 0.08;
        break;
      default:
        break;
    }
  }

  update(context: ChronoAutomatonUpdateContext): void {
    const { dt, elapsed, transport, scoreIntensity } = context;
    const art = this.articulation;
    const behavior = BEHAVIOR_PROFILES[this.behaviorId];

    this.lastEcology = this.ecology.step({
      dt,
      elapsed,
      beat: transport.beat,
      step16: transport.step16,
      scoreIntensity,
      articulation: art,
    });

    const driveStrikers = this.ecology.getDrive('strikers');
    const driveCombs = this.ecology.getDrive('combs');
    const driveBellows = this.ecology.getDrive('bellows');
    const driveFlux = this.ecology.getDrive('flux');
    const driveEscapement = this.ecology.getDrive('escapement');

    const speed =
      0.85 +
      art.overclockSpeed * 1.55 +
      scoreIntensity * 0.52 +
      driveEscapement * 0.42 +
      this.pointerStrain * 0.28;
    this.mainArborAngle += dt * speed * TAU * 0.32;
    this.barrelAngle +=
      dt * speed * TAU * (0.05 + art.barrelEngage * 0.08 + driveCombs * 0.018);
    this.pluckerAngle += dt * speed * TAU * (0.18 + driveCombs * 0.38);

    this.rig.setValue('mainArbor', this.mainArborAngle);
    this.rig.setValue('chronoBarrel', this.barrelAngle);
    this.rig.setValue('opticalReadRing', -this.barrelAngle * (1 + art.chronoShear * 1.8));
    this.rig.setValue('chronoCage', this.mainArborAngle * art.chronoShear * 0.22);
    this.rig.setTarget(
      'barrelCarriage',
      art.barrelEngage * 0.42 + this.anticipationEnergy * 0.035,
    );

    const sway =
      Math.sin(transport.beat * 0.38 + this.lastEcology.phase) *
        (0.012 + (1 - behavior.precision) * 0.045) +
      this.pointerStrain * 0.014;
    this.rig.setTarget('chassis', sway);

    const armorTarget =
      art.armorSplit * 0.92 +
      this.armorPulse * 0.18 +
      (1 - this.lastEcology.cohesion) * 0.12;
    this.rig.setTarget('armorRight', armorTarget);
    this.rig.setTarget('armorLeft', -armorTarget);
    for (let i = 0; i < 6; i++) {
      const sign = i < 3 ? 1 : -1;
      this.rig.setTarget(
        `armorPantograph${sign > 0 ? 'R' : 'L'}${i % 3}`,
        sign * armorTarget * 0.46,
      );
    }

    for (let i = 0; i < this.combJoints.length; i++) {
      const fan = art.combFan * (i % 2 === 0 ? 0.42 : -0.42);
      const shimmer = Math.sin(elapsed * (0.7 + i * 0.17) + i) * driveCombs * 0.06;
      this.combJoints[i].setTarget(fan + shimmer);
      this.pluckerJoints[i].setValue(this.pluckerAngle * (i % 2 === 0 ? 1 : -1));
    }

    const stepPhase = (transport.beat * 4) % 1;
    const strikeTick = Math.exp(-stepPhase * 7.5);
    for (let i = 0; i < this.strikerInputJoints.length; i++) {
      const phase = (i / this.strikerInputJoints.length) * TAU;
      const localDrive =
        driveStrikers * (0.65 + 0.35 * Math.sin(phase + this.lastEcology.phase));
      const angle =
        -0.55 +
        art.strikerReach * 0.72 +
        Math.sin(transport.beat * 0.7 + phase) * 0.18 +
        strikeTick * localDrive * (0.55 + behavior.energy * 0.35);
      this.strikerInputJoints[i].setValue(angle);
    }

    for (let i = 0; i < this.bellowsCranks.length; i++) {
      const crankAngle =
        transport.beat * Math.PI * (0.55 + art.overclockSpeed * 0.22) +
        i * Math.PI * 0.5;
      this.bellowsCranks[i].setValue(crankAngle);
      const solved = solveCrankSlider(crankAngle, 0.2, 0.72);
      const extension = art.bellowsBreathing * Math.max(0, solved.sliderX - 0.52) * 0.72;
      this.bellowsSliders[i].setTarget(extension, false);
      this.irisJoints[i].setTarget(
        art.irisAperture * 0.38 + this.irisPulse * 0.08 + driveBellows * 0.06,
      );
    }

    const unpin = clamp(
      art.magneticUnpin * (0.78 + driveFlux * 0.22) + this.fluxPulse * 0.035,
      0,
      1,
    );
    for (const rail of this.slipRails) rail.setUnpin(unpin);

    const rigContext: RigUpdateContext = {
      dt,
      elapsed,
      beat: transport.beat,
      bar: transport.bar,
      step16: transport.step16,
      scoreIntensity,
      impulseEnergy: this.lastEcology.arousal,
      overclock: art.overclockSpeed,
    };
    this.rig.update(rigContext);
    // Second rail pass after joint stepping keeps plasma axles exactly coincident.
    for (const rail of this.slipRails) rail.update(this.rig, rigContext);

    for (let i = 0; i < this.tines.length; i++) {
      const impulse = this.tineImpulses[i];
      const tine = this.tines[i];
      tine.scale.y = 1 + impulse * 0.12;
      tine.rotation.z = Math.sin(elapsed * 34 + i) * impulse * 0.09;
      this.tineImpulses[i] = impulse * Math.exp(-dt * 7.2);
    }

    for (let i = 0; i < this.bellowsMeshes.length; i++) {
      const pulse = this.bellowsPulse * Math.exp(-i * 0.4);
      this.bellowsMeshes[i].scale.x =
        0.62 +
        art.bellowsBreathing * 0.44 +
        driveBellows * 0.18 +
        pulse * 0.06;
    }

    for (let i = 0; i < this.irisBlades.length; i++) {
      const blade = this.irisBlades[i];
      blade.scale.x = 0.68 + art.irisAperture * 0.45 + this.irisPulse * 0.04;
      blade.scale.y = 1.02 - art.irisAperture * 0.3;
      blade.rotation.z =
        (blade.userData.angle as number) + art.irisAperture * 0.22;
    }

    for (let i = 0; i < this.opticalRings.length; i++) {
      const pulse = 1 + Math.sin(elapsed * 4.5 + i * 1.7) * 0.018 * (1 + driveFlux);
      this.opticalRings[i].scale.setScalar(pulse);
    }

    for (let i = 0; i < this.plasmaBeams.length; i++) {
      const beam = this.plasmaBeams[i];
      const thickness = 0.65 + art.tetherTension * 0.8 + this.fluxPulse * 0.08;
      beam.scale.x = thickness;
      beam.scale.z = thickness;
      const material = beam.material as THREE.MeshBasicNodeMaterial;
      material.opacity = unpin * (0.36 + art.tetherTension * 0.48);
    }

    this.anticipationEnergy *= Math.exp(-dt * 2.8);
    this.armorPulse *= Math.exp(-dt * 3.5);
    this.irisPulse *= Math.exp(-dt * 3.2);
    this.bellowsPulse *= Math.exp(-dt * 2.7);
    this.fluxPulse *= Math.exp(-dt * 2.4);
    this.pointerStrain *= Math.exp(-dt * 2.2);

    this.structuralStress = clamp(
      this.lastEcology.fatigue * 0.52 +
        art.magneticUnpin * 0.24 +
        art.chronoShear * 0.2 +
        this.anticipationEnergy * 0.1,
      0,
      1,
    );
    this.kineticEnergy = clamp(
      speed * 0.18 +
        driveStrikers * 0.24 +
        driveCombs * 0.16 +
        driveFlux * 0.14,
      0,
      1.5,
    );
  }

  getPostFxState(): Partial<PostFxState> {
    const art = this.articulation;
    const flux = this.ecology.getDrive('flux');
    const escapement = this.ecology.getDrive('escapement');
    return {
      glitch: 0.025 + art.chronoShear * 0.21 + flux * 0.12 + escapement * 0.04,
      lensDistort: 0.055 + art.magneticUnpin * 0.08,
      aberration: 0.16 + art.chronoShear * 0.24 + flux * 0.15,
      grain: 0.11 + this.lastEcology.fatigue * 0.17,
      bleachGrade: 0.3 + (1 - this.lastEcology.cohesion) * 0.16,
      starkThreshold: Math.max(0, flux - 0.72) * 0.34,
      bloomStrength: 0.82 + art.barrelEngage * 0.16 + flux * 0.24,
    };
  }

  getMetrics(): {
    activeInstances: number;
    structuralStress: number;
    kineticEnergy: number;
    behavioralState: string;
  } {
    const drives = this.lastEcology.organDrives;
    const dominant = Object.entries(drives).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'escapement';
    return {
      activeInstances: this.activeInstances,
      structuralStress: this.structuralStress,
      kineticEnergy: this.kineticEnergy,
      behavioralState: `${this.behaviorId} // ${dominant.toUpperCase()}`,
    };
  }

  getRigJointIds(): string[] {
    return this.rig.getJointIds();
  }

  getStrikerHammerIds(): string[] {
    return this.strikerHammerJoints.map((j) => j.id);
  }

  /** Exposes exact linkage solutions for tests and joint-attached director shots. */
  getFourBarSolutions() {
    return this.fourBars.map((driver) => driver.getSolution());
  }

  getFluxJointIds(): string[] {
    return this.fluxJoints.map((j) => j.id);
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const clonedMaterials = new Set<THREE.Material>();
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) geometries.add(mesh.geometry);
      if (this.plasmaBeams.includes(mesh)) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) clonedMaterials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of clonedMaterials) material.dispose();
    disposeGeometryCache();
    this.materials.dispose();
    this.rig.dispose();
    this.root.clear();
  }
}
