import { SeededRandom } from '../../engine/core/SeededRandom';
import type { ProgrammingPinSnapshot, SubsystemId } from '../../engine/core/types';
import {
  createConduitSampler,
  DEFAULT_MARBLE_COUNT,
  MODAL_FLOW_MACROS,
  MODAL_FLOW_PROGRAM_STEPS,
  MODAL_FLOW_TAU,
  type ConduitSampler,
  type ConduitSpec,
  type ModalFlowBlueprint,
  type ModuleSpec,
  type Vec3,
} from './ModalFlowBlueprint';

export type PhysicsEventKind =
  | 'release'
  | 'flow'
  | 'lift'
  | 'divert'
  | 'gate'
  | 'strike'
  | 'collision'
  | 'return'
  | 'recycle'
  | 'mechanism'
  | 'jam'
  | 'energy';

export interface PhysicsSongEvent {
  id: number;
  time: number;
  kind: PhysicsEventKind;
  moduleId: string;
  edgeId?: string;
  marbleId: number;
  position: Vec3;
  energy: number;
  speed: number;
  noteIndex: number;
  velocity: number;
  /** Metadata carried by a sequenced physical actuator into the audio mapper. */
  sequenced?: boolean;
  sliceIndex?: number;
  reverse?: boolean;
  ratchetStep?: number;
  ratchetTotal?: number;
  midiNote?: number;
  chordNotes?: number[];
  sourceBeat?: number;
  voice?: SubsystemId;
}

export interface PhysicalActuation {
  sequenced?: boolean;
  voice?: SubsystemId;
  noteIndex?: number;
  sliceIndex?: number;
  reverse?: boolean;
  ratchetStep?: number;
  ratchetTotal?: number;
  midiNote?: number;
  chordNotes?: number[];
  sourceBeat?: number;
  velocity?: number;
}

export type MarbleRunState = 'queued' | 'flowing' | 'lift' | 'settled';

export interface MarbleState {
  id: number;
  position: Vec3;
  edgeId: string | null;
  progress: number;
  speed: number;
  energy: number;
  radius: number;
  state: MarbleRunState;
  lastModuleId: string;
  wait: number;
}

export interface ModalFlowPhysicsParams {
  flowRate: number;
  gravity: number;
  gateDuty: number;
  liftTorque: number;
  marbleRestitution: number;
  phraseDensity: number;
  registerSpread: number;
  timbreBloom: number;
  droneSpeed: number;
  cameraFollow: number;
  scoreIntensity: number;
  sectionIndex: number;
}

export interface GraphCameraState {
  phase: number;
  arousal: number;
  cohesion: number;
  fatigue: number;
  curiosity: number;
  totalEnergy: number;
}

interface EdgeRuntime {
  spec: ConduitSpec;
  points: Vec3[];
  length: number;
  fromY: number;
  toY: number;
}

export interface ModalFlowPhysicsOptions {
  seed?: number;
  marbleCount?: number;
}

