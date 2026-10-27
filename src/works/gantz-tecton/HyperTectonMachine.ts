import * as THREE from 'three/webgpu';
import type { AnticipationCue, ImpulseEvent } from '../../engine/core/types';
import type { SonobjetMaterialRig } from '../../engine/render/TSLMaterials';
import type { VaultMorphMode } from '../../kit/environment/SurrealCyberVault';

export type MorphStateId = VaultMorphMode;

const MORPH_STATES: MorphStateId[] = [
  'FOLDED_MONOLITH',
  'CANTILEVER_STRIKER',
  'INVERTED_CATHEDRAL',
  'NON_EUCLIDEAN_HELIX',
  'QUANTIZED_SHATTER',
  'SINGULARITY_CROWN',
];

interface FaultClusterState {
  extrude: number;
  extrudeVel: number;
  shear: number;
  shearTarget: number;
  stretchZ: number;
  stretchX: number;
  flipQuant: number;
  flipCurrent: number;
  glow: number;
  color: THREE.Color;
}

interface StrikerBoom {
  baseGroup: THREE.Group;
  shoulderGroup: THREE.Group;
  elbowGroup: THREE.Group;
  wristTip: THREE.Object3D;
  homeAzimuth: number;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  cockLift: number;
  strikeFlash: number;
}

interface TargetAnvilState {
  basePos: THREE.Vector3;
  livePos: THREE.Vector3;
  recoil: number;
  glow: number;
  color: THREE.Color;
}

interface VoxelParticle {
  alive: boolean;
  orbitMode: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleX: number;
  scaleZ: number;
  color: THREE.Color;
}

const PITCH_PALETTE: Record<number, number> = {
  5: 0xff6224, // F  -> Molten Tungsten-Orange
  6: 0x20ffd8, // Gb -> Liquid Acid Cyan-Mint
  7: 0xffbe30, // G  -> Xenon Gold
  8: 0x3f96ff, // Ab -> Cobalt Plasma
  10: 0xff3674, // Bb -> Crimson Laser
  0: 0xffffff, // C  -> Blinding Surgical White
  1: 0x36e6ff, // Db -> Crystalline Ice Blue
  3: 0xc974ff, // Eb -> Ultraviolet Quartz
};

function midiToHex(midi: number): number {
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_PALETTE[pc] ?? 0x88ccff;
}

export interface HyperTectonAnchors {
  coreRoot: THREE.Object3D;
  primaryBoomTip: THREE.Object3D;
  morphState: MorphStateId;
  /** Current outer characteristic radius of the megastructure (3.2m .. 16.5m) */
  envelopeRadius: number;
  /** Current navigable interior hollow radius when open (0.8m .. 7.8m) */
  interiorRadius: number;
  /** Current vertical span (3.8m .. 15.0m) */
  verticalSpan: number;
}

export interface HyperUpdateOptions {
  explodeAmount: number;
  hardLock: boolean;
  stutterFreeze: boolean;
  sectionId: string;
  bar: number;
  step16: number;
}

/**
 * HYPER // TECTON — Surreal Non-Euclidean Metamorphic Sound Megastructure.
 *
 * Inspired by Alex Rutterford's *Gantz Graf* and Chris Cunningham's
 * *Second Bad Vilbel* / *All Is Full of Love* / *Monkey Drummer* (non-anthropomorphic):
 * - 4,092+ dynamic articulated & GPU-deformed geometric elements
 * - Coupled 6-State Macro-Morphology State Machine + 16 Fault-Cluster Sub-State Machines
 * - 6 Sleek White-Ceramic & Mirror-Chrome Robotic Striker Booms whipping across 24 floating resonant plates
 * - Non-Euclidean GPU TSL vertex twisting, spatial slice-shearing, and non-uniform stretching
 */
export class HyperTectonMachine {
  public readonly worldGroup = new THREE.Group();
  public readonly coreRoot = new THREE.Group();

  // Macro-Morphology State Machine weights w[0..5] summing to 1.0
  private activeMorphState: MorphStateId = 'FOLDED_MONOLITH';
  private readonly morphWeights = new Float32Array([1, 0, 0, 0, 0, 0]);
  private morphSlewRate = 2.6;

  // 16 Independent Tectonic Fault-Cluster Sub-State Machines!
  private readonly clusters: FaultClusterState[] = [];
  private clusterCursor = 0;

  // Instanced Sub-Assemblies (4,056 instanced + 36 boom parts = 4,092 parts!)
  private readonly PLATE_COUNT = 1344; // 16 clusters x 84 micro-plates
  private readonly SPINE_COUNT = 768; // 16 clusters x 48 telescoping chrome needles
  private readonly GYRO_COUNT = 512; // 16 clusters x 32 fractal gyro-arc blades
  private readonly CONDUIT_COUNT = 384; // 16 clusters x 24 spectral plasma veins
  private readonly TARGET_COUNT = 24; // 24 floating resonant striker anvils
  private readonly VOXEL_COUNT = 1024; // 1,024 quantized glitch-voxels & vectors

  private plateMesh!: THREE.InstancedMesh;
  private spineMesh!: THREE.InstancedMesh;
  private gyroMesh!: THREE.InstancedMesh;
  private conduitMesh!: THREE.InstancedMesh;
  private targetMesh!: THREE.InstancedMesh;
  private voxelMesh!: THREE.InstancedMesh;

  // Central Non-Euclidean Hyper-Singularity Core
  private singularityCore!: THREE.Mesh;
  private innerGimbalA!: THREE.Mesh;
  private innerGimbalB!: THREE.Mesh;

  // 6 Cunningham Multi-Jointed Robotic Striker Booms
  private readonly booms: StrikerBoom[] = [];
  private readonly targets: TargetAnvilState[] = [];
  private readonly voxels: VoxelParticle[] = [];
  private voxelCursor = 0;

  // Live Telemetry & Shader/PostFX Drivers
  private structuralStress = 0;
  private kineticEnergy = 0;
  private arcFlash = 0;
  private strobePulse = 0;
  private spectralGlow = 0;
  private acidEnergy = 0;
  private glitchBurst = 0;
  private twistAmount = 0;
  private spectralHueNorm = 0.55;
  private pointerStrain = 0;
  private pointerX = 0;
  private pointerY = 0;

  private envelopeRadius = 3.4;
  private interiorRadius = 1.0;
  private verticalSpan = 4.0;

  // Precomputed parametric seeds per element for fast 60fps 4,000+ matrix synthesis
  private readonly plateSeeds: Float32Array;
  private readonly spineSeeds: Float32Array;
  private readonly gyroSeeds: Float32Array;
  private readonly conduitSeeds: Float32Array;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();
  private readonly tmpVec = new THREE.Vector3();

