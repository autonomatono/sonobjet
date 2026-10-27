import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type { ImpulseEvent } from '../../engine/core/types';

const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/**
 * Live Vision Sensor combining:
 * 1. MediaPipe 3D Two-Hand Landmark Tracking (`@mediapipe/tasks-vision`)
 *    - Inter-hand span -> Tectonic CAD Spread & Strain
 *    - Left/Right Thumb-Index Pinch -> Continuous Drill/Alloy modulation + Kinetic Strike on snap!
 * 2. Instant Zero-Model Optical Motion Energy Tracker (works immediately on webcam open, even offline!)
 */
export class MediaPipeSensor {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private landmarker: HandLandmarker | null = null;
  private active = false;
  private statusText = 'OFFLINE';

  private motionCanvas: HTMLCanvasElement;
  private motionCtx: CanvasRenderingContext2D | null;
  private prevLuma: Uint8Array | null = null;

  private lastVideoTime = -1;
  private prevLeftPinch = 0;
  private prevRightPinch = 0;
  private prevWristPos = { x: 0.5, y: 0.5 };

  constructor() {
    this.motionCanvas = document.createElement('canvas');
    this.motionCanvas.width = 48;
    this.motionCanvas.height = 36;
    this.motionCtx = this.motionCanvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): string {
    return this.statusText;
  }

  async toggle(): Promise<boolean> {
    if (this.active) {
      this.stop();
      return false;
    }
    return this.start();
  }

  async start(): Promise<boolean> {
    if (this.active) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.statusText = 'NO CAMERA API';
      return false;
    }

