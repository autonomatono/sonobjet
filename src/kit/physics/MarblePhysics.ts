import type { SubsystemId } from '../../engine/core/types';
import {
  DEFAULT_MARBLE_COUNT,
  MARBLE_RADIUS,
  PHYSICS_MACRO_DEFINITIONS,
  pointOnPolyline,
  TAU,
  type MarbleBlueprint,
  type MarbleSegmentSpec,
  type Vec2Tuple,
} from './MarbleBlueprint';

export type MarbleState = 'queued' | 'free' | 'lifting';

export interface MarbleBody {
  id: number;
  lane: number;
  state: MarbleState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spin: number;
  queueSlot: number;
  targetY: number;
  liftProgress: number;
  impactEnergy: number;
  stuckTime: number;
  lastImpactAt: number;
  lastInstrumentId: string;
  tint: number;
}

export interface PhysicsImpactEvent {
  id: number;
  instrumentId: string;
  lane: number;
  subsystem: SubsystemId;
  pitchRatio: number;
  velocity: number;
  energy: number;
  x: number;
  y: number;
  time: number;
}

export interface PhysicsReleaseEvent {
  id: number;
  gateId: string;
  lane: number;
  marbleId: number;
  step: number;
  velocity: number;
  scheduledTime: number;
  actualTime: number;
  jitterMs: number;
}

export interface PhysicsTelemetry {
  time: number;
  totalMarbles: number;
  freeMarbles: number;
  queuedMarbles: number;
  liftingMarbles: number;
  activeGates: number;
  impactCount: number;
  releaseCount: number;
  recycleCount: number;
  jamCount: number;
  lostCount: number;
  releaseJitterMs: number;
  kineticEnergy: number;
  instrumentEnergy: number;
  governorAngle: number;
  governorVelocity: number;
  governorEnergy: number;
  shock: number;
  programStep: number;
  wheelAngle: number;
  flywheelAngle: number;
  scoreIntensity: number;
  gravity: number;
  restitution: number;
  friction: number;
  timeScale: number;
  gateDuration: number;
  liftSpeed: number;
}

export interface PhysicsStepResult {
  impacts: PhysicsImpactEvent[];
  releases: PhysicsReleaseEvent[];
  jams: number;
  recycled: number;
  lost: number;
  activeFree: number;
  queued: number;
  lifting: number;
  telemetry: PhysicsTelemetry;
}

export interface PhysicsOptions {
  totalMarbles: number;
  gravityScale: number;
  marbleBounce: number;
  trackFriction: number;
  gateDuration: number;
  timeScale: number;
  releaseVelocity: number;
  liftSpeed: number;
  pendulumDrive: number;
  seed: number;
}

export interface PhysicsDriveState {
  flywheelAngle: number;
  programWheelAngle: number;
  programStep: number;
  scoreIntensity: number;
  beat: number;
}

interface GateRuntime {
  id: string;
  lane: number;
  x: number;
  y: number;
  open: boolean;
  openUntil: number;
  leverValue: number;
  releaseCount: number;
  jamCount: number;
  lastReleaseTime: number;
}

interface QueueRuntime {
  lane: number;
  x: number;
  topY: number;
  gateY: number;
  capacity: number;
  slots: number[];
}

interface SegmentRuntime {
  spec: MarbleSegmentSpec;
  enabled: boolean;
}

interface GovernorState {
  angle: number;
  velocity: number;
  driveImpulse: number;
  energy: number;
}

const FIXED_DT = 1 / 120;
const MAX_SUBSTEPS = 8;
const BASE_GRAVITY = -7.4;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const MACRO_LIMITS = new Map(
  PHYSICS_MACRO_DEFINITIONS.map((definition) => [
    definition.id,
    { min: definition.min, max: definition.max, value: definition.defaultValue },
  ]),
);

/**
 * Deterministic fixed-step 2.5D steel-marble solver.
 *
 * Free marbles are verlet/semi-implicit rigid spheres with capsule-segment
 * contacts, sphere-sphere contacts, restitution, tangential friction, impact
 * telemetry and stuck-ball recovery. Queued and lifted marbles use kinematic
 * conveyor constraints so the machine can run continuously without jamming.
 */
