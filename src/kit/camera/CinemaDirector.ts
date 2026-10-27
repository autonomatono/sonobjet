import * as THREE from 'three/webgpu';

export type ShotId =
  | 'cathedral-wide'
  | 'interior-flythrough'
  | 'macro-babbage'
  | 'macro-jacquard'
  | 'light-organ-crown'
  | 'forge-hammers-low'
  | 'carriage-snorricam'
  | 'gods-eye-plan';

export type CutTransition = 'hard' | 'whip' | 'glide' | 'vertigo' | 'epic-pullback';

export interface ShotCutDirective {
  shot: ShotId;
  transition: CutTransition;
  /** Optional normalized progress [0..1] for vertigo zolly or pullback ramps */
  rampProgress?: number;
}

export interface MachineCameraAnchors {
  /** Reciprocating carriage Object3D for SnorriCam POV mount */
  shuttleCarriage: THREE.Object3D;
  /** World offset of locomotive chassis as it moves/heaves */
  chassisRoot: THREE.Object3D;
}

interface ShotSpec {
  index: number; // 1..8
  id: ShotId;
  label: string;
  lensMm: number;
  fov: number;
  roll: number;
}

export const CINEMA_SHOT_SPECS: ShotSpec[] = [
  {
    index: 1,
    id: 'cathedral-wide',
    label: 'CATHEDRAL WIDE',
    lensMm: 24,
    fov: 50,
    roll: -0.02,
  },
  {
    index: 2,
    id: 'interior-flythrough',
    label: 'INTERIOR NAVE FLYTHROUGH',
    lensMm: 28,
    fov: 54,
    roll: 0.03,
  },
  {
    index: 3,
    id: 'macro-babbage',
    label: 'MACRO: BABBAGE CIPHER WHEELS',
    lensMm: 85,
    fov: 25,
    roll: -0.04,
  },
  {
    index: 4,
    id: 'macro-jacquard',
    label: 'MACRO: JACQUARD PUNCH-LOOM',
    lensMm: 50,
    fov: 34,
    roll: 0.06,
  },
  {
    index: 5,
    id: 'light-organ-crown',
    label: 'LIGHT-ORGAN QUARTZ CROWN',
    lensMm: 24,
    fov: 54,
    roll: -0.03,
  },
  {
    index: 6,
    id: 'forge-hammers-low',
    label: 'LOW FORGE: DROP-HAMMERS',
    lensMm: 18,
    fov: 62,
    roll: -0.14,
  },
  {
    index: 7,
    id: 'carriage-snorricam',
    label: 'SHUTTLE POV [SNORRICAM]',
    lensMm: 21,
    fov: 60,
    roll: 0.0,
  },
  {
    index: 8,
    id: 'gods-eye-plan',
    label: 'OVERHEAD ASTROLABE PLAN',
    lensMm: 70,
    fov: 32,
    roll: 0.0,
  },
];

/**
 * Spectacular Multi-Perspective Cinematography & Music-Synced Epic Edit Director.
 *
 * Supports:
 * - Instant hard smash-cuts synced to musical downbeats, snares, and breakcore stabs
 * - Interior cathedral canyon flythroughs threading right inside the machine
 * - Extreme 85mm telephoto macros on Babbage cipher wheels & Jacquard needles
 * - Rigid SnorriCam POV bolted onto the reciprocating shuttle carriage
 * - Hitchcock Vertigo Dolly-Zoom (Zolly) during tension risers
 * - Epic 1m -> 23m cathedral pull-backs
 */
export class CinemaDirector {
  /** 0 = EPIC AUTO-EDIT DIRECTOR, 1..8 = Locked Manual Shot */
  private userMode = 0;
  private activeShot: ShotId = 'macro-babbage';
  private activeTransition: CutTransition = 'hard';
  private specialProgress = 0;

  // Smoothed camera pose for whip/glide transitions (hard cuts snap immediately!)
  private readonly currentPos = new THREE.Vector3(0, 1.5, 12);
  private readonly currentLook = new THREE.Vector3(0, 1.4, 0);
  private currentFov = 46;
  private currentRoll = 0;
  private whipImpulseRoll = 0;

  // Free user orbital / zoom offsets (applicable on top of any shot!)
  private orbitYaw = 0;
  private orbitPitch = 0;
  private zoomScale = 1.0;

