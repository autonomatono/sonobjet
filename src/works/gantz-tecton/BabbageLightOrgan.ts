import * as THREE from 'three/webgpu';
import type { SonobjetMaterialRig } from '../../engine/render/TSLMaterials';
import type { AnticipationCue, ImpulseEvent } from '../../engine/core/types';
import type { MachineCameraAnchors } from '../../kit/camera/CinemaDirector';

interface DropHammerState {
  pivot: THREE.Group;
  headWorldX: number;
  headWorldZ: number;
  angle: number;
  vel: number;
  cockedTarget: number;
}

interface BabbageWheelState {
  colIdx: number;
  rowIdx: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  targetAngle: number;
  carryKick: number;
}

interface OrganPipeState {
  x: number;
  yBase: number;
  z: number;
  radius: number;
  height: number;
  glow: number;
  louverOpen: number;
  color: THREE.Color;
}

interface SparkParticle {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

// Scriabin-inspired F-Phrygian Pitch-Class -> Spectral HDR Color Palette
const PITCH_CLASS_PALETTE: Record<number, number> = {
  5: 0xff5a1f, // F  -> Molten Ember-Orange
  6: 0x26ffd5, // Gb -> Electric Cyan-Mint
  7: 0xffb328, // G  -> Sodium Amber
  8: 0x3b8bff, // Ab -> Cerulean Sapphire
  10: 0xff3b6b, // Bb -> Crimson Plasma
  0: 0xfff5dc, // C  -> Blinding Xenon Ivory
  1: 0x2de2ff, // Db -> Glacial Arc Blue
  3: 0xc26eff, // Eb -> Ultraviolet Quartz
};

function midiToPipeIndex(midi: number): number {
  return Math.max(0, Math.min(23, Math.abs(Math.round(midi - 48)) % 24));
}

function midiToColorHex(midi: number): number {
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_CLASS_PALETTE[pc] ?? 0xff9a3d;
}

export interface BabbageUpdateOptions {
  explodeAmount: number;
  hardLock: boolean;
  stutterFreeze: boolean;
  sectionId: string;
}

/**
 * BABBAGE // CLAVILUX — Monumental Non-Anthropomorphic Moving-Castle,
 * Acoustic Drop-Forge Factory, Babbage Cipher-Tower & 24-Pipe Light Organ.
 *
 * Designed with an open 3.2m central atrium ("Nave") so the CinemaDirector
 * can fly directly inside the architecture, zoom to 85mm macros on brass
 * cipher wheels, ride the Jacquard shuttle carriage via SnorriCam, or pull
 * 22 meters out into the Piranesian foundry.
 */
export class BabbageLightOrgan {
  readonly worldGroup = new THREE.Group();

  // Chassis root (rides along the rails & absorbs drop-forge heave)
  readonly chassis = new THREE.Group();

  // SnorriCam POV mount on the reciprocating Jacquard shuttle carriage!
  readonly shuttleCarriage = new THREE.Group();

  // District 1: Undercarriage, Rail Wheels, Cam-Barrel & 3 Drop-Forge Trip-Hammers
  private readonly railWheels: THREE.Mesh[] = [];
  private camBarrel!: THREE.Group;
  private readonly dropHammers: DropHammerState[] = [];
  private railPosZ = 0;
  private railVelZ = 0;
  private chassisHeaveY = 0;
  private chassisHeaveVel = 0;
  private levitationLift = 0;

  // District 2: 48 Brass Babbage Cipher Wheels & 48 Chrome Carry-Levers
  private babbageWheelMesh!: THREE.InstancedMesh;
  private babbageLeverMesh!: THREE.InstancedMesh;
  private readonly babbageStates: BabbageWheelState[] = [];
  private babbageCursor = 0;

  // District 3: Overhead Jacquard Punched-Card Loom & 16 Sensing Needles
  private jacquardPrism!: THREE.Mesh;
  private jacquardNeedleMesh!: THREE.InstancedMesh;
  private readonly needleExtension = new Float32Array(16);
  private shuttleX = 0;
  private shuttleTargetX = 0;
  private prismAngle = 0;
  private prismTargetAngle = 0;

  // District 4: 24-Pipe Asymmetric Chromatic Quartz Light-Organ & Brass Louvers
  private organPipeMesh!: THREE.InstancedMesh;
  private organLouverMesh!: THREE.InstancedMesh;
  private readonly organPipes: OrganPipeState[] = [];

  // District 5: Central 3-Ring Counter-Rotating Dichroic Astrolabe & Brake
  private readonly astrolabeGroup = new THREE.Group();
  private astrolabeRingOuter!: THREE.Mesh;
  private astrolabeRingMid!: THREE.Mesh;
  private astrolabeRingInner!: THREE.Mesh;
  private dichroicCore!: THREE.Mesh;
  private brakeCaliperL!: THREE.Mesh;
  private brakeCaliperR!: THREE.Mesh;
  private astrolabeSpeed = 1.4;
  private brakeClamped = 0;

  // District 6: Asymmetric Lateral Bellows Lung-Vats & Overhead Gantry Cables
  private bellowsLeft!: THREE.InstancedMesh;
  private bellowsRight!: THREE.InstancedMesh;
  private bellowsInflation = 0.25;
  private bellowsTarget = 0.25;
  private cableMesh!: THREE.InstancedMesh;

  // Ballistic Spark Pool (220 floor-bouncing anvil & brake sparks)
  private sparkMesh!: THREE.InstancedMesh;
  private readonly sparks: SparkParticle[] = [];
  private sparkCursor = 0;