export class MarblePhysics {
  private readonly gates: GateRuntime[] = [];
  private readonly queues: QueueRuntime[] = [];
  private readonly segments: SegmentRuntime[] = [];
  private marbles: MarbleBody[] = [];
  private readonly instrumentEnergy = new Map<string, number>();
  private pendingImpacts: PhysicsImpactEvent[] = [];
  private pendingReleases: PhysicsReleaseEvent[] = [];
  private pendingJams = 0;
  private pendingRecycled = 0;
  private pendingLost = 0;
  private accumulator = 0;
  private time = 0;
  private seed: number;
  private impactCount = 0;
  private releaseCount = 0;
  private recycleCount = 0;
  private lostCount = 0;
  private totalJitterMs = 0;
  private shock = 0;
  private governor: GovernorState = { angle: 0.12, velocity: 0, driveImpulse: 0, energy: 0 };
  private driveState: PhysicsDriveState = {
    flywheelAngle: 0,
    programWheelAngle: 0,
    programStep: 0,
    scoreIntensity: 0.6,
    beat: 0,
  };

  private options: PhysicsOptions;

  constructor(
    private readonly blueprint: MarbleBlueprint,
    overrides: Partial<PhysicsOptions> = {},
  ) {
    this.options = {
      totalMarbles: overrides.totalMarbles ?? DEFAULT_MARBLE_COUNT,
      gravityScale: overrides.gravityScale ?? 1,
      marbleBounce: overrides.marbleBounce ?? 0.34,
      trackFriction: overrides.trackFriction ?? 0.16,
      gateDuration: overrides.gateDuration ?? 0.11,
      timeScale: overrides.timeScale ?? 1,
      releaseVelocity: overrides.releaseVelocity ?? 0.48,
      liftSpeed: overrides.liftSpeed ?? 1.05,
      pendulumDrive: overrides.pendulumDrive ?? 0.72,
      seed: overrides.seed ?? 0x5eed1234,
    };
    this.seed = this.options.seed >>> 0;

    for (const gate of blueprint.gates) {
      this.gates.push({
        id: gate.id,
        lane: gate.lane,
        x: gate.x,
        y: gate.y,
        open: false,
        openUntil: 0,
        leverValue: 0,
        releaseCount: 0,
        jamCount: 0,
        lastReleaseTime: -10,
      });
    }
    for (const queue of blueprint.queues) {
      this.queues.push({
        lane: queue.lane,
        x: queue.x,
        topY: queue.topY,
        gateY: queue.gateY,
        capacity: queue.capacity,
        slots: [],
      });
      this.instrumentEnergy.set(`instrument${queue.lane}`, 0);
    }
    for (const spec of blueprint.segments) {
      this.segments.push({ spec: { ...spec }, enabled: true });
    }
    this.reset(this.options.totalMarbles);
  }

  getBlueprint(): MarbleBlueprint {
    return this.blueprint;
  }

  getMarbles(): readonly MarbleBody[] {
    return this.marbles;
  }

  getGateStates(): readonly GateRuntime[] {
    return this.gates;
  }

  getGateState(lane: number): GateRuntime | undefined {
    return this.gates[lane];
  }

  getQueueLength(lane: number): number {
    return this.queues[lane]?.slots.length ?? 0;
  }

  getInstrumentEnergy(id: string): number {
    return this.instrumentEnergy.get(id) ?? 0;
  }

  getGovernor(): GovernorState {
    return { ...this.governor };
  }

  getOptions(): PhysicsOptions {
    return { ...this.options };
  }

  getMacro(id: string): number {
    return (this.options as unknown as Record<string, number>)[id] ?? 0;
  }

  setMacro(id: string, value: number): boolean {
    const limits = MACRO_LIMITS.get(id);
    if (!limits || !Number.isFinite(value)) return false;
    (this.options as unknown as Record<string, number>)[id] = clamp(value, limits.min, limits.max);
    return true;
  }

