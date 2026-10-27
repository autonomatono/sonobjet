import { SeededRandom } from '../../engine/core/SeededRandom';

/**
 * Bjorklund's Euclidean rhythm algorithm: distributes `pulses` as evenly as
 * possible across `steps`, optionally rotated by `rotation`.
 */
export function euclideanPattern(
  pulses: number,
  steps: number,
  rotation = 0,
): boolean[] {
  if (steps <= 0) return [];
  const k = Math.max(0, Math.min(steps, Math.floor(pulses)));
  if (k === 0) return new Array(steps).fill(false);
  if (k === steps) return new Array(steps).fill(true);

  const pattern: boolean[] = new Array(steps);
  for (let i = 0; i < steps; i++) {
    const active = ((i * k) % steps) < k;
    const idx = (((i + rotation) % steps) + steps) % steps;
    pattern[idx] = active;
  }
  return pattern;
}

/**
 * Computes sample-accurate sub-step offsets (in seconds) for Autechre-style
 * accelerating or decelerating micro-ratchet bursts (bouncing-ball / spring-pawl).
 *
 * @param count Number of strikes in the burst (1..24)
 * @param windowSec Total duration of the burst window in seconds
 * @param curveRatio < 1 accelerates into pitch buzz; 1 = even tuplets; > 1 decelerates
 */
export function computeRatchetBurstOffsets(
  count: number,
  windowSec: number,
  curveRatio = 0.78,
): number[] {
  const n = Math.max(1, Math.min(24, Math.floor(count)));
  if (n === 1) return [0];

  const weights: number[] = [];
  let sum = 0;
  let w = 1;
  for (let i = 0; i < n; i++) {
    weights.push(w);
    sum += w;
    w *= Math.max(0.45, Math.min(1.8, curveRatio));
  }

  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    offsets.push((acc / sum) * windowSec);
    acc += weights[i];
  }
  return offsets;
}

export interface BreakChopDecision {
  sliceIndex: number;
  pitchRatio: number;
  reverse: boolean;
  ratchetCount: number;
}

/**
 * Deterministic-yet-mutatable breakcore slice selector inspired by Warp/Planet Mu programming.
 */
export function evaluateBreakChop(
  bar: number,
  step16: number,
  chaos: number,
  seed = 909,
): BreakChopDecision {
  const globalStep = bar * 16 + step16;
  const h1 = SeededRandom.hashStep(globalStep, 1, seed);
  const h2 = SeededRandom.hashStep(globalStep, 2, seed);
  const h3 = SeededRandom.hashStep(globalStep, 3, seed);

  // Anchor downbeats & backbeats unless chaos is high, scramble fills at bar ends
  const isTurnaround = step16 >= 12;
  const effectiveChaos = Math.min(1, chaos + (isTurnaround ? 0.32 : 0));

  let sliceIndex = step16;
  if (h1 < effectiveChaos * 0.75) {
    // Favour snare slices (4, 12, 15) and kick slices (0, 2, 10) for muscular IDM punch
    const hotSlices = [0, 4, 4, 2, 12, 6, 10, 15, 7, 14];
    sliceIndex = hotSlices[Math.floor(h2 * hotSlices.length) % hotSlices.length];
  }

  const reverse = h3 < effectiveChaos * 0.24 && step16 % 4 !== 0;

  let pitchRatio = 1.0;
  if (h2 > 1 - effectiveChaos * 0.45) {
    const ratios = [0.75, 1.0, 1.189, 1.334, 1.498, 2.0];
    pitchRatio = ratios[Math.floor(h1 * ratios.length) % ratios.length];
  }

  let ratchetCount = 1;
  if (h3 > 1 - effectiveChaos * 0.36) {
    const ratchets = [2, 3, 4, 6, 8];
    ratchetCount = ratchets[Math.floor(h2 * ratchets.length) % ratchets.length];
  }

  return {
    sliceIndex,
    pitchRatio,
    reverse,
    ratchetCount,
  };
}
