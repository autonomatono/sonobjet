import * as THREE from 'three/webgpu';
import { SonobjetCore } from '../../engine/core/Sonobjet';
import { SeededRandom } from '../../engine/core/SeededRandom';
import type { ImpulseEvent } from '../../engine/core/types';
import type { SonobjetMaterialRig } from '../../engine/render/TSLMaterials';
import { quantizeDetent } from '../../kit/kinematics/SpringDamper';

interface ArticulatedPart {
  kind: 'plate' | 'fin' | 'shard' | 'piston';
  sector: number; // 0..15 mapped 1:1 to 16 break slices!
  hemisphere: number; // -1 or +1
  baseDir: THREE.Vector3;
  tangent: THREE.Vector3;
  baseRadius: number;
  baseScale: THREE.Vector3;
  baseQuat: THREE.Quaternion;

  // Dynamic physical state per component
  extension: number;
  extVel: number;
  extTarget: number;
  twist: number;
  twistVel: number;
  flipAngle: number;
  flash: number;
  stiffness: number;
  damping: number;
}

/**
 * Flagship Living Audiovisual Object: `GANTZ // TECTON` Agglomerate.
 *
 * 717 individually articulated CNC-machined plates, radiator fins, hydraulic rams,
 * and caliper shards bound to a unified SonobjetCore physics spine.
 */
export class GantzAgglomerate {
  public readonly root = new THREE.Group();
  public readonly core: SonobjetCore;

  private readonly plateMesh: THREE.InstancedMesh;
  private readonly finMesh: THREE.InstancedMesh;
  private readonly shardMesh: THREE.InstancedMesh;
  private readonly pistonMesh: THREE.InstancedMesh;
  private readonly reactorCoreMesh: THREE.Mesh;

  private readonly plates: ArticulatedPart[] = [];
  private readonly fins: ArticulatedPart[] = [];
  private readonly shards: ArticulatedPart[] = [];
  private readonly pistons: ArticulatedPart[] = [];

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpRotQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();
  private readonly axisY = new THREE.Vector3(0, 1, 0);

  private pointerVec = new THREE.Vector2(0, 0);
  private pointerTension = 0;
  private arcFlash = 0;
  private strobePulse = 0;
  private finWaveCursor = 0;

  private geometries: THREE.BufferGeometry[] = [];

