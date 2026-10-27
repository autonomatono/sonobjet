import * as THREE from 'three/webgpu';
import { SonobjetCore } from '../../engine/core/Sonobjet';
import type { AnticipationCue, ImpulseEvent } from '../../engine/core/types';
import type { SonobjetMaterialRig } from '../../engine/render/TSLMaterials';
import { quantizeDetent, ScalarSpring } from '../../kit/kinematics/SpringDamper';

interface BallisticSpark {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface HarpRodState {
  basePos: THREE.Vector3;
  length: number;
  vibration: number;
  vibPhase: number;
  flash: number;
}

interface TendonAnchor {
  startWorld: THREE.Vector3;
  localAttach: THREE.Vector3;
  sag: number;
  waveAmp: number;
}

export type AutomatonBehavior =
  | 'DORMANT_BREATH'
  | 'COILING_ANTICIPATION'
  | 'ASYMMETRIC_LOOM'
  | 'VOCALIZING_ARIA'
  | 'FRACTURE_OVERDRIVE'
  | 'PANTING_EXHAUSTION';

/**
 * Living Biomechanical Sound-Automaton (`GANTZ // AUTOMATON`).
 *
 * Replaces uniform geometry with a 7-organ asymmetric biomechanical creature/machine:
 * 1. 14-Vertebra S-Curve Spine & 8-Pair Breathing Porcelain-Bone Rib Bellows
 * 2. Asymmetric Cranial Sensorium Turret, Saccadic Optic Iris & 5-Reed Vocal Mandible-Larynx
 * 3. Heavy Right 3-DOF Siege-Hammer Arm + Spring-Mounted Floor Anvil
 * 4. Dual Left 3-Jointed Mantis Raker Limbs + 16-Rod Tensioned Brass/Chrome Harp-Comb
 * 5. Ventral Eccentric Brass Flywheel Governor, Connecting-Rod & Brake Caliper
 * 6. 10-Segment Newtonian Counter-Torque Whipping Tail & Arc Stinger
 * 7. 6 Catenary Steel Suspension Tendons + 160 Ballistic Floor-Bouncing Sparks
 */
export class GantzAutomaton {
  public readonly worldGroup = new THREE.Group();
  public readonly bodyRoot = new THREE.Group();
  public readonly core: SonobjetCore;

  // Organ Pivots (True Hierarchical Forward/Inverse Kinematic Chains)
  private readonly thoraxGroup = new THREE.Group();
  private bellowsMesh!: THREE.Mesh;
  private readonly vertebrae: THREE.Group[] = [];
  private readonly ribLeftPivots: THREE.Group[] = [];
  private readonly ribRightPivots: THREE.Group[] = [];

  // Cranial Turret & Vocal Mandible-Larynx
  private readonly neckPivot = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly opticIrisGroup = new THREE.Group();
  private readonly jawLowerPivot = new THREE.Group();
  private readonly mandibleLeftPivot = new THREE.Group();
  private readonly mandibleRightPivot = new THREE.Group();
  private readonly larynxReeds: THREE.Mesh[] = [];

  // Heavy Right Siege-Hammer Arm & Floor Anvil
  private readonly rightShoulder = new THREE.Group();
  private readonly rightElbow = new THREE.Group();
  private readonly rightWrist = new THREE.Group();
  private readonly anvilTopGroup = new THREE.Group();

  // Dual Left Mantis Raker Arms & 16-Rod Harp-Comb
  private readonly harpFrameGroup = new THREE.Group();
  private readonly harpRodMesh: THREE.InstancedMesh;
  private readonly harpRods: HarpRodState[] = [];
  private readonly upperRakerShoulder = new THREE.Group();
  private readonly upperRakerElbow = new THREE.Group();
  private readonly lowerRakerShoulder = new THREE.Group();
  private readonly lowerRakerElbow = new THREE.Group();

  // Ventral Flywheel Governor & Brake
  private readonly flywheelWheel = new THREE.Group();
  private readonly conRodMesh: THREE.Mesh;
  private readonly brakeCaliperGroup = new THREE.Group();

  // Segmented Whipping Counter-Tail
  private readonly tailSegments: THREE.Group[] = [];

  // Catenary Suspension Tendons & Ballistic Sparks
  private readonly tendonMesh: THREE.InstancedMesh;
  private tendons: TendonAnchor[] = [];
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sparks: BallisticSpark[] = [];
  private sparkCursor = 0;

  // Internal Emergent & Kinematic State
  private behavior: AutomatonBehavior = 'DORMANT_BREATH';
  private breathPhase = 0;
  private fatigue = 0;
  private larynxEnergy = 0;
  private harmonyGlow = 0;
  private vowelShape = 0.25;
  private anvilHeat = 0;
  private arcFlash = 0;
  private strobePulse = 0;

  // Spring-driven limb kinematics
  private readonly hammerPitch = new ScalarSpring(-0.15, 310, 19);
  private readonly elbowBend = new ScalarSpring(0.65, 290, 18);
  private readonly anvilCompression = new ScalarSpring(0, 420, 22);
  private readonly jawOpen = new ScalarSpring(0.04, 260, 17);
  private readonly spineCoil = new ScalarSpring(0, 165, 15);
  private readonly rakerUpperTargetY = new ScalarSpring(0.2, 480, 24);
  private readonly rakerLowerTargetY = new ScalarSpring(-0.2, 480, 24);
  private rakerUpperPluck = 0;
  private rakerLowerPluck = 0;
  private rakerToggle = 0;

  // Gaze / Saccade State
  private readonly gazeYaw = new ScalarSpring(0, 180, 16);
  private readonly gazePitch = new ScalarSpring(-0.08, 180, 16);
  private saccadeTimer = 0;
  private userGaze = { x: 0, y: 0, active: false };
  private pointerStrainVec = new THREE.Vector2();
  private pointerTension = 0;

  // Flywheel Physics
  private flywheelAngle = 0;
  private flywheelOmega = 1.4;
  private brakeClamped = false;

  // Scratch math objects
  private readonly dummy = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpPosB = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();
  private readonly upVec = new THREE.Vector3(0, 1, 0);
  private geometries: THREE.BufferGeometry[] = [];

  constructor(materials: SonobjetMaterialRig) {
    this.core = new SonobjetCore('gantz-automaton', [
      { id: 'torsoLungeZ', initial: 0, min: -0.65, max: 0.75, stiffness: 185, damping: 16 },
      { id: 'torsoRoll', initial: 0, min: -0.55, max: 0.55, stiffness: 210, damping: 17 },
      { id: 'torsoYaw', initial: 0, min: -0.7, max: 0.7, stiffness: 190, damping: 16, detentStep: Math.PI / 12 },
      { id: 'ribSpread', initial: 0.05, min: -0.15, max: 0.95, stiffness: 170, damping: 15 },
      { id: 'tailWhip', initial: 0, min: -1.4, max: 1.4, stiffness: 220, damping: 14 },
    ]);

    this.worldGroup.add(this.bodyRoot);
    this.bodyRoot.position.set(-0.08, 0.28, 0);
    this.bodyRoot.add(this.thoraxGroup);

    this.buildSpineAndThorax(materials);
    this.buildCranialLarynx(materials);
    this.buildRightSiegeHammerAndAnvil(materials);
    this.harpRodMesh = this.buildLeftHarpAndMantisRakers(materials);
    this.conRodMesh = this.buildVentralFlywheel(materials);
    this.buildCounterTail(materials);
    this.tendonMesh = this.buildSuspensionTendons(materials);
    this.sparkMesh = this.buildSparkSystem(materials);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  /**
   * ORGAN 1: 14-Vertebra S-Curve Spine + 8-Pair Porcelain Rib-Valves + Glowing Bellows Lung
   */
  private buildSpineAndThorax(m: SonobjetMaterialRig): void {
    const vertGeo = this.trackGeo(new THREE.BoxGeometry(0.28, 0.13, 0.26));
    const dorsalFinGeo = this.trackGeo(new THREE.BoxGeometry(0.06, 0.16, 0.34));
    const brassRingGeo = this.trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16));

