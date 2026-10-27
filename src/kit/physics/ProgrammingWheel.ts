import {
  LANE_COUNT,
  PROGRAM_STEPS,
  PROGRAM_STEPS_PER_BEAT,
  TAU,
} from './MarbleBlueprint';

export interface ProgrammingPin {
  lane: number;
  step: number;
  velocity: number;
}

export interface GateCue {
  lane: number;
  step: number;
  velocity: number;
  scheduledTime: number;
}

export interface ProgrammingProgram {
  version: number;
  name: string;
  laneCount: number;
  stepCount: number;
  stepsPerBeat: number;
  pins: ProgrammingPin[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const key = (lane: number, step: number): string => `${lane}:${step}`;

const MELODY_BARS: number[][] = [
  [0, 2, 4, 3, 2, 1, 0, 2],
  [4, 3, 2, 1, 0, 2, 4, 5],
  [5, 4, 3, 2, 1, 0, 2, 3],
  [2, 4, 5, 7, 5, 4, 2, 1],
  [0, 1, 2, 4, 5, 4, 2, 1],
  [3, 4, 5, 7, 6, 5, 3, 2],
  [4, 5, 7, 6, 5, 3, 2, 0],
  [0, 2, 3, 5, 4, 2, 1, 0],
];

/** Eight-bar F-Phrygian programming wheel for twelve marble gates. */
export function createDefaultProgram(): ProgrammingProgram {
  const pins: ProgrammingPin[] = [];
  const add = (lane: number, step: number, velocity: number): void => {
    pins.push({ lane, step, velocity: clamp(velocity, 0.2, 1.35) });
  };

  for (let bar = 0; bar < 8; bar++) {
    const base = bar * 8;
    const melody = MELODY_BARS[bar % MELODY_BARS.length];
    for (let sub = 0; sub < 8; sub++) {
      if (sub % 2 === 0) {
        add(melody[sub / 2], base + sub, 0.74 + 0.06 * ((bar + sub) % 3));
      } else if ((bar + sub) % 3 !== 0) {
        add((melody[(sub - 1) / 2] + 1) % 8, base + sub, 0.52);
      }
    }
    add(8, base, 1.02);
    add(8, base + 4, 0.86);
    add(9, base + 2, 0.92);
    add(9, base + 6, 0.88);
    for (const sub of [1, 3, 5, 7]) {
      add(10, base + sub, 0.42 + 0.05 * ((bar + sub) % 3));
    }
    if (bar % 2 === 1) add(11, base + 7, 0.72 + 0.05 * (bar % 3));
  }

  return {
    version: 1,
    name: 'F PHRYGIAN // EIGHT-BAR MARBLE STUDY',
    laneCount: LANE_COUNT,
    stepCount: PROGRAM_STEPS,
    stepsPerBeat: PROGRAM_STEPS_PER_BEAT,
    pins,
  };
}

/**
 * A rotating, editable score memory. Pins are sampled from actual wheel angle,
 * not from a beat-to-mesh mapping; the machine's gear train determines when a
 * lane's gate lever is tripped.
 */
export class ProgrammingWheel {
  private readonly pins = new Map<string, ProgrammingPin>();
  private pinsByStep = new Map<number, ProgrammingPin[]>();
  private lastStep = -1;
  private version = 0;
  private name: string;
  private readonly laneCount: number;
  private readonly stepCount: number;
  private readonly stepsPerBeat: number;

  constructor(program: ProgrammingProgram = createDefaultProgram()) {
    this.laneCount = program.laneCount;
    this.stepCount = program.stepCount;
    this.stepsPerBeat = program.stepsPerBeat;
    this.name = program.name;
    this.loadPins(program.pins);
  }

  getVersion(): number {
    return this.version;
  }

  getLaneCount(): number {
    return this.laneCount;
  }

  getStepCount(): number {
    return this.stepCount;
  }

  getStepsPerBeat(): number {
    return this.stepsPerBeat;
  }

  getName(): string {
    return this.name;
  }

  getPins(): ProgrammingPin[] {
    return Array.from(this.pins.values())
      .map((pin) => ({ ...pin }))
      .sort((a, b) => a.step - b.step || a.lane - b.lane);
  }

  getPinsForStep(step: number): ProgrammingPin[] {
    return (this.pinsByStep.get(step) ?? []).map((pin) => ({ ...pin }));
  }

  getPinCount(): number {
    return this.pins.size;
  }

  hasPin(lane: number, step: number): boolean {
    return this.pins.has(key(lane, step));
  }

  togglePin(lane: number, step: number, enabled?: boolean): boolean {
    if (lane < 0 || lane >= this.laneCount || step < 0 || step >= this.stepCount) {
      return false;
    }
    const id = key(lane, step);
    const existing = this.pins.get(id);
    const shouldEnable = enabled ?? !existing;
    if (!shouldEnable) {
      if (!existing) return false;
      this.pins.delete(id);
    } else {
      this.pins.set(id, {
        lane,
        step,
        velocity: existing?.velocity ?? 0.82,
      });
    }
    this.reindex();
    return shouldEnable;
  }

  resetSampling(): void {
    this.lastStep = -1;
  }

  stepFromAngle(angle: number): number {
    const normalized = ((angle % TAU) + TAU) % TAU;
    return Math.min(this.stepCount - 1, Math.floor((normalized / TAU) * this.stepCount));
  }

  angleForBeat(beat: number): number {
    return (((beat * this.stepsPerBeat) % this.stepCount) / this.stepCount) * TAU;
  }

  /** Sample all step crossings since the previous wheel angle. */
  sampleAngle(angle: number, time: number, density = 0.7): GateCue[] {
    const normalized = ((angle % TAU) + TAU) % TAU;
    const currentStep = this.stepFromAngle(normalized);
    let steps: number[] = [];
    if (this.lastStep < 0) {
      steps = [currentStep];
    } else if (currentStep === this.lastStep) {
      return [];
    } else if (currentStep > this.lastStep) {
      steps = range(this.lastStep + 1, currentStep);
    } else {
      steps = [
        ...range(this.lastStep + 1, this.stepCount - 1),
        ...range(0, currentStep),
      ];
    }
    this.lastStep = currentStep;
    steps = steps.slice(-8);

    const cues: GateCue[] = [];
    for (const step of steps) {
      for (const pin of this.getPinsForStep(step)) {
        const velocity = pin.velocity * (0.55 + clamp(density, 0, 1) * 0.72);
        if (velocity < 0.34) continue;
        cues.push({ lane: pin.lane, step, velocity, scheduledTime: time });
      }
    }
    return cues;
  }

  exportJSON(): string {
    const program: ProgrammingProgram = {
      version: 1,
      name: this.name,
      laneCount: this.laneCount,
      stepCount: this.stepCount,
      stepsPerBeat: this.stepsPerBeat,
      pins: this.getPins(),
    };
    return JSON.stringify(program, null, 2);
  }

  importJSON(raw: string): void {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as ProgrammingProgram).pins)
    ) {
      throw new Error('Programming wheel JSON must contain a pins array');
    }
    const program = parsed as ProgrammingProgram;
    if (program.laneCount !== this.laneCount || program.stepCount !== this.stepCount) {
      throw new Error('Programming wheel dimensions do not match this machine');
    }
    this.name = typeof program.name === 'string' ? program.name : 'IMPORTED MARBLE PROGRAM';
    this.loadPins(program.pins);
    this.resetSampling();
  }

  private loadPins(pins: ProgrammingPin[]): void {
    this.pins.clear();
    for (const pin of pins) {
      if (
        !Number.isInteger(pin.lane) ||
        !Number.isInteger(pin.step) ||
        pin.lane < 0 ||
        pin.lane >= this.laneCount ||
        pin.step < 0 ||
        pin.step >= this.stepCount
      ) {
        continue;
      }
      this.pins.set(key(pin.lane, pin.step), {
        lane: pin.lane,
        step: pin.step,
        velocity: clamp(Number(pin.velocity) || 0.8, 0.2, 1.35),
      });
    }
    this.reindex();
  }

  private reindex(): void {
    this.pinsByStep = new Map();
    for (const pin of this.pins.values()) {
      const list = this.pinsByStep.get(pin.step) ?? [];
      list.push(pin);
      this.pinsByStep.set(pin.step, list);
    }
    this.version++;
  }
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}