  setDriveState(state: Partial<PhysicsDriveState>): void {
    this.driveState = { ...this.driveState, ...state };
  }

  getLiftPoint(t: number): Vec2Tuple {
    return pointOnPolyline(this.blueprint.liftPath, t);
  }

  reset(totalMarbles = this.options.totalMarbles): void {
    this.options.totalMarbles = clamp(Math.round(totalMarbles), 24, 320);
    this.marbles = [];
    this.pendingImpacts = [];
    this.pendingReleases = [];
    this.pendingJams = 0;
    this.pendingRecycled = 0;
    this.pendingLost = 0;
    this.accumulator = 0;
    this.time = 0;
    this.impactCount = 0;
    this.releaseCount = 0;
    this.recycleCount = 0;
    this.lostCount = 0;
    this.totalJitterMs = 0;
    this.shock = 0;
    this.governor = { angle: 0.12, velocity: 0, driveImpulse: 0, energy: 0 };
    for (const gate of this.gates) {
      gate.open = false;
      gate.openUntil = 0;
      gate.leverValue = 0;
      gate.releaseCount = 0;
      gate.jamCount = 0;
      gate.lastReleaseTime = -10;
    }
    for (const queue of this.queues) queue.slots = [];
    for (const id of this.instrumentEnergy.keys()) this.instrumentEnergy.set(id, 0);

    let id = 0;
    const capacity = this.queues[0]?.capacity ?? 8;
    for (let slot = 0; slot < capacity && id < this.options.totalMarbles; slot++) {
      for (let lane = 0; lane < this.queues.length && id < this.options.totalMarbles; lane++) {
        const index = this.createMarble(id, lane, 'queued');
        const queue = this.queues[lane];
        queue.slots.push(index);
        this.assignQueueSlot(index, queue.slots.length - 1, true);
        id++;
      }
    }
    const remaining = this.options.totalMarbles - id;
    for (let i = 0; i < remaining; i++) {
      const lane = i % Math.max(1, this.queues.length);
      const index = this.createMarble(id, lane, 'lifting');
      const marble = this.marbles[index];
      marble.liftProgress = 0.04 + (i / Math.max(1, remaining)) * 0.92;
      this.placeOnLift(marble);
      id++;
    }
  }

  releaseGate(lane: number, scheduledTime = this.time, velocity = 1, step = -1): boolean {
    const gate = this.gates[lane];
    const queue = this.queues[lane];
    if (!gate || !queue) return false;
    gate.open = true;
    gate.openUntil = this.time + this.options.gateDuration;
    gate.leverValue = 1;
    gate.lastReleaseTime = this.time;
    if (queue.slots.length === 0) {
      gate.jamCount++;
      this.pendingJams++;
      return false;
    }
    const marbleIndex = queue.slots.shift();
    if (marbleIndex === undefined) {
      gate.jamCount++;
      this.pendingJams++;
      return false;
    }
    const marble = this.marbles[marbleIndex];
    marble.state = 'free';
    marble.x = queue.x;
    marble.y = gate.y - marble.radius * 1.25;
    marble.vx = (this.random() - 0.5) * 0.055 * velocity;
    marble.vy = -this.options.releaseVelocity * velocity;
    marble.spin = 0;
    marble.stuckTime = 0;
    marble.impactEnergy = 0.25;
    for (let slot = 0; slot < queue.slots.length; slot++) {
      this.assignQueueSlot(queue.slots[slot], slot, false);
    }
    gate.releaseCount++;
    this.releaseCount++;
    const jitterMs = Math.abs(this.time - scheduledTime) * 1000;
    this.totalJitterMs += jitterMs;
    this.pendingReleases.push({
      id: this.pendingReleases.length + this.releaseCount,
      gateId: gate.id,
      lane,
      marbleId: marble.id,
      step,
      velocity,
      scheduledTime,
      actualTime: this.time,
      jitterMs,
    });
    return true;
  }

