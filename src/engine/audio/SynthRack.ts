import type { ImpulseEvent } from '../core/types';
import { buildProceduralBreakKit, type SynthesizedBreakKit } from './BreakBufferLab';

export interface SynthMacroState {
  metallicTension: number; // 0..1
  brutalDrive: number; // 0..1
  decayScale: number; // 0.25..2.5
  strain: number; // 0..1.5 continuous tensile strain
}

/**
 * Custom IDM / Breakcore + Physical-Modeling Synthesis Rack.
 *
 * Every voice corresponds 1:1 with physical subsystems of a Sonobjet,
 * spatializing each mechanical impact according to its 3D locus.
 */
export class SynthRack {
  private readonly ctx: AudioContext;
  private readonly dryBus: GainNode;
  private readonly reverbSend: GainNode;
  private readonly noiseBuffer: AudioBuffer;
  private breakKit: SynthesizedBreakKit;
  private readonly driveCurve: Float32Array<ArrayBuffer>;

  // Continuous mechanical strain voice (servo whine + stressed cable resonance)
  private strainCarrier: OscillatorNode | null = null;
  private strainMod: OscillatorNode | null = null;
  private strainModGain: GainNode | null = null;
  private strainFilter: BiquadFilterNode | null = null;
  private strainGain: GainNode | null = null;

  constructor(
    ctx: AudioContext,
    dryBus: GainNode,
    reverbSend: GainNode,
    bpm = 168,
  ) {
    this.ctx = ctx;
    this.dryBus = dryBus;
    this.reverbSend = reverbSend;
    this.noiseBuffer = this.createWhiteNoiseBuffer();
    this.breakKit = buildProceduralBreakKit(ctx, bpm);
    this.driveCurve = this.createSaturationCurve(3.4);
    this.initContinuousStrainVoice();
  }

  rebuildBreakForBpm(bpm: number): void {
    this.breakKit = buildProceduralBreakKit(this.ctx, bpm);
  }

