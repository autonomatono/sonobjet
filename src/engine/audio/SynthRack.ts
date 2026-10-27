import type { ImpulseEvent } from '../core/types';
import {
  buildProceduralBreakKit,
  type SynthesizedBreakKit,
} from './BreakBufferLab';

export interface SynthMacroState {
  metallicTension: number; // 0..1
  brutalDrive: number; // 0..1
  decayScale: number; // 0.25..2.5
  strain: number; // 0..1.5 continuous tensile strain
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Vowel formant table [F1, F2, F3] in Hz: AH -> EH -> EE -> OH -> OO
const VOWEL_FORMANTS: Array<[number, number, number]> = [
  [730, 1090, 2440], // 0.00 AH
  [530, 1840, 2480], // 0.25 EH
  [280, 2290, 3010], // 0.50 EE
  [490, 880, 2380], // 0.75 OH
  [310, 850, 2220], // 1.00 OO
];

function sampleFormants(vowel: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, vowel)) * (VOWEL_FORMANTS.length - 1);
  const i0 = Math.floor(v);
  const i1 = Math.min(VOWEL_FORMANTS.length - 1, i0 + 1);
  const frac = v - i0;
  const a = VOWEL_FORMANTS[i0];
  const b = VOWEL_FORMANTS[i1];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ];
}

/**
 * Custom Compositional & Biomechanical Synthesis Rack.
 *
 * Combines pitched harmonic/melodic organs (Larynx Formant Lead, Bellows Polychord Choir,
 * Tuned 16-Rod Modal Harp, Wavefolded Monolith Bass) with visceral mechanical percussion
 * (Siege-Anvil Kick, Spine-Shear Snare, 16-Slice Break Chopper, Pneumatic Wind-Up Inhale).
 */
export class SynthRack {
  private readonly ctx: AudioContext;
  private readonly dryBus: GainNode;
  private readonly reverbSend: GainNode;
  private readonly pingPongInput: GainNode;
  private delayNodeL: DelayNode | null = null;
  private delayNodeR: DelayNode | null = null;
  private readonly noiseBuffer: AudioBuffer;
  private breakKit: SynthesizedBreakKit;
  private readonly driveCurve: Float32Array<ArrayBuffer>;

  private strainCarrier: OscillatorNode | null = null;
  private strainMod: OscillatorNode | null = null;
  private strainModGain: GainNode | null = null;
  private strainFilter: BiquadFilterNode | null = null;
  private strainGain: GainNode | null = null;

  constructor(
    ctx: AudioContext,
    dryBus: GainNode,
    reverbSend: GainNode,
    bpm = 164,
  ) {
    this.ctx = ctx;
    this.dryBus = dryBus;
    this.reverbSend = reverbSend;
    this.pingPongInput = ctx.createGain();
    this.noiseBuffer = this.createWhiteNoiseBuffer();
    this.breakKit = buildProceduralBreakKit(ctx, bpm);
    this.driveCurve = this.createSaturationCurve(3.1);
    this.initPingPongDelay(bpm);
    this.initContinuousStrainVoice();
  }