  // Sub-seismic anvil shock transfer
  private trauma = 0;
  private readonly shockPos = new THREE.Vector3();
  private readonly shockVel = new THREE.Vector3();

  private readonly tmpWorldA = new THREE.Vector3();
  private readonly tmpWorldB = new THREE.Vector3();

  setMode(mode: number): void {
    // Accept 0 or 9 as Auto-Edit, 1..8 as direct camera rigs
    if (mode === 0 || mode === 9) {
      this.userMode = 0;
    } else {
      const clamped = Math.max(1, Math.min(8, Math.floor(mode)));
      this.userMode = clamped;
      const spec = CINEMA_SHOT_SPECS[clamped - 1];
      if (spec) {
        this.activeShot = spec.id;
        this.activeTransition = 'whip';
      }
    }
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.zoomScale = 1.0;
  }

  getMode(): number {
    return this.userMode;
  }

  getActiveShotBadge(): string {
    const spec =
      CINEMA_SHOT_SPECS.find((s) => s.id === this.activeShot) ??
      CINEMA_SHOT_SPECS[0];
    const prefix = this.userMode === 0 ? 'AUTO-EDIT' : `CAM ${spec.index}`;
    const fxTag =
      this.activeTransition === 'vertigo'
        ? ' [ZOLLY]'
        : this.activeTransition === 'epic-pullback'
          ? ' [PULLBACK]'
          : '';
    return `${prefix} // ${spec.label} [${spec.lensMm}mm]${fxTag}`;
  }

  /**
   * Executes a music-synced editorial cut (only when in Auto-Edit Director mode 0).
   */
  applyEditorialDirective(directive: ShotCutDirective): void {
    if (this.userMode !== 0) return;
    const changed = this.activeShot !== directive.shot;
    this.activeShot = directive.shot;
    this.activeTransition = directive.transition;
    if (directive.rampProgress !== undefined) {
      this.specialProgress = directive.rampProgress;
    }
    if (changed && directive.transition === 'whip') {
      this.whipImpulseRoll = (Math.random() > 0.5 ? 1 : -1) * 0.22;
    }
  }

  setSpecialProgress(progress: number): void {
    this.specialProgress = Math.max(0, Math.min(1, progress));
  }

  orbit(dx: number, dy: number): void {
    this.orbitYaw += dx * 2.5;
    this.orbitPitch = Math.max(-1.0, Math.min(1.0, this.orbitPitch + dy * 1.8));
  }

  zoom(wheelDelta: number): void {
    this.zoomScale = Math.max(
      0.38,
      Math.min(2.4, this.zoomScale * (1 + wheelDelta * 0.00085)),
    );
  }

  addShock(energy: number, locus: [number, number, number]): void {
    this.trauma = Math.min(1.0, this.trauma + energy * 0.42);
    this.shockVel.x += -locus[0] * energy * 1.9 + (Math.random() - 0.5) * energy;
    this.shockVel.y += -locus[1] * energy * 1.7 + (Math.random() - 0.5) * energy;
    this.shockVel.z += energy * 2.3;
  }

