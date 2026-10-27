import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type { ImpulseEvent, SubsystemId } from '../../engine/core/types';

/**
 * Live Microphone Acoustic Exciter:
 * Claps, finger snaps, beatboxing, or desk percussion are converted into
 * physical kinetic impulses + spectral centroid modulation!
 */
export class MicSensor {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins = new Uint8Array(128);
  private active = false;
  private prevRms = 0;
  private cooldownSec = 0;

  isActive(): boolean {
    return this.active;
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
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      src.connect(this.analyser);
      this.freqBins = new Uint8Array(this.analyser.frequencyBinCount);
      this.active = true;
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop(): void {
    this.active = false;
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
  }

  poll(
    dt: number,
    matrix: ModulationMatrix,
    onImpulse: (ev: ImpulseEvent) => void,
  ): void {
    if (!this.active || !this.analyser) {
      matrix.setSource('mic.energy', 0);
      return;
    }

    this.analyser.getByteFrequencyData(this.freqBins);
    let weightedSum = 0;
    let magSum = 0;
    let sqSum = 0;
    const n = this.freqBins.length;
    for (let i = 0; i < n; i++) {
      const v = this.freqBins[i] / 255;
      sqSum += v * v;
      weightedSum += i * v;
      magSum += v;
    }

    const rms = Math.min(1, Math.sqrt(sqSum / n) * 2.4);
    const centroid = magSum > 0.01 ? Math.min(1, weightedSum / (magSum * n * 0.45)) : 0;

    matrix.setSource('mic.energy', rms);
    matrix.setSource('mic.centroid', centroid);

    this.cooldownSec = Math.max(0, this.cooldownSec - dt);
    const onsetDelta = rms - this.prevRms;
    this.prevRms = rms * 0.7 + this.prevRms * 0.3;

    if (onsetDelta > 0.16 && rms > 0.22 && this.cooldownSec <= 0) {
      this.cooldownSec = 0.075;
      const subsystem: SubsystemId =
        centroid < 0.28
          ? 'sub-rupture'
          : centroid < 0.58
            ? 'spine-shear'
            : 'fin-cascade';
      onImpulse({
        subsystem,
        velocity: Math.min(1.3, 0.55 + rms * 0.9),
        pitchRatio: 0.75 + centroid * 0.85,
        decay: 0.8,
        locus: [(centroid - 0.5) * 1.6, (rms - 0.3) * 1.2, 0.4],
        audioTime: 0,
        beat: 0,
        origin: 'sensor',
      });
    }
  }
}