  rebuildBreakForBpm(bpm: number): void {
    this.breakKit = buildProceduralBreakKit(this.ctx, bpm);
    const step16 = 60 / Math.max(60, bpm) / 4;
    if (this.delayNodeL && this.delayNodeR) {
      const now = this.ctx.currentTime;
      this.delayNodeL.delayTime.setTargetAtTime(step16 * 3, now, 0.03);
      this.delayNodeR.delayTime.setTargetAtTime(step16 * 2, now, 0.03);
    }
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
    // Grounded F1 (43.65 Hz) low mechanical rumble ONLY during active manual drag — never pitch-glides!
    const targetGain = s > 0.14 ? Math.min(0.07, Math.pow(s - 0.14, 1.4) * 0.08) : 0;
    const baseFreq = 43.65;

    this.strainGain.gain.setTargetAtTime(targetGain, now, 0.025);
    this.strainCarrier.frequency.setTargetAtTime(baseFreq, now, 0.03);
    this.strainMod.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.03);
    this.strainModGain.gain.setTargetAtTime(18 + s * 65, now, 0.03);
    this.strainFilter.frequency.setTargetAtTime(180 + s * 420, now, 0.03);
  }

  trigger(event: ImpulseEvent, macros: SynthMacroState): void {
    const t = Math.max(this.ctx.currentTime + 0.001, event.audioTime || 0);
    const vel = Math.max(0.04, Math.min(1.4, event.velocity));
    const pan = Math.max(-0.9, Math.min(0.9, event.locus[0] * 0.78));

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
        this.playModalClang(t, vel, event, pan, macros);
        break;
      case 'core-implode':
        this.playCoreImplode(t, vel, event, pan, macros);
        break;
      case 'arc-discharge':
        this.playArcDischarge(t, vel, event.pitchRatio, event.decay, pan, macros);
        break;
      case 'larynx-lead':
        this.playLarynxLead(t, vel, event, pan, macros);
        break;
      case 'bellows-choir':
        this.playBellowsChoir(t, vel, event, pan, macros);
        break;
      case 'windup-inhale':
        this.playWindupInhale(t, vel, event, pan, macros);
        break;
      case 'acid-squelch':
        this.playAcidSquelch(t, vel, event, pan, macros);
        break;
      case 'glass-armonica':
        this.playGlassArmonica(t, vel, event, pan, macros);
        break;
      case 'glitch-chirp':
        this.playGlitchChirp(t, vel, event, pan, macros);
        break;
    }
  }

  private routeSpatial(
    source: AudioNode,
    pan: number,
    reverbAmount: number,
    stopTime: number,
    delayAmount = 0,
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

    let delayGain: GainNode | null = null;
    if (delayAmount > 0.01) {
      delayGain = this.ctx.createGain();
      delayGain.gain.value = delayAmount;
      panner.connect(delayGain);
      delayGain.connect(this.pingPongInput);
    }

    const cleanupDelayMs = Math.max(
      120,
      (stopTime - this.ctx.currentTime + 0.25) * 1000,
    );
    setTimeout(() => {
      try {
        source.disconnect();
        panner.disconnect();
        sendGain?.disconnect();
        delayGain?.disconnect();
      } catch {
        // Already disconnected
      }
    }, cleanupDelayMs);
  }

  /**
   * LARYNX-LEAD: Haunting Biomechanical Glottal Formant Lead Voice.
   * Articulates real modal melodies while morphing vocal tract formants (AH/EH/EE/OH/OO).
   */
  private playLarynxLead(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const freq = event.midiNote
      ? midiToHz(event.midiNote)
      : 261.63 * event.pitchRatio;
    const dur = Math.max(
      0.12,
      Math.min(3.5, (event.durationSec ?? 0.48) * macros.decayScale),
    );
    const vowel = event.vowel ?? 0.35;
    const [f1, f2, f3] = sampleFormants(vowel);
    const [f1End, f2End] = sampleFormants(Math.min(1, vowel + 0.28));

    const glottalA = this.ctx.createOscillator();
    const glottalB = this.ctx.createOscillator();
    glottalA.type = 'sawtooth';
    glottalB.type = 'triangle';

    // Subtle expressive pitch onset scoop + delayed vibrato
    glottalA.frequency.setValueAtTime(freq * 0.988, t);
    glottalA.frequency.exponentialRampToValueAtTime(freq, t + 0.035);
    glottalB.frequency.setValueAtTime(freq * 0.501, t);

    const vib = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vib.frequency.value = 5.4;
    vibGain.gain.setValueAtTime(0, t);
    vibGain.gain.linearRampToValueAtTime(freq * 0.011, t + Math.min(dur * 0.6, 0.28));
    vib.connect(vibGain);
    vibGain.connect(glottalA.frequency);

    const formantSum = this.ctx.createGain();
    const formantFreqs = [f1, f2, f3];
    const formantTargets = [f1End, f2End, f3];
    const formantGains = [0.65, 0.48, 0.24];
    const formantQs = [
      6.5 + macros.metallicTension * 4,
      8.5 + macros.metallicTension * 5,
      10.0,
    ];

    formantFreqs.forEach((fStart, i) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fStart, t);
      bp.frequency.exponentialRampToValueAtTime(formantTargets[i], t + dur * 0.85);
      bp.Q.value = formantQs[i];

      const fg = this.ctx.createGain();
      fg.gain.value = formantGains[i];

      glottalA.connect(bp);
      glottalB.connect(bp);
      bp.connect(fg);
      fg.connect(formantSum);
    });

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.driveCurve;

    const env = this.ctx.createGain();
    const atk = Math.min(0.035, dur * 0.18);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.46 * vel, t + atk);
    env.gain.setValueAtTime(0.38 * vel, Math.max(t + atk + 0.01, t + dur * 0.68));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    formantSum.connect(shaper);
    shaper.connect(env);

    this.routeSpatial(env, pan * 0.45, 0.52, t + dur);

    glottalA.start(t);
    glottalB.start(t);
    vib.start(t);
    glottalA.stop(t + dur + 0.02);
    glottalB.stop(t + dur + 0.02);
    vib.stop(t + dur + 0.02);
  }

  /**
   * BELLOWS-CHOIR: Lush, brooding Warp-style modal polychordal organ/pad
   * providing harmonic gravity and emotional architecture across sections.
   */
  private playBellowsChoir(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const notes =
      event.chordNotes && event.chordNotes.length > 0
        ? event.chordNotes
        : [53, 60, 65, 68]; // Fm default
    const dur = Math.max(0.4, Math.min(8.0, event.durationSec ?? 2.8));

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const peakCutoff = 950 + macros.metallicTension * 1900;
    lp.frequency.setValueAtTime(340, t);
    lp.frequency.exponentialRampToValueAtTime(peakCutoff, t + dur * 0.42);
    lp.frequency.exponentialRampToValueAtTime(280, t + dur);
    lp.Q.value = 1.6;

    const env = this.ctx.createGain();
    const atk = Math.min(0.32, dur * 0.22);
    const voiceScale = (0.26 * vel) / Math.max(1, Math.sqrt(notes.length));
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(voiceScale, t + atk);
    env.gain.setValueAtTime(voiceScale * 0.85, Math.max(t + atk, t + dur * 0.65));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const midi of notes) {
      const hz = midiToHz(midi);
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscB.type = 'triangle';
      oscA.frequency.setValueAtTime(hz * 0.9965, t);
      oscB.frequency.setValueAtTime(hz * 1.0035, t);
      oscA.connect(lp);
      oscB.connect(lp);
      oscA.start(t);
      oscB.start(t);
      oscA.stop(t + dur + 0.03);
      oscB.stop(t + dur + 0.03);
    }

    lp.connect(env);
    this.routeSpatial(env, pan * 0.25, 0.62, t + dur);
  }

  /**
   * WINDUP-INHALE: Reverse-envelope pneumatic air-intake & hydraulic cocking
   * leading directly into heavy downbeat impacts!
   */
  private playWindupInhale(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.12, Math.min(1.2, event.durationSec ?? 0.34));
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    // Pure dry mechanical air-valve rush — low Q so it never whistles or mews
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(650, t);
    hp.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.96);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, t);
    bp.frequency.exponentialRampToValueAtTime(
      3400 + macros.metallicTension * 900,
      t + dur * 0.96,
    );
    bp.Q.value = 1.15;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0005, t);
    env.gain.exponentialRampToValueAtTime(0.24 * vel, t + dur * 0.94);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(env);

    this.routeSpatial(env, pan, 0.16, t + dur);

    noise.start(t);
    noise.stop(t + dur + 0.01);
  }

  /**
   * SUB-RUPTURE: Siege-Hammer Anvil Impact (Seismic F1 Kick + Forged Anvil Knock)
   */
  private playSubRupture(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.1, Math.min(0.68, 0.31 * decay * macros.decayScale));
    const osc = this.ctx.createOscillator();
    const clickOsc = this.ctx.createOscillator();
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.driveCurve;

    const env = this.ctx.createGain();
    const clickGain = this.ctx.createGain();

    const baseHz = 43.65 * Math.max(0.65, Math.min(1.8, pitch)); // Grounded on F1 (43.65 Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseHz * 5.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 1.4, t + 0.025);
    osc.frequency.exponentialRampToValueAtTime(baseHz, t + dur);

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(baseHz * 15, t);
    clickOsc.frequency.exponentialRampToValueAtTime(95, t + 0.018);

    clickGain.gain.setValueAtTime(0.58 * vel, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.95 * vel, t + 0.0025);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(shaper);
    clickOsc.connect(clickGain);
    clickGain.connect(shaper);
    shaper.connect(env);

    this.routeSpatial(env, 0.12, 0.1, t + dur);

    osc.start(t);
    clickOsc.start(t);
    osc.stop(t + dur + 0.01);
    clickOsc.stop(t + 0.025);
  }

  /**
   * SPINE-SHEAR: Forged Anvil Snare + Metallic Shell Crack
   */
  private playSpineShear(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.045, Math.min(0.45, 0.17 * decay * macros.decayScale));
    const mode1 = this.ctx.createOscillator();
    const mode2 = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();

    const fBase = 174.61 * pitch * (0.95 + macros.metallicTension * 0.25); // F3 modal shell
    mode1.type = 'triangle';
    mode2.type = 'sine';
    mode1.frequency.setValueAtTime(fBase * 1.85, t);
    mode1.frequency.exponentialRampToValueAtTime(fBase, t + 0.022);
    mode2.frequency.setValueAtTime(fBase * 2.98, t);
    mode2.frequency.exponentialRampToValueAtTime(fBase * 1.66, t + 0.028);

    bodyGain.gain.setValueAtTime(0.56 * vel, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.65);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2500 * pitch + macros.metallicTension * 1400, t);
    bp.Q.value = 1.5 + macros.metallicTension * 2.4;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.76 * vel, t + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const mix = this.ctx.createWaveShaper();
    mix.curve = this.driveCurve;

    mode1.connect(bodyGain);
    mode2.connect(bodyGain);
    bodyGain.connect(mix);

    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(mix);

    this.routeSpatial(mix, pan, 0.24, t + dur);

    mode1.start(t);
    mode2.start(t);
    noise.start(t);
    mode1.stop(t + dur + 0.01);
    mode2.stop(t + dur + 0.01);
    noise.stop(t + dur + 0.01);
  }

  /**
   * BREAK-SHRED: 16-Slice Procedural Breakcore Chopper
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
    filter.frequency.value = 1800 + macros.metallicTension * 2400;
    filter.Q.value = 1.6;
    filter.gain.value = 2.5 + macros.brutalDrive * 5;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.84 * vel, t + 0.002);
    env.gain.setValueAtTime(
      0.8 * vel,
      Math.max(t + 0.003, t + playDur - 0.012),
    );
    env.gain.exponentialRampToValueAtTime(0.0001, t + playDur);

    src.connect(filter);
    filter.connect(env);
    this.routeSpatial(env, pan * 0.55, 0.15, t + playDur);

    src.start(t, offset, playDur + 0.01);
    src.stop(t + playDur + 0.015);
  }

  /**
   * FIN-CASCADE: Mantis-Claw Raker Comb Micro-Tick
   */
  private playFinCascade(
    t: number,
    vel: number,
    pitch: number,
    decay: number,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(0.01, Math.min(0.14, 0.034 * decay * macros.decayScale));
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const metallic = this.ctx.createOscillator();
    metallic.type = 'square';
    metallic.frequency.setValueAtTime(
      (4100 + macros.metallicTension * 2900) * pitch,
      t,
    );

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5600 * Math.max(0.6, Math.min(1.8, pitch)), t);
    hp.Q.value = 2.2 + macros.metallicTension * 3.0;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.42 * vel, t + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const metalGain = this.ctx.createGain();
    metalGain.gain.value = 0.24;

    noise.connect(hp);
    metallic.connect(metalGain);
    metalGain.connect(hp);
    hp.connect(env);

    this.routeSpatial(env, pan, 0.14, t + dur);

    noise.start(t);
    metallic.start(t);
    noise.stop(t + dur + 0.008);
    metallic.stop(t + dur + 0.008);
  }

  /**
   * PISTON-SNAP: Hydraulic Latch Lock & Valve Release
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
    const base = 130.81 * pitch;
    osc.frequency.setValueAtTime(base * 2.8, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.035);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3100, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    lp.Q.value = 4.2;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3900 * pitch;
    bp.Q.value = 4.8;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.58 * vel, t);
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
   * MODAL-CLANG: Tuned 16-Rod Plucked Steel Harp / Bell Resonator.
   * Honors exact `event.midiNote` so thematic Seed Motifs ring with crystalline pitch clarity!
   */
  private playModalClang(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const inharmonicSpread = macros.metallicTension * 0.18;
    const ratios = [
      1.0,
      2.0,
      3.0 + inharmonicSpread * 0.35,
      4.02 + inharmonicSpread * 0.9,
      5.41 + inharmonicSpread * 1.4,
    ];
    const dur = Math.max(
      0.12,
      Math.min(
        2.2,
        (event.durationSec ?? 0.65) * event.decay * macros.decayScale,
      ),
    );
    const baseHz = event.midiNote
      ? midiToHz(event.midiNote)
      : 261.63 * event.pitchRatio;

    const sum = this.ctx.createGain();
    sum.gain.value = 0.56 * vel;

    ratios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseHz * ratio * 1.006, t);
      osc.frequency.exponentialRampToValueAtTime(baseHz * ratio, t + 0.012);

      const modeDecay = dur / (1 + idx * 0.52);
      const amp = idx === 0 ? 0.52 : 0.32 / (1 + idx * 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + modeDecay);

      osc.connect(g);
      g.connect(sum);
      osc.start(t);
      osc.stop(t + modeDecay + 0.015);
    });

    this.routeSpatial(sum, pan, 0.46, t + dur, 0.2);
  }

  /**
   * CORE-IMPLODE: Pitched Wavefolded Monolith Bassline Voice
   */
  private playCoreImplode(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const dur = Math.max(
      0.12,
      Math.min(
        1.8,
        (event.durationSec ?? 0.38) * event.decay * macros.decayScale,
      ),
    );
    const carrier = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const folder = this.ctx.createWaveShaper();
    folder.curve = this.driveCurve;
    const lp = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    const f0 = event.midiNote
      ? midiToHz(event.midiNote)
      : 43.65 * event.pitchRatio; // F1 default
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(f0 * 2, t);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(f0, t);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(f0 * 2, t);
    modGain.gain.setValueAtTime(f0 * (2.5 + macros.brutalDrive * 5.5), t);
    modGain.gain.exponentialRampToValueAtTime(f0 * 0.3, t + dur * 0.85);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600 + macros.brutalDrive * 2200, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + dur);
    lp.Q.value = 3.0;

    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.76 * vel, t + 0.006);
    env.gain.setValueAtTime(0.65 * vel, Math.max(t + 0.01, t + dur * 0.6));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(folder);
    folder.connect(lp);
    subOsc.connect(env);
    lp.connect(env);

    this.routeSpatial(env, pan * 0.18, 0.14, t + dur);

    carrier.start(t);
    subOsc.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.015);
    subOsc.stop(t + dur + 0.015);
    mod.stop(t + dur + 0.015);
  }

  /**
   * ARC-DISCHARGE: Tail-Stinger / Flywheel Brake Spark Zap
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

    modGain.gain.setValueAtTime(1500 * (0.4 + macros.brutalDrive), t);
    modGain.gain.exponentialRampToValueAtTime(20, t + dur);

    env.gain.setValueAtTime(0.42 * vel, t);
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

  /**
   * ACID-SQUELCH: Liquid 303 / Buchla Dual-Cascade Resonant Acid Counterpoint.
   */
  private playAcidSquelch(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const baseHz = event.midiNote
      ? midiToHz(event.midiNote)
      : 174.61 * event.pitchRatio;
    const dur = Math.max(
      0.08,
      Math.min(0.65, (event.durationSec ?? 0.16) * macros.decayScale),
    );

    const oscSaw = this.ctx.createOscillator();
    const oscPulse = this.ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscPulse.type = 'square';

    // Optional pitch-glide snap from slightly above/below
    const glideStart = baseHz * (event.vowel && event.vowel > 0.5 ? 1.26 : 0.94);
    oscSaw.frequency.setValueAtTime(glideStart, t);
    oscSaw.frequency.exponentialRampToValueAtTime(baseHz, t + 0.028);
    oscPulse.frequency.setValueAtTime(baseHz * 0.5, t);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.36;
    oscPulse.connect(subGain);

    // Dual cascaded resonant lowpass (24dB/oct liquid acid squelch)
    const lp1 = this.ctx.createBiquadFilter();
    const lp2 = this.ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp2.type = 'lowpass';

    const peakCutoff = Math.min(
      6800,
      baseHz * (4.5 + vel * 6.5 + macros.metallicTension * 5.0),
    );
    const floorCutoff = Math.max(110, baseHz * 1.35);

    // Note: WebAudio lowpass BiquadFilter Q is in dB — keep Q tight so cascaded stages punch without whistling/mewing!
    lp1.Q.value = 4.2 + macros.metallicTension * 3.5;
    lp2.Q.value = 1.8 + macros.metallicTension * 1.6;

    lp1.frequency.setValueAtTime(floorCutoff * 1.4, t);
    lp1.frequency.exponentialRampToValueAtTime(peakCutoff, t + 0.018);
    lp1.frequency.exponentialRampToValueAtTime(floorCutoff, t + dur * 0.85);

    lp2.frequency.setValueAtTime(floorCutoff * 1.6, t);
    lp2.frequency.exponentialRampToValueAtTime(peakCutoff * 1.15, t + 0.02);
    lp2.frequency.exponentialRampToValueAtTime(floorCutoff * 1.1, t + dur * 0.9);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.driveCurve;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.28 * vel, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    oscSaw.connect(lp1);
    subGain.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(shaper);
    shaper.connect(env);

    this.routeSpatial(env, pan, 0.24, t + dur, 0.36);

    oscSaw.start(t);
    oscPulse.start(t);
    oscSaw.stop(t + dur + 0.02);
    oscPulse.stop(t + dur + 0.02);
  }

  /**
   * GLASS-ARMONICA: Ethereal Inharmonic Crystalline 3-Op FM / Bowed Quartz Halo.
   */
  private playGlassArmonica(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const freq = event.midiNote
      ? midiToHz(event.midiNote)
      : 523.25 * event.pitchRatio;
    const dur = Math.max(
      0.45,
      Math.min(4.8, (event.durationSec ?? 1.8) * macros.decayScale),
    );

    const carrierA = this.ctx.createOscillator();
    const carrierB = this.ctx.createOscillator();
    const mod1 = this.ctx.createOscillator();
    const mod2 = this.ctx.createOscillator();
    const mod1Gain = this.ctx.createGain();
    const mod2Gain = this.ctx.createGain();

    carrierA.type = 'sine';
    carrierB.type = 'sine';
    carrierA.frequency.value = freq;
    carrierB.frequency.value = freq * 1.0038; // Ethereal beating chorus

    // Non-integer quartz bell/glass overtone ratios
    mod1.type = 'sine';
    mod1.frequency.value = freq * 2.756;
    mod2.type = 'sine';
    mod2.frequency.value = freq * 5.404;

    mod1Gain.gain.setValueAtTime(freq * (0.45 + macros.metallicTension * 0.8), t);
    mod1Gain.gain.exponentialRampToValueAtTime(freq * 0.08, t + dur * 0.85);

    mod2Gain.gain.setValueAtTime(freq * 0.28, t);
    mod2Gain.gain.exponentialRampToValueAtTime(1.0, t + dur * 0.5);

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 280;

    const env = this.ctx.createGain();
    const attack = Math.min(0.18, dur * 0.22);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.17 * vel, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod1Gain.connect(carrierA.frequency);
    mod1Gain.connect(carrierB.frequency);
    mod2Gain.connect(carrierA.frequency);

    carrierA.connect(hp);
    carrierB.connect(hp);
    hp.connect(env);

    this.routeSpatial(env, pan, 0.68, t + dur, 0.44);

    carrierA.start(t);
    carrierB.start(t);
    mod1.start(t);
    mod2.start(t);
    const stopAt = t + dur + 0.03;
    carrierA.stop(stopAt);
    carrierB.stop(stopAt);
    mod1.stop(stopAt);
    mod2.stop(stopAt);
  }

  /**
   * GLITCH-CHIRP: Hyper-Fast Stepped S&H Digital Artifact / Buffer-Scrub / Modem Zap.
   */
  private playGlitchChirp(
    t: number,
    vel: number,
    event: ImpulseEvent,
    pan: number,
    macros: SynthMacroState,
  ): void {
    const steps = 6 + ((event.sliceIndex ?? 3) % 8);
    const stepDur = Math.max(0.009, 0.014 * event.decay);
    const totalDur = steps * stepDur;

    const carrier = this.ctx.createOscillator();
    const ringOsc = this.ctx.createOscillator();
    const ringVca = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    carrier.type = (event.sliceIndex ?? 0) % 2 === 0 ? 'square' : 'sawtooth';
    ringOsc.type = 'triangle';

    const baseHz = event.midiNote
      ? midiToHz(event.midiNote) * 2
      : 880 * event.pitchRatio;

    // Stepped S&H pitch staircase (zero glide — crisp digital quantization!)
    const ratios = [1.0, 2.37, 0.62, 3.85, 1.5, 5.12, 0.84, 2.95];
    for (let s = 0; s < steps; s++) {
      const st = t + s * stepDur;
      const r = ratios[(s + (event.sliceIndex ?? 0)) % ratios.length];
      carrier.frequency.setValueAtTime(
        Math.min(9500, baseHz * r * (0.8 + macros.metallicTension * 0.6)),
        st,
      );
      ringOsc.frequency.setValueAtTime(baseHz * r * 1.618, st);
    }

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2200 * event.pitchRatio, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + totalDur);
    bp.Q.value = 3.2 + macros.metallicTension * 4.5;

    ringVca.gain.value = 0;
    ringOsc.connect(ringVca.gain);

    env.gain.setValueAtTime(0.24 * vel, t);
    env.gain.setValueAtTime(0.22 * vel, t + totalDur * 0.72);
    env.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);

    carrier.connect(ringVca);
    ringVca.connect(bp);
    bp.connect(env);

    this.routeSpatial(env, pan, 0.32, t + totalDur, 0.52);

    carrier.start(t);
    ringOsc.start(t);
    carrier.stop(t + totalDur + 0.015);
    ringOsc.stop(t + totalDur + 0.015);
  }

  private initPingPongDelay(bpm: number): void {
    const step16 = 60 / Math.max(60, bpm) / 4;
    const delayL = this.ctx.createDelay(1.5);
    const delayR = this.ctx.createDelay(1.5);
    delayL.delayTime.value = step16 * 3; // Dotted 16th left
    delayR.delayTime.value = step16 * 2; // 8th note right

    const fbL = this.ctx.createGain();
    const fbR = this.ctx.createGain();
    fbL.gain.value = 0.36;
    fbR.gain.value = 0.34;

    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'bandpass';
    toneFilter.frequency.value = 1650;
    toneFilter.Q.value = 0.85;

    const panL = this.ctx.createStereoPanner();
    const panR = this.ctx.createStereoPanner();
    panL.pan.value = -0.78;
    panR.pan.value = 0.78;

    const wetReturn = this.ctx.createGain();
    wetReturn.gain.value = 0.36;

    this.pingPongInput.connect(toneFilter);
    toneFilter.connect(delayL);

    delayL.connect(panL);
    panL.connect(wetReturn);
    delayL.connect(fbL);
    fbL.connect(delayR);

    delayR.connect(panR);
    panR.connect(wetReturn);
    delayR.connect(fbR);
    fbR.connect(delayL);

    wetReturn.connect(this.dryBus);

    this.delayNodeL = delayL;
    this.delayNodeR = delayR;
  }

  private initContinuousStrainVoice(): void {
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.value = 87.31;
    mod.type = 'sine';
    mod.frequency.value = 218.27;
    modGain.gain.value = 100;

    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 6.0;

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
    const len = Math.floor(this.ctx.sampleRate * 0.8);
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
