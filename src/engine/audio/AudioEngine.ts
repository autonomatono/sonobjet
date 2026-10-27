import type { ImpulseEvent } from '../core/types';
import { createFractureWorkletNode } from './FractureWorklet';
import { SynthRack, type SynthMacroState } from './SynthRack';

export interface FractureBusParams {
  stutterGate: number;
  grainMs: number;
  combMix: number;
  combFreq: number;
  combFeedback: number;
  crush: number;
}

/**
 * Master WebAudio Engine + Spatial Brutalist Chamber + AudioWorklet Insert + Recording Tap.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private rack: SynthRack | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private timeDomainData = new Float32Array(256);
  private muted = false;
  private volume = 0.85;
  private initPromise: Promise<void> | null = null;

  async ensureStarted(bpm = 168): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.initializeGraph(bpm);
    await this.initPromise;
  }

  private async initializeGraph(bpm: number): Promise<void> {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const dryBus = ctx.createGain();
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.28;

    const convolver = ctx.createConvolver();
    convolver.buffer = this.buildBrutalistChamberIR(ctx);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.42;

    reverbSend.connect(convolver);
    convolver.connect(reverbReturn);

    const preFxMix = ctx.createGain();
    dryBus.connect(preFxMix);
    reverbReturn.connect(preFxMix);

    // Insert custom AudioWorklet processor (or clean direct wire if unavailable)
    const worklet = await createFractureWorkletNode(ctx);
    this.workletNode = worklet;

    // Punchy bus compressor glued like a hardware VCA
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -13;
    comp.knee.value = 6;
    comp.ratio.value = 5.5;
    comp.attack.value = 0.003;
    comp.release.value = 0.085;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.muted ? 0 : this.volume;
    this.masterGain = masterGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.65;
    this.analyser = analyser;
    this.timeDomainData = new Float32Array(analyser.fftSize);

    const recordDest = ctx.createMediaStreamDestination();
    this.recordDest = recordDest;

    if (worklet) {
      preFxMix.connect(worklet);
      worklet.connect(comp);
    } else {
      preFxMix.connect(comp);
    }

    comp.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    masterGain.connect(recordDest);

    this.rack = new SynthRack(ctx, dryBus, reverbSend, bpm);

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
  }

  isReady(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() * 0.001;
  }

  setBpm(bpm: number): void {
    this.rack?.rebuildBreakForBpm(bpm);
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1.2, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.015,
      );
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.015,
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  triggerImpulse(event: ImpulseEvent, macros: SynthMacroState): void {
    if (!this.rack || !this.ctx || this.ctx.state !== 'running') return;
    this.rack.trigger(event, macros);
  }

  updateContinuous(macros: SynthMacroState, fx: FractureBusParams): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.rack?.updateContinuousStrain(macros);

    if (this.workletNode) {
      const now = this.ctx.currentTime;
      const p = this.workletNode.parameters;
      p.get('stutterGate')?.setValueAtTime(fx.stutterGate, now);
      p.get('grainMs')?.setTargetAtTime(fx.grainMs, now, 0.012);
      p.get('combMix')?.setTargetAtTime(fx.combMix, now, 0.018);
      p.get('combFreq')?.setTargetAtTime(fx.combFreq, now, 0.018);
      p.get('combFeedback')?.setTargetAtTime(fx.combFeedback, now, 0.02);
      p.get('crush')?.setTargetAtTime(fx.crush, now, 0.015);
    }
  }

  getWaveformSnapshot(): Float32Array {
    if (!this.analyser) return this.timeDomainData;
    this.analyser.getFloatTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  getRecordingAudioStream(): MediaStream | null {
    return this.recordDest?.stream ?? null;
  }

  private buildBrutalistChamberIR(ctx: AudioContext): AudioBuffer {
    // Tight 0.38s cold architectural concrete test-chamber early reflections + tail
    const duration = 0.38;
    const len = Math.floor(ctx.sampleRate * duration);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    const L = ir.getChannelData(0);
    const R = ir.getChannelData(1);

    // Distinct concrete wall slap-backs (7ms, 13ms, 21ms, 34ms)
    const earlyMs = [7.2, 13.4, 21.8, 33.5, 49.1];
    for (const ms of earlyMs) {
      const idx = Math.floor((ms * 0.001) * ctx.sampleRate);
      if (idx < len) {
        L[idx] += 0.45 * Math.exp(-ms * 0.03);
        R[Math.min(len - 1, idx + 19)] += 0.45 * Math.exp(-ms * 0.03);
      }
    }

    for (let i = 0; i < len; i++) {
      const t = i / len;
      const decay = Math.pow(1 - t, 3.4) * 0.25;
      L[i] += (Math.random() * 2 - 1) * decay;
      R[i] += (Math.random() * 2 - 1) * decay;
    }
    return ir;
  }
}