  constructor(materials: SonobjetMaterialRig) {
    this.core = new SonobjetCore('gantz-agglomerate', [
      { id: 'radialExpansion', initial: 0, min: -0.45, max: 2.4, stiffness: 260, damping: 19 },
      { id: 'axialShear', initial: 0, min: -1.8, max: 1.8, stiffness: 320, damping: 21, detentStep: Math.PI / 8 },
      { id: 'torsionUpper', initial: 0, min: -Math.PI, max: Math.PI, stiffness: 290, damping: 18, detentStep: Math.PI / 6 },
      { id: 'torsionLower', initial: 0, min: -Math.PI, max: Math.PI, stiffness: 290, damping: 18, detentStep: Math.PI / 6 },
      { id: 'verticalSplit', initial: 0, min: -0.3, max: 1.6, stiffness: 240, damping: 17 },
      { id: 'gimbalPitch', initial: 0, min: -Math.PI, max: Math.PI, stiffness: 210, damping: 16, detentStep: Math.PI / 4 },
      { id: 'gimbalRoll', initial: 0, min: -Math.PI, max: Math.PI, stiffness: 210, damping: 16, detentStep: Math.PI / 4 },
    ]);

    const rng = new SeededRandom(0x47414e54); // 'GANT'

    // 1. Central Visceral Reactor Core
    const coreGeo = new THREE.OctahedronGeometry(0.62, 2);
    this.geometries.push(coreGeo);
    this.reactorCoreMesh = new THREE.Mesh(coreGeo, materials.coreReactor);
    this.reactorCoreMesh.castShadow = true;
    this.root.add(this.reactorCoreMesh);

    // 2. Tectonic Armor Plates (180 instances)
    const plateCount = 180;
    const plateGeo = new THREE.BoxGeometry(0.36, 0.11, 0.28);
    this.geometries.push(plateGeo);
    this.plateMesh = new THREE.InstancedMesh(
      plateGeo,
      materials.gunmetalInstanced,
      plateCount,
    );
    this.plateMesh.castShadow = true;
    this.plateMesh.receiveShadow = true;
    this.populateFibonacciShell(this.plates, plateCount, 'plate', 0.92, rng);
    this.initInstanceColors(this.plateMesh, plateCount);
    this.root.add(this.plateMesh);

    // 3. Titanium Radiator Cooling Fins (240 instances)
    const finCount = 240;
    const finGeo = new THREE.BoxGeometry(0.46, 0.018, 0.16);
    this.geometries.push(finGeo);
    this.finMesh = new THREE.InstancedMesh(
      finGeo,
      materials.titaniumFinInstanced,
      finCount,
    );
    this.finMesh.castShadow = true;
    this.populateHelicalFins(this.fins, finCount, rng);
    this.initInstanceColors(this.finMesh, finCount);
    this.root.add(this.finMesh);

    // 4. Peripheral Splinter Shards & Caliper Probes (260 instances)
    const shardCount = 260;
    const shardGeo = new THREE.BoxGeometry(0.042, 0.042, 0.68);
    this.geometries.push(shardGeo);
    this.shardMesh = new THREE.InstancedMesh(
      shardGeo,
      materials.gunmetalInstanced,
      shardCount,
    );
    this.shardMesh.castShadow = true;
    this.populateFibonacciShell(this.shards, shardCount, 'shard', 1.12, rng);
    this.initInstanceColors(this.shardMesh, shardCount);
    this.root.add(this.shardMesh);

    // 5. Heavy Cardinal Hydraulic Pistons & Gimbal Blocks (36 instances)
    const pistonCount = 36;
    const pistonGeo = new THREE.BoxGeometry(0.19, 0.19, 0.82);
    this.geometries.push(pistonGeo);
    this.pistonMesh = new THREE.InstancedMesh(
      pistonGeo,
      materials.titaniumFinInstanced,
      pistonCount,
    );
    this.pistonMesh.castShadow = true;
    this.populateCardinalPistons(this.pistons, pistonCount, rng);
    this.initInstanceColors(this.pistonMesh, pistonCount);
    this.root.add(this.pistonMesh);
  }

  getActiveInstanceCount(): number {
    return (
      1 +
      this.plates.length +
      this.fins.length +
      this.shards.length +
      this.pistons.length
    );
  }

  getArcFlash(): number {
    return this.arcFlash;
  }

  getStrobePulse(): number {
    return this.strobePulse;
  }

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    this.pointerVec.set(x, y);
    const prev = this.pointerTension;
    this.pointerTension = active ? Math.max(0, Math.min(1.5, tension)) : 0;
    this.core.setExternalStrain(this.pointerTension);