  updateContinuousStrain(macros: SynthMacroState): void {
    if (
      !this.strainGain ||
      !this.strainCarrier ||
      !this.strainMod ||
      !this.strainModGain ||
      !this.strainFilter
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    const s = Math.max(0, Math.min(1.5, macros.strain));
    const targetGain = s > 0.03 ? Math.min(0.24, Math.pow(s, 1.35) * 0.18) : 0;
    const baseFreq = 92 + s * 310 + macros.metallicTension * 140;

    this.strainGain.gain.setTargetAtTime(targetGain, now, 0.025);
    this.strainCarrier.frequency.setTargetAtTime(baseFreq, now, 0.03);
    this.strainMod.frequency.setTargetAtTime(baseFreq * 2.718, now, 0.03);
    this.strainModGain.gain.setTargetAtTime(80 + s * 640, now, 0.03);
    this.strainFilter.frequency.setTargetAtTime(650 + s * 3800, now, 0.03);
  }

  trigger(event: ImpulseEvent, macros: SynthMacroState): void {
    const t = Math.max(this.ctx.currentTime + 0.001, event.audioTime || 0);
    const vel = Math.max(0.05, Math.min(1.4, event.velocity));
    const pan = Math.max(-0.92, Math.min(0.92, event.locus[0] * 0.8));

    switch (event.subsystem) {
      case 'sub-rupture':
        this.playSubRupture(t, vel, event.pitchRatio, event.decay, macros);
        break;
      case 'spine-shear':
        this.playSpineShear(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'break-shred':
        this.playBreakShred(
          t,
          vel,
          event.pitchRatio,
          event.decay,
          event.sliceIndex ?? 0,
          Boolean(event.reverse),
          pan,
          macros,
        );
        break;
      case 'fin-cascade':
        this.playFinCascade(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'piston-snap':
        this.playPistonSnap(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'modal-clang':
        this.playModalClang(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'core-implode':
        this.playCoreImplode(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'arc-discharge':
        this.playArcDischarge(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
    }
  }

  private routeSpatial(
    source: AudioNode,
    pan: number,
    reverbAmount: number,
    stopTime: number,
  ): void {
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    source.connect(panner);
    panner.connect(this.dryBus);

    let sendGain: GainNode | null = null;
    if (reverbAmount > 0.01) {
      sendGain = this.ctx.createGain();
      sendGain.gain.value = reverbAmount;
      panner.connect(sendGain);
      sendGain.connect(this.reverbSend);
    }

    const cleanupDelayMs = Math.max(80, (stopTime - this.ctx.currentTime + 0.15) * 1000);
    setTimeout(() => {
      try {
        source.disconnect();
        panner.disconnect();
        sendGain?.disconnect();
      } catch {
        // Ignore already-disconnected nodes
      }
    }, cleanupDelayMs);
  }

  /**
   * 1. SUB-RUPTURE: Heavy seismic kick with fast pitch snap + saturated punch transient
   */
  private playSubRupture(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.08, Math.min(0.65, 0.28 * decay * macros.decayScale));
    const osc = this.ctx.createOscillator();
    const clickOsc = this.ctx.createOscillator();
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.driveCurve;

    const env = this.ctx.createGain();
    const clickGain = this.ctx.createGain();

    const baseHz = 41 * Math.max(0.65, Math.min(1.8, pitch));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseHz * 5.6, t);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 1.45, t + 0.024);
    osc.frequency.exponentialRampToValueAtTime(baseHz, t + dur);

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(baseHz * 14, t);
    clickOsc.frequency.exponentialRampToValueAtTime(90, t + 0.016);

    clickGain.gain.setValueAtTime(0.55 * vel, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.95 * vel, t + 0.0025);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(shaper);
    clickOsc.connect(clickGain);
    clickGain.connect(shaper);
    shaper.connect(env);

    this.routeSpatial(env, 0, 0.08, t + dur);

    osc.start(t);
    clickOsc.start(t);
    osc.stop(t + dur + 0.01);
    clickOsc.stop(t + 0.025);
  }

  /**
   * 2. SPINE-SHEAR: Hyper-compressed IDM/breakcore snare + metallic plate snap
   */
  private playSpineShear(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.04, Math.min(0.45, 0.16 * decay * macros.decayScale));
    const mode1 = this.ctx.createOscillator();
    const mode2 = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();

    const fBase = 198 * pitch * (0.9 + macros.metallicTension * 0.35);
    mode1.type = 'triangle';
    mode2.type = 'sine';
    mode1.frequency.setValueAtTime(fBase * 1.8, t);
    mode1.frequency.exponentialRampToValueAtTime(fBase, t + 0.022);
    mode2.frequency.setValueAtTime(fBase * 2.93, t);
    mode2.frequency.exponentialRampToValueAtTime(fBase * 1.69, t + 0.028);

    bodyGain.gain.setValueAtTime(0.55 * vel, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.65);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400 * pitch + macros.metallicTension * 1600, t);
    bp.Q.value = 1.4 + macros.metallicTension * 2.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.78 * vel, t + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const mix = this.ctx.createWaveShaper();
    mix.curve = this.driveCurve;

    mode1.connect(bodyGain);
    mode2.connect(bodyGain);
    bodyGain.connect(mix);

    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(mix);

    this.routeSpatial(mix, pan, 0.22, t + dur);

    mode1.start(t);
    mode2.start(t);
    noise.start(t);
    mode1.stop(t + dur + 0.01);
    mode2.stop(t + dur + 0.01);
    noise.stop(t + dur + 0.01);
  }

  /**
   * 3. BREAK-SHRED: 16-slice procedural breakbeat chopper with pitch/reverse/filter
   */
  private playBreakShred(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    sliceIndex: number,
    reverse: boolean,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const src = this.ctx.createBufferSource();
    src.buffer = reverse ? this.breakKit.reversed : this.breakKit.forward;
    const rate = Math.max(0.35, Math.min(3.8, pitch));
    src.playbackRate.setValueAtTime(rate, t);

    const safeSlice = ((Math.floor(sliceIndex) % 16) + 16) % 16;
    const offset = safeSlice * this.breakKit.sliceDurationSec;
    const playDur = Math.max(
      0.018,
      Math.min(
        0.35,
        (this.breakKit.sliceDurationSec / rate) * Math.min(1.6, decay * 1.15),
      ),
    );

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = 1800 + macros.metallicTension * 2600;
    filter.Q.value = 1.8;
    filter.gain.value = 3 + macros.brutalDrive * 6;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.86 * vel, t + 0.002);
    env.gain.setValueAtTime(0.82 * vel, Math.max(t + 0.003, t + playDur - 0.012));
    env.gain.exponentialRampToValueAtTime(0.0001, t + playDur);

    src.connect(filter);
    filter.connect(env);
    this.routeSpatial(env, pan * 0.55, 0.14, t + playDur);

    src.start(t, offset, playDur + 0.01);
    src.stop(t + playDur + 0.015);
  }

  /**
   * 4. FIN-CASCADE: Ultra-crisp titanium cooling-fin micro-percussion (ideal for 64th/128th ratchets)
   */
  private playFinCascade(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.01, Math.min(0.14, 0.036 * decay * macros.decayScale));
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const metallic = this.ctx.createOscillator();
    metallic.type = 'square';
    metallic.frequency.setValueAtTime(
      (4200 + macros.metallicTension * 3100) * pitch,
      t,
    );

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5400 * Math.max(0.6, Math.min(1.8, pitch)), t);
    hp.Q.value = 2.4 + macros.metallicTension * 3.5;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.46 * vel, t + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const metalGain = this.ctx.createGain();
    metalGain.gain.value = 0.26;

