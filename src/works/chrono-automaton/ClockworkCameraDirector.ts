import * as THREE from 'three/webgpu';
import type { TransportState } from '../../engine/core/types';
import type { ChronoAutomaton } from './ChronoAutomaton';

export type ClockworkShotId =
  | 'wide-orbit'
  | 'barrel-track'
  | 'escapement-macro'
  | 'striker-pov'
  | 'comb-fan'
  | 'bellows-low'
  | 'flux-axial'
  | 'geneva-sniper';

interface ShotSpec {
  id: ClockworkShotId;
  label: string;
  lensMm: number;
  fov: number;
  roll: number;
}

export const CLOCKWORK_SHOTS: ShotSpec[] = [
  { id: 'wide-orbit', label: 'WIDE PLINTH ORBIT', lensMm: 32, fov: 46, roll: 0 },
  { id: 'barrel-track', label: 'CHRONO BARREL TRACK', lensMm: 50, fov: 38, roll: -0.02 },
  { id: 'escapement-macro', label: 'ESCAPEMENT MACRO', lensMm: 85, fov: 24, roll: 0.03 },
  { id: 'striker-pov', label: 'HAMMER SNORRICAM', lensMm: 24, fov: 56, roll: -0.06 },
  { id: 'comb-fan', label: 'TUNED COMB FAN', lensMm: 65, fov: 30, roll: 0.02 },
  { id: 'bellows-low', label: 'BELLOWS LOW HORIZON', lensMm: 28, fov: 50, roll: -0.13 },
  { id: 'flux-axial', label: 'TEMPORAL AXIAL MANDALA', lensMm: 40, fov: 42, roll: 0 },
  { id: 'geneva-sniper', label: 'GENEVA INDEXER SNIPER', lensMm: 100, fov: 20, roll: 0 },
];

const AUTO_SEQUENCE: ClockworkShotId[] = [
  'wide-orbit',
  'escapement-macro',
  'barrel-track',
  'comb-fan',
  'wide-orbit',
  'striker-pov',
  'geneva-sniper',
  'bellows-low',
  'flux-axial',
  'barrel-track',
  'comb-fan',
  'wide-orbit',
  'escapement-macro',
  'striker-pov',
  'geneva-sniper',
  'flux-axial',
];

/**
 * Procedural camera for the V5 work. Director Studio can override this after
 * Work.update; disabling Director Mode hands control straight back here.
 */
export class ClockworkCameraDirector {
  private mode = 0;
  private activeShot: ClockworkShotId = 'wide-orbit';
  private lastAutoIndex = -1;
  private snapNext = true;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private zoomScale = 1;

  private readonly currentPos = new THREE.Vector3(0, 1.4, 8);
  private readonly currentLook = new THREE.Vector3(0, 0, 0);
  private readonly goalPos = new THREE.Vector3();
  private readonly goalLook = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly shockPos = new THREE.Vector3();
  private readonly shockVel = new THREE.Vector3();
  private currentFov = 46;
  private currentRoll = 0;
  private trauma = 0;
  private whipRoll = 0;

  setMode(mode: number): void {
    this.mode = Math.max(0, Math.min(8, Math.floor(mode)));
    if (this.mode > 0) {
      this.activeShot = CLOCKWORK_SHOTS[this.mode - 1].id;
    }
    this.lastAutoIndex = -1;
    this.snapNext = true;
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.zoomScale = 1;
  }

  getMode(): number {
    return this.mode;
  }

  getActiveShotId(): ClockworkShotId {
    return this.activeShot;
  }

  getActiveShotBadge(): string {
    const spec = CLOCKWORK_SHOTS.find((s) => s.id === this.activeShot) ?? CLOCKWORK_SHOTS[0];
    const prefix = this.mode === 0 ? 'AUTO-CLOCKWORK' : `CAM ${this.mode}`;
    return `${prefix} // ${spec.label} [${spec.lensMm}mm]`;
  }

  orbit(dx: number, dy: number): void {
    this.orbitYaw += dx * 2.2;
    this.orbitPitch = Math.max(-0.9, Math.min(0.9, this.orbitPitch + dy * 1.4));
  }

  zoom(delta: number): void {
    this.zoomScale = Math.max(
      0.38,
      Math.min(2.4, this.zoomScale * (1 + delta * 0.0008)),
    );
  }

  addShock(energy: number, locus: [number, number, number]): void {
    this.trauma = Math.min(1, this.trauma + energy * 0.32);
    this.shockVel.x += -locus[0] * energy * 1.2;
    this.shockVel.y += -locus[1] * energy * 1.1;
    this.shockVel.z += energy * 1.5;
    this.whipRoll += (locus[0] >= 0 ? 1 : -1) * energy * 0.045;
  }

