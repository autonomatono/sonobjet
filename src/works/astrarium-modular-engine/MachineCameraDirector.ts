import * as THREE from 'three/webgpu';
import type { FocusDescriptor, FocusScale, TransportState } from '../../engine/core/types';

export type Vec3Tuple = [number, number, number];

export interface GraphCameraState {
  phase: number;
  arousal: number;
  cohesion: number;
  fatigue: number;
  curiosity: number;
  totalEnergy: number;
}

export interface MachineCameraSource {
  getFocusTargets(): FocusDescriptor[];
  getActiveFocusId(): string;
  setActiveFocusId(id: string): void;
  getJointWorldPosition(id: string): Vec3Tuple | null;
  getEdgeEndpoints(edgeId: string): [Vec3Tuple, Vec3Tuple] | null;
  getGraphState(): GraphCameraState;
}

interface ScaleShotSpec {
  fov: number;
  distance: number;
  height: number;
  roll: number;
  lensHint: string;
}

const SHOT_BY_SCALE: Record<FocusScale, ScaleShotSpec> = {
  MACRO: { fov: 47, distance: 12.8, height: 3.2, roll: 0, lensHint: '32mm' },
  CLUSTER: { fov: 35, distance: 4.6, height: 1.35, roll: -0.015, lensHint: '50mm' },
  MODULE: { fov: 25, distance: 1.85, height: 0.58, roll: 0.02, lensHint: '85mm' },
  PORT: { fov: 18, distance: 0.72, height: 0.22, roll: 0.045, lensHint: '135mm' },
  CONDUIT: { fov: 27, distance: 1.3, height: 0.42, roll: -0.04, lensHint: '65mm' },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const vec = (value: Vec3Tuple | null | undefined, fallback: Vec3Tuple = [0, 0, 0]): THREE.Vector3 =>
  new THREE.Vector3(value?.[0] ?? fallback[0], value?.[1] ?? fallback[1], value?.[2] ?? fallback[2]);

const midpoint = (a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 =>
  a.clone().add(b).multiplyScalar(0.5);

const lensFromFov = (fov: number): number =>
  Math.round((36 / (2 * Math.tan((clamp(fov, 8, 90) * Math.PI) / 360))) * 10) / 10;

/**
 * Multi-scale cinematic camera for the machine-building kit. Shot selection is
 * driven by graph focus descriptors rather than a fixed list of score-to-part
 * mappings, so the same film language works at 12 or 256 modules.
 */
export class MachineCameraDirector {
  private mode = 0;
  private manualFocusId: string | null = null;
  private currentFocus: FocusDescriptor | null = null;
  private lastAutoIndex = -1;
  private snapNext = true;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private zoomScale = 1;

  private readonly currentPos = new THREE.Vector3(0, 3.2, 12.8);
  private readonly currentLook = new THREE.Vector3(0, 0, 0);
  private readonly goalPos = new THREE.Vector3();
  private readonly goalLook = new THREE.Vector3();
  private readonly shockPos = new THREE.Vector3();
  private readonly shockVel = new THREE.Vector3();
  private currentFov = 47;
  private currentRoll = 0;
  private trauma = 0;
  private whipRoll = 0;

  constructor(private readonly source: MachineCameraSource) {}

  setMode(mode: number): void {
    this.mode = clamp(Math.floor(mode), 0, 8);
    this.manualFocusId = null;
    this.lastAutoIndex = -1;
    this.snapNext = true;
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.zoomScale = 1;
    if (this.mode > 0) {
      const target = this.source.getFocusTargets()[(this.mode - 1) % Math.max(1, this.source.getFocusTargets().length)];
      if (target) this.source.setActiveFocusId(target.id);
    }
  }

  getMode(): number {
    return this.mode;
  }

  focusOn(id: string): void {
    const target = this.source.getFocusTargets().find((f) => f.id === id);
    if (!target) return;
    this.mode = 0;
    this.manualFocusId = id;
    this.source.setActiveFocusId(id);
    this.snapNext = true;
  }

  invalidate(): void {
    this.manualFocusId = null;
    this.currentFocus = null;
    this.lastAutoIndex = -1;
    this.snapNext = true;
  }

  orbit(dx: number, dy: number): void {
    this.orbitYaw += dx * 2.4;
    this.orbitPitch = clamp(this.orbitPitch + dy * 1.5, -1.1, 1.1);
  }

  zoom(delta: number): void {
    this.zoomScale = clamp(this.zoomScale * (1 + delta * 0.0008), 0.32, 2.6);
  }

  addShock(energy: number, locus: Vec3Tuple): void {
    this.trauma = clamp(this.trauma + energy * 0.28, 0, 1);
    this.shockVel.x -= locus[0] * energy;
    this.shockVel.y -= locus[1] * energy * 0.8;
    this.shockVel.z += energy * 1.2;
    this.whipRoll += (locus[0] >= 0 ? 1 : -1) * energy * 0.04;
  }

  getActiveShotBadge(): string {
    const scale = this.currentFocus?.scale ?? 'MACRO';
    const label = this.currentFocus?.label ?? 'WHOLE ASTRARIUM';
    const prefix = this.mode === 0 ? (this.manualFocusId ? 'GRAPH FOCUS' : 'AUTO-GRAPH') : `CAM ${this.mode}`;
    return `${prefix} // ${scale} ${label} [${lensFromFov(this.currentFov)}mm]`;
  }

  getActiveFocusLabel(): string {
    return this.currentFocus?.label ?? 'WHOLE ASTRARIUM';
  }

  getActiveFocusScale(): FocusScale {
    return this.currentFocus?.scale ?? 'MACRO';
  }

  update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    transport: TransportState,
    focusDrift: number,
  ): void {
    const h = clamp(dt, 0.0005, 0.05);
    const state = this.source.getGraphState();
    const focus = this.resolveFocus(transport);
    this.currentFocus = focus;
    const scale = focus?.scale ?? 'MACRO';
    const spec = SHOT_BY_SCALE[scale];
    const az =
      elapsed * (0.09 + clamp(focusDrift, 0, 1) * 0.22) +
      this.orbitYaw +
      state.phase * 0.035 +
      state.curiosity * 0.15;
    const zoom = this.zoomScale;
    const distance = spec.distance * zoom;
    let goalFov = spec.fov;
    let goalRoll = spec.roll + Math.sin(elapsed * 0.21 + state.phase) * 0.012;

    if (scale === 'CONDUIT') {
      const endpoints = this.source.getEdgeEndpoints(focus?.edgeId ?? '');
      const a = vec(endpoints?.[0], [0, 0, 0]);
      const b = vec(endpoints?.[1], [1, 0, 0]);
      const center = midpoint(a, b);
      const along = b.clone().sub(a);
      if (along.lengthSq() < 1e-6) along.set(1, 0, 0);
      along.normalize();
      const side = new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, 1, 0));
      if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
      side.normalize();
      this.goalLook.copy(center);
      this.goalPos
        .copy(center)
        .addScaledVector(side, distance)
        .addScaledVector(new THREE.Vector3(0, 1, 0), spec.height * (1 + this.orbitPitch));
      goalFov += Math.sin(elapsed * 0.27) * 2.2;
      goalRoll += Math.sin(elapsed * 0.43) * 0.035;
    } else {
      const anchor = vec(
        focus?.jointId ? this.source.getJointWorldPosition(focus.jointId) : null,
        [0, 0, 0],
      );
      this.goalLook.copy(anchor);
      if (scale === 'MACRO') {
        this.goalLook.y += 0.35;
        this.goalPos.set(
          Math.sin(az) * distance,
          spec.height + Math.sin(elapsed * 0.16) * 0.85 + this.orbitPitch * 2.1,
          Math.cos(az) * distance,
        );
        goalFov += state.arousal * 3.5 + Math.sin(elapsed * 0.11) * 1.4;
      } else {
        const lift = scale === 'PORT' ? 0.12 : scale === 'MODULE' ? 0.34 : 0.82;
        this.goalPos.set(
          anchor.x + Math.sin(az) * distance,
          anchor.y + spec.height + lift * Math.sin(elapsed * 0.3) + this.orbitPitch * distance * 0.35,
          anchor.z + Math.cos(az) * distance,
        );
        goalFov += state.fatigue * 1.8 - state.cohesion * 0.8;
      }
      goalRoll += Math.sin(elapsed * 0.37 + anchor.x) * (scale === 'PORT' ? 0.025 : 0.012);
    }

    const alpha = this.snapNext ? 1 : 1 - Math.exp(-3.1 * h);
    this.currentPos.lerp(this.goalPos, alpha);
    this.currentLook.lerp(this.goalLook, alpha);
    this.currentFov += (goalFov - this.currentFov) * alpha;
    this.currentRoll += (goalRoll - this.currentRoll) * alpha;
    this.snapNext = false;

    const springK = 180;
    const damping = 16;
    this.shockVel.x += (-springK * this.shockPos.x - damping * this.shockVel.x) * h;
    this.shockVel.y += (-springK * this.shockPos.y - damping * this.shockVel.y) * h;
    this.shockVel.z += (-springK * this.shockPos.z - damping * this.shockVel.z) * h;
    this.shockPos.addScaledVector(this.shockVel, h);
    this.trauma = Math.max(0, this.trauma - h * 2.6);
    this.whipRoll *= Math.exp(-h * 7.5);
    const shake = this.trauma * this.trauma * 0.085;
    const jitterX = (Math.sin(elapsed * 97) + Math.sin(elapsed * 41) * 0.5) * shake;
    const jitterY = (Math.cos(elapsed * 113) + Math.sin(elapsed * 59) * 0.5) * shake;

    if (Math.abs(camera.fov - this.currentFov) > 0.025) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      this.currentPos.x + this.shockPos.x * 0.055 + jitterX,
      this.currentPos.y + this.shockPos.y * 0.055 + jitterY,
      this.currentPos.z + this.shockPos.z * 0.05,
    );
    const roll = this.currentRoll + this.whipRoll + jitterX * 0.16;
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(this.currentLook);
  }

  private resolveFocus(transport: TransportState): FocusDescriptor | null {
    const targets = this.source.getFocusTargets();
    if (targets.length === 0) return null;
    let focus: FocusDescriptor | undefined;
    if (this.mode === 0) {
      if (this.manualFocusId) {
        focus = targets.find((f) => f.id === this.manualFocusId);
      }
      if (!focus) {
        const index = Math.floor(transport.bar / 6) % targets.length;
        focus = targets[index];
        if (index !== this.lastAutoIndex) this.lastAutoIndex = index;
      }
    } else {
      focus = targets[(this.mode - 1) % targets.length];
    }
    if (focus && focus.id !== this.source.getActiveFocusId()) {
      this.source.setActiveFocusId(focus.id);
    }
    return focus ?? null;
  }
}
