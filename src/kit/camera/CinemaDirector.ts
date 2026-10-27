import * as THREE from 'three/webgpu';
import type { HyperTectonAnchors } from '../../works/gantz-tecton/HyperTectonMachine';

export type ShotId =
  | 'morph-orbit'
  | 'interior-dive'
  | 'macro-fault-seams'
  | 'helix-corkscrew'
  | 'cunningham-boom-track'
  | 'low-horizon-dutch'
  | 'wrist-snorricam'
  | 'axial-mandala';

export type CutTransition =
  | 'hard'
  | 'morph-follow'
  | 'whip'
  | 'vertigo'
  | 'epic-pullback';

export interface ShotCutDirective {
  shot: ShotId;
  transition: CutTransition;
  rampProgress?: number;
}

interface ShotSpec {
  index: number;
  id: ShotId;
  label: string;
  lensMm: number;
  fov: number;
  roll: number;
}

export const CINEMA_SHOT_SPECS: ShotSpec[] = [
  {
    index: 1,
    id: 'morph-orbit',
    label: 'MORPH-TRACKING ORBIT',
    lensMm: 32,
    fov: 46,
    roll: -0.02,
  },
  {
    index: 2,
    id: 'interior-dive',
    label: 'INTERIOR SHELL FLIGHT',
    lensMm: 22,
    fov: 58,
    roll: 0.05,
  },
  {
    index: 3,
    id: 'macro-fault-seams',
    label: 'MACRO: TECTONIC LAMELLAE',
    lensMm: 85,
    fov: 25,
    roll: -0.04,
  },
  {
    index: 4,
    id: 'helix-corkscrew',
    label: 'NON-EUCLIDEAN CORKSCREW',
    lensMm: 28,
    fov: 50,
    roll: 0.08,
  },
  {
    index: 5,
    id: 'cunningham-boom-track',
    label: 'ROBOTIC BOOM TRACKER',
    lensMm: 35,
    fov: 44,
    roll: -0.05,
  },
  {
    index: 6,
    id: 'low-horizon-dutch',
    label: 'MERCURY HORIZON LOW',
    lensMm: 18,
    fov: 62,
    roll: -0.16,
  },
  {
    index: 7,
    id: 'wrist-snorricam',
    label: 'STRIKER WRIST POV',
    lensMm: 21,
    fov: 60,
    roll: 0.0,
  },
  {
    index: 8,
    id: 'axial-mandala',
    label: 'POLAR GYRO MANDALA',
    lensMm: 65,
    fov: 32,
    roll: 0.0,
  },
];

/**
 * Morph-Following Cinematography & Selective Montage Director.
 *
 * Continuously tracks the live structural envelope, interior hollow radius,
 * helical span, and robotic striker booms of `HyperTectonMachine` as it
 * transforms between states—blending long unbroken flying/orbiting camera
 * trajectories with earned razor-sharp impact cuts and Vertigo Zolly warps.
 */
export class CinemaDirector {
  private userMode = 0; // 0 = MORPH-FOLLOW AUTO-DIRECTOR, 1..8 = Manual Rigs
  private activeShot: ShotId = 'macro-fault-seams';
  private activeTransition: CutTransition = 'hard';
  private specialProgress = 0;

  private readonly currentPos = new THREE.Vector3(0, 1.2, 6.5);
  private readonly currentLook = new THREE.Vector3(0, 0.2, 0);
  private currentFov = 46;
  private currentRoll = 0;
  private whipImpulseRoll = 0;

  private orbitYaw = 0;
  private orbitPitch = 0;
  private zoomScale = 1.0;

  private trauma = 0;
  private readonly shockPos = new THREE.Vector3();
  private readonly shockVel = new THREE.Vector3();

  private readonly tmpGoalPos = new THREE.Vector3();
  private readonly tmpGoalLook = new THREE.Vector3();
  private readonly tmpTipWorld = new THREE.Vector3();

