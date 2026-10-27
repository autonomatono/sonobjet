import * as THREE from 'three/webgpu';
import type { CameraPose, Vec3Tuple } from './KeyframeTimeline';

export type DirectorCameraMode = 'TIMELINE' | 'FREE' | 'JOINT' | 'DRONE';
export type JointPositionResolver = (id: string) => Vec3Tuple | null;

export interface DroneState {
  mode: DirectorCameraMode;
  speed: number;
  follow: boolean;
  cinematic: boolean;
  followDistance: number;
  fov: number;
}

type CameraSeed = Pick<CameraPose, 'position' | 'target' | 'fov' | 'roll'>;

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const FOLLOW_DISTANCES = [2.4, 4.4, 7.6];

/**
 * 6-DOF director camera. TIMELINE leaves the camera to authored keyframes;
 * FREE is a direct fly-through; JOINT orbits a named kinematic joint; DRONE
 * adds inertial, banked, marble-following cinematic flight with optional
 * spring-damped target lock. The same controller is used by the Director
 * Studio drawer and by works that expose a dedicated drone camera mode.
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

  private droneSpeed = 1;
  private droneSmoothing = 3.4;
  private followDistance = 4.4;
  private followDistanceIndex = 1;
  private followEnabled = false;
  private cinematicDrift = true;
  private hasFollowTarget = false;
  private readonly followTarget = new THREE.Vector3();
  private readonly followOffset = new THREE.Vector3();
  private readonly driftOffset = new THREE.Vector3();
  private driftPhase = 0;
  private bank = 0;
  private targetBank = 0;

  private readonly velocity = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly jointPos = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly scratch = new THREE.Vector3();
  private readonly scratchDir = new THREE.Vector3();

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
      this.followOffset.set(0, 0, 0);
    }
    if (mode === 'DRONE') {
      this.cinematicDrift = true;
      this.bank = 0;
      this.targetBank = 0;
      this.driftOffset.set(0, 0, 0);
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
    return this.roll + this.bank;
  }

  /** Enter free or drone flight from the currently evaluated timeline shot. */
  setFromPose(pose: CameraSeed): void {
    this.camera.position.fromArray(pose.position);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    const dir = this.scratchDir.set(
      pose.target[0] - pose.position[0],
      pose.target[1] - pose.position[1],
      pose.target[2] - pose.position[2],
    );
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(clamp(dir.y, -1, 1));
    this.roll = pose.roll;
    this.fov = pose.fov;
    this.targetFov = pose.fov;
    this.velocity.set(0, 0, 0);
    this.followOffset.set(0, 0, 0);
    this.bank = 0;
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
      roll: this.getRoll(),
      jointId: this.mode === 'JOINT' ? this.jointId : undefined,
    };
  }

  /** World-space point a DRONE camera can lock onto; usually the lead marble. */
  setFollowTarget(target: Vec3Tuple | null): void {
    this.hasFollowTarget = Boolean(target);
    if (target) this.followTarget.set(target[0], target[1], target[2]);
  }

  setDroneTuning(speed: number, smoothing = 3.4): void {
    this.droneSpeed = clamp(speed, 0.25, 3.5);
    this.droneSmoothing = clamp(smoothing, 1.2, 9);
  }

  getDroneState(): DroneState {
    return {
      mode: this.mode,
      speed: this.droneSpeed,
      follow: this.followEnabled && this.hasFollowTarget,
      cinematic: this.cinematicDrift,
      followDistance: this.followDistance,
      fov: this.fov,
    };
  }

  /** External HUD orbit nudges (right-drag, gamepad, etc.). */
  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.004;
    this.pitch = clamp(this.pitch - dy * 0.004, -1.45, 1.45);
  }

  zoom(delta: number): void {
    this.targetFov = clamp(this.targetFov + delta * 0.018, 12, 90);
    if (this.mode === 'JOINT') {
      this.orbitRadius = clamp(this.orbitRadius * (1 + delta * 0.00055), 0.35, 12);
    }
    if (this.mode === 'DRONE') {
      this.followDistance = clamp(
        this.followDistance * (1 + delta * 0.0004),
        1.2,
        12,
      );
    }
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
        const offset = this.scratch.set(
          Math.sin(this.yaw) * cp * this.orbitRadius,
          Math.sin(this.pitch) * this.orbitRadius,
          Math.cos(this.yaw) * cp * this.orbitRadius,
        );
        this.camera.position.copy(this.jointPos).add(offset);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(this.jointPos);
        this.camera.rotateZ(this.getRoll());
        return;
      }
    }

    if (this.mode === 'DRONE') {
      this.updateDrone(h);
      return;
    }

    this.euler.set(this.pitch, this.yaw, this.getRoll(), 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const fast = this.keys.has('shift') ? 3 : 1;
    const precise = this.keys.has('alt') ? 0.2 : 1;
    const speed = 4.2 * fast * precise;
    const wish = this.scratch.set(0, 0, 0);
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

  private updateDrone(h: number): void {
    this.euler.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const fast = this.keys.has('shift') ? 2.4 : 1;
    const precise = this.keys.has('alt') ? 0.22 : 1;
    const speed = 4.2 * fast * precise * this.droneSpeed;
    const wish = this.scratch.set(0, 0, 0);
    if (this.keys.has('w')) wish.add(this.forward);
    if (this.keys.has('s')) wish.sub(this.forward);
    if (this.keys.has('d')) wish.add(this.right);
    if (this.keys.has('a')) wish.sub(this.right);
    if (this.keys.has('e')) wish.add(this.up);
    if (this.keys.has('q')) wish.sub(this.up);
    const strafe = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    this.velocity.lerp(wish, 1 - Math.exp(-this.droneSmoothing * h));
    this.camera.position.addScaledVector(this.velocity, h);

    this.driftPhase += h * 0.62;
    let driftRoll = 0;
    if (this.cinematicDrift) {
      this.driftOffset.set(
        Math.sin(this.driftPhase * 1.31) * 0.0022,
        Math.sin(this.driftPhase * 0.73 + 1.7) * 0.0016,
        Math.cos(this.driftPhase * 0.91) * 0.0022,
      );
      this.camera.position.add(this.driftOffset);
      driftRoll = Math.sin(this.driftPhase * 0.83) * 0.016;
      this.targetBank = -strafe * 0.115 - this.velocity.x * 0.008;
    } else {
      this.targetBank = 0;
    }
    this.bank += (this.targetBank - this.bank) * (1 - Math.exp(-4.2 * h));

    if (this.followEnabled && this.hasFollowTarget) {
      const look = this.scratchDir.copy(this.followTarget);
      look.y += 0.28;
      this.followOffset.addScaledVector(wish, h * 0.22);
      this.followOffset.multiplyScalar(Math.exp(-1.05 * h));
      const cp = Math.cos(this.pitch);
      const desired = this.scratch.set(
        look.x + Math.sin(this.yaw) * cp * this.followDistance,
        look.y + Math.sin(this.pitch) * this.followDistance,
        look.z + Math.cos(this.yaw) * cp * this.followDistance,
      );
      desired.add(this.followOffset);
      this.camera.position.lerp(desired, 1 - Math.exp(-2.7 * h));
      const dir = this.scratchDir.copy(look).sub(this.camera.position);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        this.yaw = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.asin(clamp(dir.y, -1, 1));
      }
    }

    this.euler.set(this.pitch, this.yaw, this.roll + this.bank + driftRoll, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
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
      if (this.mode === 'DRONE') this.followOffset.set(0, 0, 0);
      e.preventDefault();
      return;
    }
    if (this.mode === 'DRONE' && !e.repeat) {
      if (key === 'f') {
        this.followEnabled = !this.followEnabled;
        e.preventDefault();
        return;
      }
      if (key === 'v') {
        this.cinematicDrift = !this.cinematicDrift;
        e.preventDefault();
        return;
      }
      if (key === 'c') {
        this.followDistanceIndex = (this.followDistanceIndex + 1) % FOLLOW_DISTANCES.length;
        this.followDistance = FOLLOW_DISTANCES[this.followDistanceIndex];
        e.preventDefault();
        return;
      }
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
    if (!this.enabled || (e.button !== 0 && e.button !== 2)) return;
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.orbit(dx, dy);
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.zoom(e.deltaY);
    if (this.mode === 'DRONE') {
      this.droneSpeed = clamp(this.droneSpeed * (1 - e.deltaY * 0.00045), 0.25, 3.5);
    }
  };

  private onDoubleClick = (): void => {
    if (!this.enabled) return;
    this.roll = 0;
    if (this.mode === 'DRONE') this.followOffset.set(0, 0, 0);
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