    noise.connect(hp);
    metallic.connect(metalGain);
    metalGain.connect(hp);
    hp.connect(env);

    this.routeSpatial(env, pan, 0.12, t + dur);

    noise.start(t);
    metallic.start(t);
    noise.stop(t + dur + 0.008);
    metallic.stop(t + dur + 0.008);
  }

  /**
   * 5. PISTON-SNAP: Pneumatic lock-in thud + pressurized air-valve release
   */
  private playPistonSnap(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.04, Math.min(0.32, 0.11 * decay * macros.decayScale));
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 135 * pitch;
    osc.frequency.setValueAtTime(base * 2.8, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.035);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(320, t + dur);
    lp.Q.value = 4.5;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4100 * pitch;
    bp.Q.value = 5.0;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.62 * vel, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp);
    noise.connect(bp);
    lp.connect(env);
    bp.connect(env);

    this.routeSpatial(env, pan, 0.25, t + dur);

    osc.start(t);
    noise.start(t);
    osc.stop(t + dur + 0.01);
    noise.stop(t + dur + 0.01);
  }

  /**
   * 6. MODAL-CLANG: 5-partial inharmonic machined steel plate resonator (pure Autechre metal)
   */
  private playModalClang(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const ratios = [1.0, 1.584, 2.241, 2.917, 4.132];
    const dur = Math.max(
      0.06,
      Math.min(0.85, (0.24 + macros.metallicTension * 0.28) * decay * macros.decayScale),
    );
    const baseHz = 260 * pitch * (0.85 + macros.metallicTension * 0.55);

    const sum = this.ctx.createGain();
    sum.gain.value = 0.55 * vel;

    ratios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseHz * ratio * 1.02, t);
      osc.frequency.exponentialRampToValueAtTime(baseHz * ratio, t + 0.018);

      const modeDecay = dur / (1 + idx * 0.42);
      const amp = 0.38 / (1 + idx * 0.35);
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + modeDecay);

      osc.connect(g);
      g.connect(sum);
      osc.start(t);
      osc.stop(t + modeDecay + 0.01);
    });

    this.routeSpatial(sum, pan, 0.36, t + dur);
  }

  /**
   * 7. CORE-IMPLODE: Folded West-Coast FM sub-monolith bass pulse
   */
  private playCoreImplode(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.08, Math.min(0.7, 0.26 * decay * macros.decayScale));
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const folder = this.ctx.createWaveShaper();
    folder.curve = this.driveCurve;
    const lp = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    const f0 = 55 * pitch;
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(f0, t);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(f0 * (1.5 + macros.metallicTension * 0.5), t);
    modGain.gain.setValueAtTime(f0 * (2.2 + macros.brutalDrive * 5.0), t);
    modGain.gain.exponentialRampToValueAtTime(f0 * 0.25, t + dur * 0.8);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1900 + macros.brutalDrive * 2400, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + dur);
    lp.Q.value = 3.2;

    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.72 * vel, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(folder);
    folder.connect(lp);
    lp.connect(env);

    this.routeSpatial(env, pan * 0.3, 0.16, t + dur);

    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.01);
    mod.stop(t + dur + 0.01);
  }

  /**
   * 8. ARC-DISCHARGE: High-voltage irrational-ratio FM chirp / electro-mechanical spark
   */
  private playArcDischarge(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.025, Math.min(0.28, 0.085 * decay * macros.decayScale));
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const env = this.ctx.createGain();

    const startHz = 1480 * pitch;
    const endHz = 210 * pitch;
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(startHz, t);
    carrier.frequency.exponentialRampToValueAtTime(endHz, t + dur);

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(startHz * 1.4142, t);
    mod.frequency.exponentialRampToValueAtTime(endHz * 3.1415, t + dur);

    modGain.gain.setValueAtTime(1600 * (0.4 + macros.brutalDrive), t);
    modGain.gain.exponentialRampToValueAtTime(20, t + dur);

    env.gain.setValueAtTime(0.45 * vel, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);

    this.routeSpatial(env, pan, 0.28, t + dur);

    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.01);
    mod.stop(t + dur + 0.01);
  }

  private initContinuousStrainVoice(): void {
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.value = 110;
    mod.type = 'sine';
    mod.frequency.value = 298;
    modGain.gain.value = 120;

    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 6.5;

    gain.gain.value = 0;

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryBus);
    gain.connect(this.reverbSend);

    carrier.start();
    mod.start();

    this.strainCarrier = carrier;
    this.strainMod = mod;
    this.strainModGain = modGain;
    this.strainFilter = filter;
    this.strainGain = gain;
  }

  private createWhiteNoiseBuffer(): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * 0.6);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private createSaturationCurve(drive: number): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    return curve;
  }
}