    for (let i = 0; i < 14; i++) {
      const t = i / 13; // 0 = pelvis, 1 = upper cervical
      const vGroup = new THREE.Group();
      const y = -0.82 + t * 1.92;
      // Predatory hunched S-curve spine
      const z = Math.sin(t * Math.PI * 1.25 - 0.35) * 0.28 - 0.18;
      vGroup.position.set(0, y, z);

      const centrum = new THREE.Mesh(vertGeo, m.forgedIron);
      const scaleW = 0.72 + Math.sin(t * Math.PI) * 0.55;
      centrum.scale.set(scaleW, 1, scaleW);
      centrum.castShadow = true;
      vGroup.add(centrum);

      // Porcelain-bone dorsal spinous process jutting out back
      const dorsal = new THREE.Mesh(
        dorsalFinGeo,
        i % 3 === 0 ? m.boneCarapace : m.forgedIron,
      );
      dorsal.position.set(0, 0.03, -0.22 * scaleW);
      dorsal.rotation.x = 0.35 - t * 0.5;
      dorsal.castShadow = true;
      vGroup.add(dorsal);

      if (i % 2 === 1) {
        const disc = new THREE.Mesh(brassRingGeo, m.agedBrass);
        disc.position.y = -0.07;
        vGroup.add(disc);
      }

      this.vertebrae.push(vGroup);
      this.thoraxGroup.add(vGroup);
    }

    // Glowing Inner Bellows-Lung Chamber
    const lungGeo = this.trackGeo(new THREE.CylinderGeometry(0.29, 0.21, 0.92, 20));
    this.bellowsMesh = new THREE.Mesh(lungGeo, m.visceralFilament);
    this.bellowsMesh.position.set(0, 0.26, 0.02);
    this.thoraxGroup.add(this.bellowsMesh);

    // 8 Pairs of Curved Porcelain-Bone Rib-Carapace Plates
    const ribSlabGeo = this.trackGeo(new THREE.BoxGeometry(0.46, 0.085, 0.14));
    const ribTipGeo = this.trackGeo(new THREE.BoxGeometry(0.24, 0.055, 0.09));

    for (let r = 0; r < 8; r++) {
      const rt = r / 7;
      const y = -0.22 + rt * 0.96;
      const span = 0.32 + Math.sin(rt * Math.PI) * 0.24;

      const leftPivot = new THREE.Group();
      leftPivot.position.set(-0.14, y, -0.08);
      const lRib = new THREE.Mesh(ribSlabGeo, m.boneCarapace);
      lRib.position.set(-span * 0.55, 0, 0.16);
      lRib.rotation.y = 0.48;
      lRib.rotation.z = 0.15 - rt * 0.25;
      lRib.castShadow = true;
      const lTip = new THREE.Mesh(ribTipGeo, m.surgicalChrome);
      lTip.position.set(-span * 1.02, -0.02, 0.31);
      lTip.rotation.y = 0.95;
      leftPivot.add(lRib, lTip);

      const rightPivot = new THREE.Group();
      rightPivot.position.set(0.14, y, -0.08);
      const rRib = new THREE.Mesh(
        ribSlabGeo,
        r >= 5 ? m.boneCarapace : m.forgedIron, // Asymmetric exposed iron ribs on lower right!
      );
      rRib.position.set(span * 0.58, 0, 0.16);
      rRib.rotation.y = -0.48;
      rRib.rotation.z = -(0.15 - rt * 0.25);
      rRib.castShadow = true;
      const rTip = new THREE.Mesh(ribTipGeo, m.agedBrass);
      rTip.position.set(span * 1.05, -0.02, 0.31);
      rTip.rotation.y = -0.95;
      rightPivot.add(rRib, rTip);

      this.ribLeftPivots.push(leftPivot);
      this.ribRightPivots.push(rightPivot);
      this.thoraxGroup.add(leftPivot, rightPivot);
    }
  }