  // Physical telemetry & lighting outputs
  private structuralStress = 0;
  private kineticEnergy = 0;
  private arcFlash = 0;
  private strobePulse = 0;
  private organGlow = 0;
  private anvilHeat = 0;
  private spectralHueNorm = 0.08;
  private pointerStrain = 0;
  private pointerX = 0;
  private behavioralState = 'IDLE_ESCAPEMENT';

  private readonly dummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();
  private readonly upVec = new THREE.Vector3(0, 1, 0);
  private readonly tmpDir = new THREE.Vector3();

  constructor(private readonly materials: SonobjetMaterialRig) {
    this.worldGroup.add(this.chassis);

    this.buildUndercarriageAndForge();
    this.buildBabbageCipherTowers();
    this.buildJacquardLoomBridge();
    this.buildLightOrganCrown();
    this.buildCentralAstrolabe();
    this.buildBellowsAndGantryCables();
    this.buildSparkPool();
  }

  getCameraAnchors(): MachineCameraAnchors {
    return {
      shuttleCarriage: this.shuttleCarriage,
      chassisRoot: this.chassis,
    };
  }

  getActiveInstanceCount(): number {
    // 48 wheels + 48 levers + 16 needles + 24 pipes + 24 louvers + 18 bellows + 112 cables + 220 sparks = 510!
    return 510;
  }

  getStructuralStress(): number {
    return this.structuralStress;
  }

  getKineticEnergy(): number {
    return this.kineticEnergy;
  }

  getBehavioralState(): string {
    return this.behavioralState;
  }

  getArcFlash(): number {
    return this.arcFlash;
  }

  getStrobePulse(): number {
    return this.strobePulse;
  }

  getOrganGlow(): number {
    return this.organGlow;
  }

  getSpectralHueNorm(): number {
    return this.spectralHueNorm;
  }

  setPointerStrain(
    x: number,
    _y: number,
    tension: number,
    active: boolean,
  ): void {
    this.pointerStrain = active ? tension : 0;
    this.pointerX = x;
    if (active && tension > 0.05) {
      this.shuttleTargetX = x * 1.9;
    }
  }

  /**
   * DISTRICT 1: Asymmetric Cast-Iron Locomotive Bogie, 4 Flanged Rail Wheels,
   * Rotating Brass Cam-Barrel & 3 Staggered Drop-Forge Trip-Hammers.
   */
  private buildUndercarriageAndForge(): void {
    const sillGeo = new THREE.BoxGeometry(0.68, 0.55, 6.8);
    const sillL = new THREE.Mesh(sillGeo, this.materials.forgedIron);
    sillL.position.set(-2.1, -1.92, 0);
    sillL.castShadow = true;
    sillL.receiveShadow = true;

    const sillR = new THREE.Mesh(sillGeo, this.materials.forgedIron);
    sillR.position.set(2.1, -1.92, 0);
    sillR.castShadow = true;
    sillR.receiveShadow = true;

    const transomGeo = new THREE.BoxGeometry(5.2, 0.45, 0.72);
    const transomFront = new THREE.Mesh(transomGeo, this.materials.forgedIron);
    transomFront.position.set(0, -1.95, 2.85);
    const transomRear = new THREE.Mesh(transomGeo, this.materials.forgedIron);
    transomRear.position.set(0, -1.95, -2.85);

    this.chassis.add(sillL, sillR, transomFront, transomRear);

    // 4 Flanged Steel/Iron Locomotive Wheels riding on PiranesiFoundry rails (x = ±2.1m)
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.22, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const spokeBarGeo = new THREE.BoxGeometry(0.26, 0.78, 0.12);

    const wheelCoords: [number, number][] = [
      [-2.1, 2.05],
      [2.1, 2.05],
      [-2.1, -2.05],
      [2.1, -2.05],
    ];
    for (const [wx, wz] of wheelCoords) {
      const wheel = new THREE.Mesh(wheelGeo, this.materials.surgicalChrome);
      wheel.position.set(wx, -2.02, wz);
      const spoke = new THREE.Mesh(spokeBarGeo, this.materials.agedBrass);
      wheel.add(spoke);
      this.chassis.add(wheel);
      this.railWheels.push(wheel);
    }

    // Rotating Brass Cam-Barrel across the front-lower forge apron
    this.camBarrel = new THREE.Group();
    this.camBarrel.position.set(0, -1.35, 1.95);
    const barrelDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 3.6, 20).rotateZ(Math.PI / 2),
      this.materials.agedBrass,
    );
    this.camBarrel.add(barrelDrum);

    const toothGeo = new THREE.BoxGeometry(0.14, 0.34, 0.14);
    for (let i = 0; i < 12; i++) {
      const tooth = new THREE.Mesh(toothGeo, this.materials.surgicalChrome);
      const x = -1.5 + i * 0.27;
      const a = i * 1.15;
      tooth.position.set(x, Math.sin(a) * 0.25, Math.cos(a) * 0.25);
      tooth.rotation.x = -a;
      this.camBarrel.add(tooth);
    }
    this.chassis.add(this.camBarrel);

    // 3 Asymmetric Drop-Forge Trip-Hammers & Brass-Capped Anvils
    const hammerXs = [-1.15, 0.0, 1.15];
    const anvilGeo = new THREE.BoxGeometry(0.62, 0.55, 0.62);
    const anvilCapGeo = new THREE.BoxGeometry(0.54, 0.12, 0.54);
    const armGeo = new THREE.BoxGeometry(0.18, 0.16, 1.35);
    const headGeo = new THREE.BoxGeometry(0.46, 0.54, 0.44);

