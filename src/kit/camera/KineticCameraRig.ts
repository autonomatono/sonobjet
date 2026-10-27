import * as THREE from 'three/webgpu';

export interface CameraPreset {
  id: number;
  name: string;
  azimuth: number;
  elevation: number;
  distance: number;
  fov: number;
  roll: number;
  target: [number, number, number];
}

const GANTZ_CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 1,
    name: 'FULL AUTOMATON & ANVIL [3/4]',
    azimuth: 0.28,
    elevation: 0.08,
    distance: 5.35,
    fov: 43,
    roll: -0.025,
    target: [0.15, -0.18, 0.1],
  },
  {
    id: 2,
    name: 'PORTRAIT // LARYNX & HARP',
    azimuth: -0.36,
    elevation: 0.12,
    distance: 2.85,
    fov: 46,
    roll: 0.04,
    target: [-0.18, 0.68, 0.2],
  },
  {
    id: 3,
    name: 'LOW FORGE // SIEGE ANVIL',
    azimuth: 0.64,
    elevation: -0.26,
    distance: 4.15,
    fov: 48,
    roll: -0.065,
    target: [0.42, -0.55, 0.2],
  },
  {
    id: 4,
    name: 'WIDE CONTAINMENT GANTRY',
    azimuth: -0.18,
    elevation: 0.04,
    distance: 7.8,
    fov: 36,
    roll: 0.0,
    target: [0.05, 0.0, 0],
  },
  {
    id: 5,
    name: 'AUTONOMOUS CINEMA DIRECTOR',
    azimuth: 0.28,
    elevation: 0.08,
    distance: 5.35,
    fov: 43,
    roll: -0.02,
    target: [0.12, -0.12, 0.1],
  },
];

/**
 * Industrial Cinematography Rig with Cut-Camera Director, Orbital Inspection,
 * and Anisotropic Sub-Seismic Trauma (shock transfer from Siege-Anvil impacts).
 */
export class KineticCameraRig {
  private mode = 5;
  private activePresetIndex = 0;

  private azimuth = 0.28;
  private elevation = 0.08;
  private distance = 5.35;
  private fov = 43;
  private roll = -0.025;
  private readonly target = new THREE.Vector3(0.15, -0.18, 0.1);
  private readonly goalTarget = new THREE.Vector3(0.15, -0.18, 0.1);

  private userAzimuthOffset = 0;
  private userElevationOffset = 0;
  private userDistanceScale = 1;

  private trauma = 0;
  private kickOffset = new THREE.Vector3();
  private kickVelocity = new THREE.Vector3();

  setMode(mode: number): void {
    this.mode = Math.max(1, Math.min(5, Math.floor(mode)));
    if (this.mode <= 4) {
      this.applyPreset(this.mode - 1, false);
    }
    this.userAzimuthOffset = 0;
    this.userElevationOffset = 0;
    this.userDistanceScale = 1;
  }

  getMode(): number {
    return this.mode;
  }

  getModeName(): string {
    return GANTZ_CAMERA_PRESETS[this.mode - 1]?.name ?? 'CHAMBER 3/4';
  }

  orbit(deltaX: number, deltaY: number): void {
    this.userAzimuthOffset += deltaX * 2.6;
    this.userElevationOffset = Math.max(
      -0.95,
      Math.min(0.95, this.userElevationOffset + deltaY * 1.9),
    );
  }

  zoom(wheelDelta: number): void {
    this.userDistanceScale = Math.max(
      0.45,
      Math.min(2.1, this.userDistanceScale * (1 + wheelDelta * 0.0008)),
    );
  }

  addShock(energy: number, locus: [number, number, number]): void {
    this.trauma = Math.min(1.0, this.trauma + energy * 0.38);
    this.kickVelocity.x +=
      -locus[0] * energy * 1.6 + (Math.random() - 0.5) * energy;
    this.kickVelocity.y +=
      -locus[1] * energy * 1.5 + (Math.random() - 0.5) * energy;
    this.kickVelocity.z += energy * 2.0;
  }