    try {
      this.statusText = 'REQUESTING CAM...';
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = this.stream;
      await video.play();
      this.video = video;
      this.active = true;
      this.statusText = 'OPTICAL ACTIVE // LOADING MEDIAPIPE...';

      // Load MediaPipe HandLandmarker asynchronously using our self-hosted WASM bundle!
      this.initHandLandmarker().catch((err) => {
        console.warn('[MediaPipeSensor] Falling back to optical motion only:', err);
        if (this.active) {
          this.statusText = 'OPTICAL MOTION MODE';
        }
      });

      return true;
    } catch (err) {
      console.warn('[MediaPipeSensor] Camera permission denied or unavailable:', err);
      this.statusText = 'CAM BLOCKED';
      this.stop();
      return false;
    }
  }

  private async initHandLandmarker(): Promise<void> {
    const wasmBase = new URL('./mediapipe-wasm', window.location.href).href;
    const vision = await FilesetResolver.forVisionTasks(wasmBase);
    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    } catch {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    }
    if (this.active) {
      this.statusText = 'MEDIAPIPE 2-HAND 3D';
    }
  }

  stop(): void {
    this.active = false;
    this.statusText = 'OFFLINE';
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video = null;
    this.prevLuma = null;
  }

  /**
   * Samples webcam frame, evaluates MediaPipe 3D hand gestures + optical motion,
   * updates ModulationMatrix, emits pinch-snap ImpulseEvents, and renders PIP skeleton!
   */
  poll(
    matrix: ModulationMatrix,
    pipCanvas: HTMLCanvasElement | null,
    onImpulse: (ev: ImpulseEvent) => void,
    onHandStrain: (x: number, y: number, tension: number, active: boolean) => void,
  ): void {
    if (!this.active || !this.video || this.video.readyState < 2) {
      matrix.setSource('mediapipe.active', 0);
      return;
    }

    matrix.setSource('mediapipe.active', 1);

    // 1. Zero-latency optical frame-differencing energy
    let motionEnergy = 0;
    if (this.motionCtx) {
      const w = this.motionCanvas.width;
      const h = this.motionCanvas.height;
      this.motionCtx.drawImage(this.video, 0, 0, w, h);
      const img = this.motionCtx.getImageData(0, 0, w, h).data;
      if (!this.prevLuma || this.prevLuma.length !== w * h) {
        this.prevLuma = new Uint8Array(w * h);
      }
      let diffSum = 0;
      for (let i = 0, p = 0; i < img.length; i += 4, p++) {
        const luma = (img[i] * 77 + img[i + 1] * 150 + img[i + 2] * 29) >> 8;
        diffSum += Math.abs(luma - this.prevLuma[p]);
        this.prevLuma[p] = luma;
      }
      motionEnergy = Math.min(1, diffSum / (w * h * 26));
      matrix.setSource('webcam.motion', motionEnergy);
    }

    const pipCtx = pipCanvas?.getContext('2d') ?? null;
    if (pipCanvas && pipCtx) {
      const cw = pipCanvas.width;
      const ch = pipCanvas.height;
      pipCtx.save();
      pipCtx.scale(-1, 1);
      pipCtx.drawImage(this.video, -cw, 0, cw, ch);
      pipCtx.restore();
      pipCtx.fillStyle = 'rgba(8, 11, 16, 0.45)';
      pipCtx.fillRect(0, 0, cw, ch);
    }

    // 2. MediaPipe 3D Hand Landmarker
    if (this.landmarker && this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const result = this.landmarker.detectForVideo(
        this.video,
        performance.now(),
      );
      const hands = result.landmarks ?? [];

      if (hands.length > 0) {
        const h0 = hands[0];
        const wrist = h0[0];
        const vx = Math.hypot(
          wrist.x - this.prevWristPos.x,
          wrist.y - this.prevWristPos.y,
        );
        this.prevWristPos = { x: wrist.x, y: wrist.y };
        const handVel = Math.min(1.5, vx * 16);
        matrix.setSource('mediapipe.velocity', handVel);

        const pinch0 = this.computePinch(h0);
        const pinch1 = hands[1] ? this.computePinch(hands[1]) : 0;

        matrix.setSource('mediapipe.leftPinch', pinch0);
        matrix.setSource('mediapipe.rightPinch', pinch1);

        // Pinch-snap impulse detection
        if (pinch0 > 0.82 && this.prevLeftPinch <= 0.65) {
          onImpulse({
            subsystem: 'spine-shear',
            velocity: 1.05,
            pitchRatio: 0.75 + (1 - wrist.y) * 0.8,
            decay: 0.85,
            locus: [(0.5 - wrist.x) * 2, (0.5 - wrist.y) * 2, 0.4],
            audioTime: 0,
            beat: 0,
            origin: 'sensor',
          });
        }
        if (pinch1 > 0.82 && this.prevRightPinch <= 0.65 && hands[1]) {
          const w1 = hands[1][0];
          onImpulse({
            subsystem: 'arc-discharge',
            velocity: 1.0,
            pitchRatio: 0.85 + (1 - w1.y) * 0.9,
            decay: 0.9,
            locus: [(0.5 - w1.x) * 2, (0.5 - w1.y) * 2, 0.4],
            audioTime: 0,
            beat: 0,
            origin: 'sensor',
          });
        }
        this.prevLeftPinch = pinch0;
        this.prevRightPinch = pinch1;

        if (hands.length >= 2) {
          const p0 = hands[0][9]; // Middle MCP palm center
          const p1 = hands[1][9];
          const span = Math.max(
            0,
            Math.min(1.3, (Math.hypot(p0.x - p1.x, p0.y - p1.y) - 0.14) * 1.9),
          );
          matrix.setSource('mediapipe.handSpan', span);
          const midX = (0.5 - (p0.x + p1.x) * 0.5) * 2;
          const midY = (0.5 - (p0.y + p1.y) * 0.5) * 2;
          onHandStrain(midX, midY, span, span > 0.08);
        } else {
          matrix.setSource('mediapipe.handSpan', pinch0 * 0.45);
          onHandStrain(
            (0.5 - wrist.x) * 2,
            (0.5 - wrist.y) * 2,
            pinch0 * 0.55,
            pinch0 > 0.25,
          );
        }

        // Draw crisp skeletal overlay on PIP canvas
        if (pipCanvas && pipCtx) {
          const cw = pipCanvas.width;
          const ch = pipCanvas.height;
          hands.forEach((lm, hIdx) => {
            pipCtx.strokeStyle = hIdx === 0 ? '#7cc4ff' : '#ff9b4e';
            pipCtx.lineWidth = 1.5;
            for (const [a, b] of HAND_CONNECTIONS) {
              pipCtx.beginPath();
              pipCtx.moveTo((1 - lm[a].x) * cw, lm[a].y * ch);
              pipCtx.lineTo((1 - lm[b].x) * cw, lm[b].y * ch);
              pipCtx.stroke();
            }
            // Highlight thumb & index pinch tips
            for (const tipIdx of [4, 8]) {
              pipCtx.fillStyle = '#ffffff';
              pipCtx.beginPath();
              pipCtx.arc((1 - lm[tipIdx].x) * cw, lm[tipIdx].y * ch, 3, 0, Math.PI * 2);
              pipCtx.fill();
            }
          });
        }
      } else {
        // Fallback when hands leave frame: decay smoothly or use optical motion
        matrix.setSource('mediapipe.leftPinch', 0);
        matrix.setSource('mediapipe.rightPinch', 0);
        matrix.setSource('mediapipe.handSpan', motionEnergy * 0.45);
        onHandStrain(0, 0, 0, false);
      }
    } else if (!this.landmarker) {
      // Optical-only modulation while model downloads or if offline
      matrix.setSource('mediapipe.handSpan', motionEnergy * 0.75);
      if (motionEnergy > 0.52 && Math.random() < 0.25) {
        onImpulse({
          subsystem: 'fin-cascade',
          velocity: Math.min(1.1, motionEnergy * 1.3),
          pitchRatio: 0.9 + motionEnergy * 0.6,
          decay: 0.65,
          locus: [(Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.2, 0.3],
          audioTime: 0,
          beat: 0,
          origin: 'sensor',
        });
      }
    }
  }

  private computePinch(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const thumb = landmarks[4];
    const index = landmarks[8];
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const handScale = Math.max(
      0.04,
      Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y),
    );
    const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y) / handScale;
    // dist ~ 0.15 when pinched tight, ~ 0.9+ when open
    return Math.max(0, Math.min(1, 1 - (dist - 0.18) / 0.65));
  }
}