  dropMarbles(count: number): number {
    let released = 0;
    for (let i = 0; i < count; i++) {
      const lane = (i * 5 + Math.floor(this.time * 3)) % this.gates.length;
      if (this.releaseGate(lane, this.time, 0.85 + this.random() * 0.5, -2)) released++;
    }
    return released;
  }

  kickImpulse(velocity: number, locus: [number, number, number]): void {
    const energy = clamp(velocity, 0, 2);
    this.shock = clamp(this.shock + energy * 0.45, 0, 1.6);
    this.governor.driveImpulse += energy * 1.4;
    this.governor.velocity += locus[0] * energy * 0.12;
    for (const marble of this.marbles) {
      if (marble.state !== 'free') continue;
      marble.vx += locus[0] * energy * 0.14;
      marble.vy += Math.max(0, locus[1]) * energy * 0.18;
    }
  }

  step(dt: number): PhysicsStepResult {
    const scaledDt = clamp(dt * this.options.timeScale, 0, 0.2);
    this.accumulator += scaledDt;
    let substeps = 0;
    while (this.accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
      this.substep(FIXED_DT);
      this.accumulator -= FIXED_DT;
      substeps++;
    }
    if (substeps >= MAX_SUBSTEPS) this.accumulator = 0;
    const telemetry = this.getTelemetry();
    const result: PhysicsStepResult = {
      impacts: this.pendingImpacts,
      releases: this.pendingReleases,
      jams: this.pendingJams,
      recycled: this.pendingRecycled,
      lost: this.pendingLost,
      activeFree: telemetry.freeMarbles,
      queued: telemetry.queuedMarbles,
      lifting: telemetry.liftingMarbles,
      telemetry,
    };
    this.pendingImpacts = [];
    this.pendingReleases = [];
    this.pendingJams = 0;
    this.pendingRecycled = 0;
    this.pendingLost = 0;
    return result;
  }

  getTelemetry(): PhysicsTelemetry {
    let free = 0;
    let queued = 0;
    let lifting = 0;
    let kinetic = 0;
    for (const marble of this.marbles) {
      if (marble.state === 'free') {
        free++;
        kinetic += 0.5 * (marble.vx * marble.vx + marble.vy * marble.vy);
      } else if (marble.state === 'queued') queued++;
      else lifting++;
    }
    let instrumentEnergy = 0;
    for (const value of this.instrumentEnergy.values()) instrumentEnergy += value;
    return {
      time: this.time,
      totalMarbles: this.marbles.length,
      freeMarbles: free,
      queuedMarbles: queued,
      liftingMarbles: lifting,
      activeGates: this.gates.filter((gate) => gate.open).length,
      impactCount: this.impactCount,
      releaseCount: this.releaseCount,
      recycleCount: this.recycleCount,
      jamCount: this.gates.reduce((sum, gate) => sum + gate.jamCount, 0),
      lostCount: this.lostCount,
      releaseJitterMs: this.releaseCount > 0 ? this.totalJitterMs / this.releaseCount : 0,
      kineticEnergy: kinetic / Math.max(1, free),
      instrumentEnergy,
      governorAngle: this.governor.angle,
      governorVelocity: this.governor.velocity,
      governorEnergy: this.governor.energy,
      shock: this.shock,
      programStep: this.driveState.programStep,
      wheelAngle: this.driveState.programWheelAngle,
      flywheelAngle: this.driveState.flywheelAngle,
      scoreIntensity: this.driveState.scoreIntensity,
      gravity: BASE_GRAVITY * this.options.gravityScale,
      restitution: this.options.marbleBounce,
      friction: this.options.trackFriction,
      timeScale: this.options.timeScale,
      gateDuration: this.options.gateDuration,
      liftSpeed: this.options.liftSpeed,
    };
  }