    // Releasing high tension slams all extended parts inward with pneumatic recoil!
    if (!active && prev > 0.25) {
      this.slamConstruct(-prev * 8.5);
    }
  }

  /**
   * Direct physical actuation coupled 1:1 with acoustic synthesis impulses.
   */
  applyImpulse(event: ImpulseEvent): void {
    const v = Math.max(0.05, Math.min(1.5, event.velocity));
    const sliceSector = ((event.sliceIndex ?? 0) % 16 + 16) % 16;

    switch (event.subsystem) {
      case 'sub-rupture': {
        this.core.kickDOF('radialExpansion', 9.5 * v, 0.12 * v);
        this.core.kickDOF('verticalSplit', 5.2 * v, 0.05);
        this.strobePulse = Math.min(1.4, this.strobePulse + 0.65 * v);
        // Blow equatorial & aligned armor plates outward violently
        for (let i = 0; i < this.plates.length; i++) {
          const p = this.plates[i];
          const eqWeight = 1 - Math.abs(p.baseDir.y) * 0.55;
          p.extVel += (8.5 + (i % 5) * 1.1) * v * eqWeight;
          p.flash = Math.max(p.flash, 0.65 * v);
        }
        break;
      }

      case 'spine-shear': {
        const dir = event.locus[0] >= 0 ? 1 : -1;
        this.core.kickDOF('axialShear', dir * 11.0 * v, dir * 0.22);
        this.core.kickDOF(
          'torsionUpper',
          dir * 8.5 * v,
          this.core.getDOF('torsionUpper') + dir * (Math.PI / 6),
        );
        this.core.kickDOF(
          'torsionLower',
          -dir * 8.5 * v,
          this.core.getDOF('torsionLower') - dir * (Math.PI / 6),
        );
        this.arcFlash = Math.min(1.5, this.arcFlash + 0.55 * v);
        for (let i = 0; i < this.shards.length; i += 2) {
          const s = this.shards[i];
          s.extVel += 12.5 * v;
          s.twistVel += dir * 14 * v;
          s.flash = 1.0;
        }
        break;
      }

      case 'break-shred': {
        // Actuate the exact physical sector corresponding to this breakbeat slice!
        for (const p of this.plates) {
          if (p.sector === sliceSector || p.sector === (sliceSector + 8) % 16) {
            p.extVel += 11.5 * v;
            if (event.reverse) {
              p.flipAngle += Math.PI;
            }
            p.flash = 1.0;
          }
        }
        for (const s of this.shards) {
          if (s.sector === sliceSector) {
            s.extVel += 14.0 * v;
            s.flash = 1.0;
          }
        }
        if (event.reverse) {
          this.core.kickDOF('gimbalRoll', 7.5 * v);
        }
        break;
      }

      case 'fin-cascade': {
        // Sequential wave across 24 titanium radiator fins per micro-tick!
        const batch = 24;
        for (let k = 0; k < batch; k++) {
          const idx = (this.finWaveCursor + k) % this.fins.length;
          const f = this.fins[idx];
          f.extVel += (6.5 + (k / batch) * 4.5) * v;
          f.twistVel += 18.0 * v;
          f.flash = 0.9 * v;
        }
        this.finWaveCursor = (this.finWaveCursor + 17) % this.fins.length;
        break;
      }

      case 'piston-snap': {
        const axisGroup = Math.abs(Math.floor(event.pitchRatio * 7)) % 3;
        this.pistons.forEach((p, idx) => {
          if (idx % 3 === axisGroup) {
            p.extTarget = p.extTarget > 0.3 ? 0.0 : 0.72 * v;
            p.extVel += (p.extTarget > 0.3 ? 13 : -13) * v;
            p.flash = 1.0;
          }
        });
        break;
      }

      case 'modal-clang': {
        const sign = (this.finWaveCursor % 2 === 0 ? 1 : -1);
        this.core.kickDOF(
          'gimbalPitch',
          9.0 * v * sign,
          this.core.getDOF('gimbalPitch') + sign * (Math.PI / 4),
        );
        for (let i = 0; i < this.fins.length; i += 4) {
          this.fins[i].twistVel += 12 * v * sign;
          this.fins[i].flash = Math.max(this.fins[i].flash, 0.7 * v);
        }
        break;
      }

      case 'core-implode': {
        // Violent inward implosion crushing silhouette before spring rebound
        this.slamConstruct(-11.0 * v);
        this.arcFlash = Math.min(1.5, this.arcFlash + 0.75 * v);
        break;
      }

      case 'arc-discharge': {
        this.arcFlash = Math.min(1.6, this.arcFlash + 1.0 * v);
        this.strobePulse = Math.min(1.4, this.strobePulse + 0.8 * v);
        // Asymmetric insectoid needle probes shoot outward
        const stride = Math.max(3, Math.floor(11 - v * 6));
        for (let i = this.finWaveCursor % stride; i < this.shards.length; i += stride) {
          const s = this.shards[i];
          s.extVel += 18.0 * v;
          s.flash = 1.2;
        }
        break;
      }
    }
  }

  private slamConstruct(inwardVelocity: number): void {
    this.core.kickDOF('radialExpansion', inwardVelocity * 0.7, 0);
    this.core.kickDOF('verticalSplit', inwardVelocity * 0.5, 0);
    for (const p of this.plates) {
      p.extVel += inwardVelocity;
      p.extTarget = 0;
    }
    for (const s of this.shards) {
      s.extVel += inwardVelocity * 1.1;
      s.extTarget = 0;
    }
  }

  /**
   * Steps Sonobjet physics + updates all 717 instance matrices and stress colors.
   */
  update(
    dt: number,
    elapsed: number,
    options: {
      explodeAmount: number;
      hardLock: boolean;
      geometryChaos: number;
      materials: SonobjetMaterialRig;
    },
  ): ImpulseEvent | null {
    const h = Math.min(0.033, Math.max(0.0005, dt));
    const spontaneousRupture = this.core.stepPhysics(h, options.hardLock);

    this.arcFlash = Math.max(0, this.arcFlash - h * 5.8);
    this.strobePulse = Math.max(0, this.strobePulse - h * 7.5);

    const stress = this.core.getStructuralStress();
    options.materials.uniforms.stress.value = stress;
    options.materials.uniforms.arcFlash.value = this.arcFlash;
    options.materials.uniforms.time.value = elapsed;

    // Hovering industrial levitation + subtle gimbal attitude
    const hoverY = Math.sin(elapsed * 1.35) * 0.055;
    const lockAmt = options.hardLock ? 1.0 : 0.0;
    this.root.position.set(
      quantizeDetent(this.pointerVec.x * this.pointerTension * 0.25, 0.1, lockAmt),
      hoverY + quantizeDetent(this.pointerVec.y * this.pointerTension * 0.22, 0.1, lockAmt),
      0,
    );
    this.root.rotation.set(
      quantizeDetent(this.core.getDOF('gimbalPitch') * 0.28, Math.PI / 8, lockAmt),
      quantizeDetent(elapsed * 0.16, Math.PI / 8, lockAmt),
      quantizeDetent(this.core.getDOF('gimbalRoll') * 0.24, Math.PI / 8, lockAmt),
    );

    // Core spine pulsation
    const coreScale =
      1.0 +
      Math.max(-0.25, this.core.getDOF('radialExpansion') * 0.22) +
      this.arcFlash * 0.14;
    this.reactorCoreMesh.scale.setScalar(coreScale);
    this.reactorCoreMesh.rotation.y = -elapsed * 0.9;
    this.reactorCoreMesh.rotation.z = this.core.getDOF('axialShear') * 0.6;

    const globalRadial =
      this.core.getDOF('radialExpansion') * 0.35 +
      options.explodeAmount * 1.55 +
      this.pointerTension * 1.15;
    const verticalSplit =
      this.core.getDOF('verticalSplit') * 0.32 + options.explodeAmount * 0.45;
    const shear = this.core.getDOF('axialShear') * 0.36;
    const torsionUpper = this.core.getDOF('torsionUpper');
    const torsionLower = this.core.getDOF('torsionLower');

    this.updatePartBank(
      this.plateMesh,
      this.plates,
      h,
      elapsed,
      globalRadial,
      verticalSplit,
      shear,
      torsionUpper,
      torsionLower,
      options.hardLock,
      options.geometryChaos,
    );
    this.updatePartBank(
      this.finMesh,
      this.fins,
      h,
      elapsed,
      globalRadial * 0.85,
      verticalSplit * 0.7,
      shear * 0.75,
      torsionUpper * 1.25,
      torsionLower * 1.25,
      options.hardLock,
      options.geometryChaos,
    );
    this.updatePartBank(
      this.shardMesh,
      this.shards,
      h,
      elapsed,
      globalRadial * 1.35,
      verticalSplit * 1.1,
      shear * 1.2,
      torsionUpper * 0.8,
      torsionLower * 0.8,
      options.hardLock,
      options.geometryChaos,
    );
    this.updatePartBank(
      this.pistonMesh,
      this.pistons,
      h,
      elapsed,
      globalRadial * 0.65,
      verticalSplit * 0.5,
      shear * 0.4,
      torsionUpper * 0.5,
      torsionLower * 0.5,
      options.hardLock,
      options.geometryChaos,
    );

    return spontaneousRupture;
  }

  private updatePartBank(
    mesh: THREE.InstancedMesh,
    parts: ArticulatedPart[],
    dt: number,
    elapsed: number,
    globalRadial: number,
    verticalSplit: number,
    shear: number,
    torsionUpper: number,
    torsionLower: number,
    hardLock: boolean,
    chaos: number,
  ): void {
    const strainX = this.pointerVec.x * this.pointerTension;
    const strainY = this.pointerVec.y * this.pointerTension;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];

      if (!hardLock) {
        const force =
          -p.stiffness * (p.extension - p.extTarget) - p.damping * p.extVel;
        p.extVel += force * dt;
        p.extension += p.extVel * dt;
        if (p.extension < -0.28) {
          p.extension = -0.28;
          p.extVel = -p.extVel * 0.35;
        } else if (p.extension > 2.4) {
          p.extension = 2.4;
          p.extVel = -p.extVel * 0.3;
        }

        p.twistVel += (-180 * p.twist - 14 * p.twistVel) * dt;
        p.twist += p.twistVel * dt;
      } else {
        p.extension = Math.round(p.extension / 0.2) * 0.2;
        p.twist = Math.round(p.twist / (Math.PI / 4)) * (Math.PI / 4);
      }

      p.flash = Math.max(0, p.flash - dt * 5.2);

      // High-frequency servo micro-tremor under stress/chaos
      const tremor =
        (chaos * 0.025 + this.pointerTension * 0.04) *
        Math.sin(elapsed * 68 + i * 1.7);

      const radius = Math.max(
        0.32,
        p.baseRadius + globalRadial + p.extension + tremor,
      );

      this.tmpPos.copy(p.baseDir).multiplyScalar(radius);

      // Hemisphere shear & vertical tectonic separation
      this.tmpPos.x += p.hemisphere * shear + p.baseDir.x * Math.abs(strainX) * 0.55;
      this.tmpPos.y +=
        p.hemisphere * verticalSplit + p.baseDir.y * Math.abs(strainY) * 0.55;

      // Differential upper/lower axial torsion around Y
      const torsionAngle =
        (p.hemisphere > 0 ? torsionUpper : torsionLower) * 0.55;
      this.tmpPos.applyAxisAngle(this.axisY, torsionAngle);

      // Local CAD rotation + flip + twist
      this.tmpRotQuat.setFromAxisAngle(this.axisY, torsionAngle);
      this.tmpQuat.copy(this.tmpRotQuat).multiply(p.baseQuat);
      if (Math.abs(p.twist) > 0.001 || Math.abs(p.flipAngle) > 0.001) {
        this.tmpRotQuat.setFromAxisAngle(p.tangent, p.twist + p.flipAngle);
        this.tmpQuat.multiply(this.tmpRotQuat);
      }

      // Elongate shards/pistons slightly along radial vector during high velocity snap
      const velStretch =
        p.kind === 'shard' || p.kind === 'piston'
          ? 1 + Math.min(1.6, Math.abs(p.extVel) * 0.065)
          : 1;
      this.tmpScale.set(
        p.baseScale.x,
        p.baseScale.y,
        p.baseScale.z * velStretch,
      );

      this.dummyMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      mesh.setMatrixAt(i, this.dummyMatrix);

      // Encode mechanical excitation & xenon/amber flash into instance color
      const lum = 0.85 + p.flash * 1.35 + Math.min(0.4, Math.abs(p.extVel) * 0.04);
      this.tmpColor.setRGB(
        lum + p.flash * 0.35,
        lum + p.flash * 0.22,
        lum + p.flash * 0.45,
      );
      mesh.setColorAt(i, this.tmpColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  private populateFibonacciShell(
    out: ArticulatedPart[],
    count: number,
    kind: 'plate' | 'shard',
    radiusBase: number,
    rng: SeededRandom,
  ): void {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const up = new THREE.Vector3(0, 1, 0);
    const lookMat = new THREE.Matrix4();
    const zero = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const dir = new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r,
      ).normalize();

      const tangent = new THREE.Vector3().crossVectors(dir, up);
      if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
      tangent.normalize();

      lookMat.lookAt(dir, zero, up);
      const baseQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);

      const sector = Math.floor(((theta % (Math.PI * 2)) / (Math.PI * 2)) * 16) % 16;
      const scaleJitter =
        kind === 'plate'
          ? new THREE.Vector3(
              rng.range(0.65, 1.45),
              rng.range(0.7, 1.5),
              rng.range(0.75, 1.35),
            )
          : new THREE.Vector3(
              rng.range(0.6, 1.3),
              rng.range(0.6, 1.3),
              rng.range(0.55, 1.65),
            );

      out.push({
        kind,
        sector,
        hemisphere: y >= 0 ? 1 : -1,
        baseDir: dir,
        tangent,
        baseRadius: radiusBase + rng.range(-0.14, 0.24),
        baseScale: scaleJitter,
        baseQuat,
        extension: 0,
        extVel: 0,
        extTarget: 0,
        twist: 0,
        twistVel: 0,
        flipAngle: 0,
        flash: 0,
        stiffness: kind === 'plate' ? rng.range(210, 310) : rng.range(260, 390),
        damping: kind === 'plate' ? rng.range(16, 23) : rng.range(18, 26),
      });
    }
  }

  private populateHelicalFins(
    out: ArticulatedPart[],
    count: number,
    rng: SeededRandom,
  ): void {
    const up = new THREE.Vector3(0, 1, 0);
    const lookMat = new THREE.Matrix4();
    const zero = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const band = (i % 6) - 2.5;
      const angle = t * Math.PI * 8 + band * 0.28;
      const y = band * 0.28 + Math.sin(t * Math.PI * 4) * 0.12;
      const dir = new THREE.Vector3(
        Math.cos(angle),
        y,
        Math.sin(angle),
      ).normalize();

      const tangent = new THREE.Vector3().crossVectors(dir, up).normalize();
      lookMat.lookAt(dir, zero, up);
      const baseQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);

      out.push({
        kind: 'fin',
        sector: i % 16,
        hemisphere: dir.y >= 0 ? 1 : -1,
        baseDir: dir,
        tangent,
        baseRadius: 1.04 + (i % 3) * 0.07,
        baseScale: new THREE.Vector3(
          rng.range(0.8, 1.25),
          1.0,
          rng.range(0.85, 1.3),
        ),
        baseQuat,
        extension: 0,
        extVel: 0,
        extTarget: 0,
        twist: 0,
        twistVel: 0,
        flipAngle: 0,
        flash: 0,
        stiffness: 340,
        damping: 22,
      });
    }
  }

  private populateCardinalPistons(
    out: ArticulatedPart[],
    count: number,
    rng: SeededRandom,
  ): void {
    const axes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    const zero = new THREE.Vector3();
    const lookMat = new THREE.Matrix4();

    for (let i = 0; i < count; i++) {
      const cardinal = axes[i % axes.length].clone();
      const ringIdx = Math.floor(i / 6);
      const offsetAngle = (ringIdx / 6) * Math.PI * 2;
      const ortho1 =
        Math.abs(cardinal.y) > 0.9
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 1, 0);
      const ortho2 = new THREE.Vector3().crossVectors(cardinal, ortho1).normalize();

      const dir = cardinal
        .clone()
        .addScaledVector(ortho1, Math.cos(offsetAngle) * 0.24)
        .addScaledVector(ortho2, Math.sin(offsetAngle) * 0.24)
        .normalize();

      lookMat.lookAt(dir, zero, ortho1);
      const baseQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);

      out.push({
        kind: 'piston',
        sector: i % 16,
        hemisphere: dir.y >= 0 ? 1 : -1,
        baseDir: dir,
        tangent: ortho2,
        baseRadius: 0.86 + (ringIdx % 2) * 0.14,
        baseScale: new THREE.Vector3(
          rng.range(0.85, 1.15),
          rng.range(0.85, 1.15),
          rng.range(0.9, 1.35),
        ),
        baseQuat,
        extension: 0,
        extVel: 0,
        extTarget: 0,
        twist: 0,
        twistVel: 0,
        flipAngle: 0,
        flash: 0,
        stiffness: 290,
        damping: 20,
      });
    }
  }

  private initInstanceColors(mesh: THREE.InstancedMesh, count: number): void {
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, c);
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
  }
}