  setMode(mode: number): void {
    if (mode === 0 || mode === 9) {
      this.userMode = 0;
    } else {
      const clamped = Math.max(1, Math.min(8, Math.floor(mode)));
      this.userMode = clamped;
      const spec = CINEMA_SHOT_SPECS[clamped - 1];
      if (spec) {
        this.activeShot = spec.id;
        this.activeTransition = 'morph-follow';
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
    const prefix = this.userMode === 0 ? 'AUTO-MORPH' : `CAM ${spec.index}`;
    const fxTag =
      this.activeTransition === 'vertigo'
        ? ' [ZOLLY]'
        : this.activeTransition === 'epic-pullback'
          ? ' [FOLD-OUT]'
          : '';
    return `${prefix} // ${spec.label} [${spec.lensMm}mm]${fxTag}`;
  }

  applyEditorialDirective(directive: ShotCutDirective): void {
    if (this.userMode !== 0) return;
    const changed = this.activeShot !== directive.shot;
    this.activeShot = directive.shot;
    this.activeTransition = directive.transition;
    if (directive.rampProgress !== undefined) {
      this.specialProgress = directive.rampProgress;
    }
    if (changed && directive.transition === 'whip') {
      this.whipImpulseRoll = (Math.random() > 0.5 ? 1 : -1) * 0.24;
    }
  }

  orbit(dx: number, dy: number): void {
    this.orbitYaw += dx * 2.5;
    this.orbitPitch = Math.max(-1.05, Math.min(1.05, this.orbitPitch + dy * 1.8));
  }

  zoom(wheelDelta: number): void {
    this.zoomScale = Math.max(
      0.35,
      Math.min(2.5, this.zoomScale * (1 + wheelDelta * 0.00085)),
    );
  }

  addShock(energy: number, locus: [number, number, number]): void {
    this.trauma = Math.min(1.0, this.trauma + energy * 0.4);
    this.shockVel.x += -locus[0] * energy * 1.9 + (Math.random() - 0.5) * energy;
    this.shockVel.y += -locus[1] * energy * 1.7 + (Math.random() - 0.5) * energy;
    this.shockVel.z += energy * 2.2;
  }

  update(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    beat: number,
    anchors: HyperTectonAnchors | null,
    traumaScale = 1,
  ): void {
    const h = Math.min(0.04, Math.max(0.0005, dt));
    const spec =
      CINEMA_SHOT_SPECS.find((s) => s.id === this.activeShot) ??
      CINEMA_SHOT_SPECS[0];

    const goalPos = this.tmpGoalPos;
    const goalLook = this.tmpGoalLook;
    let goalFov = spec.fov;
    let goalRoll = spec.roll;

    const envR = anchors?.envelopeRadius ?? 4.5;
    const intR = anchors?.interiorRadius ?? 2.5;
    const vSpan = anchors?.verticalSpan ?? 5.0;

    if (this.activeTransition === 'vertigo' && this.userMode === 0) {
      // HITCHCOCK VERTIGO DOLLY-ZOOM: Constant framed width (1.85m) as FOV narrows 72 -> 17 deg!
      const p = this.specialProgress;
      goalFov = 72 - p * 55;
      const halfRad = THREE.MathUtils.degToRad(goalFov * 0.5);
      const frustumHalfWidth = 1.85;
      const zollyDist = frustumHalfWidth / Math.max(0.08, Math.tan(halfRad));
      goalLook.set(0, 0.25, 0);
      goalPos.set(Math.sin(p * 0.8) * 0.95, 0.45 - p * 0.35, zollyDist);
      goalRoll = Math.sin(p * Math.PI * 2) * 0.08;
    } else if (this.activeTransition === 'epic-pullback' && this.userMode === 0) {
      // CONTINUOUS SINGULARITY PULL-BACK: 1.3m inside core -> 23m vast megastructure horizon!
      const p = Math.pow(this.specialProgress, 1.3);
      const dist = (1.35 + p * 21.5) * this.zoomScale;
      const az = elapsed * 0.12 + p * 0.65;
      goalLook.set(0, 0.3, 0);
      goalPos.set(
        Math.sin(az) * dist,
        0.4 + p * 2.8,
        Math.cos(az) * dist,
      );
      goalFov = 58 - p * 14;
      goalRoll = -0.03 * p;
    } else {
      switch (this.activeShot) {
        case 'morph-orbit': {
          // Physically breathes & pulls back/in with the machine's live envelopeRadius!
          const dist = Math.max(4.4, envR * 1.48 + 1.8) * this.zoomScale;
          const az = elapsed * 0.26 + this.orbitYaw;
          const elev =
            0.14 + Math.sin(elapsed * 0.19) * 0.16 + this.orbitPitch;
          goalLook.set(0, 0.25, 0);
          goalPos.set(
            Math.sin(az) * Math.cos(elev) * dist,
            Math.sin(elev) * dist + 0.4,
            Math.cos(az) * Math.cos(elev) * dist,
          );
          goalRoll = Math.sin(elapsed * 0.35) * 0.05;
          break;
        }

        case 'interior-dive': {
          // Flies INSIDE the hollow inverted shell, orbiting between the core & outer plates!
          const flyR = Math.max(1.65, intR * 0.64) * this.zoomScale;
          const az = beat * 0.22 + this.orbitYaw;
          const weaveY =
            Math.sin(beat * 0.31) * (vSpan * 0.22) + this.orbitPitch * 1.5;
          goalPos.set(Math.sin(az) * flyR, weaveY, Math.cos(az) * flyR);
          // Look slightly ahead along the interior orbital tangent toward the glowing shell & core!
          const lookAz = az + 1.15;
          goalLook.set(
            Math.sin(lookAz) * (flyR * 0.45),
            -weaveY * 0.35,
            Math.cos(lookAz) * (flyR * 0.45),
          );
          goalRoll = Math.cos(beat * 0.22) * 0.14;
          break;
        }

        case 'macro-fault-seams': {
          // Gantz-Graf 85mm Telephoto Macro skimming right off the shearing micro-plates!
          const surfR = (Math.min(4.2, envR * 0.55) + 1.35) * this.zoomScale;
          const az = -0.45 + Math.sin(elapsed * 0.32) * 0.42 + this.orbitYaw;
          const panY = Math.sin(elapsed * 0.48) * 1.15 + this.orbitPitch;
          goalLook.set(
            Math.sin(az) * (surfR * 0.35),
            panY * 0.7,
            Math.cos(az) * (surfR * 0.35),
          );
          goalPos.set(
            Math.sin(az + 0.28) * surfR,
            panY + 0.18,
            Math.cos(az + 0.28) * surfR,
          );
          break;
        }

        case 'helix-corkscrew': {
          // Spirals smoothly up and down the twisting non-Euclidean vertical spine!
          const spiralPhase = Math.sin(elapsed * 0.38);
          const dist = Math.max(3.8, envR * 1.05 + 1.4) * this.zoomScale;
          const az = elapsed * 0.62 + spiralPhase * 1.2 + this.orbitYaw;
          const yPos = spiralPhase * (vSpan * 0.42) + this.orbitPitch * 2.0;
          goalPos.set(Math.sin(az) * dist, yPos, Math.cos(az) * dist);
          goalLook.set(0, yPos * 0.35, 0);
          goalRoll = 0.11 * Math.cos(elapsed * 0.38);
          break;
        }

        case 'cunningham-boom-track': {
          // Glides smoothly alongside the live whipping Cunningham robotic striker boom!
          if (anchors?.primaryBoomTip) {
            anchors.primaryBoomTip.updateMatrixWorld(true);
            this.tmpTipWorld.set(0, 0, 0);
            anchors.primaryBoomTip.localToWorld(this.tmpTipWorld);

            goalLook.copy(this.tmpTipWorld).multiplyScalar(0.75);
            const offsetAz = elapsed * 0.25 + this.orbitYaw;
            const d = 2.65 * this.zoomScale;
            goalPos.set(
              this.tmpTipWorld.x + Math.sin(offsetAz) * d,
              this.tmpTipWorld.y + 0.65 + this.orbitPitch,
              this.tmpTipWorld.z + Math.cos(offsetAz) * d,
            );
          } else {
            goalLook.set(1.8, 0, 0);
            goalPos.set(3.2, 0.8, 3.2);
          }
          break;
        }

        case 'low-horizon-dutch': {
          // Surreal obsidian-mercury floor skimmer looking up into the megastructure!
          const dist = Math.max(5.2, envR * 1.25 + 1.5) * this.zoomScale;
          const az = 0.52 + Math.sin(elapsed * 0.22) * 0.35 + this.orbitYaw;
          goalLook.set(0, vSpan * 0.16, 0);
          goalPos.set(
            Math.sin(az) * dist,
            -3.35 + Math.max(-0.4, this.orbitPitch),
            Math.cos(az) * dist,
          );
          break;
        }

        case 'wrist-snorricam': {
          // Rigidly mounted to the Cunningham Robotic Striker Wrist!
          if (anchors?.primaryBoomTip) {
            anchors.primaryBoomTip.updateMatrixWorld(true);
            goalLook.set(0, 0, 0); // Look back inward/across at impact zone & core!
            goalPos.set(
              0.25 + this.orbitYaw * 0.5,
              0.38 + this.orbitPitch * 0.5,
              -1.45 * this.zoomScale,
            );
            anchors.primaryBoomTip.localToWorld(goalPos);
          } else {
            goalLook.set(0, 0, 0);
            goalPos.set(0, 1.5, 3.5);
          }
          break;
        }

        case 'axial-mandala': {
          // Polar axis view down through the counter-rotating fractal gyro-shells!
          const hDist = Math.max(7.5, vSpan * 1.15 + 3.0) * this.zoomScale;
          const spin = elapsed * 0.18 + this.orbitYaw;
          goalLook.set(0, 0, 0);
          goalPos.set(
            Math.sin(spin) * 0.75,
            hDist,
            Math.cos(spin) * 0.75 + 0.01,
          );
          break;
        }
      }
    }

    // Apply editorial transition dynamics:
    // - 'hard' / 'wrist-snorricam' / 'vertigo' snap immediately
    // - 'morph-follow' glides organically (speed 2.8) so the camera physically rides transformations!
    // - 'whip' snaps fast (speed 18.0)
    const isInstant =
      this.activeTransition === 'hard' ||
      this.activeShot === 'wrist-snorricam' ||
      this.activeTransition === 'vertigo';

    if (isInstant) {
      this.currentPos.copy(goalPos);
      this.currentLook.copy(goalLook);
      this.currentFov = goalFov;
      this.currentRoll = goalRoll;
    } else {
      const speed = this.activeTransition === 'whip' ? 18.0 : 2.85;
      const alpha = 1 - Math.exp(-speed * h);
      this.currentPos.lerp(goalPos, alpha);
      this.currentLook.lerp(goalLook, alpha);
      this.currentFov += (goalFov - this.currentFov) * alpha;
      this.currentRoll += (goalRoll - this.currentRoll) * alpha;
    }

    this.whipImpulseRoll *= Math.exp(-15 * h);

    // Seismic impulse spring
    const springK = 220;
    const damp = 18;
    this.shockVel.x += (-springK * this.shockPos.x - damp * this.shockVel.x) * h;
    this.shockVel.y += (-springK * this.shockPos.y - damp * this.shockVel.y) * h;
    this.shockVel.z += (-springK * this.shockPos.z - damp * this.shockVel.z) * h;
    this.shockPos.addScaledVector(this.shockVel, h);

    this.trauma = Math.max(0, this.trauma - h * 3.1);
    const shake = this.trauma * this.trauma * 0.13 * traumaScale;
    const jx = (Math.sin(elapsed * 107.3) + (Math.random() - 0.5)) * shake;
    const jy = (Math.cos(elapsed * 123.7) + (Math.random() - 0.5)) * shake;

    if (Math.abs(camera.fov - this.currentFov) > 0.04) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }

    camera.position.set(
      this.currentPos.x + (this.shockPos.x * 0.08 + jx) * traumaScale,
      this.currentPos.y + (this.shockPos.y * 0.08 + jy) * traumaScale,
      this.currentPos.z + this.shockPos.z * 0.09 * traumaScale,
    );

    const netRoll = this.currentRoll + this.whipImpulseRoll + jx * 0.3;
    camera.up.set(Math.sin(netRoll), Math.cos(netRoll), 0);
    camera.lookAt(this.currentLook);
  }
}