  private createMarble(id: number, lane: number, state: MarbleState): number {
    const marble: MarbleBody = {
      id,
      lane,
      state,
      x: this.blueprint.laneXs[lane] ?? 0,
      y: this.blueprint.gateY + MARBLE_RADIUS * 2,
      vx: 0,
      vy: 0,
      radius: this.blueprint.marbleRadius,
      spin: 0,
      queueSlot: 0,
      targetY: this.blueprint.gateY + MARBLE_RADIUS * 2,
      liftProgress: 0,
      impactEnergy: 0,
      stuckTime: 0,
      lastImpactAt: -10,
      lastInstrumentId: '',
      tint: this.random(),
    };
    this.marbles.push(marble);
    return this.marbles.length - 1;
  }

  private assignQueueSlot(index: number, slot: number, immediate: boolean): void {
    const marble = this.marbles[index];
    const queue = this.queues[marble.lane];
    if (!marble || !queue) return;
    const baseY = queue.gateY + marble.radius * 2.1;
    const spacing =
      (queue.topY - baseY) / Math.max(1, queue.capacity - 1);
    marble.queueSlot = slot;
    marble.targetY = baseY + slot * spacing;
    marble.x = queue.x;
    if (immediate) {
      marble.y = marble.targetY;
      marble.vx = 0;
      marble.vy = 0;
    }
  }

  private placeOnLift(marble: MarbleBody): void {
    const point = this.getLiftPoint(clamp(marble.liftProgress, 0, 1));
    marble.x = point[0];
    marble.y = point[1];
    marble.vx = 0;
    marble.vy = 0;
  }

  private substep(dt: number): void {
    this.time += dt;
    this.stepGovernor(dt);
    this.shock *= Math.exp(-dt * 2.6);
    for (const gate of this.gates) {
      if (this.time > gate.openUntil) gate.open = false;
      gate.leverValue += ((gate.open ? 1 : 0) - gate.leverValue) * (1 - Math.exp(-dt * 14));
    }
    for (const id of this.instrumentEnergy.keys()) {
      this.instrumentEnergy.set(id, (this.instrumentEnergy.get(id) ?? 0) * Math.exp(-dt * 5.5));
    }

    for (const marble of this.marbles) {
      marble.impactEnergy *= Math.exp(-dt * 3.5);
      if (marble.state === 'queued') {
        marble.y += (marble.targetY - marble.y) * (1 - Math.exp(-dt * 13));
        marble.x = this.queues[marble.lane]?.x ?? marble.x;
        marble.spin *= Math.exp(-dt * 4);
      } else if (marble.state === 'lifting') {
        this.updateLiftingMarble(marble, dt);
      } else {
        this.integrateFreeMarble(marble, dt);
      }
    }

    this.resolveMarbleCollisions();
    this.collectMarbles(dt);
  }

  private stepGovernor(dt: number): void {
    const naturalFrequency = 2.18;
    const drivePhase = this.driveState.flywheelAngle * 0.5;
    const drive =
      Math.sin(drivePhase) * this.options.pendulumDrive * 0.85 +
      this.governor.driveImpulse;
    const accel =
      -naturalFrequency * naturalFrequency * Math.sin(this.governor.angle) -
      0.24 * this.governor.velocity +
      drive;
    this.governor.velocity += accel * dt;
    this.governor.angle = clamp(this.governor.angle + this.governor.velocity * dt, -1.05, 1.05);
    this.governor.driveImpulse *= Math.exp(-dt * 4.2);
    this.governor.energy =
      0.5 * this.governor.velocity * this.governor.velocity +
      naturalFrequency * naturalFrequency * (1 - Math.cos(this.governor.angle));
  }

  private updateLiftingMarble(marble: MarbleBody, dt: number): void {
    marble.liftProgress += this.options.liftSpeed * dt * 0.25;
    if (marble.liftProgress < 1) {
      this.placeOnLift(marble);
      return;
    }
    marble.liftProgress = 1;
    const lane = this.findShortestAvailableQueue();
    if (lane >= 0) {
      const queue = this.queues[lane];
      const index = marble.id;
      marble.state = 'queued';
      marble.lane = lane;
      marble.x = queue.x;
      marble.y = queue.topY + 0.16;
      queue.slots.push(index);
      this.assignQueueSlot(index, queue.slots.length - 1, false);
    } else {
      const topIndex = marble.id % 26;
      marble.x = -4.6 + topIndex * 0.37;
      marble.y = 5.12 + Math.sin(this.time * 1.7 + marble.id) * 0.035;
      marble.vx = 0;
      marble.vy = 0;
    }
  }