    for (let i = 0; i < hammerXs.length; i++) {
      const hx = hammerXs[i];
      const anvil = new THREE.Mesh(anvilGeo, this.materials.forgedIron);
      anvil.position.set(hx, -2.08, 1.15);
      anvil.castShadow = true;
      anvil.receiveShadow = true;

      const cap = new THREE.Mesh(anvilCapGeo, this.materials.agedBrass);
      cap.position.set(hx, -1.76, 1.15);
      this.chassis.add(anvil, cap);

      const pivot = new THREE.Group();
      pivot.position.set(hx, -1.48, 2.25);

      const arm = new THREE.Mesh(armGeo, this.materials.surgicalChrome);
      arm.position.set(0, 0, -0.58);
      const head = new THREE.Mesh(headGeo, this.materials.forgedIron);
      head.position.set(0, -0.16, -1.1);
      head.castShadow = true;

      pivot.add(arm, head);
      this.chassis.add(pivot);

      this.dropHammers.push({
        pivot,
        headWorldX: hx,
        headWorldZ: 1.15,
        angle: 0.12,
        vel: 0,
        cockedTarget: 0,
      });
    }
  }

  /**
   * DISTRICT 2: Twin Babbage Analytical Cipher Towers (x = ±1.95m)
   * framing the open 3.2m central atrium with 48 engraved brass digit wheels
   * and 48 surgical-chrome carry-levers.
   */
  private buildBabbageCipherTowers(): void {
    const pierGeo = new THREE.BoxGeometry(0.36, 5.2, 0.36);
    const buttressCoords: [number, number][] = [
      [-2.55, 1.65],
      [-2.55, -1.65],
      [2.55, 1.65],
      [2.55, -1.65],
    ];
    for (const [bx, bz] of buttressCoords) {
      const pier = new THREE.Mesh(pierGeo, this.materials.forgedIron);
      pier.position.set(bx, 0.85, bz);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.chassis.add(pier);
    }

    const shaftGeo = new THREE.CylinderGeometry(0.055, 0.055, 3.8, 14);
    const colCoords: [number, number][] = [
      [-1.95, 0.95],
      [-1.95, 0.0],
      [-1.95, -0.95],
      [1.95, 0.95],
      [1.95, 0.0],
      [1.95, -0.95],
    ];

    for (let c = 0; c < colCoords.length; c++) {
      const [cx, cz] = colCoords[c];
      const shaft = new THREE.Mesh(shaftGeo, this.materials.surgicalChrome);
      shaft.position.set(cx, 1.25, cz);
      this.chassis.add(shaft);

      for (let r = 0; r < 8; r++) {
        const wy = -0.25 + r * 0.42;
        this.babbageStates.push({
          colIdx: c,
          rowIdx: r,
          x: cx,
          y: wy,
          z: cz,
          angle: c * 0.7 + r * 0.628,
          targetAngle: c * 0.7 + r * 0.628,
          carryKick: 0,
        });
      }
    }

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 10);
    this.babbageWheelMesh = new THREE.InstancedMesh(
      wheelGeo,
      this.materials.brassInstanced,
      this.babbageStates.length,
    );
    this.babbageWheelMesh.castShadow = true;
    this.babbageWheelMesh.receiveShadow = true;

    const leverGeo = new THREE.BoxGeometry(0.28, 0.05, 0.07);
    this.babbageLeverMesh = new THREE.InstancedMesh(
      leverGeo,
      this.materials.surgicalChrome,
      this.babbageStates.length,
    );

    const col = new THREE.Color();
    for (let i = 0; i < this.babbageStates.length; i++) {
      const shade = 0.85 + ((i * 7) % 5) * 0.06;
      col.setRGB(shade, shade * 0.96, shade * 0.88);
      this.babbageWheelMesh.setColorAt(i, col);
    }

    this.chassis.add(this.babbageWheelMesh, this.babbageLeverMesh);
  }

  /**
   * DISTRICT 3: Overhead Jacquard Punched-Card Loom Bridge & Shuttle Carriage
   * spanning the nave at y = +2.95m (houses the SnorriCam POV mount!).
   */
  private buildJacquardLoomBridge(): void {
    const railGeo = new THREE.CylinderGeometry(0.05, 0.05, 5.2, 14).rotateZ(
      Math.PI / 2,
    );
    const railFront = new THREE.Mesh(railGeo, this.materials.surgicalChrome);
    railFront.position.set(0, 2.95, 0.62);
    const railBack = new THREE.Mesh(railGeo, this.materials.surgicalChrome);
    railBack.position.set(0, 2.95, 0.12);
    this.chassis.add(railFront, railBack);

    this.shuttleCarriage.position.set(0, 2.95, 0.37);
    const carriageFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.36, 0.72),
      this.materials.forgedIron,
    );
    const brassCollar = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.12, 0.78),
      this.materials.agedBrass,
    );
    brassCollar.position.y = 0.18;
    this.shuttleCarriage.add(carriageFrame, brassCollar);
    this.chassis.add(this.shuttleCarriage);

    const prismGeo = new THREE.CylinderGeometry(0.26, 0.26, 2.75, 6).rotateZ(
      Math.PI / 2,
    );
    this.jacquardPrism = new THREE.Mesh(prismGeo, this.materials.boneCarapace);
    this.jacquardPrism.position.set(0, 2.48, 0.37);
    this.jacquardPrism.castShadow = true;
    this.chassis.add(this.jacquardPrism);

    const needleGeo = new THREE.CylinderGeometry(0.024, 0.018, 0.55, 8);
    this.jacquardNeedleMesh = new THREE.InstancedMesh(
      needleGeo,
      this.materials.surgicalChrome,
      16,
    );
    this.chassis.add(this.jacquardNeedleMesh);
  }

  /**
   * DISTRICT 4: Asymmetric 24-Pipe Chromatic Quartz Clavilux Light-Organ Crown.
   */
  private buildLightOrganCrown(): void {
    const chestLeft = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.42, 3.8),
      this.materials.forgedIron,
    );
    chestLeft.position.set(-2.05, 3.38, -0.35);
    chestLeft.castShadow = true;

    const chestRight = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.42, 3.4),
      this.materials.forgedIron,
    );
    chestRight.position.set(2.05, 3.12, -0.2);
    chestRight.castShadow = true;

    const rearArch = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.48, 1.15),
      this.materials.forgedIron,
    );
    rearArch.position.set(0, 3.55, -1.65);
    rearArch.castShadow = true;

    this.chassis.add(chestLeft, chestRight, rearArch);

    for (let i = 0; i < 24; i++) {
      let px = 0;
      let py = 3.55;
      let pz = -1.65;
      let radius = 0.14;
      let height = 2.4;

      if (i < 10) {
        const row = i % 2;
        const idx = Math.floor(i / 2);
        px = -2.35 + row * 0.56;
        pz = -1.85 + idx * 0.78;
        py = 3.58;
        radius = 0.17 - i * 0.004;
        height = 3.45 - idx * 0.36 - row * 0.18;
      } else if (i < 16) {
        const k = i - 10;
        px = -1.35 + k * 0.54;
        pz = -1.68 - (k % 2) * 0.26;
        py = 3.78;
        radius = 0.135;
        height = 2.95 - Math.abs(k - 2.5) * 0.28;
      } else {
        const k = i - 16;
        const row = k % 2;
        const idx = Math.floor(k / 2);
        px = 1.75 + row * 0.52;
        pz = -1.45 + idx * 0.76;
        py = 3.32;
        radius = 0.105 - k * 0.003;
        height = 1.95 - idx * 0.22;
      }

      this.organPipes.push({
        x: px,
        yBase: py,
        z: pz,
        radius,
        height,
        glow: 0.03,
        louverOpen: 0.05,
        color: new THREE.Color(0x090b10),
      });
    }

    const pipeUnitGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
    this.organPipeMesh = new THREE.InstancedMesh(
      pipeUnitGeo,
      this.materials.lightOrganPipeInstanced,
      24,
    );
    this.organPipeMesh.castShadow = true;

    const louverGeo = new THREE.CylinderGeometry(1.18, 1.05, 0.14, 12);
    this.organLouverMesh = new THREE.InstancedMesh(
      louverGeo,
      this.materials.agedBrass,
      24,
    );

    for (let i = 0; i < 24; i++) {
      this.organPipeMesh.setColorAt(i, this.organPipes[i].color);
    }

    this.chassis.add(this.organPipeMesh, this.organLouverMesh);
  }

  /**
   * DISTRICT 5: Central 3-Ring Counter-Rotating Dichroic Astrolabe & Brake Shoes
   * suspended inside the open interior atrium at (0, 1.38, -0.15).
   */
  private buildCentralAstrolabe(): void {
    this.astrolabeGroup.position.set(0, 1.38, -0.15);

    this.astrolabeRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.055, 14, 48),
      this.materials.agedBrass,
    );
    this.astrolabeRingMid = new THREE.Mesh(
      new THREE.TorusGeometry(0.94, 0.045, 14, 40),
      this.materials.surgicalChrome,
    );
    this.astrolabeRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.038, 12, 32),
      this.materials.agedBrass,
    );

    this.dichroicCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 1),
      this.materials.visceralFilament,
    );

    const shoeGeo = new THREE.BoxGeometry(0.24, 0.52, 0.28);
    this.brakeCaliperL = new THREE.Mesh(shoeGeo, this.materials.forgedIron);
    this.brakeCaliperL.position.set(-1.38, 0, 0);
    this.brakeCaliperR = new THREE.Mesh(shoeGeo, this.materials.forgedIron);
    this.brakeCaliperR.position.set(1.38, 0, 0);

    this.astrolabeGroup.add(
      this.astrolabeRingOuter,
      this.astrolabeRingMid,
      this.astrolabeRingInner,
      this.dichroicCore,
      this.brakeCaliperL,
      this.brakeCaliperR,
    );
    this.chassis.add(this.astrolabeGroup);
  }

  /**
   * DISTRICT 6: Asymmetric Lateral Accordion Bellows Lung-Vats & Overhead Crane Cables.
   */
  private buildBellowsAndGantryCables(): void {
    const pleatGeo = new THREE.BoxGeometry(0.92, 0.11, 1.45);
    this.bellowsLeft = new THREE.InstancedMesh(
      pleatGeo,
      this.materials.boneCarapace,
      10,
    );
    this.bellowsRight = new THREE.InstancedMesh(
      pleatGeo,
      this.materials.boneCarapace,
      8,
    );
    this.chassis.add(this.bellowsLeft, this.bellowsRight);

    const stackGroup = new THREE.Group();
    stackGroup.position.set(-3.15, 2.25, -1.1);
    stackGroup.rotation.z = 0.14;
    const stackPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 2.8, 16),
      this.materials.forgedIron,
    );
    const stackCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.22, 0.35, 16),
      this.materials.agedBrass,
    );
    stackCrown.position.y = 1.45;
    stackGroup.add(stackPipe, stackCrown);
    this.chassis.add(stackGroup);

    const linkGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
    this.cableMesh = new THREE.InstancedMesh(
      linkGeo,
      this.materials.surgicalChrome,
      8 * 14,
    );
    this.worldGroup.add(this.cableMesh);
  }

  private buildSparkPool(): void {
    const sparkGeo = new THREE.BoxGeometry(0.032, 0.032, 0.22);
    this.sparkMesh = new THREE.InstancedMesh(
      sparkGeo,
      this.materials.sparkEmissive,
      220,
    );
    this.sparkMesh.frustumCulled = false;

    const c = new THREE.Color(1, 0.85, 0.6);
    for (let i = 0; i < 220; i++) {
      this.sparks.push({
        alive: false,
        pos: new THREE.Vector3(0, -99, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.4,
      });
      this.sparkMesh.setColorAt(i, c);
    }
    this.worldGroup.add(this.sparkMesh);
  }

  private emitSparks(
    originX: number,
    originY: number,
    originZ: number,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      s.alive = true;
      s.pos.set(originX, originY, originZ);
      const theta = Math.random() * Math.PI * 2;
      const up = 0.2 + Math.random() * 0.9;
      s.vel.set(
        Math.cos(theta) * speed * (0.4 + Math.random()),
        up * speed * 0.75,
        Math.sin(theta) * speed * (0.4 + Math.random()),
      );
      s.life = 0;
      s.maxLife = 0.24 + Math.random() * 0.44;
    }
  }

  private ignitePipe(pipeIdx: number, midi: number, energy: number): void {
    const idx = ((pipeIdx % 24) + 24) % 24;
    const p = this.organPipes[idx];
    const hex = midiToColorHex(midi);
    p.glow = Math.min(2.8, Math.max(p.glow, 0.55 + energy * 1.85));
    p.louverOpen = Math.min(1.0, Math.max(p.louverOpen, 0.45 + energy * 0.55));
    this.tmpColor.setHex(hex).multiplyScalar(p.glow);
    p.color.copy(this.tmpColor);

    this.organGlow = Math.min(1.8, Math.max(this.organGlow, energy * 1.1));
    this.spectralHueNorm = (((midi % 12) + 12) % 12) / 12;
  }

  /**
   * Pre-stroke mechanical cocking: raises drop-forge trip-hammers & inflates bellows!
   */
  applyAnticipation(cue: AnticipationCue): void {
    if (
      cue.targetSubsystem === 'sub-rupture' ||
      cue.targetSubsystem === 'core-implode'
    ) {
      const idx = Math.floor(Math.random() * 3);
      this.dropHammers[idx].cockedTarget = -0.68 * cue.intensity;
      this.bellowsTarget = Math.min(
        1.0,
        this.bellowsTarget + 0.45 * cue.intensity,
      );
      this.behavioralState = 'FORGE_WINDUP';
    } else if (cue.targetSubsystem === 'spine-shear') {
      for (const h of this.dropHammers) {
        h.cockedTarget = -0.52 * cue.intensity;
      }
      this.behavioralState = 'UNISON_COCKED';
    }
  }

  /**
   * Direct causal mechanical actuation for every voice in SynthRack!
   */
  applyImpulse(event: ImpulseEvent): void {
    const e = event.velocity;
    const pitch = event.midiNote ?? Math.round(53 + Math.log2(Math.max(0.25, event.pitchRatio)) * 12);

    this.structuralStress = Math.min(1.2, this.structuralStress + e * 0.14);
    this.kineticEnergy = Math.min(1.8, this.kineticEnergy + e * 0.26);

    switch (event.subsystem) {
      case 'sub-rupture': {
        const hIdx = Math.abs(Math.round(pitch)) % 3;
        const h = this.dropHammers[hIdx];
        h.cockedTarget = 0;
        h.vel = 16.5 * e;
        this.chassisHeaveVel -= 2.4 * e;
        this.railVelZ += (hIdx === 1 ? -1.4 : 1.1) * e;
        this.strobePulse = Math.min(1.5, this.strobePulse + e * 0.9);
        this.anvilHeat = Math.min(1.4, this.anvilHeat + e * 0.55);
        this.behavioralState = 'DROP_FORGE_IMPACT';
        this.emitSparks(
          h.headWorldX,
          -1.72,
          this.railPosZ + h.headWorldZ,
          Math.floor(26 * e),
          6.8,
        );
        this.ignitePipe(0, 29, e * 0.9);
        this.ignitePipe(1, 29, e * 0.8);
        break;
      }

      case 'spine-shear': {
        for (const h of this.dropHammers) {
          h.cockedTarget = 0;
          h.vel = 14.0 * e;
          this.emitSparks(
            h.headWorldX,
            -1.72,
            this.railPosZ + h.headWorldZ,
            14,
            6.2,
          );
        }
        this.chassisHeaveVel += 2.1 * e;
        this.strobePulse = Math.min(1.4, this.strobePulse + e * 0.7);
        this.behavioralState = 'TRIPLE_HAMMER_SHEAR';
        break;
      }

      case 'piston-snap':
      case 'modal-clang':
      case 'fin-cascade': {
        const count = event.subsystem === 'fin-cascade' ? 6 : 3;
        for (let k = 0; k < count; k++) {
          const w =
            this.babbageStates[
              (this.babbageCursor + k) % this.babbageStates.length
            ];
          w.targetAngle += (Math.PI * 2) / 10; // Exact 36-deg decimal wheel click!
          w.carryKick = 1.0;
        }
        this.babbageCursor =
          (this.babbageCursor + count) % this.babbageStates.length;

        if (event.subsystem === 'modal-clang') {
          this.ignitePipe(midiToPipeIndex(pitch + 12), pitch, e * 0.95);
          this.behavioralState = 'BABBAGE_CHIME_CARRY';
        }
        break;
      }

      case 'break-shred': {
        const slice = event.sliceIndex ?? 0;
        this.prismTargetAngle += Math.PI / 3;
        this.shuttleTargetX = ((slice % 8) / 3.5 - 1.0) * 1.65;
        this.needleExtension[slice % 16] = 1.0;
        this.needleExtension[(slice + 8) % 16] = 0.85 * e;
        this.astrolabeSpeed = Math.min(9.5, this.astrolabeSpeed + 1.4 * e);
        this.behavioralState = 'JACQUARD_CARD_FEED';

        if (e > 0.72) {
          this.emitSparks(this.shuttleX, 2.75, this.railPosZ + 0.37, 10, 4.5);
        }
        break;
      }

      case 'larynx-lead': {
        const pIdx = midiToPipeIndex(pitch);
        this.ignitePipe(pIdx, pitch, Math.max(0.85, e * 1.25));
        this.ignitePipe((pIdx + 12) % 24, pitch, e * 0.7);
        this.bellowsTarget = Math.min(1.0, this.bellowsTarget + 0.25 * e);
        this.behavioralState = 'CLAVILUX_SOLO_REED';
        break;
      }

      case 'bellows-choir': {
        this.bellowsTarget = Math.min(1.0, 0.55 + e * 0.45);
        const notes =
          event.chordNotes && event.chordNotes.length > 0
            ? event.chordNotes
            : [pitch, pitch + 4, pitch + 7, pitch + 11];
        for (const n of notes) {
          this.ignitePipe(midiToPipeIndex(n), n, e * 1.05);
          this.ignitePipe((midiToPipeIndex(n) + 8) % 24, n, e * 0.7);
        }
        this.behavioralState = 'LIGHT_ORGAN_PLENUM';
        break;
      }

      case 'windup-inhale': {
        this.bellowsTarget = 0.95;
        this.astrolabeSpeed = Math.min(11.0, this.astrolabeSpeed + 2.2 * e);
        this.behavioralState = 'BELLOWS_INTAKE';
        break;
      }

      case 'arc-discharge': {
        this.brakeClamped = Math.min(1.0, e);
        this.arcFlash = Math.min(1.6, this.arcFlash + e * 1.1);
        this.emitSparks(-1.25, 1.38, this.railPosZ - 0.15, 14, 5.4);
        this.emitSparks(1.25, 1.38, this.railPosZ - 0.15, 14, 5.4);
        this.behavioralState = 'ASTROLABE_ARC_CLAMP';
        break;
      }

      case 'core-implode': {
        this.chassisHeaveVel += 3.2 * e;
        this.astrolabeSpeed = 12.0;
        this.arcFlash = 1.6;
        this.strobePulse = 1.5;
        for (let i = 0; i < 24; i += 2) {
          this.ignitePipe(i, pitch + i, e * 1.25);
        }
        this.emitSparks(0, 1.38, this.railPosZ - 0.15, 65, 9.2);
        this.behavioralState = 'CATHEDRAL_OVERDRIVE';
        break;
      }
    }
  }

  update(
    dt: number,
    elapsed: number,
    opts: BabbageUpdateOptions,
  ): ImpulseEvent | null {
    const h = opts.stutterFreeze
      ? 0.0005
      : Math.min(0.033, Math.max(0.001, dt));

    // Decay telemetry & shader uniforms
    this.structuralStress = Math.max(
      this.pointerStrain * 0.5,
      this.structuralStress * Math.exp(-2.2 * h),
    );
    this.kineticEnergy *= Math.exp(-3.4 * h);
    this.arcFlash *= Math.exp(-7.5 * h);
    this.strobePulse *= Math.exp(-9.0 * h);
    this.organGlow *= Math.exp(-3.6 * h);
    this.anvilHeat *= Math.exp(-2.5 * h);

    // Push physical state into custom TSL shader uniforms!
    this.materials.uniforms.stress.value = this.structuralStress;
    this.materials.uniforms.arcFlash.value = this.arcFlash;
    this.materials.uniforms.larynxGlow.value = 0.18 + this.organGlow * 0.9;
    this.materials.uniforms.anvilHeat.value = this.anvilHeat;
    this.materials.uniforms.time.value = elapsed;

    // Dramatic section lifts (Act III Levitation / Act IV Brake-Lock)
    const targetLev =
      opts.sectionId === 'larynx-aria' || opts.sectionId === 'act3-dialogues'
        ? 0.68
        : 0.0;
    this.levitationLift +=
      (targetLev - this.levitationLift) * (1 - Math.exp(-2.5 * h));
    if (opts.hardLock) {
      this.brakeClamped = 1.0;
      this.behavioralState = 'BRAKE_DEAD_LOCK';
    }

    // 1. Locomotive rail motion & suspension heave
    const targetCruiseZ = opts.hardLock
      ? this.railPosZ
      : Math.sin(elapsed * 0.24) * 1.65 + this.pointerX * 0.4;
    this.railVelZ +=
      ((targetCruiseZ - this.railPosZ) * 4.5 - this.railVelZ * 3.8) * h;
    this.railPosZ += this.railVelZ * h;

    this.chassisHeaveVel +=
      (-140 * this.chassisHeaveY - 14 * this.chassisHeaveVel) * h;
    this.chassisHeaveY += this.chassisHeaveVel * h;

    this.chassis.position.set(
      0,
      this.chassisHeaveY + this.levitationLift * 0.58,
      this.railPosZ,
    );
    this.chassis.rotation.z =
      Math.sin(elapsed * 0.9) * 0.008 + this.chassisHeaveY * 0.04;

    const wheelAngle = this.railPosZ / 0.46;
    for (const w of this.railWheels) {
      w.rotation.x = wheelAngle;
    }

    // Rotate front cam-barrel & integrate 3 Drop-Forge Trip-Hammers
    if (!opts.hardLock) {
      this.camBarrel.rotation.x =
        elapsed * (2.6 + this.kineticEnergy * 3.8);
    }
    for (const hm of this.dropHammers) {
      if (hm.cockedTarget < -0.02) {
        hm.angle += (hm.cockedTarget - hm.angle) * (1 - Math.exp(-16 * h));
      } else {
        hm.vel += (38 - hm.angle * 95 - hm.vel * 10) * h;
        hm.angle += hm.vel * h;
        if (hm.angle > 0.26) {
          hm.angle = 0.26;
          hm.vel = -Math.abs(hm.vel) * 0.28;
        }
      }
      hm.pivot.rotation.x = hm.angle;
    }

    // 2. Update 48 Brass Babbage Cipher Wheels & Carry-Levers (with architectural spread!)
    const spreadX = opts.explodeAmount * 0.55;
    for (let i = 0; i < this.babbageStates.length; i++) {
      const bw = this.babbageStates[i];
      bw.angle += (bw.targetAngle - bw.angle) * (1 - Math.exp(-26 * h));
      bw.carryKick *= Math.exp(-11 * h);

      const signX = bw.x < 0 ? -1 : 1;
      const wx = bw.x + signX * spreadX;

      this.dummy.position.set(wx, bw.y, bw.z);
      this.dummy.rotation.set(0, bw.angle, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.babbageWheelMesh.setMatrixAt(i, this.dummy.matrix);

      const inwardSign = -signX;
      this.dummy.position.set(
        wx + inwardSign * (0.28 + bw.carryKick * 0.11),
        bw.y + 0.14 + bw.carryKick * 0.06,
        bw.z,
      );
      this.dummy.rotation.set(0, 0, inwardSign * bw.carryKick * 0.48);
      this.dummy.updateMatrix();
      this.babbageLeverMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.babbageWheelMesh.instanceMatrix.needsUpdate = true;
    this.babbageLeverMesh.instanceMatrix.needsUpdate = true;

    // 3. Update Overhead Jacquard Shuttle Carriage & 16 Sensing Needles
    this.shuttleX +=
      (this.shuttleTargetX - this.shuttleX) * (1 - Math.exp(-24 * h));
    this.shuttleCarriage.position.x = this.shuttleX;

    this.prismAngle +=
      (this.prismTargetAngle - this.prismAngle) * (1 - Math.exp(-22 * h));
    this.jacquardPrism.rotation.x = this.prismAngle;

    for (let i = 0; i < 16; i++) {
      this.needleExtension[i] *= Math.exp(-15 * h);
      const nx = -1.2 + i * 0.16;
      const plunge = this.needleExtension[i] * 0.24;
      this.dummy.position.set(nx, 2.92 - plunge, 0.37);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.jacquardNeedleMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.jacquardNeedleMesh.instanceMatrix.needsUpdate = true;

    // 4. Update 24 Chromatic Quartz Light-Organ Pipes & Brass Louvers
    for (let i = 0; i < 24; i++) {
      const p = this.organPipes[i];
      p.glow *= Math.exp(-4.6 * h);
      p.louverOpen *= Math.exp(-4.0 * h);

      const liftY = opts.explodeAmount * 0.35;
      this.dummy.position.set(p.x, p.yBase + liftY + p.height * 0.5, p.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(p.radius, p.height, p.radius);
      this.dummy.updateMatrix();
      this.organPipeMesh.setMatrixAt(i, this.dummy.matrix);

      if (p.glow > 0.02) {
        this.tmpColor.copy(p.color).multiplyScalar(0.35 + p.glow * 0.65);
      } else {
        this.tmpColor.setRGB(0.02, 0.025, 0.035);
      }
      this.organPipeMesh.setColorAt(i, this.tmpColor);

      this.dummy.position.set(
        p.x,
        p.yBase + liftY + p.height + 0.09 + p.louverOpen * 0.08,
        p.z,
      );
      this.dummy.rotation.set(-p.louverOpen * 0.92, i * 0.4, 0);
      this.dummy.scale.set(p.radius, 1, p.radius);
      this.dummy.updateMatrix();
      this.organLouverMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.organPipeMesh.instanceMatrix.needsUpdate = true;
    if (this.organPipeMesh.instanceColor) {
      this.organPipeMesh.instanceColor.needsUpdate = true;
    }
    this.organLouverMesh.instanceMatrix.needsUpdate = true;

    // 5. Update Central 3-Ring Counter-Rotating Dichroic Astrolabe & Brake Shoes
    this.brakeClamped *= Math.exp(-6.0 * h);
    const effectiveSpin =
      this.astrolabeSpeed * (1 - Math.min(0.98, this.brakeClamped));
    this.astrolabeSpeed = Math.max(
      1.1 + this.kineticEnergy * 2.5,
      this.astrolabeSpeed * Math.exp(-1.8 * h),
    );

    this.astrolabeRingOuter.rotation.y += effectiveSpin * h;
    this.astrolabeRingOuter.rotation.x = Math.sin(elapsed * 0.7) * 0.32;

    this.astrolabeRingMid.rotation.x -= effectiveSpin * 1.35 * h;
    this.astrolabeRingMid.rotation.z += effectiveSpin * 0.65 * h;

    this.astrolabeRingInner.rotation.z += effectiveSpin * 1.9 * h;
    this.astrolabeRingInner.rotation.y -= effectiveSpin * 1.1 * h;

    this.dichroicCore.rotation.y -= effectiveSpin * 2.1 * h;
    this.dichroicCore.rotation.x += effectiveSpin * 1.4 * h;
    const coreScale =
      1.0 + this.kineticEnergy * 0.22 + this.levitationLift * 0.22;
    this.dichroicCore.scale.setScalar(coreScale);

    this.brakeCaliperL.position.x = -1.42 + this.brakeClamped * 0.16;
    this.brakeCaliperR.position.x = 1.42 - this.brakeClamped * 0.16;

    // 6. Update Lateral Accordion Bellows Lung-Vats & Overhead Gantry Cables
    this.bellowsTarget = Math.max(
      0.18 + opts.explodeAmount * 0.55,
      this.bellowsTarget * Math.exp(-2.2 * h),
    );
    this.bellowsInflation +=
      (this.bellowsTarget - this.bellowsInflation) * (1 - Math.exp(-10 * h));

    const leftSpan = 0.85 + this.bellowsInflation * 0.95;
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      this.dummy.position.set(-3.12 - spreadX, 0.35 + t * leftSpan, 0.45);
      this.dummy.rotation.set(0, 0, Math.sin(t * Math.PI) * 0.08);
      const flare = 1 + Math.sin(t * Math.PI) * this.bellowsInflation * 0.24;
      this.dummy.scale.set(flare, 1, flare);
      this.dummy.updateMatrix();
      this.bellowsLeft.setMatrixAt(i, this.dummy.matrix);
    }
    this.bellowsLeft.instanceMatrix.needsUpdate = true;

    const rightSpan = 0.7 + this.bellowsInflation * 0.8;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      this.dummy.position.set(3.08 + spreadX, 0.55 + t * rightSpan, -0.35);
      this.dummy.rotation.set(0, 0, -Math.sin(t * Math.PI) * 0.08);
      const flare = 1 + Math.sin(t * Math.PI) * this.bellowsInflation * 0.22;
      this.dummy.scale.set(flare, 1, flare);
      this.dummy.updateMatrix();
      this.bellowsRight.setMatrixAt(i, this.dummy.matrix);
    }
    this.bellowsRight.instanceMatrix.needsUpdate = true;

    const anchorsMachine: [number, number, number][] = [
      [-2.55, 3.45, 1.65],
      [2.55, 3.45, 1.65],
      [-2.55, 3.45, -1.65],
      [2.55, 3.45, -1.65],
      [-3.12, 2.2, 0.45],
      [3.08, 2.0, -0.35],
      [-1.55, 3.9, -1.65],
      [1.55, 3.9, -1.65],
    ];
    const anchorsVault: [number, number, number][] = [
      [-6.5, 9.2, 4.8],
      [6.5, 9.2, 4.8],
      [-6.5, 9.2, -5.2],
      [6.5, 9.2, -5.2],
      [-9.2, 8.4, 1.2],
      [9.2, 8.4, -1.2],
      [-4.2, 11.5, -6.5],
      [4.2, 11.5, -6.5],
    ];

    let cIdx = 0;
    const cy = this.chassis.position.y;
    const cz = this.chassis.position.z;
    for (let c = 0; c < 8; c++) {
      const [mx, my, mz] = anchorsMachine[c];
      const [vx, vy, vz] = anchorsVault[c];
      const sx = mx;
      const sy = my + cy;
      const sz = mz + cz;

      for (let s = 0; s < 14; s++) {
        const t0 = s / 14;
        const t1 = (s + 1) / 14;
        const sag0 = Math.sin(t0 * Math.PI) * 0.38;
        const sag1 = Math.sin(t1 * Math.PI) * 0.38;

        const p0x = sx + (vx - sx) * t0;
        const p0y = sy + (vy - sy) * t0 - sag0;
        const p0z = sz + (vz - sz) * t0;

        const p1x = sx + (vx - sx) * t1;
        const p1y = sy + (vy - sy) * t1 - sag1;
        const p1z = sz + (vz - sz) * t1;

        this.tmpDir.set(p1x - p0x, p1y - p0y, p1z - p0z);
        const segLen = Math.max(0.001, this.tmpDir.length());
        this.dummy.position.set(
          (p0x + p1x) * 0.5,
          (p0y + p1y) * 0.5,
          (p0z + p1z) * 0.5,
        );
        this.dummy.quaternion.setFromUnitVectors(
          this.upVec,
          this.tmpDir.normalize(),
        );
        this.dummy.scale.set(1, segLen, 1);
        this.dummy.updateMatrix();
        this.cableMesh.setMatrixAt(cIdx++, this.dummy.matrix);
      }
    }
    this.cableMesh.instanceMatrix.needsUpdate = true;

    // 7. Integrate Ballistic Floor-Bouncing Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.alive) {
        this.dummy.position.set(0, -99, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      sp.life += h;
      if (sp.life >= sp.maxLife) {
        sp.alive = false;
        this.dummy.position.set(0, -99, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      sp.vel.y -= 18.5 * h;
      sp.pos.addScaledVector(sp.vel, h);
      if (sp.pos.y < -2.32) {
        sp.pos.y = -2.32;
        sp.vel.y = Math.abs(sp.vel.y) * 0.46;
        sp.vel.x *= 0.78;
        sp.vel.z *= 0.78;
      }

      this.dummy.position.copy(sp.pos);
      this.tmpDir.copy(sp.vel);
      if (this.tmpDir.lengthSq() > 0.001) {
        this.dummy.lookAt(
          sp.pos.x + sp.vel.x,
          sp.pos.y + sp.vel.y,
          sp.pos.z + sp.vel.z,
        );
      }
      const fade = 1 - sp.life / sp.maxLife;
      this.dummy.scale.set(fade, fade, fade * 1.45);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    return null;
  }

  dispose(): void {
    this.worldGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  }
}
