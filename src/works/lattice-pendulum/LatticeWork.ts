import * as THREE from 'three/webgpu';
import { SonobjetCore } from '../../engine/core/Sonobjet';
import type {
  ImpulseEvent,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import {
  createSonobjetMaterials,
  type SonobjetMaterialRig,
} from '../../engine/render/TSLMaterials';
import { KineticCameraRig } from '../../kit/camera/KineticCameraRig';
import { BrutalistChamber } from '../../kit/environment/BrutalistChamber';

interface LatticeNode {
  angle: number;
  omega: number;
  radius: number;
  zOffset: number;
  flash: number;
  pitchRatio: number;
}

/**
 * Work 02: `PHASE // LATTICE` — Contrasting polymetric resonant pendulum array
 * demonstrating engine composability across radically different aesthetics.
 */
class LatticeSceneInstance implements WorkSceneInstance {
  private materials: SonobjetMaterialRig | null = null;
  private chamber: BrutalistChamber | null = null;
  private root = new THREE.Group();
  private bobMesh: THREE.InstancedMesh | null = null;
  private rodMesh: THREE.InstancedMesh | null = null;
  private readonly nodes: LatticeNode[] = [];
  private readonly core = new SonobjetCore('lattice-core', [
    { id: 'spread', initial: 0, min: -0.5, max: 1.5, stiffness: 180, damping: 16 },
    { id: 'warp', initial: 0, min: -1.5, max: 1.5, stiffness: 220, damping: 18 },
  ]);
  private readonly cameraRig = new KineticCameraRig();
  private readonly dummy = new THREE.Matrix4();
  private readonly tmpColor = new THREE.Color();
  private geometries: THREE.BufferGeometry[] = [];
  private strain = 0;

  init(ctx: WorkRuntimeContext): void {
    this.materials = createSonobjetMaterials();
    this.chamber = new BrutalistChamber(this.materials.chamberConcrete);
    ctx.scene.add(this.chamber.group);
    ctx.scene.add(this.root);

    const count = 48;
    const bobGeo = new THREE.BoxGeometry(0.18, 0.34, 0.18);
    const rodGeo = new THREE.BoxGeometry(0.025, 2.4, 0.025);
    this.geometries.push(bobGeo, rodGeo);

    this.bobMesh = new THREE.InstancedMesh(
      bobGeo,
      this.materials.gunmetalInstanced,
      count,
    );
    this.rodMesh = new THREE.InstancedMesh(
      rodGeo,
      this.materials.titaniumFinInstanced,
      count,
    );
    this.root.add(this.bobMesh, this.rodMesh);

    const ratios = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        angle: (i / count) * Math.PI,
        omega: 1.4 + i * 0.065,
        radius: 1.9 + (i % 3) * 0.25,
        zOffset: ((i / (count - 1)) - 0.5) * 5.6,
        flash: 0,
        pitchRatio: ratios[i % ratios.length] * (i >= 24 ? 1.5 : 0.75),
      });
      this.bobMesh.setColorAt(i, new THREE.Color(1, 1, 1));
      this.rodMesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }

    this.cameraRig.setMode(1);
  }

  scheduleStep(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void {
    if (step64 % 4 !== 0) return;
    const step16 = Math.floor(step64 / 4);
    const global16 = bar * 16 + step16;
    const density = ctx.matrix.getTarget('harmonicDensity', 0.55);

    // Coprime polymetric triggers (3, 5, 7, 11)
    const activeLanes = [3, 5, 7, 11].filter((_, idx) => idx <= density * 4);
    for (const mod of activeLanes) {
      if (global16 % mod === 0) {
        const nodeIdx = (global16 * mod) % this.nodes.length;
        const node = this.nodes[nodeIdx];
        const ev: ImpulseEvent = {
          subsystem: mod === 7 ? 'sub-rupture' : mod === 5 ? 'piston-snap' : 'modal-clang',
          velocity: mod === 7 ? 0.92 : 0.68,
          pitchRatio: node.pitchRatio,
          decay: 1.15,
          sliceIndex: nodeIdx,
          locus: [node.zOffset / 3, 0, 0],
          audioTime,
          beat: bar * 4 + step16 / 4,
          origin: 'score',
        };
        ctx.audio.triggerImpulse(ev, {
          metallicTension: ctx.matrix.getTarget('metallicTension', 0.65),
          brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.2),
          decayScale: 1.2,
          strain: this.strain,
        });
        ctx.clock.queueVisualEvent(ev);
      }
    }
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    const idx = ((event.sliceIndex ?? 0) % this.nodes.length + this.nodes.length) % this.nodes.length;
    const target = this.nodes[idx];
    if (target) {
      target.flash = 1.3;
      target.angle += 0.38 * event.velocity;
    }
    this.core.kickDOF('warp', event.velocity * 4.5);
    if (event.subsystem === 'sub-rupture') {
      this.cameraRig.addShock(event.velocity * 0.45, event.locus);
    }
    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, {
        metallicTension: ctx.matrix.getTarget('metallicTension', 0.65),
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.2),
        decayScale: 1.2,
        strain: this.strain,
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    _transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    if (!this.bobMesh || !this.rodMesh || !this.materials || !this.chamber) return;
    const h = Math.min(0.033, Math.max(0.0005, dt));
    this.core.stepPhysics(h, ctx.matrix.getSource('punch.hard-lock') > 0.5);

    const spread = ctx.matrix.getTarget('latticeSpread', 0.25) + this.strain;
    this.materials.uniforms.stress.value = this.strain;
    this.materials.uniforms.time.value = elapsed;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      n.angle += n.omega * h * (1 + spread * 0.6);
      n.flash = Math.max(0, n.flash - h * 4.2);

      const swing = Math.sin(n.angle) * (0.65 + spread * 0.45);
      const x = Math.sin(swing) * n.radius;
      const y = 2.1 - Math.cos(swing) * n.radius;
      const z = n.zOffset;

      this.dummy.makeRotationZ(swing);
      this.dummy.setPosition(x, y, z);
      this.bobMesh.setMatrixAt(i, this.dummy);

      this.dummy.makeRotationZ(swing);
      this.dummy.setPosition(x * 0.5, 2.1 - (2.1 - y) * 0.5, z);
      this.rodMesh.setMatrixAt(i, this.dummy);

      const lum = 0.85 + n.flash * 1.4;
      this.tmpColor.setRGB(lum, lum + n.flash * 0.2, lum + n.flash * 0.5);
      this.bobMesh.setColorAt(i, this.tmpColor);
    }

    this.bobMesh.instanceMatrix.needsUpdate = true;
    this.rodMesh.instanceMatrix.needsUpdate = true;
    if (this.bobMesh.instanceColor) this.bobMesh.instanceColor.needsUpdate = true;

    this.chamber.updateLighting(this.strain, 0, 0);
    this.cameraRig.update(ctx.camera, h, elapsed, 0.6);
  }

  setCameraMode(mode: number): void {
    this.cameraRig.setMode(mode);
  }

  getCameraMode(): number {
    return this.cameraRig.getMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.cameraRig.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cameraRig.zoom(delta);
  }

  setPointerStrain(_x: number, _y: number, tension: number, active: boolean): void {
    this.strain = active ? tension : 0;
    this.core.setExternalStrain(this.strain);
  }

  getMetrics() {
    return {
      activeInstances: this.nodes.length * 2,
      structuralStress: this.core.getStructuralStress(),
      kineticEnergy: this.core.getKineticEnergy(),
    };
  }

  dispose(): void {
    this.root.removeFromParent();
    this.chamber?.group.removeFromParent();
    this.chamber?.dispose();
    this.materials?.dispose();
    for (const g of this.geometries) g.dispose();
  }
}

