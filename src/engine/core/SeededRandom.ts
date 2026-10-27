/**
 * Deterministic fast 32-bit PRNG (Mulberry32) so composed IDM/breakcore
 * micro-variations reproduce identically across music-video runs while still
 * allowing live performers to offset or mutate chaos in real time.
 */
export class SeededRandom {
  private state: number;

  constructor(seed = 0x504e4f42) {
    this.state = seed >>> 0;
  }

  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /** Returns deterministic float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 0.999999));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length) % items.length];
  }

  /** Hash an integer step + lane into a stateless [0, 1) value for scrubbable score evaluation */
  static hashStep(step: number, lane: number, seed = 1337): number {
    let h = (step * 374761393 + lane * 668265263 + seed * 1442695041) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
}
