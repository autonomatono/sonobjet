import { SeededRandom } from '../core/SeededRandom';

export interface SynthesizedBreakKit {
  forward: AudioBuffer;
  reversed: AudioBuffer;
  sliceDurationSec: number;
  sliceCount: number;
}

/**
 * Procedural Breakbeat Buffer Synthesizer.
 *
 * Generates a crunchy, saturated 16-slice Amen/Think-inspired drum break buffer
 * directly in memory at startup (zero external audio files needed) so BreakSlicer
 * can chop, time-stretch, pitch-shift, reverse, and micro-loop authentic breakcore grit!
 */
export function buildProceduralBreakKit(
  ctx: BaseAudioContext,
  bpm = 168,
): SynthesizedBreakKit {
  const sliceCount = 16;
  // 1 bar of 16th notes = 4 beats
  const barSec = (4 * 60) / bpm;
  const sliceDurationSec = barSec / sliceCount;
  const totalSamples = Math.max(1024, Math.floor(barSec * ctx.sampleRate));

  const forward = ctx.createBuffer(2, totalSamples, ctx.sampleRate);
  const reversed = ctx.createBuffer(2, totalSamples, ctx.sampleRate);

  const left = forward.getChannelData(0);
  const right = forward.getChannelData(1);
  const rng = new SeededRandom(0x67616e74); // 'gant'

  // Classic Amen-archetype 16-step pattern:
  // K = Kick, S = Snare, g = Ghost snare, R = Ride/Hat accent
  const pattern: Array<'K' | 'S' | 'g' | 'R'> = [
    'K', 'R', 'K', 'R',
    'S', 'R', 'g', 'K',
    'R', 'g', 'K', 'K',
    'S', 'R', 'g', 'S',
  ];

  const sr = ctx.sampleRate;

  for (let s = 0; s < sliceCount; s++) {
    const startSample = Math.floor((s * totalSamples) / sliceCount);
    const kind = pattern[s];
    const maxLen = Math.min(totalSamples - startSample, Math.floor(sr * 0.24));

    let phase1 = 0;
    let phase2 = 0;
    let snareLp = 0;

    for (let i = 0; i < maxLen; i++) {
      const t = i / sr;
      let mono = 0;

      // Persistent metallic ride / cymbal shimmer on every 16th for authentic break glue
      const rideEnv = Math.exp(-t * (kind === 'R' ? 28 : 42));
      const cymbalMetallic =
        Math.sin(2 * Math.PI * 3410 * t + Math.sin(2 * Math.PI * 5291 * t) * 2.1) *
        0.5 +
        (rng.next() * 2 - 1) * 0.5;
      mono += cymbalMetallic * rideEnv * (kind === 'R' ? 0.34 : 0.16);

      if (kind === 'K') {
        const f = 54 + 175 * Math.exp(-t * 48);
        phase1 += (2 * Math.PI * f) / sr;
        const body = Math.sin(phase1) * Math.exp(-t * 14);
        const knock = Math.sin(phase1 * 2.7) * Math.exp(-t * 65) * 0.45;
        const click = (rng.next() * 2 - 1) * Math.exp(-t * 220) * 0.5;
        mono += (body + knock + click) * 0.95;
      } else if (kind === 'S' || kind === 'g') {
        const amp = kind === 'S' ? 0.95 : 0.44;
        const f1 = 212 + 90 * Math.exp(-t * 55);
        const f2 = 368 + 60 * Math.exp(-t * 45);
        phase1 += (2 * Math.PI * f1) / sr;
        phase2 += (2 * Math.PI * f2) / sr;
        const shell =
          (Math.sin(phase1) * 0.65 + Math.sin(phase2) * 0.45) *
          Math.exp(-t * (kind === 'S' ? 22 : 34));
        const rawNoise = rng.next() * 2 - 1;
        snareLp += 0.42 * (rawNoise - snareLp);
        const wires = (rawNoise - snareLp * 0.65) * Math.exp(-t * (kind === 'S' ? 17 : 29));
        mono += (shell * 0.65 + wires * 0.85) * amp;
      }

      // Vintage sampler 12-bit crunch + tape saturation
      const quantized = Math.round(mono * 512) / 512;
      const driven = Math.tanh(quantized * 2.1) * 0.86;
      const stereoDecor = (rng.next() * 2 - 1) * 0.025 * Math.exp(-t * 25);

      const idx = startSample + i;
      left[idx] = Math.max(-0.98, Math.min(0.98, left[idx] + driven + stereoDecor));
      right[idx] = Math.max(-0.98, Math.min(0.98, right[idx] + driven - stereoDecor));
    }
  }

  // Populate slice-reversed buffer (each slice reversed individually so rhythm stays sharp!)
  const revL = reversed.getChannelData(0);
  const revR = reversed.getChannelData(1);
  const sliceSamples = Math.floor(totalSamples / sliceCount);
  for (let s = 0; s < sliceCount; s++) {
    const base = s * sliceSamples;
    for (let i = 0; i < sliceSamples && base + i < totalSamples; i++) {
      const srcIdx = Math.min(totalSamples - 1, base + (sliceSamples - 1 - i));
      revL[base + i] = left[srcIdx];
      revR[base + i] = right[srcIdx];
    }
  }

  return {
    forward,
    reversed,
    sliceDurationSec,
    sliceCount,
  };
}