  constructor(private readonly materials: SonobjetMaterialRig) {
    this.worldGroup.add(this.coreRoot);

    this.plateSeeds = this.buildParametricSeeds(this.PLATE_COUNT, 101);
    this.spineSeeds = this.buildParametricSeeds(this.SPINE_COUNT, 202);
    this.gyroSeeds = this.buildParametricSeeds(this.GYRO_COUNT, 303);
    this.conduitSeeds = this.buildParametricSeeds(this.CONDUIT_COUNT, 404);

    this.initClusters();
    this.buildSingularityCore();
    this.buildInstancedAssemblies();
    this.buildCunninghamStrikerBooms();
    this.buildVoxelSwarm();
  }

  private buildParametricSeeds(count: number, salt: number): Float32Array {
    // 4 floats per item: [u (0..1), v (0..1), w (-1..1), aspectType (0..1)]
    const arr = new Float32Array(count * 4);
    const phi = 1.61803398875;
    for (let i = 0; i < count; i++) {
      arr[i * 4 + 0] = i / Math.max(1, count - 1);
      arr[i * 4 + 1] = ((i * phi + salt * 0.13) % 1 + 1) % 1;
      arr[i * 4 + 2] = Math.sin(i * 12.9898 + salt) * 0.99;
      arr[i * 4 + 3] = ((i * 7 + salt) % 11) / 10;
    }
    return arr;
  }

  private initClusters(): void {
    for (let c = 0; c < 16; c++) {
      this.clusters.push({
        extrude: 0,
        extrudeVel: 0,
        shear: 0,
        shearTarget: 0,
        stretchZ: 1,
        stretchX: 1,
        flipQuant: 0,
        flipCurrent: 0,
        glow: 0.05,
        color: new THREE.Color(0x285588),
      });
    }
  }