  triggerDirectorCut(presetIdx: number): void {
    if (this.mode !== 5) return;
    this.applyPreset(((presetIdx % 4) + 4) % 4, true);
  }

  private applyPreset(idx: number, instantSnap: boolean): void {
    this.activePresetIndex = idx;
    const p = GANTZ_CAMERA_PRESETS[idx] ?? GANTZ_CAMERA_PRESETS[0];
    this.goalTarget.set(p.target[0], p.target[1], p.target[2]);
    if (instantSnap) {
      this.azimuth = p.azimuth;
      this.elevation = p.elevation;
      this.distance = p.distance;
      this.fov = p.fov;
      this.roll = p.roll;
      this.target.copy(this.goalTarget);
    }
  }

  update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    traumaScale = 1,
  ): void {
    const h = Math.min(0.04, Math.max(0.0005, dt));
    const p =
      GANTZ_CAMERA_PRESETS[
        this.mode === 5 ? this.activePresetIndex : this.mode - 1
      ] ?? GANTZ_CAMERA_PRESETS[0];
    this.goalTarget.set(p.target[0], p.target[1], p.target[2]);

    const lerpRate = this.mode === 5 ? 12 : 7.5;
    const alpha = 1 - Math.exp(-lerpRate * h);

    const slowDriftAz = Math.sin(elapsed * 0.21) * 0.065;
    const slowDriftEl = Math.cos(elapsed * 0.17) * 0.03;

    const goalAz = p.azimuth + this.userAzimuthOffset + slowDriftAz;
    const goalEl = Math.max(
      -1.15,
      Math.min(1.15, p.elevation + this.userElevationOffset + slowDriftEl),
    );
    const goalDist = p.distance * this.userDistanceScale;

    this.azimuth += (goalAz - this.azimuth) * alpha;
    this.elevation += (goalEl - this.elevation) * alpha;
    this.distance += (goalDist - this.distance) * alpha;
    this.fov += (p.fov - this.fov) * alpha;
    this.roll += (p.roll - this.roll) * alpha;
    this.target.lerp(this.goalTarget, alpha);

    const springK = 190;
    const damp = 18;
    this.kickVelocity.x +=
      (-springK * this.kickOffset.x - damp * this.kickVelocity.x) * h;
    this.kickVelocity.y +=
      (-springK * this.kickOffset.y - damp * this.kickVelocity.y) * h;
    this.kickVelocity.z +=
      (-springK * this.kickOffset.z - damp * this.kickVelocity.z) * h;
    this.kickOffset.addScaledVector(this.kickVelocity, h);

    this.trauma = Math.max(0, this.trauma - h * 2.8);
    const shake = this.trauma * this.trauma * 0.12 * traumaScale;
    const jitterX = (Math.sin(elapsed * 97.3) + (Math.random() - 0.5)) * shake;
    const jitterY = (Math.cos(elapsed * 113.7) + (Math.random() - 0.5)) * shake;

    const cosEl = Math.cos(this.elevation);
    const camX =
      this.target.x +
      Math.sin(this.azimuth) * cosEl * this.distance +
      (this.kickOffset.x * 0.08 + jitterX) * traumaScale;
    const camY =
      this.target.y +
      Math.sin(this.elevation) * this.distance +
      (this.kickOffset.y * 0.08 + jitterY) * traumaScale;
    const camZ =
      this.target.z +
      Math.cos(this.azimuth) * cosEl * this.distance +
      this.kickOffset.z * 0.09 * traumaScale;

    if (Math.abs(camera.fov - this.fov) > 0.05) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }

    camera.position.set(camX, camY, camZ);
    camera.up.set(
      Math.sin(this.roll + jitterX * 0.35),
      Math.cos(this.roll + jitterX * 0.35),
      0,
    );
    camera.lookAt(this.target);
  }
}