  update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    transport: TransportState,
    machine: ChronoAutomaton,
  ): void {
    const h = Math.min(0.05, Math.max(0.0005, dt));
    if (this.mode === 0) {
      const autoIndex = Math.floor(transport.bar / 6) % AUTO_SEQUENCE.length;
      if (autoIndex !== this.lastAutoIndex) {
        this.lastAutoIndex = autoIndex;
        this.activeShot = AUTO_SEQUENCE[autoIndex];
        this.snapNext = true;
      }
    }

    const spec = CLOCKWORK_SHOTS.find((s) => s.id === this.activeShot) ?? CLOCKWORK_SHOTS[0];
    const anchor = (id: string): THREE.Vector3 => {
      const p = machine.getJointWorldPosition(id);
      return p ? this.tmp.set(p[0], p[1], p[2]) : this.tmp.set(0, 0, 0);
    };

    let goalFov = spec.fov;
    let goalRoll = spec.roll;
    const az = elapsed * 0.24 + this.orbitYaw;
    const zoom = this.zoomScale;

    switch (this.activeShot) {
      case 'wide-orbit': {
        const dist = 7.8 * zoom;
        this.goalLook.set(0, 0.1, 0);
        this.goalPos.set(
          Math.sin(az) * dist,
          1.4 + Math.sin(elapsed * 0.19) * 0.65 + this.orbitPitch * 2,
          Math.cos(az) * dist,
        );
        goalRoll = Math.sin(elapsed * 0.23) * 0.025;
        break;
      }
      case 'barrel-track': {
        const p = anchor('chronoBarrel').clone();
        const radius = 2.35 * zoom;
        this.goalLook.copy(p);
        this.goalPos.set(
          p.x + Math.sin(az * 1.5) * radius,
          p.y + 0.45 + this.orbitPitch,
          p.z + Math.cos(az * 1.5) * radius,
        );
        break;
      }
      case 'escapement-macro': {
        const p = anchor('balanceWheel').clone();
        const radius = 1.35 * zoom;
        this.goalLook.copy(p);
        this.goalPos.set(
          p.x + Math.sin(az * 1.9) * radius,
          p.y + 0.28 + this.orbitPitch * 0.7,
          p.z + Math.cos(az * 1.9) * radius,
        );
        goalRoll = Math.sin(elapsed * 0.5) * 0.035;
        break;
      }
      case 'striker-pov': {
        const p = anchor('hammerHead0').clone();
        const inward = p.clone().multiplyScalar(-1).normalize();
        this.goalPos.copy(p).addScaledVector(inward, 0.25 * zoom);
        this.goalPos.y += 0.16;
        this.goalLook.copy(p).multiplyScalar(0.35);
        goalRoll = 0.1 * Math.sin(transport.beat * 0.8) + this.orbitPitch * 0.2;
        break;
      }
      case 'comb-fan': {
        const p = anchor('combBank0').clone();
        const radius = 1.65 * zoom;
        this.goalLook.copy(p);
        this.goalPos.set(
          p.x + Math.sin(az * 1.3) * radius,
          p.y + 0.8 + this.orbitPitch,
          p.z + Math.cos(az * 1.3) * radius,
        );
        break;
      }
      case 'bellows-low': {
        const p = anchor('resonatorPipe0').clone();
        this.goalLook.set(p.x * 0.45, p.y + 0.4, p.z * 0.45);
        this.goalPos.set(
          Math.sin(az * 0.8) * 4.2 * zoom,
          -1.35 + this.orbitPitch * 0.5,
          Math.cos(az * 0.8) * 4.2 * zoom,
        );
        goalRoll = -0.11 + Math.sin(elapsed * 0.3) * 0.025;
        break;
      }
      case 'flux-axial': {
        const p = anchor('chronoCage').clone();
        const height = 6.1 * zoom;
        this.goalLook.copy(p);
        this.goalPos.set(
          p.x + Math.sin(az * 0.5) * 0.75,
          p.y + height,
          p.z + Math.cos(az * 0.5) * 0.75 + 0.01,
        );
        goalRoll = az * 0.04;
        break;
      }
      case 'geneva-sniper': {
        const p = anchor('genevaWheel').clone();
        const radius = 0.92 * zoom;
        this.goalLook.copy(p);
        this.goalPos.set(
          p.x + Math.sin(az * 2.1) * radius,
          p.y + 0.12 + this.orbitPitch * 0.5,
          p.z + Math.cos(az * 2.1) * radius,
        );
        goalFov = 20 + Math.sin(elapsed * 0.4) * 2.5;
        break;
      }
    }

    const alpha = this.snapNext ? 1 : 1 - Math.exp(-3.4 * h);
    this.currentPos.lerp(this.goalPos, alpha);
    this.currentLook.lerp(this.goalLook, alpha);
    this.currentFov += (goalFov - this.currentFov) * alpha;
    this.currentRoll += (goalRoll - this.currentRoll) * alpha;
    this.snapNext = false;

    const springK = 190;
    const damp = 17;
    this.shockVel.x += (-springK * this.shockPos.x - damp * this.shockVel.x) * h;
    this.shockVel.y += (-springK * this.shockPos.y - damp * this.shockVel.y) * h;
    this.shockVel.z += (-springK * this.shockPos.z - damp * this.shockVel.z) * h;
    this.shockPos.addScaledVector(this.shockVel, h);
    this.trauma = Math.max(0, this.trauma - h * 2.8);
    this.whipRoll *= Math.exp(-h * 8);
    const shake = this.trauma * this.trauma * 0.1;
    const jitterX = (Math.sin(elapsed * 103) + Math.sin(elapsed * 47) * 0.5) * shake;
    const jitterY = (Math.cos(elapsed * 117) + Math.sin(elapsed * 61) * 0.5) * shake;

    if (Math.abs(camera.fov - this.currentFov) > 0.03) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      this.currentPos.x + this.shockPos.x * 0.06 + jitterX,
      this.currentPos.y + this.shockPos.y * 0.06 + jitterY,
      this.currentPos.z + this.shockPos.z * 0.05,
    );
    const roll = this.currentRoll + this.whipRoll + jitterX * 0.2;
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(this.currentLook);
  }
}
