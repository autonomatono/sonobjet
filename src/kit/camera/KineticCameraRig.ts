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
    name: 'CHAMBER 3/4 [GANTZ]',
    azimuth: 0.34,
    elevation: 0.14,
    distance: 6.1,
    fov: 42,
    roll: -0.035,
    target: [0, 0.12, 0],
  },
  {
    id: 2,
    name: 'MACRO PISTON CORE',
    azimuth: -0.52,
    elevation: 0.04,
    distance: 3.15,
    fov: 52,
    roll: 0.08,
    target: [0.05, 0.15, 0.1],
  },
  {
    id: 3,
    name: 'BRUTAL LOW LOOM',
    azimuth: 0.78,
    elevation: -0.34,
    distance: 4.85,
    fov: 48,
    roll: -0.09,
    target: [0, 0.25, 0],
  },
  {
    id: 4,
    name: 'AXIAL ORTHO TELE',
    azimuth: 0.0,
    elevation: 0.02,
    distance: 11.4,
    fov: 22,
    roll: 0.0,
    target: [0, 0.1, 0],
  },
  {
    id: 5,
    name: 'AUTONOMOUS CUT DIRECTOR',
    azimuth: -0.35,
    elevation: 0.22,
    distance: 5.8,
    fov: 44,
    roll: 0.02,
    target: [0, 0.12, 0],
  },
];

/**
 * Industrial Cinematography Rig with Cut-Camera Director, Orbital Inspection,
 * and Anisotropic Sub-Seismic Trauma (shock transfer from heavy Sonobjet impacts).
 */
export class KineticCameraRig {
  private mode = 1;
  private activePresetIndex = 0;

  private azimuth = 0.34;
  private elevation = 0.14;
  private distance = 6.1;
  private fov = 42;
  private roll = -0.035;
  private readonly target = new THREE.Vector3(0, 0.12, 0);

  // User orbit offsets
  private userAzimuthOffset = 0;
  private userElevationOffset = 0;
  private userDistanceScale = 1;

  // Anisotropic physical shock / camera shake state
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

  /**
   * Injects physical recoil shock into the camera mount when a heavy rupture fires.
   */
  addShock(energy: number, locus: [number, number, number]): void {
    this.trauma = Math.min(1.0, this.trauma + energy * 0.42);
    this.kickVelocity.x += -locus[0] * energy * 1.8 + (Math.random() - 0.5) * energy;
    this.kickVelocity.y += -locus[1] * energy * 1.6 + (Math.random() - 0.5) * energy;
    this.kickVelocity.z += energy * 2.2;
  }

  /**
   * Autonomous cut director triggered on sharp structural downbeats/fractures when mode === 5.
   */
  triggerDirectorCut(presetIdx: number): void {
    if (this.mode !== 5) return;
    this.applyPreset(presetIdx % 4, true);
  }

  private applyPreset(idx: number, instantSnap: boolean): void {
    this.activePresetIndex = idx;
    const p = GANTZ_CAMERA_PRESETS[idx] ?? GANTZ_CAMERA_PRESETS[0];
    if (instantSnap) {
      this.azimuth = p.azimuth;
      this.elevation = p.elevation;
      this.distance = p.distance;
      this.fov = p.fov;
      this.roll = p.roll;
      this.target.set(p.target[0], p.target[1], p.target[2]);
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

    const lerpRate = this.mode === 5 ? 16 : 7.5;
    const alpha = 1 - Math.exp(-lerpRate * h);

    const slowDriftAz = Math.sin(elapsed * 0.23) * 0.08;
    const slowDriftEl = Math.cos(elapsed * 0.19) * 0.035;

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

    // Spring-back camera mount recoil
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
    const shake = this.trauma * this.trauma * 0.14 * traumaScale;
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
