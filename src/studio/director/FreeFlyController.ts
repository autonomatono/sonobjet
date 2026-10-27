import * as THREE from 'three/webgpu';
import type { CameraPose, Vec3Tuple } from './KeyframeTimeline';

export type DirectorCameraMode = 'TIMELINE' | 'FREE' | 'JOINT';
export type JointPositionResolver = (id: string) => Vec3Tuple | null;

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * 6-DOF director camera. Timeline mode leaves the camera to authored keyframes;
 * FREE mode is full fly-through; JOINT mode orbits a named kinematic joint.
 */
export class FreeFlyController {
  private enabled = false;
  private mode: DirectorCameraMode = 'TIMELINE';
  private readonly keys = new Set<string>();
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  private yaw = 0;
  private pitch = 0;
  private roll = 0;
  private fov = 45;
  private targetFov = 45;
  private orbitRadius = 2.6;
  private jointId: string | undefined;
  private jointResolver: JointPositionResolver | null = null;

  private readonly velocity = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly jointPos = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDoubleClick);
  }

  setMode(mode: DirectorCameraMode): void {
    this.mode = mode;
    this.enabled = mode !== 'TIMELINE';
    if (!this.enabled) {
      this.keys.clear();
      this.dragging = false;
      this.velocity.set(0, 0, 0);
    }
  }

  getMode(): DirectorCameraMode {
    return this.mode;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setJointResolver(resolver: JointPositionResolver | null): void {
    this.jointResolver = resolver;
  }

  setJointId(id: string | undefined): void {
    this.jointId = id;
  }

  getJointId(): string | undefined {
    return this.jointId;
  }

  getFov(): number {
    return this.fov;
  }

  getRoll(): number {
    return this.roll;
  }

  /** Enter free flight from the currently evaluated timeline shot. */
  setFromPose(pose: CameraPose): void {
    this.camera.position.fromArray(pose.position);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    const dir = new THREE.Vector3(
      pose.target[0] - pose.position[0],
      pose.target[1] - pose.position[1],
      pose.target[2] - pose.position[2],
    ).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(clamp(dir.y, -1, 1));
    this.roll = pose.roll;
    this.fov = pose.fov;
    this.targetFov = pose.fov;
    this.velocity.set(0, 0, 0);
    this.applyOrientation();
  }

  capturePose(): {
    position: Vec3Tuple;
    target: Vec3Tuple;
    fov: number;
    roll: number;
    jointId?: string;
  } {
    this.camera.getWorldDirection(this.forward);
    const target = this.camera.position.clone().addScaledVector(this.forward, 3.2);
    return {
      position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      target: [target.x, target.y, target.z],
      fov: this.fov,
      roll: this.roll,
      jointId: this.mode === 'JOINT' ? this.jointId : undefined,
    };
  }

  update(dt: number): void {
    if (!this.enabled) return;
    const h = Math.min(0.05, Math.max(0.0005, dt));

    this.fov += (this.targetFov - this.fov) * (1 - Math.exp(-9 * h));
    if (Math.abs(this.camera.fov - this.fov) > 0.02) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    const rollDir =
      (this.keys.has('z') ? 1 : 0) - (this.keys.has('x') ? 1 : 0);
    this.roll = clamp(this.roll + rollDir * h * 0.9, -Math.PI / 4, Math.PI / 4);

    if (this.mode === 'JOINT' && this.jointId && this.jointResolver) {
      const resolved = this.jointResolver(this.jointId);
      if (resolved) {
        this.jointPos.fromArray(resolved);
        const cp = Math.cos(this.pitch);
        const offset = new THREE.Vector3(
          Math.sin(this.yaw) * cp * this.orbitRadius,
          Math.sin(this.pitch) * this.orbitRadius,
          Math.cos(this.yaw) * cp * this.orbitRadius,
        );
        this.camera.position.copy(this.jointPos).add(offset);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(this.jointPos);
        this.camera.rotateZ(this.roll);
        return;
      }
    }

    this.euler.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const fast = this.keys.has('shift') ? 3 : 1;
    const precise = this.keys.has('alt') ? 0.2 : 1;
    const speed = 4.2 * fast * precise;
    const wish = new THREE.Vector3();
    if (this.keys.has('w')) wish.add(this.forward);
    if (this.keys.has('s')) wish.sub(this.forward);
    if (this.keys.has('d')) wish.add(this.right);
    if (this.keys.has('a')) wish.sub(this.right);
    if (this.keys.has('e')) wish.add(this.up);
    if (this.keys.has('q')) wish.sub(this.up);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    const alpha = 1 - Math.exp(-10 * h);
    this.velocity.lerp(wish, alpha);
    this.camera.position.addScaledVector(this.velocity, h);
  }

  private applyOrientation(): void {
    this.euler.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private isUiTarget(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return Boolean(
      target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable),
    );
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled || this.isUiTarget(e)) return;
    const key = e.key.toLowerCase();
    if (key === '0') {
      this.roll = 0;
      e.preventDefault();
      return;
    }
    const handled = ['w', 'a', 's', 'd', 'e', 'q', 'z', 'x', 'shift', 'alt'];
    if (handled.includes(key)) {
      this.keys.add(key);
      if (['w', 'a', 's', 'd', 'e', 'q', 'z', 'x'].includes(key)) {
        e.preventDefault();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.dragging = false;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled || e.button !== 0) return;
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.yaw -= dx * 0.004;
    this.pitch = clamp(this.pitch - dy * 0.004, -1.45, 1.45);
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.targetFov = clamp(this.targetFov + e.deltaY * 0.018, 12, 90);
    if (this.mode === 'JOINT') {
      this.orbitRadius = clamp(
        this.orbitRadius * (1 + e.deltaY * 0.00055),
        0.35,
        12,
      );
    }
  };

  private onDoubleClick = (): void => {
    if (!this.enabled) return;
    this.roll = 0;
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
  }
}