export const LatticeWork: WorkDefinition = {
  id: 'phase-lattice',
  title: 'PHASE // LATTICE',
  subtitle: '48-Pendulum Coprime Polyrhythmic Modal Steel Study',
  author: 'SONOBJET ENGINE // ETUDE 02',
  bpm: 138,
  bars: 32,
  sections: [
    {
      id: 'phase-1',
      name: 'I. COPRIME ALIGNMENT',
      startBar: 0,
      endBar: 16,
      intensity: 0.5,
      description: '3:5:7 modal steel phase drift',
    },
    {
      id: 'phase-2',
      name: 'II. HARMONIC SHEAR',
      startBar: 16,
      endBar: 32,
      intensity: 0.85,
      description: 'Full 11-limit resonant pendulum convergence',
    },
  ],
  macros: [
    {
      id: 'harmonicDensity',
      label: 'PHASE DENSITY',
      min: 0,
      max: 1,
      defaultValue: 0.65,
      description: 'Active coprime polyrhythmic pendulum lanes',
    },
    {
      id: 'metallicTension',
      label: 'MODAL ALLOY',
      min: 0,
      max: 1,
      defaultValue: 0.68,
      description: 'Inharmonic steel plate partial brightness',
    },
    {
      id: 'latticeSpread',
      label: 'PENDULUM ARC',
      min: 0,
      max: 1,
      defaultValue: 0.28,
      description: 'Angular excursion & phase acceleration',
    },
    {
      id: 'brutalDrive',
      label: 'WAVEFOLD',
      min: 0,
      max: 1,
      defaultValue: 0.18,
      description: 'Harmonic saturation',
    },
  ],
  defaultPatches: [
    {
      id: 'mp-span-arc',
      source: 'mediapipe.handSpan',
      target: 'latticeSpread',
      amount: 0.85,
      slew: 0.04,
      enabled: true,
    },
    {
      id: 'mp-pinch-density',
      source: 'mediapipe.leftPinch',
      target: 'harmonicDensity',
      amount: 0.7,
      slew: 0.04,
      enabled: true,
    },
  ],
  createInstance: () => new LatticeSceneInstance(),
};