  update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    beat: number,
    anchors: MachineCameraAnchors | null,
    traumaScale = 1,
  ): void {
    const h = Math.min(0.04, Math.max(0.0005, dt));
    const spec =
      CINEMA_SHOT_SPECS.find((s) => s.id === this.activeShot) ??
      CINEMA_SHOT_SPECS[0];

    const goalPos = this.tmpWorldA;
    const goalLook = this.tmpWorldB;
    let goalFov = spec.fov;
    let goalRoll = spec.roll;

    const chassisZ = anchors?.chassisRoot.position.z ?? 0;

    // --- COMPUTE TARGET POSE FOR EACH OF THE 8 CINEMATOGRAPHIC RIGS ---
    if (this.activeTransition === 'vertigo' && this.userMode === 0) {
      // HITCHCOCK VERTIGO DOLLY-ZOOM:
      // Keep constant subject framing width at Central Dichroic Prism (0, 1.5, chassisZ)
      // while FOV narrows 72deg -> 17deg and distance expands 2.55m -> 12.4m!
      const p = this.specialProgress;
      goalFov = 72 - p * 55;
      const halfRad = THREE.MathUtils.degToRad(goalFov * 0.5);
      const frustumHalfWidth = 1.85; // Constant framed width of central atrium!
      const zollyDist = frustumHalfWidth / Math.max(0.08, Math.tan(halfRad));
      goalLook.set(0, 1.55, chassisZ);
      goalPos.set(
        Math.sin(p * 0.5) * 0.9,
        1.45 - p * 0.35,
        chassisZ + zollyDist,
      );
      goalRoll = Math.sin(p * Math.PI * 2) * 0.06;
    } else if (this.activeTransition === 'epic-pullback' && this.userMode === 0) {
      // EPIC 1.1m INTERIOR -> 21.5m CATHEDRAL WIDE PULL-BACK!
      const p = Math.pow(this.specialProgress, 1.35);
      const dist = 1.15 + p * 20.5;
      const az = p * 0.42;
      goalLook.set(0, 1.65 + p * 0.55, chassisZ);
      goalPos.set(
        Math.sin(az) * dist,
        1.55 + p * 2.6,
        chassisZ + Math.cos(az) * dist,
      );
      goalFov = 58 - p * 12;
      goalRoll = -0.02 * p;
    } else {
      switch (this.activeShot) {
        case 'cathedral-wide': {
          // Monumental sweeping crane across the Piranesian hall
          const sweepAz = 0.36 + Math.sin(elapsed * 0.16) * 0.28 + this.orbitYaw;
          const elev = 0.11 + Math.cos(elapsed * 0.13) * 0.05 + this.orbitPitch;
          const dist = 16.8 * this.zoomScale;
          goalLook.set(0, 1.9, chassisZ);
          goalPos.set(
            Math.sin(sweepAz) * Math.cos(elev) * dist,
            1.9 + Math.sin(elev) * dist,
            chassisZ + Math.cos(sweepAz) * Math.cos(elev) * dist,
          );
          break;
        }

        case 'interior-flythrough': {
          // Threads DIRECTLY THROUGH the central 3.2m canyon between the Babbage towers!
          const railPhase = ((beat * 0.125) % 1 + 1) % 1; // 8-beat smooth interior tracking pass
          const zTravel = 5.4 - railPhase * 10.6; // Flies from +5.4m straight through (0,0,0) to -5.2m!
          const weaveX = Math.sin(railPhase * Math.PI * 2) * 0.58 + this.orbitYaw * 0.6;
          const weaveY = 1.25 + Math.sin(railPhase * Math.PI) * 1.15 + this.orbitPitch;
          goalPos.set(weaveX, weaveY, chassisZ + zTravel * this.zoomScale);
          goalLook.set(
            -weaveX * 0.5,
            1.85 + Math.cos(railPhase * Math.PI) * 0.65,
            chassisZ + zTravel - 3.6,
          );
          goalRoll = weaveX * 0.14;
          break;
        }

        case 'macro-babbage': {
          // 85mm Telephoto Macro inches from the Right Babbage Brass Cipher-Wheel Column!
          const panY = 1.15 + Math.sin(elapsed * 0.45) * 1.05 + this.orbitPitch;
          const dist = 1.55 * this.zoomScale;
          const angle = -0.55 + this.orbitYaw;
          goalLook.set(1.95, panY, chassisZ + 0.15);
          goalPos.set(
            1.95 + Math.sin(angle) * dist,
            panY + 0.12,
            chassisZ + 0.15 + Math.cos(angle) * dist,
          );
          break;
        }

        case 'macro-jacquard': {
          // Tight oblique inspection of the overhead Jacquard Punch-Card Loom & 16 Chrome Needles
          const dist = 1.65 * this.zoomScale;
          const az = 0.48 + Math.sin(elapsed * 0.35) * 0.18 + this.orbitYaw;
          goalLook.set(0, 2.75, chassisZ + 0.35);
          goalPos.set(
            Math.sin(az) * dist,
            2.42 + this.orbitPitch * 0.6,
            chassisZ + 0.35 + Math.cos(az) * dist,
          );
          break;
        }

        case 'light-organ-crown': {
          // Dramatic low cathedral angle inside the 24 Chromatic Quartz Pipes looking up into rafters!
          const az = -0.32 + Math.sin(elapsed * 0.24) * 0.35 + this.orbitYaw;
          const dist = 3.25 * this.zoomScale;
          goalLook.set(0, 4.95, chassisZ - 0.1);
          goalPos.set(
            Math.sin(az) * dist,
            1.15 + this.orbitPitch,
            chassisZ + Math.cos(az) * dist,
          );
          break;
        }

        case 'forge-hammers-low': {
          // Brutal floor-level wide-angle inches from the sparking Drop-Forge Trip-Hammers!
          const az = 0.58 + Math.sin(elapsed * 0.3) * 0.16 + this.orbitYaw;
          const dist = 3.35 * this.zoomScale;
          goalLook.set(0.35, -1.25, chassisZ + 0.85);
          goalPos.set(
            0.35 + Math.sin(az) * dist,
            -1.88 + this.orbitPitch * 0.5,
            chassisZ + 0.85 + Math.cos(az) * dist,
          );
          break;
        }

        case 'carriage-snorricam': {
          // RIGIDLY BOLTED TO THE RECIPROCATING SHUTTLE CARRIAGE!
          if (anchors?.shuttleCarriage) {
            anchors.shuttleCarriage.updateMatrixWorld(true);
            goalLook.set(0, -0.35, 0);
            anchors.shuttleCarriage.localToWorld(goalLook);

            goalPos.set(0.15 + this.orbitYaw * 0.5, 0.32 + this.orbitPitch * 0.5, 1.55 * this.zoomScale);
            anchors.shuttleCarriage.localToWorld(goalPos);
          } else {
            goalLook.set(0, 2.5, chassisZ);
            goalPos.set(0, 2.8, chassisZ + 1.8);
          }
          break;
        }

        case 'gods-eye-plan': {
          // Kubrickian vertical plan shot straight down through the counter-rotating Astrolabe!
          const hDist = 11.8 * this.zoomScale;
          const spin = elapsed * 0.11 + this.orbitYaw;
          goalLook.set(0, 1.2, chassisZ);
          goalPos.set(
            Math.sin(spin) * 0.85,
            1.2 + hDist,
            chassisZ + Math.cos(spin) * 0.85 + 0.01,
          );
          break;
        }
      }
    }

    // Apply editorial transition dynamics (Hard Cut = instant snap!)
    const isInstant =
      this.activeTransition === 'hard' ||
      this.activeShot === 'carriage-snorricam' ||
      this.activeTransition === 'vertigo';

    if (isInstant) {
      this.currentPos.copy(goalPos);
      this.currentLook.copy(goalLook);
      this.currentFov = goalFov;
      this.currentRoll = goalRoll;
    } else {
      const speed = this.activeTransition === 'whip' ? 22.0 : 5.5;
      const alpha = 1 - Math.exp(-speed * h);
      this.currentPos.lerp(goalPos, alpha);
      this.currentLook.lerp(goalLook, alpha);
      this.currentFov += (goalFov - this.currentFov) * alpha;
      this.currentRoll += (goalRoll - this.currentRoll) * alpha;
    }

    this.whipImpulseRoll *= Math.exp(-16 * h);

    // Sub-seismic anvil recoil spring
    const springK = 210;
    const damp = 18;
    this.shockVel.x += (-springK * this.shockPos.x - damp * this.shockVel.x) * h;
    this.shockVel.y += (-springK * this.shockPos.y - damp * this.shockVel.y) * h;
    this.shockVel.z += (-springK * this.shockPos.z - damp * this.shockVel.z) * h;
    this.shockPos.addScaledVector(this.shockVel, h);

    this.trauma = Math.max(0, this.trauma - h * 2.9);
    const shake = this.trauma * this.trauma * 0.14 * traumaScale;
    const jx = (Math.sin(elapsed * 103.7) + (Math.random() - 0.5)) * shake;
    const jy = (Math.cos(elapsed * 119.3) + (Math.random() - 0.5)) * shake;

    if (Math.abs(camera.fov - this.currentFov) > 0.04) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }

    camera.position.set(
      this.currentPos.x + (this.shockPos.x * 0.08 + jx) * traumaScale,
      this.currentPos.y + (this.shockPos.y * 0.08 + jy) * traumaScale,
      this.currentPos.z + this.shockPos.z * 0.09 * traumaScale,
    );

    const netRoll = this.currentRoll + this.whipImpulseRoll + jx * 0.32;
    camera.up.set(Math.sin(netRoll), Math.cos(netRoll), 0);
    camera.lookAt(this.currentLook);
  }
}