  private findShortestAvailableQueue(): number {
    let bestLane = -1;
    let bestLength = Number.POSITIVE_INFINITY;
    for (const queue of this.queues) {
      if (queue.slots.length >= queue.capacity) continue;
      if (queue.slots.length < bestLength) {
        bestLength = queue.slots.length;
        bestLane = queue.lane;
      }
    }
    return bestLane;
  }

  private integrateFreeMarble(marble: MarbleBody, dt: number): void {
    marble.vy += BASE_GRAVITY * this.options.gravityScale * dt;
    // Gravity component along the collector trough: spent marbles drift toward
    // the right-side bucket lift instead of pooling under the instrument bank.
    if (marble.y < -1.92 && marble.x < 4.92) {
      marble.vx += dt * 1.35 * (1 - this.options.trackFriction * 0.55);
    }
    marble.vx *= Math.exp(-dt * 0.012);
    marble.vy *= Math.exp(-dt * 0.008);
    marble.x += marble.vx * dt;
    marble.y += marble.vy * dt;
    marble.spin += (marble.vx / Math.max(0.01, marble.radius)) * dt;

    for (const segment of this.segments) {
      if (!segment.enabled) continue;
      if (segment.spec.gateId) {
        const gate = this.gates.find((candidate) => candidate.id === segment.spec.gateId);
        if (gate?.open) continue;
      }
      if (segment.spec.lane !== undefined && segment.spec.lane !== marble.lane) continue;
      this.collideSegment(marble, segment.spec, dt);
    }

    const world = this.blueprint.world;
    if (marble.x < world.minX + marble.radius) {
      marble.x = world.minX + marble.radius;
      marble.vx = Math.abs(marble.vx) * 0.35;
    } else if (marble.x > world.maxX - marble.radius) {
      marble.x = world.maxX - marble.radius;
      marble.vx = -Math.abs(marble.vx) * 0.35;
    }
    if (marble.y > world.maxY - marble.radius) {
      marble.y = world.maxY - marble.radius;
      marble.vy = -Math.abs(marble.vy) * 0.2;
    }
  }

  private collideSegment(marble: MarbleBody, spec: MarbleSegmentSpec, dt: number): void {
    const dx = spec.b[0] - spec.a[0];
    const dy = spec.b[1] - spec.a[1];
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 1e-8) return;
    const t = clamp(
      ((marble.x - spec.a[0]) * dx + (marble.y - spec.a[1]) * dy) / lengthSq,
      0,
      1,
    );
    const closestX = spec.a[0] + dx * t;
    const closestY = spec.a[1] + dy * t;
    let nx = marble.x - closestX;
    let ny = marble.y - closestY;
    let distance = Math.hypot(nx, ny);
    const minDistance = marble.radius + spec.radius;
    if (distance >= minDistance) return;
    if (distance < 1e-6) {
      const length = Math.sqrt(lengthSq);
      nx = -dy / length;
      ny = dx / length;
      distance = 1e-6;
    } else {
      nx /= distance;
      ny /= distance;
    }
    const penetration = minDistance - distance;
    marble.x += nx * penetration;
    marble.y += ny * penetration;

    const normalVelocity = marble.vx * nx + marble.vy * ny;
    if (normalVelocity >= 0) return;
    const restitution = spec.restitution ?? this.options.marbleBounce;
    marble.vx -= (1 + restitution) * normalVelocity * nx;
    marble.vy -= (1 + restitution) * normalVelocity * ny;