  /**
   * ORGAN 2: Asymmetric Cranial Sensorium Turret, Saccadic Iris & 5-Reed Vocal Mandibles
   */
  private buildCranialLarynx(m: SonobjetMaterialRig): void {
    this.neckPivot.position.set(0, 1.18, 0.08);
    this.thoraxGroup.add(this.neckPivot);
    this.headGroup.position.set(0, 0.14, 0.22);
    this.neckPivot.add(this.headGroup);

    // Sculpted Asymmetric Porcelain Cranium Cowl
    const skullMainGeo = this.trackGeo(new THREE.BoxGeometry(0.54, 0.36, 0.62));
    const skullCrestGeo = this.trackGeo(new THREE.BoxGeometry(0.22, 0.18, 0.72));
    const skullMain = new THREE.Mesh(skullMainGeo, m.boneCarapace);
    skullMain.position.set(-0.04, 0.12, 0);
    skullMain.rotation.x = 0.12;
    skullMain.castShadow = true;

    const skullCrest = new THREE.Mesh(skullCrestGeo, m.boneCarapace);
    skullCrest.position.set(-0.08, 0.28, -0.08);
    skullCrest.rotation.x = 0.24;
    skullCrest.castShadow = true;

    // Asymmetric Right-Side Brass Optical Rangefinder Pod
    const rangeGeo = this.trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 0.44, 18));
    const rangePod = new THREE.Mesh(rangeGeo, m.agedBrass);
    rangePod.rotation.x = Math.PI * 0.5;
    rangePod.position.set(0.29, 0.15, 0.12);
    rangePod.castShadow = true;

    // Primary Cyclops Optic Bezel + 6 Surgical Chrome Shutter Blades + Glowing Eye
    const bezelGeo = this.trackGeo(new THREE.TorusGeometry(0.135, 0.026, 12, 24));
    const bezel = new THREE.Mesh(bezelGeo, m.surgicalChrome);
    bezel.position.set(-0.06, 0.11, 0.32);

    const pupilGeo = this.trackGeo(new THREE.SphereGeometry(0.095, 16, 16));
    const pupil = new THREE.Mesh(pupilGeo, m.visceralFilament);
    pupil.position.set(-0.06, 0.11, 0.29);

    this.opticIrisGroup.position.set(-0.06, 0.11, 0.33);
    const bladeGeo = this.trackGeo(new THREE.BoxGeometry(0.09, 0.025, 0.012));
    for (let b = 0; b < 6; b++) {
      const angle = (b / 6) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, m.surgicalChrome);
      blade.position.set(Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0);
      blade.rotation.z = angle + 0.5;
      this.opticIrisGroup.add(blade);
    }

    // Split Mandibles & Hinged Lower Jaw + 5 Vibrating Larynx Reeds
    const jawGeo = this.trackGeo(new THREE.BoxGeometry(0.34, 0.11, 0.46));
    const pincerGeo = this.trackGeo(new THREE.BoxGeometry(0.11, 0.15, 0.38));
    const reedGeo = this.trackGeo(new THREE.BoxGeometry(0.026, 0.16, 0.22));

    this.jawLowerPivot.position.set(-0.02, -0.06, -0.05);
    const jawMesh = new THREE.Mesh(jawGeo, m.forgedIron);
    jawMesh.position.set(0, -0.08, 0.2);
    this.jawLowerPivot.add(jawMesh);

    this.mandibleLeftPivot.position.set(-0.22, -0.04, 0.06);
    const leftMandible = new THREE.Mesh(pincerGeo, m.boneCarapace);
    leftMandible.position.set(-0.03, -0.04, 0.18);
    leftMandible.rotation.y = 0.22;
    this.mandibleLeftPivot.add(leftMandible);

    this.mandibleRightPivot.position.set(0.2, -0.04, 0.06);
    const rightMandible = new THREE.Mesh(pincerGeo, m.boneCarapace);
    rightMandible.position.set(0.03, -0.04, 0.18);
    rightMandible.rotation.y = -0.22;
    this.mandibleRightPivot.add(rightMandible);

    // 5 Glowing Tungsten Larynx Reeds inside Throat Cavity
    for (let r = 0; r < 5; r++) {
      const reed = new THREE.Mesh(reedGeo, m.visceralFilament);
      reed.position.set(-0.1 + r * 0.048, -0.05, 0.16);
      this.larynxReeds.push(reed);
      this.headGroup.add(reed);
    }

    this.headGroup.add(
      skullMain,
      skullCrest,
      rangePod,
      bezel,
      pupil,
      this.opticIrisGroup,
      this.jawLowerPivot,
      this.mandibleLeftPivot,
      this.mandibleRightPivot,
    );
  }

  /**
   * ORGAN 3: Massive Lopsided Right Siege-Hammer Arm + Spring-Mounted Floor Anvil
   */
  private buildRightSiegeHammerAndAnvil(m: SonobjetMaterialRig): void {
    this.rightShoulder.position.set(0.56, 0.78, 0.02);
    this.thoraxGroup.add(this.rightShoulder);

    // Heavy Porcelain Scapula Pauldron + Brass Hydraulic Cylinder
    const pauldronGeo = this.trackGeo(new THREE.BoxGeometry(0.46, 0.34, 0.42));
    const pauldron = new THREE.Mesh(pauldronGeo, m.boneCarapace);
    pauldron.position.set(0.16, 0.08, 0);
    pauldron.rotation.z = -0.28;
    pauldron.castShadow = true;

    const humerusGeo = this.trackGeo(new THREE.BoxGeometry(0.22, 1.08, 0.24));
    const humerus = new THREE.Mesh(humerusGeo, m.forgedIron);
    humerus.position.set(0.32, -0.46, 0.06);
    humerus.rotation.z = 0.22;
    humerus.castShadow = true;

    const hydroCylGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.068, 0.068, 0.88, 16),
    );
    const hydroCyl = new THREE.Mesh(hydroCylGeo, m.agedBrass);
    hydroCyl.position.set(0.48, -0.38, 0.14);
    hydroCyl.rotation.z = 0.18;

    this.rightElbow.position.set(0.46, -0.96, 0.12);
    this.rightShoulder.add(pauldron, humerus, hydroCyl, this.rightElbow);

    // Forearm + Counterweight + Forged Pile-Driver Hammer Head
    const forearmGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 1.15, 0.22));
    const forearm = new THREE.Mesh(forearmGeo, m.surgicalChrome);
    forearm.position.set(0.14, -0.45, 0.18);
    forearm.rotation.x = -0.32;
    forearm.castShadow = true;

    const counterWeightGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.18, 0.18, 0.24, 18),
    );
    const counterWeight = new THREE.Mesh(counterWeightGeo, m.agedBrass);
    counterWeight.rotation.z = Math.PI * 0.5;
    counterWeight.position.set(0.14, 0.16, -0.14);

    this.rightWrist.position.set(0.18, -1.04, 0.36);
    const hammerHeadGeo = this.trackGeo(new THREE.BoxGeometry(0.46, 0.36, 0.54));
    const hammerFaceGeo = this.trackGeo(new THREE.BoxGeometry(0.48, 0.07, 0.56));
    const hammerHead = new THREE.Mesh(hammerHeadGeo, m.forgedIron);
    hammerHead.castShadow = true;
    const hammerFace = new THREE.Mesh(hammerFaceGeo, m.surgicalChrome);
    hammerFace.position.y = -0.19;
    this.rightWrist.add(hammerHead, hammerFace);

    this.rightElbow.add(forearm, counterWeight, this.rightWrist);

    // Floor-Bolted Sloped Anvil Block (in worldGroup so it stays anchored to floor plinth!)
    const anvilBaseGeo = this.trackGeo(new THREE.BoxGeometry(0.95, 0.38, 0.92));
    const anvilTopGeo = this.trackGeo(new THREE.BoxGeometry(0.82, 0.24, 0.78));
    const springColGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.055, 0.055, 0.32, 12),
    );

    const anvilPedestal = new THREE.Mesh(anvilBaseGeo, m.forgedIron);
    anvilPedestal.position.set(1.22, -2.16, 0.44);
    anvilPedestal.receiveShadow = true;
    anvilPedestal.castShadow = true;
    this.worldGroup.add(anvilPedestal);

    for (const [sx, sz] of [
      [-0.28, -0.26],
      [0.28, -0.26],
      [-0.28, 0.26],
      [0.28, 0.26],
    ]) {
      const sp = new THREE.Mesh(springColGeo, m.surgicalChrome);
      sp.position.set(1.22 + sx, -1.9, 0.44 + sz);
      this.worldGroup.add(sp);
    }

    this.anvilTopGroup.position.set(1.22, -1.72, 0.44);
    const anvilPlate = new THREE.Mesh(anvilTopGeo, m.forgedIron);
    anvilPlate.castShadow = true;
    anvilPlate.receiveShadow = true;
    const strikePadGeo = this.trackGeo(new THREE.BoxGeometry(0.62, 0.04, 0.58));
    const strikePad = new THREE.Mesh(strikePadGeo, m.agedBrass);
    strikePad.position.y = 0.13;
    this.anvilTopGroup.add(anvilPlate, strikePad);
    this.worldGroup.add(this.anvilTopGroup);
  }

  /**
   * ORGAN 4: Dual Left Arachnid Mantis Raker Limbs + 16-Rod Tensioned Harp-Comb
   */
  private buildLeftHarpAndMantisRakers(
    m: SonobjetMaterialRig,
  ): THREE.InstancedMesh {
    this.harpFrameGroup.position.set(-0.78, 0.16, 0.32);
    this.harpFrameGroup.rotation.y = 0.32;
    this.harpFrameGroup.rotation.z = 0.08;
    this.thoraxGroup.add(this.harpFrameGroup);

    // Brass Curved Harp Spine & Top/Bottom Soundboards
    const harpPostGeo = this.trackGeo(new THREE.BoxGeometry(0.11, 1.56, 0.14));
    const harpBarGeo = this.trackGeo(new THREE.BoxGeometry(0.72, 0.09, 0.14));

    const post = new THREE.Mesh(harpPostGeo, m.agedBrass);
    post.position.set(0.28, 0, 0);
    post.castShadow = true;

    const topBar = new THREE.Mesh(harpBarGeo, m.forgedIron);
    topBar.position.set(-0.04, 0.76, 0);
    topBar.rotation.z = 0.18;

    const botBar = new THREE.Mesh(harpBarGeo, m.forgedIron);
    botBar.position.set(-0.08, -0.76, 0);
    botBar.rotation.z = -0.12;

    this.harpFrameGroup.add(post, topBar, botBar);

    // 16 Tensioned Surgical-Chrome Resonator Rods (graduated lengths like a concert harp/kalimba)
    const rodGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.014, 0.014, 1.0, 8),
    );
    rodGeo.rotateZ(Math.PI * 0.5);
    const harpMesh = new THREE.InstancedMesh(
      rodGeo,
      m.titaniumFinInstanced,
      16,
    );
    const white = new THREE.Color(1, 1, 1);

    for (let i = 0; i < 16; i++) {
      const t = i / 15; // 0 = lowest rod, 15 = highest treble rod
      const y = -0.66 + t * 1.32;
      const len = 0.68 - t * 0.28;
      this.harpRods.push({
        basePos: new THREE.Vector3(0.24 - len * 0.5, y, 0),
        length: len,
        vibration: 0,
        vibPhase: i * 0.9,
        flash: 0,
      });
      harpMesh.setColorAt(i, white);
    }
    this.harpFrameGroup.add(harpMesh);

    // Two Slender Multi-Jointed Mantis Raker Arms on Left Shoulder
    const buildRakerArm = (
      shoulder: THREE.Group,
      elbow: THREE.Group,
      yMount: number,
    ) => {
      shoulder.position.set(-0.48, yMount, -0.05);
      this.thoraxGroup.add(shoulder);

      const jointSphere = this.trackGeo(new THREE.SphereGeometry(0.09, 12, 12));
      const sJoint = new THREE.Mesh(jointSphere, m.agedBrass);
      const femurGeo = this.trackGeo(new THREE.BoxGeometry(0.075, 0.72, 0.085));
      const femur = new THREE.Mesh(femurGeo, m.boneCarapace);
      femur.position.set(-0.32, 0.16, 0.14);
      femur.rotation.z = 1.05;
      femur.rotation.y = -0.35;
      femur.castShadow = true;

      elbow.position.set(-0.62, 0.32, 0.26);
      shoulder.add(sJoint, femur, elbow);

      const tibiaGeo = this.trackGeo(new THREE.BoxGeometry(0.052, 0.68, 0.062));
      const tibia = new THREE.Mesh(tibiaGeo, m.surgicalChrome);
      tibia.position.set(0.12, -0.26, 0.18);
      tibia.rotation.z = -0.38;
      tibia.rotation.x = 0.45;
      tibia.castShadow = true;

      // Razor Plectrum Claw Tip
      const clawGeo = this.trackGeo(new THREE.ConeGeometry(0.038, 0.24, 6));
      const claw = new THREE.Mesh(clawGeo, m.surgicalChrome);
      claw.position.set(0.22, -0.56, 0.34);
      claw.rotation.z = -2.4;
      elbow.add(tibia, claw);
    };

    buildRakerArm(this.upperRakerShoulder, this.upperRakerElbow, 0.74);
    buildRakerArm(this.lowerRakerShoulder, this.lowerRakerElbow, 0.18);

    return harpMesh;
  }

  /**
   * ORGAN 5: Ventral Eccentric Brass Flywheel Governor, Connecting-Rod & Brake Caliper
   */
  private buildVentralFlywheel(m: SonobjetMaterialRig): THREE.Mesh {
    const mount = new THREE.Group();
    mount.position.set(0.06, -0.44, 0.16);
    this.thoraxGroup.add(mount);

    const rimGeo = this.trackGeo(new THREE.TorusGeometry(0.31, 0.048, 14, 32));
    const hubGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16),
    );
    const spokeGeo = this.trackGeo(new THREE.BoxGeometry(0.58, 0.036, 0.03));

    const rim = new THREE.Mesh(rimGeo, m.agedBrass);
    rim.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, m.surgicalChrome);
    hub.rotation.x = Math.PI * 0.5;
    this.flywheelWheel.add(rim, hub);

    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(spokeGeo, m.agedBrass);
      spoke.rotation.z = (s / 3) * Math.PI;
      this.flywheelWheel.add(spoke);
    }
    // Eccentric counterweight lobe (deliberately off-balance industrial cam!)
    const lobeGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 0.12, 0.09));
    const lobe = new THREE.Mesh(lobeGeo, m.forgedIron);
    lobe.position.set(0.2, 0, 0.04);
    this.flywheelWheel.add(lobe);
    mount.add(this.flywheelWheel);

    // Reciprocating Chrome Connecting Rod
    const rodGeo = this.trackGeo(new THREE.BoxGeometry(0.045, 0.56, 0.045));
    const conRod = new THREE.Mesh(rodGeo, m.surgicalChrome);
    mount.add(conRod);

    // Hydraulic Brake Caliper poised at top of flywheel rim
    const caliperGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 0.15, 0.18));
    const caliper = new THREE.Mesh(caliperGeo, m.forgedIron);
    this.brakeCaliperGroup.position.set(0, 0.34, 0);
    this.brakeCaliperGroup.add(caliper);
    mount.add(this.brakeCaliperGroup);

    return conRod;
  }

  /**
   * ORGAN 6: 10-Segment Whipping Newtonian Counter-Balance Tail & Stinger
   */
  private buildCounterTail(m: SonobjetMaterialRig): void {
    const segGeo = this.trackGeo(new THREE.BoxGeometry(0.18, 0.16, 0.22));
    const stingerGeo = this.trackGeo(new THREE.ConeGeometry(0.08, 0.36, 8));

    let parent: THREE.Object3D = this.thoraxGroup;
    for (let i = 0; i < 10; i++) {
      const pivot = new THREE.Group();
      if (i === 0) {
        pivot.position.set(0, -0.88, -0.18);
      } else {
        pivot.position.set(0, -0.15, -0.14);
      }
      const scale = 1 - i * 0.072;
      const seg = new THREE.Mesh(
        segGeo,
        i % 2 === 0 ? m.forgedIron : m.boneCarapace,
      );
      seg.scale.setScalar(scale);
      seg.castShadow = true;
      pivot.add(seg);

      if (i === 9) {
        const stinger = new THREE.Mesh(stingerGeo, m.visceralFilament);
        stinger.rotation.x = -Math.PI * 0.65;
        stinger.position.set(0, -0.16, -0.14);
        pivot.add(stinger);
      }

      parent.add(pivot);
      parent = pivot;
      this.tailSegments.push(pivot);
    }
  }

  /**
   * ORGAN 7A: 6 Catenary Steel Suspension Tendons (96 instanced links)
   */
  private buildSuspensionTendons(m: SonobjetMaterialRig): THREE.InstancedMesh {
    this.tendons = [
      {
        startWorld: new THREE.Vector3(-2.6, 3.85, -0.9),
        localAttach: new THREE.Vector3(-0.48, 0.85, -0.08),
        sag: 0.24,
        waveAmp: 0,
      },
      {
        startWorld: new THREE.Vector3(2.8, 3.85, -0.9),
        localAttach: new THREE.Vector3(0.58, 0.88, -0.05),
        sag: 0.22,
        waveAmp: 0,
      },
      {
        startWorld: new THREE.Vector3(-1.5, 3.85, 0.9),
        localAttach: new THREE.Vector3(-0.22, 1.18, 0.12),
        sag: 0.16,
        waveAmp: 0,
      },
      {
        startWorld: new THREE.Vector3(1.6, 3.85, 0.9),
        localAttach: new THREE.Vector3(0.22, 1.12, 0.12),
        sag: 0.18,
        waveAmp: 0,
      },
      {
        startWorld: new THREE.Vector3(-2.1, -2.35, -0.85),
        localAttach: new THREE.Vector3(-0.26, -0.78, -0.16),
        sag: -0.12,
        waveAmp: 0,
      },
      {
        startWorld: new THREE.Vector3(0.45, -2.35, -1.15),
        localAttach: new THREE.Vector3(0.18, -0.82, -0.18),
        sag: -0.12,
        waveAmp: 0,
      },
    ];

    const segsPerTendon = 16;
    const total = this.tendons.length * segsPerTendon;
    const cableGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.016, 0.016, 1.0, 6),
    );
    const mesh = new THREE.InstancedMesh(cableGeo, m.gunmetalInstanced, total);
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < total; i++) mesh.setColorAt(i, c);
    this.worldGroup.add(mesh);
    return mesh;
  }

  /**
   * ORGAN 7B: 160 Ballistic Floor-Bouncing Sparks (Anvil & Brake Friction)
   */
  private buildSparkSystem(m: SonobjetMaterialRig): THREE.InstancedMesh {
    const count = 160;
    const geo = this.trackGeo(new THREE.BoxGeometry(0.022, 0.022, 0.18));
    const mesh = new THREE.InstancedMesh(geo, m.sparkEmissive, count);
    mesh.frustumCulled = false;

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < count; i++) {
      this.sparks.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
      });
      mesh.setMatrixAt(i, zeroMat);
      mesh.setColorAt(i, c);
    }
    this.worldGroup.add(mesh);
    return mesh;
  }

  private emitSparks(
    origin: THREE.Vector3,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      s.active = true;
      s.pos.copy(origin);
      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.4 + Math.random() * 0.9) * speed;
      s.vel.set(
        Math.cos(angle) * horiz,
        (0.25 + Math.random() * 0.85) * speed * 0.65,
        Math.sin(angle) * horiz,
      );
      s.maxLife = 0.26 + Math.random() * 0.44;
      s.life = s.maxLife;
    }
  }

  getActiveInstanceCount(): number {
    // 14 vertebrae + 16 ribs + head/limbs/anvil (~28) + 16 harp rods + 96 tendon links + 160 sparks
    return 330;
  }

  getBehavioralState(): AutomatonBehavior {
    return this.behavior;
  }

  getArcFlash(): number {
    return this.arcFlash;
  }

  getStrobePulse(): number {
    return this.strobePulse;
  }

  getHarmonyGlow(): number {
    return this.harmonyGlow + this.larynxEnergy * 0.6;
  }

  setGazeTarget(x: number, y: number): void {
    this.userGaze = { x, y, active: true };
  }

  setPointerStrain(
    x: number,
    y: number,
    tension: number,
    active: boolean,
  ): void {
    this.pointerStrainVec.set(x, y);
    const prev = this.pointerTension;
    this.pointerTension = active ? Math.max(0, Math.min(1.5, tension)) : 0;
    this.core.setExternalStrain(this.pointerTension);

    if (active) {
      this.spineCoil.target = -this.pointerTension * 0.55;
      this.core.setDOFTarget('ribSpread', 0.15 + this.pointerTension * 0.65);
    } else if (prev > 0.25) {
      this.spineCoil.target = 0;
      this.core.setDOFTarget('ribSpread', 0.05);
      this.core.kickDOF('torsoLungeZ', prev * 6.5, 0);
    }
  }

  /**
   * Biomechanical Pre-Cue Anticipation:
   * Invoked 250ms-450ms BEFORE heavy downbeats so the creature physically cocks
   * its Siege-Hammer, coils its spine, and glances at the anvil before striking!
   */
  applyAnticipation(cue: AnticipationCue): void {
    const k = Math.min(1.3, cue.intensity);
    this.behavior = 'COILING_ANTICIPATION';
    if (
      cue.targetSubsystem === 'sub-rupture' ||
      cue.targetSubsystem === 'spine-shear'
    ) {
      this.hammerPitch.target = 1.18 * k;
      this.elbowBend.target = 1.35 * k;
      this.spineCoil.target = -0.38 * k;
      // Creature glances sharply down-right at its own cocked hammer & anvil!
      this.gazeYaw.target = -0.46;
      this.gazePitch.target = -0.42;
      this.saccadeTimer = cue.leadTimeSec + 0.15;
    } else if (cue.targetSubsystem === 'larynx-lead') {
      this.spineCoil.target = -0.22 * k;
      this.core.setDOFTarget('ribSpread', 0.45 * k);
      this.gazeYaw.target = 0;
      this.gazePitch.target = 0.08;
    }
  }

  /**
   * Direct Biomechanical Organ Actuation (1:1 coupled with acoustic synthesis).
   */
  applyImpulse(event: ImpulseEvent): void {
    const v = Math.max(0.05, Math.min(1.45, event.velocity));
    this.fatigue = Math.min(1.0, this.fatigue + v * 0.018);

    switch (event.subsystem) {
      case 'windup-inhale': {
        this.applyAnticipation({
          targetSubsystem: 'sub-rupture',
          intensity: v,
          leadTimeSec: event.durationSec ?? 0.34,
          audioTime: event.audioTime,
        });
        break;
      }

      case 'sub-rupture': {
        // SIEGE-HAMMER SLAMS DOWN ONTO THE ANVIL!
        this.hammerPitch.target = -0.62;
        this.hammerPitch.impulse(-19.5 * v);
        this.elbowBend.target = 0.18;
        this.elbowBend.impulse(-12.0 * v);
        this.spineCoil.target = 0.18;
        this.spineCoil.impulse(9.5 * v);

        this.anvilCompression.impulse(-8.5 * v);
        this.anvilHeat = Math.min(1.6, this.anvilHeat + 0.85 * v);
        this.strobePulse = Math.min(1.4, this.strobePulse + 0.65 * v);

        // Newtonian counter-torque on torso & whipping tail!
        this.core.kickDOF('torsoRoll', -7.2 * v, 0);
        this.core.kickDOF('torsoLungeZ', 6.4 * v, 0);
        this.core.kickDOF('tailWhip', 11.5 * v, 0);

        for (const t of this.tendons) t.waveAmp = Math.max(t.waveAmp, 0.18 * v);

        this.emitSparks(
          new THREE.Vector3(1.22, -1.56, 0.44),
          Math.floor(22 + v * 20),
          5.8 * v,
        );
        break;
      }

      case 'spine-shear': {
        // Snare crack: sharp torso torsion + secondary hammer bounce + jaw snap
        const sign = event.locus[0] >= 0 ? 1 : -1;
        this.core.kickDOF('torsoYaw', sign * 8.5 * v, sign * 0.12);
        this.core.kickDOF('tailWhip', -sign * 9.5 * v, 0);
        this.hammerPitch.impulse(-11.0 * v);
        this.anvilHeat = Math.min(1.5, this.anvilHeat + 0.45 * v);
        this.emitSparks(new THREE.Vector3(1.22, -1.56, 0.44), 12, 4.2 * v);
        break;
      }

      case 'modal-clang':
      case 'break-shred':
      case 'fin-cascade': {
        // MANTIS RAKER CLAWS PLUCK & RAKE ACROSS THE 16-ROD HARP-COMB!
        let rodIdx = event.sliceIndex ?? 0;
        if (event.midiNote !== undefined) {
          // Map MIDI pitch (F3..C6) onto rods 0..15!
          rodIdx = Math.max(0, Math.min(15, Math.round(event.midiNote - 58)));
        } else {
          rodIdx = ((rodIdx % 16) + 16) % 16;
        }

        const rod = this.harpRods[rodIdx];
        if (rod) {
          rod.vibration = Math.min(1.4, rod.vibration + 0.95 * v);
          rod.flash = Math.min(1.6, rod.flash + 1.15 * v);

          if (rodIdx >= 8 || this.rakerToggle++ % 2 === 0) {
            this.rakerUpperTargetY.target = rod.basePos.y;
            this.rakerUpperPluck = 1.0 * v;
          } else {
            this.rakerLowerTargetY.target = rod.basePos.y;
            this.rakerLowerPluck = 1.0 * v;
          }
        }

        // Glance toward harp when playing exposed solo Seed Motif notes!
        if (event.subsystem === 'modal-clang' && v > 0.65) {
          this.gazeYaw.target = 0.44;
          this.gazePitch.target = -0.12;
          this.saccadeTimer = 0.45;
        }
        this.flywheelOmega = Math.min(22, this.flywheelOmega + 0.85 * v);
        break;
      }

      case 'larynx-lead': {
        // VOCAL MANDIBLE-LARYNX SINGS!
        this.behavior = 'VOCALIZING_ARIA';
        this.vowelShape = event.vowel ?? 0.35;
        const mouthTarget = 0.24 + (1 - this.vowelShape * 0.65) * 0.42 * v;
        this.jawOpen.target = mouthTarget;
        this.jawOpen.impulse(4.5 * v);
        this.larynxEnergy = Math.min(1.8, 0.85 + v * 0.85);
        // Lock direct eye-contact with the viewer while singing!
        this.gazeYaw.target = 0;
        this.gazePitch.target = 0.04;
        this.saccadeTimer = event.durationSec ?? 0.6;
        break;
      }

      case 'bellows-choir': {
        // Bellows-Lung inflates with warm harmonic polychord glow!
        this.harmonyGlow = Math.min(1.5, 0.75 + v * 0.65);
        this.core.setDOFTarget('ribSpread', 0.42 * v);
        break;
      }

      case 'core-implode': {
        // Sub-Monolith Bass: chest compresses inward while flywheel surges
        this.core.kickDOF('ribSpread', -4.2 * v, 0.08);
        this.core.kickDOF('torsoLungeZ', -3.8 * v, 0);
        this.larynxEnergy = Math.min(1.5, this.larynxEnergy + 0.45 * v);
        this.flywheelOmega = Math.min(24, this.flywheelOmega + 2.2 * v);
        break;
      }

      case 'piston-snap': {
        this.hammerPitch.target = 0.35;
        this.hammerPitch.impulse(6.5 * v);
        this.core.kickDOF('torsoYaw', (Math.random() - 0.5) * 6 * v, 0);
        break;
      }

      case 'arc-discharge': {
        this.arcFlash = Math.min(1.6, this.arcFlash + 1.1 * v);
        this.strobePulse = Math.min(1.3, this.strobePulse + 0.7 * v);
        this.core.kickDOF('tailWhip', (Math.random() > 0.5 ? 1 : -1) * 14 * v, 0);
        break;
      }
    }
  }

  /**
   * Steps full biomechanical hierarchy, metabolic respiration, saccadic gaze,
   * flywheel governor, catenary tendons, and ballistic sparks.
   */
  update(
    dt: number,
    elapsed: number,
    options: {
      explodeAmount: number;
      hardLock: boolean;
      stutterFreeze: boolean;
      sectionId: string;
      materials: SonobjetMaterialRig;
    },
  ): ImpulseEvent | null {
    const h = Math.min(0.033, Math.max(0.0005, dt));
    const spontaneous = this.core.stepPhysics(h, options.hardLock);

    // Update behavioral state from musical narrative context + exertion
    this.updateBehaviorState(h, options.sectionId);

    // Decay transient energies
    this.arcFlash = Math.max(0, this.arcFlash - h * 5.2);
    this.strobePulse = Math.max(0, this.strobePulse - h * 6.8);
    this.anvilHeat = Math.max(0, this.anvilHeat - h * 1.9);
    this.larynxEnergy = Math.max(0.1, this.larynxEnergy - h * 2.1);
    this.harmonyGlow = Math.max(0, this.harmonyGlow - h * 0.75);
    this.fatigue = Math.max(0, this.fatigue - h * 0.045);

    if (this.larynxEnergy < 0.25 && this.jawOpen.target > 0.06) {
      this.jawOpen.target = 0.03 + this.fatigue * 0.14; // Slightly open panting jaw when fatigued!
    }
    if (this.harmonyGlow < 0.15 && this.pointerTension < 0.05) {
      this.core.setDOFTarget('ribSpread', 0.05 + this.fatigue * 0.22);
    }
    if (this.hammerPitch.value < -0.35 && this.hammerPitch.velocity < 0.5) {
      // Return hammer to poised neutral guard after striking anvil
      this.hammerPitch.target = -0.08;
      this.elbowBend.target = 0.68;
      this.spineCoil.target = 0;
    }

    // Step spring solvers
    if (!options.hardLock) {
      this.hammerPitch.step(h);
      this.elbowBend.step(h);
      this.anvilCompression.step(h);
      this.jawOpen.step(h);
      this.spineCoil.step(h);
      this.rakerUpperTargetY.step(h);
      this.rakerLowerTargetY.step(h);
      this.gazeYaw.step(h);
      this.gazePitch.step(h);
    }

    // 1. METABOLIC RESPIRATION & SPINE ARTICULATION
    const breathFreq = 0.26 + this.fatigue * 0.65;
    this.breathPhase += h * breathFreq * Math.PI * 2;
    const breathWave = Math.sin(this.breathPhase);

    const lockAmt = options.hardLock ? 1 : 0;
    const coil = quantizeDetent(this.spineCoil.value, 0.12, lockAmt);
    const lungeZ = this.core.getDOF('torsoLungeZ') * 0.18 + coil * 0.35;

    this.bodyRoot.position.set(
      -0.08 + this.pointerStrainVec.x * this.pointerTension * 0.28,
      0.28 + breathWave * (0.035 + this.fatigue * 0.045),
      lungeZ,
    );
    this.bodyRoot.rotation.set(
      coil * 0.42,
      quantizeDetent(this.core.getDOF('torsoYaw') * 0.35, Math.PI / 12, lockAmt),
      quantizeDetent(this.core.getDOF('torsoRoll') * 0.28, Math.PI / 12, lockAmt),
    );

    // Propagate peristaltic breathing & coil along all 14 vertebrae
    for (let i = 0; i < this.vertebrae.length; i++) {
      const t = i / 13;
      const v = this.vertebrae[i];
      const baseZ = Math.sin(t * Math.PI * 1.25 - 0.35) * 0.28 - 0.18;
      const archOffset = Math.sin(t * Math.PI) * (coil * 0.28 + breathWave * 0.025);
      v.position.z = baseZ + archOffset;
      v.rotation.x = (t - 0.5) * coil * 0.55;
      v.rotation.y = Math.sin(elapsed * 2.1 + i * 0.4) * 0.03;
    }

    // Bellows-Lung & Porcelain Rib-Valves
    const ribOpen =
      this.core.getDOF('ribSpread') +
      (breathWave * 0.5 + 0.5) * (0.09 + this.fatigue * 0.16) +
      options.explodeAmount * 0.65;
    const lungScale = 0.88 + ribOpen * 0.36 + this.harmonyGlow * 0.12;
    this.bellowsMesh.scale.set(lungScale, 1 + breathWave * 0.05, lungScale);

    for (let r = 0; r < this.ribLeftPivots.length; r++) {
      const wave = Math.sin(this.breathPhase - r * 0.28) * 0.045;
      const flare = ribOpen * (0.55 + (r / 8) * 0.45) + wave;
      this.ribLeftPivots[r].rotation.y = -flare;
      this.ribLeftPivots[r].rotation.z = -flare * 0.25;
      this.ribRightPivots[r].rotation.y = flare;
      this.ribRightPivots[r].rotation.z = flare * 0.25;
    }

    // 2. AUTONOMOUS SACCADIC GAZE & VOCAL MANDIBLE-LARYNX
    this.saccadeTimer -= h;
    if (this.saccadeTimer <= 0) {
      if (this.userGaze.active && Math.hypot(this.userGaze.x, this.userGaze.y) > 0.05) {
        this.gazeYaw.target = this.userGaze.x * 0.55;
        this.gazePitch.target = this.userGaze.y * 0.38;
        this.saccadeTimer = 0.12;
      } else {
        // Emergent curious/wary saccadic darts around chamber & own body
        const targets: Array<[number, number]> = [
          [0, 0.02], // Stare directly at viewer
          [-0.38, -0.32], // Inspect right anvil
          [0.36, -0.14], // Inspect left harp
          [0.18, 0.22], // Glance up at gantry tendon
        ];
        const pick = targets[Math.floor(Math.random() * targets.length)];
        this.gazeYaw.target = pick[0];
        this.gazePitch.target = pick[1];
        this.saccadeTimer = 0.65 + Math.random() * 1.6;
      }
    }

    this.neckPivot.rotation.y = quantizeDetent(
      this.gazeYaw.value,
      Math.PI / 10,
      lockAmt,
    );
    this.neckPivot.rotation.x = quantizeDetent(
      -this.gazePitch.value - coil * 0.35,
      Math.PI / 10,
      lockAmt,
    );
    // Subtle curious insectoid head-tilt!
    this.headGroup.rotation.z =
      Math.sin(elapsed * 0.9) * 0.08 + this.gazeYaw.value * 0.22;

    // Optic Iris dilation/constriction
    const pupilAperture = 0.72 + this.larynxEnergy * 0.35 - this.strobePulse * 0.25;
    this.opticIrisGroup.rotation.z = elapsed * 0.6 + this.larynxEnergy * 1.4;
    this.opticIrisGroup.scale.setScalar(Math.max(0.55, Math.min(1.3, pupilAperture)));

    // Vocal Mandibles & 5 Vibrating Larynx Reeds
    const jawAngle = Math.max(0, Math.min(0.85, this.jawOpen.value));
    this.jawLowerPivot.rotation.x = jawAngle;
    const spreadVowel = (1 - this.vowelShape) * jawAngle * 0.65;
    this.mandibleLeftPivot.rotation.y = spreadVowel;
    this.mandibleRightPivot.rotation.y = -spreadVowel;

    for (let r = 0; r < this.larynxReeds.length; r++) {
      const reedVib =
        this.larynxEnergy > 0.18
          ? Math.sin(elapsed * (95 + r * 28)) * 0.032 * this.larynxEnergy
          : 0;
      this.larynxReeds[r].position.y = -0.05 + reedVib;
      this.larynxReeds[r].scale.y = 0.8 + jawAngle * 0.9;
    }

    // 3. RIGHT SIEGE-HAMMER ARM & FLOOR ANVIL
    this.rightShoulder.rotation.x = -this.hammerPitch.value;
    this.rightShoulder.rotation.z = -0.12 - options.explodeAmount * 0.35;
    this.rightElbow.rotation.x = -this.elbowBend.value;
    this.anvilTopGroup.position.y =
      -1.72 + Math.max(-0.14, Math.min(0.06, this.anvilCompression.value * 0.06));

    // 4. LEFT 16-ROD HARP-COMB & MANTIS RAKER LIMBS
    this.rakerUpperPluck = Math.max(0, this.rakerUpperPluck - h * 9.5);
    this.rakerLowerPluck = Math.max(0, this.rakerLowerPluck - h * 9.5);

    this.harpFrameGroup.position.x = -0.78 - options.explodeAmount * 0.42;

    this.upperRakerShoulder.rotation.z =
      (this.rakerUpperTargetY.value - 0.35) * 0.75;
    this.upperRakerElbow.rotation.y = -this.rakerUpperPluck * 0.68;
    this.upperRakerElbow.rotation.x = this.rakerUpperPluck * 0.35;

    this.lowerRakerShoulder.rotation.z =
      (this.rakerLowerTargetY.value + 0.15) * 0.75;
    this.lowerRakerElbow.rotation.y = -this.rakerLowerPluck * 0.68;
    this.lowerRakerElbow.rotation.x = -this.rakerLowerPluck * 0.35;

    for (let i = 0; i < this.harpRods.length; i++) {
      const rod = this.harpRods[i];
      rod.vibration = Math.max(0, rod.vibration - h * 2.4);
      rod.flash = Math.max(0, rod.flash - h * 4.5);
      rod.vibPhase += h * (58 + i * 9);

      const dispZ = Math.sin(rod.vibPhase) * rod.vibration * 0.045;
      this.tmpPos.set(rod.basePos.x, rod.basePos.y, rod.basePos.z + dispZ);
      this.tmpQuat.identity();
      this.tmpScale.set(rod.length, 1 + rod.vibration * 0.8, 1 + rod.vibration * 0.8);
      this.dummy.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      this.harpRodMesh.setMatrixAt(i, this.dummy);

      const lum = 0.88 + rod.flash * 1.8;
      this.tmpColor.setRGB(lum + rod.flash * 0.6, lum + rod.flash * 0.3, lum);
      this.harpRodMesh.setColorAt(i, this.tmpColor);
    }
    this.harpRodMesh.instanceMatrix.needsUpdate = true;
    if (this.harpRodMesh.instanceColor) {
      this.harpRodMesh.instanceColor.needsUpdate = true;
    }

    // 5. VENTRAL FLYWHEEL GOVERNOR & BRAKE CALIPER
    this.brakeClamped = options.stutterFreeze || options.hardLock;
    if (this.brakeClamped) {
      if (this.flywheelOmega > 3.5) {
        // Brake caliper clamping fast flywheel sprays friction sparks!
        this.bodyRoot.localToWorld(
          this.tmpPos.set(0.06, -0.1, 0.16),
        );
        this.emitSparks(this.tmpPos, 4, 3.2);
      }
      this.flywheelOmega *= Math.pow(0.01, h);
      this.brakeCaliperGroup.position.y = 0.295;
    } else {
      const minCruise = options.sectionId === 'exhaustion' ? 0.25 : 1.6;
      this.flywheelOmega = Math.max(
        minCruise,
        this.flywheelOmega - h * 2.8,
      );
      this.flywheelAngle += this.flywheelOmega * h;
      this.brakeCaliperGroup.position.y = 0.345;
    }

    this.flywheelWheel.rotation.z = this.flywheelAngle;
    const crankX = Math.cos(this.flywheelAngle) * 0.18;
    const crankY = Math.sin(this.flywheelAngle) * 0.18;
    this.conRodMesh.position.set(crankX * 0.5, crankY * 0.5 + 0.26, 0.05);
    this.conRodMesh.rotation.z = -crankX * 1.4;

    // 6. SEGMENTED COUNTER-TORQUE WHIPPING TAIL
    const tailWhip = this.core.getDOF('tailWhip');
    for (let i = 0; i < this.tailSegments.length; i++) {
      const seg = this.tailSegments[i];
      const wave =
        Math.sin(elapsed * 4.2 - i * 0.55) * (0.045 + Math.abs(tailWhip) * 0.08);
      seg.rotation.z = tailWhip * 0.14 + wave;
      seg.rotation.x = -0.09 + Math.cos(elapsed * 2.8 - i * 0.4) * 0.035 - coil * 0.06;
    }

    // 7. UPDATE CATENARY SUSPENSION TENDONS & BALLISTIC SPARKS
    this.bodyRoot.updateMatrixWorld(true);
    this.updateTendonInstances(h, elapsed);
    this.updateSparkInstances(h);

    // Update TSL Shader Uniforms
    const stress = this.core.getStructuralStress();
    options.materials.uniforms.stress.value = stress;
    options.materials.uniforms.arcFlash.value = this.arcFlash;
    options.materials.uniforms.larynxGlow.value =
      this.larynxEnergy + this.harmonyGlow * 0.65;
    options.materials.uniforms.anvilHeat.value = this.anvilHeat;
    options.materials.uniforms.time.value = elapsed;

    return spontaneous;
  }

  private updateBehaviorState(dt: number, sectionId: string): void {
    void dt;
    if (sectionId === 'stasis-seed') {
      this.behavior = 'DORMANT_BREATH';
    } else if (sectionId === 'asymmetric-loom') {
      this.behavior = 'ASYMMETRIC_LOOM';
    } else if (sectionId === 'larynx-aria') {
      this.behavior = 'VOCALIZING_ARIA';
    } else if (sectionId === 'flywheel-cadenza' || sectionId === 'apex-convergence') {
      this.behavior = 'FRACTURE_OVERDRIVE';
    } else if (sectionId === 'exhaustion') {
      this.behavior = 'PANTING_EXHAUSTION';
    }
  }

  private updateTendonInstances(dt: number, elapsed: number): void {
    const segs = 16;
    let instanceIdx = 0;

    for (let tIdx = 0; tIdx < this.tendons.length; tIdx++) {
      const tendon = this.tendons[tIdx];
      tendon.waveAmp = Math.max(0, tendon.waveAmp - dt * 1.8);

      const endWorld = this.tmpPosB.copy(tendon.localAttach);
      this.thoraxGroup.localToWorld(endWorld);

      for (let s = 0; s < segs; s++) {
        const u0 = s / segs;
        const u1 = (s + 1) / segs;
        const p0 = this.evalTendonPoint(tendon, endWorld, u0, elapsed, tIdx);
        const p1 = this.evalTendonPoint(tendon, endWorld, u1, elapsed, tIdx);

        this.tmpPos.addVectors(p0, p1).multiplyScalar(0.5);
        const dir = p1.sub(p0);
        const len = Math.max(0.001, dir.length());
        dir.divideScalar(len);

        this.tmpQuat.setFromUnitVectors(this.upVec, dir);
        this.tmpScale.set(1, len * 1.04, 1);
        this.dummy.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        this.tendonMesh.setMatrixAt(instanceIdx++, this.dummy);
      }
    }
    this.tendonMesh.instanceMatrix.needsUpdate = true;
  }

  private evalTendonPoint(
    tendon: TendonAnchor,
    endWorld: THREE.Vector3,
    u: number,
    elapsed: number,
    seed: number,
  ): THREE.Vector3 {
    const p = new THREE.Vector3().lerpVectors(tendon.startWorld, endWorld, u);
    const parabola = 4 * u * (1 - u);
    // Tension pulls catenary straighter under load!
    const slack = Math.max(0.15, 1 - this.pointerTension * 0.7);
    p.y -= tendon.sag * parabola * slack;
    if (tendon.waveAmp > 0.002) {
      p.x +=
        Math.sin(u * Math.PI * 3 + elapsed * 38 + seed) *
        tendon.waveAmp *
        parabola;
    }
    return p;
  }

  private updateSparkInstances(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      anyChanged = true;

      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        this.dummy.makeScale(0, 0, 0);
        this.sparkMesh.setMatrixAt(i, this.dummy);
        continue;
      }

      s.vel.y -= 14.5 * dt; // Gravity
      s.pos.addScaledVector(s.vel, dt);

      // Floor plinth bounce!
      if (s.pos.y < -2.33) {
        s.pos.y = -2.33;
        s.vel.y = -s.vel.y * 0.46;
        s.vel.x *= 0.78;
        s.vel.z *= 0.78;
      }

      const speed = Math.max(0.01, s.vel.length());
      this.tmpPos.copy(s.vel).divideScalar(speed);
      this.tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.tmpPos);
      const lifeNorm = s.life / s.maxLife;
      this.tmpScale.set(
        lifeNorm,
        lifeNorm,
        Math.min(2.6, 0.5 + speed * 0.18) * lifeNorm,
      );
      this.dummy.compose(s.pos, this.tmpQuat, this.tmpScale);
      this.sparkMesh.setMatrixAt(i, this.dummy);

      this.tmpColor.setRGB(1.2 * lifeNorm, 0.8 * lifeNorm, 0.35 * lifeNorm);
      this.sparkMesh.setColorAt(i, this.tmpColor);
    }

    if (anyChanged) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
      if (this.sparkMesh.instanceColor) {
        this.sparkMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
  }
}