  private buildSingularityCore(): void {
    this.singularityCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 2),
      this.materials.visceralFilament,
    );
    this.innerGimbalA = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.042, 16, 64),
      this.materials.surgicalChrome,
    );
    this.innerGimbalB = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.032, 14, 64),
      this.materials.boneCarapace,
    );
    this.coreRoot.add(this.singularityCore, this.innerGimbalA, this.innerGimbalB);
  }

  private buildInstancedAssemblies(): void {
    // 1. 1,344 Tectonic Micro-Plates & Lamellae (precision beveled wafers)
    const plateGeo = new THREE.BoxGeometry(0.38, 0.065, 0.52);
    this.plateMesh = new THREE.InstancedMesh(
      plateGeo,
      this.materials.tectonicPlateInstanced,
      this.PLATE_COUNT,
    );
    this.plateMesh.castShadow = true;
    this.plateMesh.receiveShadow = true;
    this.plateMesh.frustumCulled = false;

    const c = new THREE.Color();
    for (let i = 0; i < this.PLATE_COUNT; i++) {
      // Alternate stark Cunningham white-ceramic wafers with matte Gantz-Graf obsidian & titanium!
      const tier = i % 7;
      if (tier === 0 || tier === 3) {
        c.setRGB(0.88, 0.92, 0.98); // Cunningham stark white ceramic!
      } else if (tier === 1) {
        c.setRGB(0.42, 0.48, 0.58); // Machined gunmetal
      } else {
        c.setRGB(0.08, 0.095, 0.125); // Matte obsidian graphite
      }
      this.plateMesh.setColorAt(i, c);
    }

    // 2. 768 Telescoping Surgical-Chrome Needles & Splines
    const spineGeo = new THREE.BoxGeometry(0.028, 0.028, 0.95);
    this.spineMesh = new THREE.InstancedMesh(
      spineGeo,
      this.materials.surgicalChrome,
      this.SPINE_COUNT,
    );
    this.spineMesh.frustumCulled = false;

    // 3. 512 Segmented Fractal Gyro-Arcs & Blades
    const gyroGeo = new THREE.BoxGeometry(0.58, 0.035, 0.14);
    this.gyroMesh = new THREE.InstancedMesh(
      gyroGeo,
      this.materials.brassInstanced,
      this.GYRO_COUNT,
    );
    this.gyroMesh.frustumCulled = false;
    for (let i = 0; i < this.GYRO_COUNT; i++) {
      const bright = i % 3 === 0 ? 1.15 : 0.72;
      c.setRGB(bright, bright * 0.95, bright * 0.88);
      this.gyroMesh.setColorAt(i, c);
    }

    // 4. 384 Spectral Plasma, Acid & Crystalline Light Conduits
    const conduitGeo = new THREE.BoxGeometry(0.048, 0.85, 0.048);
    this.conduitMesh = new THREE.InstancedMesh(
      conduitGeo,
      this.materials.lightOrganPipeInstanced,
      this.CONDUIT_COUNT,
    );
    this.conduitMesh.frustumCulled = false;
    c.setRGB(0.04, 0.06, 0.1);
    for (let i = 0; i < this.CONDUIT_COUNT; i++) {
      this.conduitMesh.setColorAt(i, c);
    }

    // 5. 24 Floating Resonant Target Anvil-Slabs (struck by Cunningham Robotic Booms!)
    const targetGeo = new THREE.CylinderGeometry(0.36, 0.32, 0.08, 6);
    this.targetMesh = new THREE.InstancedMesh(
      targetGeo,
      this.materials.lightOrganPipeInstanced,
      this.TARGET_COUNT,
    );
    this.targetMesh.frustumCulled = false;

    for (let t = 0; t < this.TARGET_COUNT; t++) {
      const az = (t / this.TARGET_COUNT) * Math.PI * 2;
      const ring = t % 3;
      const r = 2.6 + ring * 0.95;
      const y = (ring - 1) * 1.25;
      const bp = new THREE.Vector3(Math.cos(az) * r, y, Math.sin(az) * r);
      const col = new THREE.Color(0x0c1420);
      this.targets.push({
        basePos: bp,
        livePos: bp.clone(),
        recoil: 0,
        glow: 0.06,
        color: col,
      });
      this.targetMesh.setColorAt(t, col);
    }

    this.coreRoot.add(
      this.plateMesh,
      this.spineMesh,
      this.gyroMesh,
      this.conduitMesh,
      this.targetMesh,
    );
  }

  /**
   * 6 Sleek Cunningham Multi-Jointed Robotic Striker Booms
   * (Glossy white ceramic shells + surgical chrome tendons + glowing striker mallets!)
   */
  private buildCunninghamStrikerBooms(): void {
    const upperShroudGeo = new THREE.BoxGeometry(0.14, 0.16, 1.85);
    const upperRodGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.0, 10).rotateX(
      Math.PI * 0.5,
    );
    const foreArmGeo = new THREE.BoxGeometry(0.085, 0.095, 1.75);
    const jointSphereGeo = new THREE.SphereGeometry(0.13, 14, 12);
    const malletGeo = new THREE.OctahedronGeometry(0.14, 1);

    for (let b = 0; b < 6; b++) {
      const az = (b / 6) * Math.PI * 2 + 0.26;
      const baseGroup = new THREE.Group();
      baseGroup.position.set(
        Math.cos(az) * 1.35,
        (b % 2 === 0 ? 0.55 : -0.55),
        Math.sin(az) * 1.35,
      );

      const shoulderJoint = new THREE.Mesh(
        jointSphereGeo,
        this.materials.agedBrass,
      );
      baseGroup.add(shoulderJoint);

      const shoulderGroup = new THREE.Group();
      const upperShroud = new THREE.Mesh(
        upperShroudGeo,
        this.materials.boneCarapace,
      );
      upperShroud.position.z = 0.92;
      upperShroud.castShadow = true;

      const upperRod = new THREE.Mesh(
        upperRodGeo,
        this.materials.surgicalChrome,
      );
      upperRod.position.set(0, 0.09, 0.95);
      shoulderGroup.add(upperShroud, upperRod);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.set(0, 0, 1.85);

      const elbowJoint = new THREE.Mesh(
        jointSphereGeo,
        this.materials.surgicalChrome,
      );
      const foreArm = new THREE.Mesh(foreArmGeo, this.materials.boneCarapace);
      foreArm.position.z = 0.88;
      foreArm.castShadow = true;

      const wristTip = new THREE.Mesh(
        malletGeo,
        this.materials.visceralFilament,
      );
      wristTip.position.set(0, 0, 1.78);

      elbowGroup.add(elbowJoint, foreArm, wristTip);
      shoulderGroup.add(elbowGroup);
      baseGroup.add(shoulderGroup);
      this.coreRoot.add(baseGroup);

      const initTarget = this.targets[(b * 4) % this.TARGET_COUNT].basePos.clone();
      this.booms.push({
        baseGroup,
        shoulderGroup,
        elbowGroup,
        wristTip,
        homeAzimuth: az,
        targetPos: initTarget.clone(),
        currentPos: initTarget.clone(),
        cockLift: 0,
        strikeFlash: 0,
      });
    }
  }

  private buildVoxelSwarm(): void {
    const voxGeo = new THREE.BoxGeometry(0.065, 0.065, 0.24);
    this.voxelMesh = new THREE.InstancedMesh(
      voxGeo,
      this.materials.sparkEmissive,
      this.VOXEL_COUNT,
    );
    this.voxelMesh.frustumCulled = false;

    const c = new THREE.Color(1, 0.95, 0.85);
    for (let i = 0; i < this.VOXEL_COUNT; i++) {
      // Seed half as ambient orbital micro-debris so space feels hyper-detailed immediately!
      const isAmbient = i < 384;
      const theta = (i / 384) * Math.PI * 24;
      const r = 2.2 + (i % 17) * 0.48;
      this.voxels.push({
        alive: isAmbient,
        orbitMode: isAmbient,
        pos: new THREE.Vector3(
          Math.cos(theta) * r,
          ((i % 23) - 11) * 0.32,
          Math.sin(theta) * r,
        ),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
        scaleX: 0.7 + (i % 5) * 0.35,
        scaleZ: 0.5 + (i % 7) * 0.55,
        color: c.clone(),
      });
      this.voxelMesh.setColorAt(i, c);
    }
    this.worldGroup.add(this.voxelMesh);
  }

  private emitBurstVoxels(
    origin: THREE.Vector3,
    count: number,
    speed: number,
    hexColor: number,
    needleStretch = 1.0,
  ): void {
    const startIdx = 384; // Keep 0..383 as persistent orbital flux field!
    const poolLen = this.VOXEL_COUNT - startIdx;
    for (let i = 0; i < count; i++) {
      const idx = startIdx + ((this.voxelCursor + i) % poolLen);
      const v = this.voxels[idx];
      v.alive = true;
      v.orbitMode = false;
      v.pos.copy(origin);
      const az = Math.random() * Math.PI * 2;
      const el = (Math.random() - 0.5) * Math.PI;
      const sp = speed * (0.45 + Math.random() * 0.95);
      v.vel.set(
        Math.cos(el) * Math.cos(az) * sp,
        Math.sin(el) * sp,
        Math.cos(el) * Math.sin(az) * sp,
      );
      v.life = 0;
      v.maxLife = 0.22 + Math.random() * 0.48;
      v.scaleX = 0.65;
      v.scaleZ = 1.2 * needleStretch;
      v.color.setHex(hexColor);
    }
    this.voxelCursor = (this.voxelCursor + count) % poolLen;
  }

  /**
   * Explicitly command a Macro-Morphology State transition!
   */
  setMorphState(state: MorphStateId, slewRate = 2.6): void {
    this.activeMorphState = state;
    this.morphSlewRate = slewRate;
  }

  getMorphState(): MorphStateId {
    return this.activeMorphState;
  }

  getCameraAnchors(): HyperTectonAnchors {
    return {
      coreRoot: this.coreRoot,
      primaryBoomTip: this.booms[0]?.wristTip ?? this.coreRoot,
      morphState: this.activeMorphState,
      envelopeRadius: this.envelopeRadius,
      interiorRadius: this.interiorRadius,
      verticalSpan: this.verticalSpan,
    };
  }

  getActiveInstanceCount(): number {
    return 4092;
  }

  getStructuralStress(): number {
    return this.structuralStress;
  }

  getKineticEnergy(): number {
    return this.kineticEnergy;
  }

  getBehavioralState(): string {
    return this.activeMorphState;
  }

  getArcFlash(): number {
    return this.arcFlash;
  }

  getStrobePulse(): number {
    return this.strobePulse;
  }

  getSpectralGlow(): number {
    return this.spectralGlow;
  }

  getAcidEnergy(): number {
    return this.acidEnergy;
  }

  getGlitchBurst(): number {
    return this.glitchBurst;
  }

  getSpectralHueNorm(): number {
    return this.spectralHueNorm;
  }

  setPointerStrain(
    x: number,
    y: number,
    tension: number,
    active: boolean,
  ): void {
    this.pointerStrain = active ? tension : 0;
    this.pointerX = x;
    this.pointerY = y;
  }

  applyAnticipation(cue: AnticipationCue): void {
    if (
      cue.targetSubsystem === 'sub-rupture' ||
      cue.targetSubsystem === 'spine-shear' ||
      cue.targetSubsystem === 'core-implode'
    ) {
      // Cock Cunningham robotic striker booms high up & pull fault-clusters inward before detonation!
      for (let i = 0; i < this.booms.length; i++) {
        if (cue.targetSubsystem === 'spine-shear' || i % 2 === 0) {
          this.booms[i].cockLift = 1.45 * cue.intensity;
        }
      }
      for (const cl of this.clusters) {
        cl.extrudeVel -= 3.8 * cue.intensity;
      }
    }
  }

  applyImpulse(event: ImpulseEvent): void {
    const e = event.velocity;
    const midi =
      event.midiNote ??
      Math.round(53 + Math.log2(Math.max(0.25, event.pitchRatio)) * 12);
    const hex = midiToHex(midi);

    this.structuralStress = Math.min(1.4, this.structuralStress + e * 0.14);
    this.kineticEnergy = Math.min(2.0, this.kineticEnergy + e * 0.24);

    switch (event.subsystem) {
      case 'sub-rupture': {
        // Slam 2 opposing robotic striker booms onto resonant plates + radial shockwave!
        const bA = Math.abs(midi) % 6;
        const bB = (bA + 3) % 6;
        for (const bi of [bA, bB]) {
          const tIdx = (bi * 4 + (Math.abs(midi) % 4)) % this.TARGET_COUNT;
          const tgt = this.targets[tIdx];
          this.booms[bi].cockLift = 0;
          this.booms[bi].targetPos.copy(tgt.livePos);
          this.booms[bi].currentPos.lerp(tgt.livePos, 0.82);
          this.booms[bi].strikeFlash = 1.4 * e;
          tgt.recoil = 1.35 * e;
          tgt.glow = 2.4 * e;
          tgt.color.setHex(0xff6b26);
          this.emitBurstVoxels(tgt.livePos, Math.floor(24 * e), 11.5, 0xff9a44, 1.8);
        }
        for (let c = 0; c < 16; c += 2) {
          this.clusters[c].extrudeVel += 12.5 * e;
          this.clusters[c].stretchX = 1.85;
        }
        this.strobePulse = Math.min(1.6, this.strobePulse + e * 0.95);
        break;
      }

      case 'spine-shear': {
        // Gantz-Graf fault-plane lateral shear + 90-degree plate snap!
        for (let c = 0; c < 16; c++) {
          const dir = c % 2 === 0 ? 1 : -1;
          this.clusters[c].shearTarget =
            this.clusters[c].shearTarget > 0.2 ? -0.85 * dir : 0.85 * dir;
          this.clusters[c].flipQuant += Math.PI * 0.5 * dir;
          this.clusters[c].stretchZ = 2.4 * e;
        }
        const bIdx = (this.clusterCursor++) % 6;
        const tIdx = (bIdx * 4 + 1) % this.TARGET_COUNT;
        this.booms[bIdx].cockLift = 0;
        this.booms[bIdx].targetPos.copy(this.targets[tIdx].livePos);
        this.targets[tIdx].recoil = 1.1 * e;
        this.targets[tIdx].glow = 2.0 * e;
        this.targets[tIdx].color.setHex(0xd8ecff);
        this.strobePulse = Math.min(1.5, this.strobePulse + e * 0.75);
        this.glitchBurst = Math.min(1.2, this.glitchBurst + e * 0.45);
        break;
      }

      case 'break-shred':
      case 'fin-cascade':
      case 'piston-snap': {
        // Shoot specific cluster chrome needles & micro-plates outward!
        const slice = (event.sliceIndex ?? this.clusterCursor++) % 16;
        const cl = this.clusters[slice];
        cl.extrudeVel += (event.subsystem === 'break-shred' ? 15.0 : 9.5) * e;
        cl.stretchZ = 1.0 + e * 2.6;
        if (event.reverse) {
          cl.flipQuant -= Math.PI * 0.5;
          this.glitchBurst = Math.min(1.3, this.glitchBurst + 0.55 * e);
        }
        // Whip a nimble robotic boom to a neighboring plate!
        const bIdx = slice % 6;
        const tIdx = (slice + 5) % this.TARGET_COUNT;
        this.booms[bIdx].targetPos.copy(this.targets[tIdx].livePos);
        break;
      }

      case 'modal-clang': {
        // Strike crystalline chime target + ripple cluster!
        const tIdx = Math.abs(midi - 48) % this.TARGET_COUNT;
        const bIdx = tIdx % 6;
        const tgt = this.targets[tIdx];
        this.booms[bIdx].targetPos.copy(tgt.livePos);
        tgt.recoil = 0.9 * e;
        tgt.glow = 2.2 * e;
        tgt.color.setHex(hex);

        const cl = this.clusters[tIdx % 16];
        cl.glow = Math.max(cl.glow, 1.6 * e);
        cl.color.setHex(hex);
        this.spectralGlow = Math.min(1.8, this.spectralGlow + e * 0.55);
        this.spectralHueNorm = (((midi % 12) + 12) % 12) / 12;
        break;
      }

      case 'acid-squelch': {
        // Liquid non-Euclidean twist surge + toxic emerald/cyan plasma veins!
        this.acidEnergy = Math.min(1.8, this.acidEnergy + e * 1.15);
        this.twistAmount = Math.min(2.2, this.twistAmount + e * 0.75);
        const cIdx = Math.abs(midi) % 16;
        for (const off of [0, 4, 8, 12]) {
          const cl = this.clusters[(cIdx + off) % 16];
          cl.glow = 2.4 * e;
          cl.color.setHex(0x1effd5);
          cl.stretchX = 0.45;
          cl.stretchZ = 2.8;
        }
        break;
      }

      case 'glass-armonica': {
        // Ethereal ultraviolet / ice-blue crystalline halo expansion!
        this.spectralGlow = Math.min(2.0, this.spectralGlow + e * 0.95);
        this.spectralHueNorm = 0.62;
        for (let c = 0; c < 16; c += 3) {
          this.clusters[c].glow = Math.max(this.clusters[c].glow, 1.9 * e);
          this.clusters[c].color.setHex(0x8be8ff);
        }
        break;
      }

      case 'glitch-chirp': {
        // Instantaneous spatial vertex slice-glitch & razor-needle stretch!
        this.glitchBurst = Math.min(1.6, this.glitchBurst + e * 1.15);
        const cIdx = (event.sliceIndex ?? 0) % 16;
        const cl = this.clusters[cIdx];
        cl.stretchZ = 4.6;
        cl.stretchX = 0.22;
        cl.flipQuant += Math.PI;
        cl.glow = 2.6;
        cl.color.setHex(0xffffff);
        this.emitBurstVoxels(
          this.tmpVec.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
          ),
          18,
          16.0,
          0x99f2ff,
          3.4,
        );
        break;
      }

      case 'larynx-lead': {
        const cIdx = Math.abs(midi - 53) % 16;
        for (const off of [0, 8]) {
          const cl = this.clusters[(cIdx + off) % 16];
          cl.glow = Math.max(cl.glow, 2.2 * e);
          cl.color.setHex(hex);
          cl.extrudeVel += 5.5 * e;
        }
        this.spectralGlow = Math.min(2.0, this.spectralGlow + e * 0.85);
        this.spectralHueNorm = (((midi % 12) + 12) % 12) / 12;
        break;
      }

      case 'bellows-choir': {
        const notes =
          event.chordNotes && event.chordNotes.length > 0
            ? event.chordNotes
            : [midi, midi + 4, midi + 7, midi + 11];
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          const cl = this.clusters[(i * 3 + Math.abs(n)) % 16];
          cl.glow = Math.max(cl.glow, 1.95 * e);
          cl.color.setHex(midiToHex(n));
        }
        this.spectralGlow = Math.min(2.2, this.spectralGlow + e * 1.1);
        break;
      }

      case 'arc-discharge':
      case 'core-implode': {
        this.arcFlash = Math.min(1.8, this.arcFlash + e * 1.25);
        if (event.subsystem === 'core-implode') {
          this.strobePulse = Math.min(1.6, this.strobePulse + e * 0.8);
          this.emitBurstVoxels(this.tmpVec.set(0, 0, 0), 42, 14.0, hex, 2.2);
        }
        break;
      }
    }
  }

  /**
   * Auto-advances the Macro-Morphology State Machine based on musical phrasing,
   * while allowing continuous interpolation across all 4,092 parts!
   */
  private updateMorphologyStateMachine(opts: HyperUpdateOptions): void {
    const bar = opts.bar;
    if (opts.hardLock) {
      this.setMorphState('QUANTIZED_SHATTER', 12.0);
      return;
    }

    switch (opts.sectionId) {
      case 'stasis-seed':
        // Bars 0..5: Tight folded precision monolith; Bar 6: cracks open into Cantilever Striker!
        if (bar < 6) this.setMorphState('FOLDED_MONOLITH', 2.4);
        else this.setMorphState('CANTILEVER_STRIKER', 3.2);
        break;

      case 'asymmetric-loom':
        // Alternates smoothly every 8 bars between Cantilever Striker & Non-Euclidean Helix!
        if (bar < 20) this.setMorphState('CANTILEVER_STRIKER', 2.8);
        else this.setMorphState('NON_EUCLIDEAN_HELIX', 2.2);
        break;

      case 'larynx-aria':
        // Bars 28..43: Peels inside-out into the vast hollow INVERTED_CATHEDRAL!
        // Bars 44..47: Pure floating Cathedral suspension
        // Bars 48..51 (The 4-bar Deconstruction Bridge!): Spirals through Helix into Shatter!
        if (bar < 48) {
          this.setMorphState('INVERTED_CATHEDRAL', 1.8);
        } else if (bar < 50) {
          this.setMorphState('NON_EUCLIDEAN_HELIX', 3.0);
        } else {
          this.setMorphState('QUANTIZED_SHATTER', 3.8);
        }
        break;

      case 'flywheel-cadenza':
        // Bars 52..59: Quantized Shatter Lattice; Bars 60..63: Imploding Helix Riser -> Folded Lock!
        if (bar < 60) {
          this.setMorphState('QUANTIZED_SHATTER', 6.5);
        } else if (bar === 63 && opts.step16 >= 8) {
          // 2-beat pre-drop silence: sudden hyper-compressed Monolith implosion!
          this.setMorphState('FOLDED_MONOLITH', 14.0);
        } else {
          this.setMorphState('NON_EUCLIDEAN_HELIX', 3.5);
        }
        break;

      case 'apex-convergence':
        // Bars 64..71: SINGULARITY_CROWN; Bars 72..79: Second grand pass morphing Crown <-> Inverted Cathedral!
        if (bar < 72) {
          this.setMorphState('SINGULARITY_CROWN', 4.2);
        } else if (bar < 76) {
          this.setMorphState('INVERTED_CATHEDRAL', 2.6);
        } else {
          this.setMorphState('SINGULARITY_CROWN', 3.2);
        }
        break;

      default:
        // Act VI (Bars 80..95): Gradual entropic folding from Cathedral -> Monolith stillness!
        if (bar < 88) {
          this.setMorphState('INVERTED_CATHEDRAL', 1.4);
        } else {
          this.setMorphState('FOLDED_MONOLITH', 1.2);
        }
        break;
    }
  }

  update(
    dt: number,
    elapsed: number,
    opts: HyperUpdateOptions,
  ): ImpulseEvent | null {
    this.updateMorphologyStateMachine(opts);

    // Freeze time during stutter or Beat-4 cadenza dead-stops!
    const isCadenzaDeadStop =
      opts.sectionId === 'flywheel-cadenza' &&
      opts.bar < 60 &&
      opts.step16 >= 12;
    const frozen = opts.stutterFreeze || opts.hardLock || isCadenzaDeadStop;
    const h = frozen ? 0.0004 : Math.min(0.033, Math.max(0.001, dt));

    // Blend Macro-Morphology weights w[0..5]
    const targetIdx = MORPH_STATES.indexOf(this.activeMorphState);
    const morphAlpha = 1 - Math.exp(-this.morphSlewRate * h);
    let wSum = 0;
    for (let m = 0; m < 6; m++) {
      const goal = m === targetIdx ? 1.0 : 0.0;
      this.morphWeights[m] += (goal - this.morphWeights[m]) * morphAlpha;
      wSum += this.morphWeights[m];
    }
    if (wSum > 0.0001) {
      for (let m = 0; m < 6; m++) this.morphWeights[m] /= wSum;
    }

    const wMono = this.morphWeights[0];
    const wCant = this.morphWeights[1];
    const wCath = this.morphWeights[2];
    const wHelix = this.morphWeights[3];
    const wShatter = this.morphWeights[4];
    const wCrown = this.morphWeights[5];

    // Export live characteristic dimensions for Morph-Following Camera!
    this.envelopeRadius =
      wMono * 2.8 +
      wCant * 6.8 +
      wCath * 10.5 +
      wHelix * 5.2 +
      wShatter * 8.6 +
      wCrown * 11.8 +
      opts.explodeAmount * 2.5;
    this.interiorRadius =
      wMono * 0.7 +
      wCant * 2.2 +
      wCath * 6.4 +
      wHelix * 2.4 +
      wShatter * 4.2 +
      wCrown * 6.8;
    this.verticalSpan =
      (wMono * 3.6 +
        wCant * 5.2 +
        wCath * 11.0 +
        wHelix * 14.5 +
        wShatter * 9.5 +
        wCrown * 12.5) *
      (1.0 + this.pointerY * this.pointerStrain * 0.28);

    // Decay physical & post-FX drivers
    this.structuralStress = Math.max(
      this.pointerStrain * 0.65,
      this.structuralStress * Math.exp(-2.4 * h),
    );
    this.kineticEnergy *= Math.exp(-3.2 * h);
    this.arcFlash *= Math.exp(-7.5 * h);
    this.strobePulse *= Math.exp(-9.0 * h);
    this.spectralGlow *= Math.exp(-3.2 * h);
    this.acidEnergy *= Math.exp(-4.5 * h);
    this.glitchBurst *= Math.exp(-8.5 * h);
    this.twistAmount *= Math.exp(-2.6 * h);

    // Push Non-Euclidean GPU Vertex Deformation Uniforms into TSLMaterials!
    const netTwist =
      wHelix * 1.45 +
      wCrown * 0.65 +
      this.twistAmount * 0.85 +
      this.pointerX * this.pointerStrain * 1.2;
    this.materials.uniforms.stress.value = this.structuralStress;
    this.materials.uniforms.arcFlash.value = this.arcFlash;
    this.materials.uniforms.larynxGlow.value = 0.2 + this.spectralGlow * 0.95;
    this.materials.uniforms.anvilHeat.value = this.strobePulse;
    this.materials.uniforms.time.value = elapsed;
    this.materials.uniforms.nonEuclideanTwist.value = netTwist;
    this.materials.uniforms.spatialGlitch.value =
      this.glitchBurst + (isCadenzaDeadStop ? 0.35 : 0.0);
    this.materials.uniforms.acousticRipple.value =
      this.spectralGlow * 0.7 + this.acidEnergy * 0.9;

    // Step 16 Fault-Cluster Sub-State Machines
    for (let c = 0; c < 16; c++) {
      const cl = this.clusters[c];
      cl.extrudeVel += (-165 * cl.extrude - 15 * cl.extrudeVel) * h;
      cl.extrude = Math.max(-0.4, Math.min(3.5, cl.extrude + cl.extrudeVel * h));
      cl.shear += (cl.shearTarget - cl.shear) * (1 - Math.exp(-22 * h));
      cl.shearTarget *= Math.exp(-3.5 * h);
      cl.stretchZ += (1.0 - cl.stretchZ) * (1 - Math.exp(-12 * h));
      cl.stretchX += (1.0 - cl.stretchX) * (1 - Math.exp(-12 * h));
      cl.flipCurrent +=
        (cl.flipQuant - cl.flipCurrent) * (1 - Math.exp(-24 * h));
      cl.glow *= Math.exp(-4.2 * h);
    }

    // Rotate Central Singularity Hyper-Prism
    if (!frozen) {
      const spin = 1.2 + this.kineticEnergy * 2.8 + wCrown * 2.2;
      this.singularityCore.rotation.y += spin * h;
      this.singularityCore.rotation.x += spin * 0.73 * h;
      this.innerGimbalA.rotation.x -= spin * 1.4 * h;
      this.innerGimbalA.rotation.z += spin * 0.8 * h;
      this.innerGimbalB.rotation.y -= spin * 1.9 * h;
    }
    const coreScale =
      0.85 + wCath * 0.55 + wCrown * 0.75 + this.strobePulse * 0.32;
    this.singularityCore.scale.setScalar(coreScale);
    this.innerGimbalA.scale.setScalar(1.0 + wCath * 0.8 + wCrown * 1.1);
    this.innerGimbalB.scale.setScalar(1.0 + wCath * 1.1 + wCrown * 1.45);

    const spreadBoost = 1.0 + opts.explodeAmount * 0.65 + this.pointerStrain * 0.45;

    // =========================================================================
    // SYNTHESIZE ALL 1,344 TECTONIC MICRO-PLATES ACROSS THE 6 MORPH STATES!
    // =========================================================================
    for (let i = 0; i < this.PLATE_COUNT; i++) {
      const clIdx = i & 15;
      const cl = this.clusters[clIdx];
      const u = this.plateSeeds[i * 4 + 0];
      const v = this.plateSeeds[i * 4 + 1];
      const w = this.plateSeeds[i * 4 + 2];
      const asp = this.plateSeeds[i * 4 + 3];

      const theta = v * Math.PI * 2;
      const phi = (u - 0.5) * Math.PI;

      // State 0: FOLDED_MONOLITH (Stepped asymmetric Gantz-Graf hyper-cube!)
      const sideX = w >= 0 ? 1 : -1;
      const monoX =
        sideX * (0.65 + ((i % 9) / 8) * 1.15) + cl.shear * 0.45;
      const monoY = (u - 0.5) * 3.4 + (clIdx % 3 - 1) * 0.12;
      const monoZ = ((v - 0.5) * 3.1) + cl.extrude * 0.35 * sideX;

      // State 1: CANTILEVER_STRIKER (Wide sweeping asymmetric horizontal wings!)
      const wingSign = clIdx % 2 === 0 ? 1 : -1;
      const cantX = wingSign * (1.6 + u * 5.8) + cl.extrude * wingSign * 0.7;
      const cantY = (v - 0.5) * 3.8 + Math.sin(u * 8 + elapsed * 2.2) * 0.42;
      const cantZ = w * 2.2 + cl.shear * 0.8;

      // State 2: INVERTED_CATHEDRAL (18m hollow inside-out spherical rib vault!)
      const cathR = 8.4 + (i % 5) * 0.55 + cl.extrude * 0.65;
      const cathAz = theta + elapsed * (clIdx % 2 === 0 ? 0.12 : -0.09);
      const cathX = Math.cos(phi) * Math.cos(cathAz) * cathR;
      const cathY = Math.sin(phi) * cathR * 0.82 + 0.6;
      const cathZ = Math.cos(phi) * Math.sin(cathAz) * cathR;

      // State 3: NON_EUCLIDEAN_HELIX (3 intertwined counter-rotating vertical strands!)
      const strand = i % 3;
      const helixAngle =
        u * Math.PI * 7.0 + (strand * Math.PI * 2) / 3 + elapsed * 1.35;
      const helixR = 2.1 + Math.sin(u * Math.PI) * 2.4 + cl.extrude * 0.5;
      const helixX = Math.cos(helixAngle) * helixR;
      const helixY = (u - 0.5) * 13.8;
      const helixZ = Math.sin(helixAngle) * helixR;

      // State 4: QUANTIZED_SHATTER (Cubic 0.85m snap-grid explosion!)
      const qStep = 0.88;
      const shatX =
        Math.round((Math.cos(theta) * (2.5 + u * 5.5)) / qStep) * qStep +
        cl.shear * 1.1;
      const shatY = Math.round(((u - 0.5) * 8.4) / qStep) * qStep;
      const shatZ =
        Math.round((Math.sin(theta) * (2.5 + v * 5.5)) / qStep) * qStep +
        cl.extrude * 0.9;

      // State 5: SINGULARITY_CROWN (Multi-ring orbital Dyson torus + radial spires!)
      const crownR = (i % 2 === 0 ? 9.6 : 4.6) + cl.extrude * 0.95;
      const crownAz = theta + elapsed * (i % 2 === 0 ? 0.28 : -0.45);
      const crownX = Math.cos(crownAz) * crownR;
      const crownY =
        (u - 0.5) * (i % 2 === 0 ? 9.5 : 4.2) +
        Math.sin(crownAz * 3) * 0.85;
      const crownZ = Math.sin(crownAz) * crownR;

      const px =
        (monoX * wMono +
          cantX * wCant +
          cathX * wCath +
          helixX * wHelix +
          shatX * wShatter +
          crownX * wCrown) *
        spreadBoost;
      const py =
        monoY * wMono +
        cantY * wCant +
        cathY * wCath +
        helixY * wHelix +
        shatY * wShatter +
        crownY * wCrown;
      const pz =
        (monoZ * wMono +
          cantZ * wCant +
          cathZ * wCath +
          helixZ * wHelix +
          shatZ * wShatter +
          crownZ * wCrown) *
        spreadBoost;

      this.dummy.position.set(px, py, pz);
      this.dummy.rotation.set(
        cl.flipCurrent * 0.5 + phi * (wCath + wCrown),
        theta * (1 - wMono) + cl.shear * 0.4,
        wHelix * 0.75 + (asp > 0.7 ? Math.PI * 0.5 : 0),
      );

      // Non-uniform surreal scale morphing!
      const sx =
        (0.65 + asp * 1.45) *
        cl.stretchX *
        (1 + wCath * 0.85 + wShatter * (i % 3 === 0 ? 2.2 : 0.35));
      const sy = 0.75 + (i % 4) * 0.45 + wMono * 0.5;
      const sz =
        (0.7 + (1 - asp) * 1.6) *
        cl.stretchZ *
        (1 + wCant * 0.65 + this.glitchBurst * (i % 5 === 0 ? 2.5 : 0));

      this.dummy.scale.set(sx, sy, sz);
      this.dummy.updateMatrix();
      this.plateMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.plateMesh.instanceMatrix.needsUpdate = true;

    // =========================================================================
    // 2. SYNTHESIZE 768 TELESCOPING SURGICAL-CHROME NEEDLES & MICRO-SPINES
    // =========================================================================
    for (let i = 0; i < this.SPINE_COUNT; i++) {
      const clIdx = i & 15;
      const cl = this.clusters[clIdx];
      const u = this.spineSeeds[i * 4 + 0];
      const v = this.spineSeeds[i * 4 + 1];
      const theta = v * Math.PI * 2 + elapsed * (i % 2 === 0 ? 0.18 : -0.15);
      const elev = (u - 0.5) * Math.PI * 0.92;

      const baseR =
        wMono * 1.45 +
        wCant * (2.2 + u * 3.8) +
        wCath * 6.8 +
        wHelix * 2.6 +
        wShatter * 4.8 +
        wCrown * 7.4 +
        cl.extrude * 0.95;

      const rx = Math.cos(elev) * Math.cos(theta) * baseR * spreadBoost;
      const ry =
        Math.sin(elev) * baseR * (1 - wHelix * 0.5) +
        wHelix * (u - 0.5) * 13.0;
      const rz = Math.cos(elev) * Math.sin(theta) * baseR * spreadBoost;

      this.dummy.position.set(rx, ry, rz);
      // In Inverted Cathedral, needles point INWARD toward the singularity!
      if (wCath + wCrown > 0.45) {
        this.dummy.lookAt(0, 0.4, 0);
      } else {
        this.dummy.lookAt(rx * 2, ry * 2, rz * 2);
      }

      const needleLen =
        0.55 +
        cl.extrude * 1.35 +
        cl.stretchZ * 0.85 +
        wShatter * 1.8 +
        (i % 6) * 0.25;
      this.dummy.scale.set(1.0, 1.0, needleLen);
      this.dummy.updateMatrix();
      this.spineMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.spineMesh.instanceMatrix.needsUpdate = true;

    // =========================================================================
    // 3. SYNTHESIZE 512 FRACTAL GYRO-ARCS & CHIME BLADES
    // =========================================================================
    for (let i = 0; i < this.GYRO_COUNT; i++) {
      const clIdx = i & 15;
      const cl = this.clusters[clIdx];
      const gAsp = this.gyroSeeds[i * 4 + 3];
      const shell = i % 8; // 8 nested non-coplanar gyroscopic shells!
      const segAngle =
        ((i >> 3) / (this.GYRO_COUNT / 8)) * Math.PI * 2 +
        elapsed * (shell % 2 === 0 ? 0.55 : -0.72) * (1 + shell * 0.12);

      const shellR =
        (1.35 + shell * 0.46) *
          (wMono * 0.72 +
            wCant * 1.15 +
            wCath * 1.85 +
            wHelix * 0.95 +
            wShatter * 1.55 +
            wCrown * 2.05) +
        cl.extrude * 0.35;

      const tiltX = shell * 0.39 + Math.sin(elapsed * 0.35 + shell) * 0.42;
      const lx = Math.cos(segAngle) * shellR;
      const lz = Math.sin(segAngle) * shellR;
      const ly = Math.sin(tiltX) * lz * 0.65 + (wHelix * (shell - 3.5) * 1.45);
      const rz = Math.cos(tiltX) * lz;

      this.dummy.position.set(lx, ly, rz);
      this.dummy.rotation.set(tiltX, -segAngle, cl.flipCurrent * 0.25);
      this.dummy.scale.set(
        (0.65 + gAsp * 0.9) + wCath * 0.9 + cl.stretchX * 0.35,
        1.0 + this.acidEnergy * 0.8,
        1.0 + cl.glow * 0.4,
      );
      this.dummy.updateMatrix();
      this.gyroMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.gyroMesh.instanceMatrix.needsUpdate = true;

    // =========================================================================
    // 4. SYNTHESIZE 384 SPECTRAL PLASMA, ACID & GLASS CONDUITS
    // =========================================================================
    for (let i = 0; i < this.CONDUIT_COUNT; i++) {
      const clIdx = i & 15;
      const cl = this.clusters[clIdx];
      const u = this.conduitSeeds[i * 4 + 0];
      const v = this.conduitSeeds[i * 4 + 1];

      const angle =
        v * Math.PI * 2 +
        u * (wHelix * 6.0 + wCrown * 3.0) +
        elapsed * 0.24;
      const rad =
        (1.05 + (i % 4) * 0.65) *
        (wMono * 0.9 +
          wCant * 1.6 +
          wCath * 2.75 +
          wHelix * 1.35 +
          wShatter * 2.1 +
          wCrown * 3.1);

      const cx = Math.cos(angle) * rad;
      const cy = (u - 0.5) * this.verticalSpan * 0.88;
      const cz = Math.sin(angle) * rad;

      this.dummy.position.set(cx, cy, cz);
      this.dummy.rotation.set(
        wCath * 0.35,
        -angle,
        wCant * (clIdx % 2 === 0 ? 0.65 : -0.65) + wHelix * 0.52,
      );
      this.dummy.scale.set(
        1.0 + cl.glow * 0.35,
        0.75 + cl.glow * 0.95 + wHelix * 0.8,
        1.0 + cl.glow * 0.35,
      );
      this.dummy.updateMatrix();
      this.conduitMesh.setMatrixAt(i, this.dummy.matrix);

      if (cl.glow > 0.04) {
        this.tmpColor.copy(cl.color).multiplyScalar(0.35 + cl.glow * 0.85);
      } else {
        this.tmpColor.setRGB(0.025, 0.04, 0.065);
      }
      this.conduitMesh.setColorAt(i, this.tmpColor);
    }
    this.conduitMesh.instanceMatrix.needsUpdate = true;
    if (this.conduitMesh.instanceColor) {
      this.conduitMesh.instanceColor.needsUpdate = true;
    }

    // =========================================================================
    // 5. UPDATE 24 FLOATING TARGET ANVILS & 6 CUNNINGHAM ROBOTIC STRIKER BOOMS!
    // =========================================================================
    const targetScaleR =
      0.75 * wMono +
      1.25 * wCant +
      1.65 * wCath +
      1.05 * wHelix +
      1.35 * wShatter +
      1.75 * wCrown;

    for (let t = 0; t < this.TARGET_COUNT; t++) {
      const tgt = this.targets[t];
      tgt.recoil *= Math.exp(-14 * h);
      tgt.glow *= Math.exp(-5.0 * h);

      const orbitSpin = elapsed * (t % 2 === 0 ? 0.22 : -0.18);
      const bx = tgt.basePos.x;
      const bz = tgt.basePos.z;
      const rx = (bx * Math.cos(orbitSpin) - bz * Math.sin(orbitSpin)) * targetScaleR;
      const rz = (bx * Math.sin(orbitSpin) + bz * Math.cos(orbitSpin)) * targetScaleR;
      const ry =
        tgt.basePos.y * (1 + wHelix * 1.4 + wCath * 0.6) - tgt.recoil * 0.32;

      tgt.livePos.set(rx, ry, rz);
      this.dummy.position.copy(tgt.livePos);
      this.dummy.rotation.set(
        Math.sin(elapsed + t) * 0.22,
        orbitSpin,
        Math.cos(elapsed * 0.8 + t) * 0.22,
      );
      const s = 1.0 + tgt.recoil * 0.45 + wCath * 0.35;
      this.dummy.scale.set(s, 1.0, s);
      this.dummy.updateMatrix();
      this.targetMesh.setMatrixAt(t, this.dummy.matrix);

      if (tgt.glow > 0.05) {
        this.tmpColor.copy(tgt.color).multiplyScalar(0.4 + tgt.glow);
      } else {
        this.tmpColor.setRGB(0.06, 0.09, 0.14);
      }
      this.targetMesh.setColorAt(t, this.tmpColor);
    }
    this.targetMesh.instanceMatrix.needsUpdate = true;
    if (this.targetMesh.instanceColor) {
      this.targetMesh.instanceColor.needsUpdate = true;
    }

    // Analytical 2-Link Target Tracking for all 6 Cunningham Robotic Booms!
    const boomBaseR = 1.15 + wCant * 1.1 + wCath * 1.8 + wCrown * 1.9;
    for (let b = 0; b < this.booms.length; b++) {
      const bm = this.booms[b];
      bm.cockLift *= Math.exp(-9.0 * h);
      bm.strikeFlash *= Math.exp(-12.0 * h);

      const az = bm.homeAzimuth + elapsed * 0.16;
      bm.baseGroup.position.set(
        Math.cos(az) * boomBaseR,
        (b % 2 === 0 ? 0.65 : -0.65) * (1 + wCath * 0.8),
        Math.sin(az) * boomBaseR,
      );

      // Blend toward cocked overhead wind-up or lightning strike target!
      this.tmpVec.copy(bm.targetPos);
      this.tmpVec.y += bm.cockLift * 1.65;
      bm.currentPos.lerp(this.tmpVec, 1 - Math.exp(-32 * h));

      // Aim shoulder toward target and bend elbow via cosine law (L1=1.85, L2=1.78)
      bm.shoulderGroup.lookAt(bm.currentPos);
      const dist = Math.max(
        0.4,
        Math.min(3.55, bm.baseGroup.position.distanceTo(bm.currentPos)),
      );
      const l1 = 1.85;
      const l2 = 1.78;
      const cosShoulder = Math.max(
        -0.98,
        Math.min(0.98, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)),
      );
      const cosElbow = Math.max(
        -0.98,
        Math.min(0.98, (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2)),
      );
      const shoulderLiftAngle = Math.acos(cosShoulder);
      const elbowBendAngle = Math.PI - Math.acos(cosElbow);

      bm.shoulderGroup.rotateX(-shoulderLiftAngle);
      bm.elbowGroup.rotation.set(elbowBendAngle, 0, 0);
      bm.wristTip.scale.setScalar(1.0 + bm.strikeFlash * 0.85);
    }

    // =========================================================================
    // 6. INTEGRATE 1,024 NON-GRAVITY MAGNETIC / GLITCH VOXELS & VECTORS
    // =========================================================================
    for (let i = 0; i < this.VOXEL_COUNT; i++) {
      const v = this.voxels[i];
      if (!v.alive) {
        this.dummy.position.set(0, -150, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.voxelMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      if (v.orbitMode) {
        // Surreal orbital magnetic debris field swirling around the megastructure!
        const r =
          (2.2 + (i % 19) * 0.55) * (0.7 + this.envelopeRadius * 0.14);
        const speed = (i % 2 === 0 ? 0.55 : -0.42) * (1 + this.kineticEnergy * 0.6);
        const ang = i * 0.47 + (frozen ? 0 : elapsed * speed);
        const vx = Math.cos(ang) * r;
        const vz = Math.sin(ang) * r;
        const vy =
          Math.sin(i * 0.31 + elapsed * 0.7) * (this.verticalSpan * 0.46);

        this.dummy.position.set(vx, vy, vz);
        this.dummy.rotation.set(0, -ang, 0);
        const stretch = 1.0 + this.glitchBurst * 3.2 + wShatter * 1.8;
        this.dummy.scale.set(v.scaleX, v.scaleX, v.scaleZ * stretch);
        this.dummy.updateMatrix();
        this.voxelMesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        v.life += h;
        if (v.life >= v.maxLife) {
          v.alive = false;
          this.dummy.position.set(0, -150, 0);
          this.dummy.scale.setScalar(0.001);
          this.dummy.updateMatrix();
          this.voxelMesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
        v.pos.addScaledVector(v.vel, h);
        this.dummy.position.copy(v.pos);
        this.dummy.lookAt(
          v.pos.x + v.vel.x,
          v.pos.y + v.vel.y,
          v.pos.z + v.vel.z,
        );
        const fade = 1 - v.life / v.maxLife;
        this.dummy.scale.set(fade * v.scaleX, fade * v.scaleX, fade * v.scaleZ * 2.6);
        this.dummy.updateMatrix();
        this.voxelMesh.setMatrixAt(i, this.dummy.matrix);
        this.voxelMesh.setColorAt(i, v.color);
      }
    }
    this.voxelMesh.instanceMatrix.needsUpdate = true;
    if (this.voxelMesh.instanceColor) {
      this.voxelMesh.instanceColor.needsUpdate = true;
    }

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