const FIXED_STEP = 1 / 90;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const distance = (a: Vec3, b: Vec3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const macroDefault = (id: string, fallback: number): number =>
  MODAL_FLOW_MACROS.find((m) => m.id === id)?.defaultValue ?? fallback;

function defaultParams(): ModalFlowPhysicsParams {
  return {
    flowRate: macroDefault('flowRate', 0.82),
    gravity: macroDefault('gravity', 9.8),
    gateDuty: macroDefault('gateDuty', 0.46),
    liftTorque: macroDefault('liftTorque', 1.18),
    marbleRestitution: macroDefault('marbleRestitution', 0.34),
    phraseDensity: macroDefault('phraseDensity', 0.62),
    registerSpread: macroDefault('registerSpread', 1),
    timbreBloom: macroDefault('timbreBloom', 0.54),
    droneSpeed: macroDefault('droneSpeed', 1),
    cameraFollow: macroDefault('cameraFollow', 0.38),
    scoreIntensity: 0.4,
    sectionIndex: 0,
  };
}

/**
 * Deterministic 3D marble-flow solver. Marbles conserve gravitational potential
 * along curved conduits, gain energy from motorized lifts, collide on shared
 * paths, queue behind escapements, and emit physical events. No note is
 * produced here: ModalFlowComposer rations these events into a D-Lydian song.
 */
export class ModalFlowPhysics {
  public readonly blueprint: ModalFlowBlueprint;
  public readonly params: ModalFlowPhysicsParams = defaultParams();
  public marbles: MarbleState[] = [];

  private readonly sampler: ConduitSampler;
  private readonly seed: number;
  private readonly marbleCount: number;
  private readonly moduleById = new Map<string, ModuleSpec>();
  private readonly edgeById = new Map<string, EdgeRuntime>();
  private readonly moduleEnergy = new Map<string, number>();
  private readonly edgeFlow = new Map<string, number>();
  private readonly bindingWeights = new Map<string, number>();
  /** Unwrapped turns preserve exact tooth/lug crossings across fixed steps. */
  private readonly transmissionPhase = new Map<string, number>();
  private readonly transmissionEnergy = new Map<string, number>();
  private program: boolean[][] = [];
  private pendingEvents: PhysicsSongEvent[] = [];

  private time = 0;
  private accumulator = 0;
  private eventId = 0;
  private releaseTimer = 0;
  private governorAngle = 0.18;
  private governorVelocity = 0;
  private gatePhase = 0;
  private lastCollisionTime = -1;
  private releaseCount = 0;
  private recycleCount = 0;
  private collisionCount = 0;
  private strikeCount = 0;
  private mechanismPulseCount = 0;
  private jamCount = 0;
  private lostCount = 0;
  private instrumentEnergy = 0;
  private injectedEnergy = 0;

  constructor(
    blueprint: ModalFlowBlueprint,
    options: ModalFlowPhysicsOptions = {},
  ) {
    this.blueprint = blueprint;
    this.seed = options.seed ?? 0x4d4f4441;
    this.marbleCount = Math.max(
      12,
      Math.floor(options.marbleCount ?? blueprint.marbleCount ?? DEFAULT_MARBLE_COUNT),
    );
    this.sampler = createConduitSampler(blueprint);
    for (const module of blueprint.modules) this.moduleById.set(module.id, module);
    for (const edge of blueprint.conduits) {
      const points = this.sampler.points(edge, 32);
      let length = 0;
      for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
      const [from, to] = this.sampler.endpoints(edge);
      this.edgeById.set(edge.id, {
        spec: edge,
        points,
        length: Math.max(0.8, length),
        fromY: from.y,
        toY: to.y,
      });
    }
    for (const binding of blueprint.bindings) {
      this.bindingWeights.set(binding.id, binding.weight * (binding.enabled ? 1 : 0));
    }
    for (const transmission of blueprint.transmissions) {
      this.transmissionPhase.set(transmission.id, transmission.section * 0.071);
      this.transmissionEnergy.set(transmission.id, 0);
    }
    this.program = blueprint.defaultProgram.map((row) => [...row]);
    this.reset();
  }

  /** Deterministic reset keeps program, bindings and live macro values intact. */
  reset(): void {
    this.time = 0;
    this.accumulator = 0;
    this.eventId = 0;
    this.releaseTimer = 0;
    this.governorAngle = 0.18;
    this.governorVelocity = 0;
    this.gatePhase = 0;
    this.lastCollisionTime = -1;
    this.releaseCount = 0;
    this.recycleCount = 0;
    this.collisionCount = 0;
    this.strikeCount = 0;
    this.mechanismPulseCount = 0;
    this.jamCount = 0;
    this.lostCount = 0;
    this.instrumentEnergy = 0;
    this.injectedEnergy = 0;
    this.pendingEvents = [];
    this.moduleEnergy.clear();
    this.edgeFlow.clear();
    this.transmissionPhase.clear();
    this.transmissionEnergy.clear();
    for (const transmission of this.blueprint.transmissions) {
      this.transmissionPhase.set(transmission.id, transmission.section * 0.071);
      this.transmissionEnergy.set(transmission.id, 0);
    }
    const source = this.moduleById.get('source-reservoir');
    this.marbles = Array.from({ length: this.marbleCount }, (_, id) => ({
      id,
      position: source ? { ...source.position } : { x: 0, y: 0, z: 0 },
      edgeId: null,
      progress: 0,
      speed: 0,
      energy: 0,
      radius: 0.115,
      state: 'queued' as MarbleRunState,
      lastModuleId: 'source-reservoir',
      wait: 0,
    }));

    // Seed a visible flow immediately rather than waiting for a full recycle.
    const seedEdges = this.blueprint.conduits.filter(
      (edge) => edge.kind !== 'return' && edge.weight >= 0.75,
    );
    const active = Math.min(Math.floor(this.marbleCount * 0.42), 30);
    for (let i = 0; i < active; i++) {
      const edge = seedEdges[i % Math.max(1, seedEdges.length)];
      const runtime = this.edgeById.get(edge.id);
      if (!runtime) continue;
      const hash = SeededRandom.hashStep(i, 17, this.seed);
      const marble = this.marbles[i];
      marble.edgeId = edge.id;
      marble.progress = 0.06 + hash * 0.82;
      marble.speed = 0.7 + hash * 0.9;
      marble.energy = 0.25 + hash * 0.3;
      marble.state = edge.kind === 'lift' ? 'lift' : 'flowing';
      marble.lastModuleId = edge.from;
      marble.position = this.sampler.sample(edge, marble.progress);
      marble.wait = 0;
    }
  }

  setParams(patch: Partial<ModalFlowPhysicsParams>): void {
    Object.assign(this.params, patch);
  }

  setMacro(id: string, value: number): void {
    if (id in this.params) {
      (this.params as unknown as Record<string, number>)[id] = value;
    }
  }

  setBindingWeight(id: string, weight: number): void {
    if (this.bindingWeights.has(id)) this.bindingWeights.set(id, clamp(weight, 0, 1.5));
  }

  getBindingWeights(): Array<{ id: string; weight: number }> {
    return Array.from(this.bindingWeights, ([id, weight]) => ({ id, weight }));
  }

  getProgram(): boolean[][] {
    return this.program.map((row) => [...row]);
  }

  getProgramPins(): ProgrammingPinSnapshot[] {
    const pins: ProgrammingPinSnapshot[] = [];
    this.program.forEach((row, lane) => {
      row.forEach((enabled, step) => {
        if (enabled) pins.push({ lane, step, velocity: 0.65 + ((lane + step) % 5) * 0.07 });
      });
    });
    return pins;
  }

  toggleProgram(lane: number, step: number, enabled?: boolean): void {
    const l = ((Math.floor(lane) % this.program.length) + this.program.length) % this.program.length;
    const s = ((Math.floor(step) % MODAL_FLOW_PROGRAM_STEPS) + MODAL_FLOW_PROGRAM_STEPS) % MODAL_FLOW_PROGRAM_STEPS;
    this.program[l][s] = enabled ?? !this.program[l][s];
  }

  exportProgram(): string {
    return JSON.stringify({
      version: 2,
      name: 'MODAL FLOW ROUTING WHEEL',
      lanes: this.program.length,
      steps: MODAL_FLOW_PROGRAM_STEPS,
      program: this.program,
    });
  }

  importProgram(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as { lanes?: number; steps?: number; program?: boolean[][] };
      if (!Array.isArray(parsed.program) || parsed.program.length === 0) return;
      const steps = Math.min(MODAL_FLOW_PROGRAM_STEPS, parsed.steps ?? MODAL_FLOW_PROGRAM_STEPS);
      this.program = Array.from({ length: Math.min(this.program.length, parsed.program.length) }, (_, lane) =>
        Array.from({ length: MODAL_FLOW_PROGRAM_STEPS }, (_, step) =>
          step < steps ? Boolean(parsed.program?.[lane]?.[step]) : false,
        ),
      );
      while (this.program.length < this.blueprint.routingLanes.length) {
        this.program.push(Array.from({ length: MODAL_FLOW_PROGRAM_STEPS }, () => false));
      }
    } catch {
      // Invalid JSON is ignored; the live program stays deterministic.
    }
  }

  /** Live pads and score cues are actuators, not direct sound generators. */
  injectEnergy(
    amount: number,
    moduleId = 'crank-flywheel',
    actuation: PhysicalActuation = {},
  ): void {
    const energy = clamp(amount, 0, 2);
    this.injectedEnergy += energy;
    this.moduleEnergy.set(moduleId, clamp((this.moduleEnergy.get(moduleId) ?? 0) + energy, 0, 2));
    const module = this.moduleById.get(moduleId) ?? this.moduleById.get('crank-flywheel');
    if (module) {
      this.emit({
        kind: 'energy',
        moduleId: module.id,
        marbleId: -1,
        position: { ...module.position },
        energy: energy * 0.55,
        speed: 0.7,
        noteIndex: actuation.noteIndex ?? module.noteRole,
        velocity: actuation.velocity ?? energy * 0.4,
        sequenced: actuation.sequenced,
        sliceIndex: actuation.sliceIndex,
        reverse: actuation.reverse,
        ratchetStep: actuation.ratchetStep,
        ratchetTotal: actuation.ratchetTotal,
        midiNote: actuation.midiNote,
        chordNotes: actuation.chordNotes ? [...actuation.chordNotes] : undefined,
        sourceBeat: actuation.sourceBeat,
        voice: actuation.voice,
      });
    }
    const wake = Math.max(1, Math.round(energy * 3));
    for (let i = 0; i < wake; i++) this.releaseQueuedMarble();
  }

  dropMarbles(count: number): void {
    const total = clamp(Math.floor(count), 1, 24);
    for (let i = 0; i < total; i++) this.releaseQueuedMarble();
  }

  step(dt: number, patch?: Partial<ModalFlowPhysicsParams>): PhysicsSongEvent[] {
    if (patch) this.setParams(patch);
    this.accumulator += clamp(dt, 0, 0.08);
    let guard = 0;
    while (this.accumulator >= FIXED_STEP && guard < 9) {
      this.simulate(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      guard += 1;
    }
    if (guard >= 9) this.accumulator = 0;
    return this.drainEvents();
  }

  drainEvents(): PhysicsSongEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getTime(): number {
    return this.time;
  }

  getGovernorEnergy(): number {
    return (
      0.5 * this.governorVelocity * this.governorVelocity +
      (this.params.gravity / 1.25) * (1 - Math.cos(this.governorAngle))
    );
  }

  getGatePhase(): number {
    return this.gatePhase;
  }

  getModuleEnergy(id: string): number {
    return this.moduleEnergy.get(id) ?? 0;
  }

  getEdgeFlow(id: string): number {
    return this.edgeFlow.get(id) ?? 0;
  }

  /** Normalized mechanical turn used by gears, pulleys, cams and chain lugs. */
  getTransmissionPhase(id: string): number {
    const turns = this.transmissionPhase.get(id) ?? 0;
    return ((turns % 1) + 1) % 1;
  }

  getTransmissionEnergy(id: string): number {
    return this.transmissionEnergy.get(id) ?? 0;
  }

  getMostEnergeticMarble(): MarbleState | null {
    let best: MarbleState | null = null;
    for (const marble of this.marbles) {
      if (marble.state === 'queued') continue;
      if (!best || marble.energy > best.energy) best = marble;
    }
    return best;
  }

  getGraphState(): GraphCameraState {
    let totalEnergy = 0;
    for (const marble of this.marbles) totalEnergy += marble.energy;
    const arousal = clamp(totalEnergy / Math.max(8, this.marbleCount * 0.9), 0, 1);
    return {
      phase: this.governorAngle,
      arousal,
      cohesion: clamp(1 - this.jamCount / 24, 0.25, 1),
      fatigue: clamp(this.time / 180, 0, 1),
      curiosity: clamp(0.34 + Math.sin(this.time * 0.23) * 0.22 + arousal * 0.2, 0, 1),
      totalEnergy,
    };
  }

  getTelemetry(): Record<string, number> {
    const flowing = this.marbles.filter((m) => m.state !== 'queued').length;
    return {
      time: this.time,
      totalMarbles: this.marbles.length,
      freeMarbles: flowing,
      activeMarbles: flowing,
      releaseCount: this.releaseCount,
      recycleCount: this.recycleCount,
      collisionCount: this.collisionCount,
      strikeCount: this.strikeCount,
      mechanismPulseCount: this.mechanismPulseCount,
      transmissionCount: this.blueprint.transmissions.length,
      instrumentEnergy: this.instrumentEnergy,
      jamCount: this.jamCount,
      lostCount: this.lostCount,
      releaseJitterMs: 0,
      governorEnergy: this.getGovernorEnergy(),
      gatePhase: this.gatePhase,
      injectedEnergy: this.injectedEnergy,
    };
  }

  private simulate(h: number): void {
    this.time += h;
    this.updateGovernor(h);
    this.gatePhase = (this.gatePhase + h * (0.22 + this.params.flowRate * 0.16)) % 1;
    for (const [id, value] of this.moduleEnergy) {
      this.moduleEnergy.set(id, value * Math.exp(-h * 2.15));
    }
    for (const [id, value] of this.edgeFlow) {
      this.edgeFlow.set(id, value * Math.exp(-h * 1.8));
    }
    for (const [id, value] of this.transmissionEnergy) {
      this.transmissionEnergy.set(id, value * Math.exp(-h * 2.4));
    }
    this.updateTransmissions(h);

    this.releaseTimer += h;
    const interval = 1 / (0.62 + this.params.flowRate * 1.85 + this.params.scoreIntensity * 0.35);
    let released = 0;
    while (this.releaseTimer >= interval && released < 3) {
      if (this.releaseQueuedMarble()) released += 1;
      this.releaseTimer -= interval;
    }

    for (const marble of this.marbles) {
      if (marble.state === 'queued') {
        if (marble.wait > 0) {
          marble.wait -= h;
          if (marble.wait <= 0) {
            const module = this.moduleById.get(marble.lastModuleId);
            if (module) this.routeMarble(marble, module, false);
            else this.returnToSource(marble);
          }
        }
        continue;
      }
      if (!marble.edgeId) {
        const module = this.moduleById.get(marble.lastModuleId);
        if (module) this.routeMarble(marble, module, false);
        else this.returnToSource(marble);
        continue;
      }
      const runtime = this.edgeById.get(marble.edgeId);
      if (!runtime) {
        this.returnToSource(marble);
        continue;
      }
      const edge = runtime.spec;
      const y = this.sampler.sample(edge, marble.progress).y;
      const drop = Math.max(0, runtime.fromY - y);
      let speed: number;
      if (edge.kind === 'lift') {
        speed = 0.95 * this.params.liftTorque * edge.speed;
      } else {
        const base = Math.max(0.34 * edge.speed, marble.speed);
        speed = Math.sqrt(Math.max(base * base, base * base + 2 * this.params.gravity * drop));
        speed *= 1 - 0.012 * h;
      }
      const minSpeed = 0.28 * edge.speed;
      speed = Math.max(minSpeed, Math.min(6.5, speed));
      marble.speed = speed;
      marble.progress += (speed * h) / runtime.length;
      marble.energy = clamp(speed / 4.2 + drop * 0.035, 0, 1.35);
      marble.position = this.sampler.sample(edge, clamp(marble.progress, 0, 1));
      this.edgeFlow.set(edge.id, clamp((this.edgeFlow.get(edge.id) ?? 0) + h * 0.14, 0, 1.5));
      if (marble.progress >= 1) {
        this.arriveAtModule(marble, edge);
      }
    }

    this.resolveCollisions(h);
  }

  /**
   * Non-marble mechanisms are first-class energy paths and sound generators.
   * A tooth, belt lug, cam lobe or linkage dead-centre crossing emits a
   * deterministic physical event; upstream module energy is also delivered to
   * the downstream module. This makes movement compose music rather than merely
   * decorating the marble simulation.
   */
  private updateTransmissions(h: number): void {
    const governor = clamp(this.getGovernorEnergy() * 0.08, 0, 0.55);
    this.blueprint.transmissions.forEach((transmission, index) => {
      const from = this.moduleById.get(transmission.from);
      const to = this.moduleById.get(transmission.to);
      if (!from || !to) return;
      const upstream = this.moduleEnergy.get(from.id) ?? 0;
      const sectionDistance = Math.abs(this.params.sectionIndex - transmission.section);
      const sectionFocus = sectionDistance === 0 ? 1 : sectionDistance === 1 ? 0.72 : 0.46;
      const turnsPerSecond =
        (0.045 + this.params.flowRate * 0.028 + governor * 0.05 + upstream * 0.018) *
        (0.78 + Math.abs(transmission.ratio) * 0.18) *
        sectionFocus;
      const previous = this.transmissionPhase.get(transmission.id) ?? 0;
      const next = previous + turnsPerSecond * h;
      this.transmissionPhase.set(transmission.id, next);

      const transfer = clamp(
        (0.1 + upstream * 0.68 + this.params.scoreIntensity * 0.16) *
          transmission.efficiency *
          sectionFocus,
        0,
        1.35,
      );
      this.transmissionEnergy.set(
        transmission.id,
        clamp((this.transmissionEnergy.get(transmission.id) ?? 0) + transfer * h * 0.7, 0, 1.5),
      );
      this.moduleEnergy.set(
        to.id,
        clamp((this.moduleEnergy.get(to.id) ?? 0) + transfer * h * 0.12, 0, 1.8),
      );

      const previousPulse = Math.floor(previous * transmission.pulses);
      const nextPulse = Math.floor(next * transmission.pulses);
      if (nextPulse <= previousPulse) return;
      const energy = clamp(0.18 + transfer * 0.72 + governor * 0.12, 0, 1.25);
      this.emit({
        kind: 'mechanism',
        moduleId: to.id,
        edgeId: transmission.id,
        marbleId: -100 - index,
        position: {
          x: (from.position.x + to.position.x) * 0.5,
          y: (from.position.y + to.position.y) * 0.5 + 0.14,
          z: (from.position.z + to.position.z) * 0.5,
        },
        energy,
        speed: turnsPerSecond * transmission.pulses,
        noteIndex: (from.noteRole + to.noteRole + index) % 9,
        velocity: clamp(0.28 + transfer * 0.48, 0.2, 0.92),
      });
      this.mechanismPulseCount += 1;
    });
  }

  private updateGovernor(h: number): void {
    const drive =
      0.45 +
      this.params.flowRate * 0.55 +
      this.params.scoreIntensity * 0.35 +
      this.injectedEnergy * 0.12;
    const accel =
      -(this.params.gravity / 1.25) * Math.sin(this.governorAngle) -
      0.32 * this.governorVelocity +
      Math.sin(this.time * 2.1) * drive * 0.42;
    this.governorVelocity += accel * h;
    this.governorAngle += this.governorVelocity * h;
    this.governorAngle = clamp(this.governorAngle, -0.82, 0.82);
    this.injectedEnergy *= Math.exp(-h * 1.1);
  }

  private releaseQueuedMarble(): boolean {
    const marble = this.marbles.find((m) => m.state === 'queued' && m.wait <= 0);
    if (!marble) return false;
    const source = this.moduleById.get('source-reservoir');
    if (!source) return false;
    marble.lastModuleId = source.id;
    this.routeMarble(marble, source, true);
    return true;
  }

  private arriveAtModule(marble: MarbleState, edge: ConduitSpec): void {
    const module = this.moduleById.get(edge.to);
    if (!module) {
      this.returnToSource(marble);
      return;
    }
    marble.progress = 0;
    marble.edgeId = null;
    marble.lastModuleId = module.id;
    marble.position = { ...module.position };
    this.routeMarble(marble, module, true);
  }

  private routeMarble(marble: MarbleState, module: ModuleSpec, arrival: boolean): void {
    if (module.kind === 'gate' && !this.gateIsOpen(marble)) {
      marble.state = 'queued';
      marble.edgeId = null;
      marble.wait = 0.09 + SeededRandom.hashStep(marble.id, Math.floor(this.time * 8), this.seed) * 0.16;
      // A closed escapement is a physical rest, not an audible event.
      return;
    }

    const speedEnergy = clamp(marble.speed / 4.2, 0, 1.25);
    const bindingGain = this.bindingGain(module.id);
    const energy = clamp(speedEnergy * module.gain * (0.55 + bindingGain * 0.55), 0, 1.5);
    this.moduleEnergy.set(module.id, clamp((this.moduleEnergy.get(module.id) ?? 0) + energy, 0, 1.8));

    const noteIndex = module.noteRole + (marble.id % 3) - 1;
    const step = Math.floor(this.time * 2) % MODAL_FLOW_PROGRAM_STEPS;
    const lane = marble.id % Math.max(1, this.blueprint.routingLanes.length);

    switch (module.kind) {
      case 'source':
        if (arrival) {
          this.emit({
            kind: 'release',
            moduleId: module.id,
            marbleId: marble.id,
            position: { ...module.position },
            energy: energy * 0.55,
            speed: marble.speed,
            noteIndex,
            velocity: 0.5,
          });
          this.releaseCount += 1;
        }
        break;
      case 'flywheel':
      case 'lift':
        this.emit({
          kind: 'lift',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy: energy * 0.72,
          speed: marble.speed,
          noteIndex,
          velocity: 0.55,
        });
        break;
      case 'aqueduct':
        this.emit({
          kind: 'flow',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy: energy * 0.35,
          speed: marble.speed,
          noteIndex,
          velocity: 0.35,
        });
        break;
      case 'diverter':
        this.emit({
          kind: 'divert',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy: energy * 0.5,
          speed: marble.speed,
          noteIndex,
          velocity: 0.45,
        });
        break;
      case 'gate':
        this.emit({
          kind: 'gate',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy,
          speed: marble.speed,
          noteIndex: lane,
          velocity: 0.7,
        });
        break;
      case 'tines':
      case 'resonator':
      case 'chime':
      case 'drum':
      case 'satellite':
      case 'ratchet':
      case 'bells':
      case 'crystal':
      case 'percussion':
      case 'loom':
      case 'pinball':
      case 'computer':
      case 'neon':
        this.emit({
          kind: 'strike',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy,
          speed: marble.speed,
          noteIndex,
          velocity: 0.85,
        });
        this.strikeCount += 1;
        this.instrumentEnergy += energy;
        break;
      case 'collector':
      case 'return':
        this.emit({
          kind: module.kind === 'collector' ? 'return' : 'recycle',
          moduleId: module.id,
          marbleId: marble.id,
          position: { ...module.position },
          energy: energy * 0.3,
          speed: marble.speed,
          noteIndex,
          velocity: 0.3,
        });
        if (module.kind === 'return') this.recycleCount += 1;
        break;
    }

    const nextEdgeId = this.chooseOutput(module, marble, step);
    const runtime = nextEdgeId ? this.edgeById.get(nextEdgeId) : undefined;
    if (!runtime) {
      this.returnToSource(marble);
      return;
    }
    marble.edgeId = runtime.spec.id;
    marble.progress = 0;
    marble.state = runtime.spec.kind === 'lift' ? 'lift' : 'flowing';
    marble.speed = Math.max(0.32, marble.speed * (runtime.spec.kind === 'lift' ? 0.85 : 0.72));
    marble.position = this.sampler.sample(runtime.spec, 0);
    marble.wait = 0;
    if (runtime.spec.to === 'source-reservoir') this.recycleCount += 1;
  }

  private gateIsOpen(marble: MarbleState): boolean {
    const step = Math.floor(this.time * 2) % MODAL_FLOW_PROGRAM_STEPS;
    const lane = marble.id % Math.max(1, this.program.length);
    const pinned = this.program[lane]?.[step] ?? false;
    const window = Math.sin((this.gatePhase + marble.id * 0.037) * MODAL_FLOW_TAU) * 0.5 + 0.5;
    return pinned && window < 0.35 + this.params.gateDuty * 0.75;
  }

  private chooseOutput(module: ModuleSpec, marble: MarbleState, step: number): string | null {
    const outputs = module.outputs.filter((id) => this.edgeById.has(id));
    if (outputs.length === 0) return null;
    if (module.kind === 'diverter') {
      const active: string[] = [];
      this.blueprint.routingLanes.forEach((lane, index) => {
        const pinned = this.program[index]?.[step] ?? false;
        const bias = (step + lane.stepBias) % MODAL_FLOW_PROGRAM_STEPS;
        if ((pinned || this.program[index]?.[bias]) && this.edgeById.has(lane.edgeId)) {
          active.push(lane.edgeId);
        }
      });
      const pool = active.length > 0 ? active : outputs.filter((id) => id !== 'conduit-diverter-bypass');
      const hash = SeededRandom.hashStep(marble.id, step, this.seed ^ 0x21);
      return pool[Math.floor(hash * pool.length) % pool.length] ?? outputs[0];
    }
    if (module.kind === 'gate') {
      const preferred = outputs.filter((id) => id !== 'conduit-gate-bypass');
      const pool = preferred.length > 0 ? preferred : outputs;
      const hash = SeededRandom.hashStep(marble.id, step + 11, this.seed);
      return pool[Math.floor(hash * pool.length) % pool.length] ?? outputs[0];
    }
    if (module.kind === 'satellite') {
      const chain = outputs.find((id) => id.includes('satellite-'));
      const collector = outputs.find((id) => id.includes('collector'));
      const hash = SeededRandom.hashStep(marble.id, step + 23, this.seed);
      if (chain && hash < 0.34) return chain;
      return collector ?? outputs[0];
    }
    const hash = SeededRandom.hashStep(marble.id, step + module.noteRole, this.seed);
    return outputs[Math.floor(hash * outputs.length) % outputs.length] ?? outputs[0];
  }

  private bindingGain(moduleId: string): number {
    let sum = 0;
    let count = 0;
    for (const binding of this.blueprint.bindings) {
      if (binding.target !== moduleId && !binding.target.startsWith('music:')) continue;
      sum += this.bindingWeights.get(binding.id) ?? binding.weight;
      count += 1;
    }
    return count > 0 ? clamp(sum / count, 0.2, 1.4) : 0.7;
  }

  private resolveCollisions(h: number): void {
    const byEdge = new Map<string, MarbleState[]>();
    for (const marble of this.marbles) {
      if (!marble.edgeId || marble.state === 'queued') continue;
      const list = byEdge.get(marble.edgeId) ?? [];
      list.push(marble);
      byEdge.set(marble.edgeId, list);
    }
    for (const [edgeId, list] of byEdge) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.progress - b.progress);
      const runtime = this.edgeById.get(edgeId);
      if (!runtime) continue;
      const minGap = (list[0].radius * 2.35) / runtime.length;
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const b = list[i];
        const gap = b.progress - a.progress;
        if (gap >= minGap) continue;
        const mid = (a.progress + b.progress) * 0.5;
        a.progress = clamp(mid - minGap * 0.5, 0, 0.999);
        b.progress = clamp(mid + minGap * 0.5, 0, 1);
        a.position = this.sampler.sample(runtime.spec, a.progress);
        b.position = this.sampler.sample(runtime.spec, b.progress);
        const rel = Math.abs(a.speed - b.speed);
        const restitution = 0.15 + this.params.marbleRestitution * 0.6;
        const energy = clamp((rel * 0.22 + 0.08) * restitution, 0, 0.75);
        const avgSpeed = (a.speed + b.speed) * 0.5;
        a.speed = b.speed = avgSpeed * (1 - restitution * 0.18);
        if (energy < 0.11 || this.time - this.lastCollisionTime < 0.16) continue;
        this.lastCollisionTime = this.time;
        this.collisionCount += 1;
        const module = this.moduleById.get(runtime.spec.to);
        this.emit({
          kind: 'collision',
          moduleId: module?.id ?? runtime.spec.to,
          edgeId,
          marbleId: a.id,
          position: this.sampler.sample(runtime.spec, mid),
          energy,
          speed: avgSpeed,
          noteIndex: (module?.noteRole ?? 2) + (a.id % 3) - 1,
          velocity: energy * 0.65,
        });
      }
    }
    void h;
  }

  private returnToSource(marble: MarbleState): void {
    const source = this.moduleById.get('source-reservoir');
    marble.state = 'queued';
    marble.edgeId = null;
    marble.progress = 0;
    marble.speed = 0;
    marble.energy = 0;
    marble.wait = 0.04;
    marble.lastModuleId = source?.id ?? 'source-reservoir';
    marble.position = source ? { ...source.position } : { x: 0, y: 0, z: 0 };
    this.lostCount += 1;
  }

  private emit(event: Omit<PhysicsSongEvent, 'id' | 'time'>): void {
    // Dense V10 ratchets can legitimately layer several actuators and marble
    // releases in one render frame. Preserve those causal score events while
    // still bounding pathological collision storms.
    if (this.pendingEvents.length >= 128) {
      if (!event.sequenced) return;
      const replace = this.pendingEvents.findIndex((candidate) => !candidate.sequenced);
      if (replace < 0) return;
      this.pendingEvents.splice(replace, 1);
    }
    this.pendingEvents.push({
      ...event,
      id: this.eventId++,
      time: this.time,
    });
  }
}