    const tangentX = -ny;
    const tangentY = nx;
    const tangentVelocity = marble.vx * tangentX + marble.vy * tangentY;
    const friction = spec.friction ?? this.options.trackFriction;
    const damping = Math.max(0, 1 - friction * dt * 18);
    marble.vx -= tangentVelocity * (1 - damping) * tangentX;
    marble.vy -= tangentVelocity * (1 - damping) * tangentY;
    marble.spin += tangentVelocity * dt * 0.6;

    const impactSpeed = -normalVelocity;
    if (
      spec.instrumentId &&
      spec.subsystem &&
      impactSpeed > 0.32 &&
      (this.time - marble.lastImpactAt > 0.055 ||
        marble.lastInstrumentId !== spec.instrumentId)
    ) {
      this.emitImpact(marble, spec, impactSpeed);
    }
  }

  private emitImpact(marble: MarbleBody, spec: MarbleSegmentSpec, speed: number): void {
    const instrumentId = spec.instrumentId ?? 'unknown';
    const energy = clamp(speed * 0.34, 0, 1.6);
    marble.lastImpactAt = this.time;
    marble.lastInstrumentId = instrumentId;
    marble.impactEnergy = Math.max(marble.impactEnergy, energy);
    this.instrumentEnergy.set(
      instrumentId,
      clamp((this.instrumentEnergy.get(instrumentId) ?? 0) + energy, 0, 2),
    );
    this.impactCount++;
    this.pendingImpacts.push({
      id: this.impactCount,
      instrumentId,
      lane: spec.lane ?? marble.lane,
      subsystem: spec.subsystem ?? 'modal-clang',
      pitchRatio: spec.pitchRatio ?? 1,
      velocity: speed,
      energy,
      x: marble.x,
      y: marble.y,
      time: this.time,
    });
  }

  private resolveMarbleCollisions(): void {
    const byLane = new Map<number, MarbleBody[]>();
    for (const marble of this.marbles) {
      if (marble.state !== 'free') continue;
      const list = byLane.get(marble.lane) ?? [];
      list.push(marble);
      byLane.set(marble.lane, list);
    }
    const restitution = this.options.marbleBounce * 0.72;
    for (const list of byLane.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          const minDistance = a.radius + b.radius;
          if (distance >= minDistance) continue;
          if (distance < 1e-6) {
            dx = 0.01;
            dy = 0;
            distance = 0.01;
          }
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minDistance - distance;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relativeVelocity >= 0) continue;
          const impulse = -(1 + restitution) * relativeVelocity * 0.5;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  }

  private collectMarbles(dt: number): void {
    for (let index = 0; index < this.marbles.length; index++) {
      const marble = this.marbles[index];
      if (marble.state !== 'free') continue;
      const speed = Math.hypot(marble.vx, marble.vy);
      if (speed < 0.025 && marble.y < this.blueprint.collectorY + 0.55) {
        marble.stuckTime += dt;
      } else {
        marble.stuckTime = Math.max(0, marble.stuckTime - dt * 2);
      }
      const outOfBounds =
        marble.y < this.blueprint.world.minY ||
        marble.x < this.blueprint.world.minX - 0.4 ||
        marble.x > this.blueprint.world.maxX + 0.4;
      const reachedLift =
        marble.x > 4.62 && marble.y < -2.72;
      const settledInFunnel = marble.y < -3.18;
      const stuck = marble.stuckTime > 6;
      if (!outOfBounds && !reachedLift && !settledInFunnel && !stuck) continue;
      if (outOfBounds) {
        this.lostCount++;
        this.pendingLost++;
      }
      if (stuck) {
        this.pendingJams++;
        for (const gate of this.gates) {
          if (gate.lane === marble.lane) gate.jamCount++;
        }
      }
      marble.state = 'lifting';
      marble.vx = 0;
      marble.vy = 0;
      marble.liftProgress = -0.012 * (marble.id % 10);
      marble.stuckTime = 0;
      marble.impactEnergy = 0;
      this.placeOnLift(marble);
      this.recycleCount++;
      this.pendingRecycled++;
    }
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}

export const normalizeAngle = (angle: number): number =>
  ((angle % TAU) + TAU) % TAU;
