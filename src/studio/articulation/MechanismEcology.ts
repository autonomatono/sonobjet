import type { BehaviorMapEntry, ImpulseEvent } from '../../engine/core/types';
import {
  BEHAVIOR_PROFILES,
  type ArticulationState,
  type BehaviorId,
  type BehaviorProfile,
} from './ArticulationRig';

export const ORGAN_IDS = [
  'escapement',
  'barrel',
  'strikers',
  'combs',
  'bellows',
  'iris',
  'armor',
  'flux',
] as const;

export type OrganId = (typeof ORGAN_IDS)[number];

export const DEFAULT_BEHAVIOR_MAPS: BehaviorMapEntry[] = [
  { id: 'map-sub', source: 'sub-rupture', target: 'strikers', gain: 1.15, enabled: true },
  { id: 'map-spine', source: 'spine-shear', target: 'armor', gain: 0.82, enabled: true },
  { id: 'map-fin', source: 'fin-cascade', target: 'combs', gain: 0.76, enabled: true },
  { id: 'map-piston', source: 'piston-snap', target: 'bellows', gain: 0.94, enabled: true },
  { id: 'map-break', source: 'break-shred', target: 'strikers', gain: 1.08, enabled: true },
  { id: 'map-modal', source: 'modal-clang', target: 'combs', gain: 1.0, enabled: true },
  { id: 'map-core', source: 'core-implode', target: 'flux', gain: 1.2, enabled: true },
  { id: 'map-arc', source: 'arc-discharge', target: 'flux', gain: 0.92, enabled: true },
  { id: 'map-larynx', source: 'larynx-lead', target: 'iris', gain: 1.05, enabled: true },
  { id: 'map-bellows', source: 'bellows-choir', target: 'bellows', gain: 1.1, enabled: true },
  { id: 'map-windup', source: 'windup-inhale', target: 'bellows', gain: 0.74, enabled: true },
  { id: 'map-acid', source: 'acid-squelch', target: 'barrel', gain: 0.88, enabled: true },
  { id: 'map-glass', source: 'glass-armonica', target: 'combs', gain: 0.95, enabled: true },
  { id: 'map-glitch', source: 'glitch-chirp', target: 'escapement', gain: 1.0, enabled: true },
];

interface OrganAgent {
  id: OrganId;
  phase: number;
  drive: number;
  fatigue: number;
  impulse: number;
  excitability: number;
  naturalFrequency: number;
  neighbor: OrganId;
}

export interface EcologyStepContext {
  dt: number;
  elapsed: number;
  beat: number;
  step16: number;
  scoreIntensity: number;
  articulation: ArticulationState;
}

export interface EcologySnapshot {
  behavior: BehaviorId;
  arousal: number;
  cohesion: number;
  fatigue: number;
  curiosity: number;
  phase: number;
  resonance: number;
  organDrives: Record<OrganId, number>;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * An embodied behavioral ecology rather than a bag of independent LFOs.
 *
 * Eight organ agents are coupled phase oscillators. Score impulses enter via
 * editable behavior maps, excite local organs, raise global arousal, accumulate
 * fatigue, and alter cohesion. Neighbor coupling and phase coherence produce
 * gesture propagation across the automaton without any floating particle cloud.
 */
export class MechanismEcology {
  private behavior: BehaviorProfile = BEHAVIOR_PROFILES.PRECISION_ESCAPEMENT;
  private maps: BehaviorMapEntry[] = DEFAULT_BEHAVIOR_MAPS.map((m) => ({ ...m }));
  private agents: OrganAgent[] = ORGAN_IDS.map((id, index) => ({
    id,
    phase: (index / ORGAN_IDS.length) * Math.PI * 2,
    drive: 0.12,
    fatigue: 0.05,
    impulse: 0,
    excitability: 0.72 + index * 0.055,
    naturalFrequency: 0.21 + index * 0.047,
    neighbor: ORGAN_IDS[(index + 3) % ORGAN_IDS.length],
  }));

  private arousal = 0.18;
  private cohesion = 0.84;
  private fatigue = 0.06;
  private curiosity = 0.36;
  private phase = 0;
  private resonance = 0.68;
  private eventEnergy = 0;

  setBehavior(id: string): void {
    const profile = BEHAVIOR_PROFILES[id as BehaviorId];
    if (profile) this.behavior = profile;
  }

  getBehavior(): BehaviorId {
    return this.behavior.id;
  }

  setMaps(maps: BehaviorMapEntry[]): void {
    this.maps = maps.map((m) => ({ ...m }));
  }

  getMaps(): BehaviorMapEntry[] {
    return this.maps.map((m) => ({ ...m }));
  }

  stimulate(event: ImpulseEvent): void {
    const liveBoost = event.origin === 'score' ? 1 : 1.2;
    this.eventEnergy = Math.min(2.4, this.eventEnergy + event.velocity * 0.24 * liveBoost);
    let matched = false;
    for (const map of this.maps) {
      if (!map.enabled || map.source !== event.subsystem) continue;
      const agent = this.agents.find((a) => a.id === map.target);
      if (!agent) continue;
      agent.impulse += event.velocity * map.gain * liveBoost;
      agent.phase += event.locus[0] * 0.18 + event.locus[1] * 0.09;
      matched = true;
    }
    if (!matched) this.arousal = clamp01(this.arousal + event.velocity * 0.05);
  }

  getDrive(id: OrganId): number {
    return this.agents.find((a) => a.id === id)?.drive ?? 0;
  }

  getSnapshot(): EcologySnapshot {
    const organDrives = {} as Record<OrganId, number>;
    for (const agent of this.agents) organDrives[agent.id] = agent.drive;
    return {
      behavior: this.behavior.id,
      arousal: this.arousal,
      cohesion: this.cohesion,
      fatigue: this.fatigue,
      curiosity: this.curiosity,
      phase: this.phase,
      resonance: this.resonance,
      organDrives,
    };
  }

  /** Flat numeric snapshot for generic Director telemetry and JSON export. */
  getFlatSnapshot(): Record<string, number> {
    const snap = this.getSnapshot();
    const out: Record<string, number> = {
      'ecology.arousal': snap.arousal,
      'ecology.cohesion': snap.cohesion,
      'ecology.fatigue': snap.fatigue,
      'ecology.curiosity': snap.curiosity,
      'ecology.phase': snap.phase,
      'ecology.resonance': snap.resonance,
    };
    for (const [id, drive] of Object.entries(snap.organDrives)) {
      out[`drive.${id}`] = drive;
    }
    return out;
  }

  step(context: EcologyStepContext): EcologySnapshot {
    const dt = Math.min(0.05, Math.max(0.0005, context.dt));
    const p = this.behavior;
    const art = context.articulation;

    this.eventEnergy *= Math.exp(-dt * 2.5);
    const arousalTarget = clamp01(
      0.1 +
        context.scoreIntensity * 0.42 +
        this.eventEnergy * 0.22 +
        p.energy * 0.32 +
        art.overclockSpeed * 0.08,
    );
    this.arousal += (arousalTarget - this.arousal) * (1 - Math.exp(-dt * 3.1));

    this.fatigue = clamp01(
      this.fatigue +
        dt * (this.arousal * p.fatigueGain - p.recovery * (1 - this.arousal * 0.55)),
    );
    const cohesionTarget = clamp01(
      0.78 +
        p.cohesionBias +
        art.tetherTension * 0.18 -
        art.magneticUnpin * 0.42 -
        this.fatigue * 0.22,
    );
    this.cohesion += (cohesionTarget - this.cohesion) * (1 - Math.exp(-dt * 1.7));

    this.phase += dt * (0.63 + this.arousal * 1.45 + art.chronoShear * 1.1);
    this.curiosity = clamp01(
      0.45 +
        Math.sin(this.phase * 0.71) * 0.22 +
        Math.sin(this.phase * 1.93 + this.arousal * 4.1) * 0.14 +
        p.noise * Math.sin(this.phase * 3.7),
    );

    let meanSin = 0;
    let meanCos = 0;
    for (const agent of this.agents) {
      meanSin += Math.sin(agent.phase);
      meanCos += Math.cos(agent.phase);
    }
    meanSin /= this.agents.length;
    meanCos /= this.agents.length;
    this.resonance = Math.hypot(meanSin, meanCos);
    const meanPhase = Math.atan2(meanSin, meanCos);

    const neighborDrives = new Map<OrganId, number>();
    for (const agent of this.agents) neighborDrives.set(agent.id, agent.drive);

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const neighbor = neighborDrives.get(agent.neighbor) ?? 0;
      const couplingTerm = Math.sin(meanPhase - agent.phase);
      const localNoise =
        Math.sin(context.elapsed * (0.73 + i * 0.13) + i * 1.91) * p.noise;
      const tempo = 1 + art.overclockSpeed * 0.72 + this.arousal * 0.35;
      agent.phase +=
        dt *
        Math.PI *
        2 *
        (agent.naturalFrequency * tempo +
          p.coupling * 0.34 * couplingTerm +
          p.phaseSpread * 0.045 * Math.sin(i + this.phase) +
          localNoise * 0.14);

      agent.impulse *= Math.exp(-dt * (3.4 + agent.fatigue * 1.2));
      agent.fatigue = clamp01(
        agent.fatigue +
          dt *
            (this.arousal * p.fatigueGain * 0.7 -
              p.recovery * (1 - this.arousal) * 0.8),
      );

      const oscillator = (Math.sin(agent.phase) + 1) * 0.5;
      let driveTarget =
        0.08 +
        this.arousal * 0.46 * agent.excitability +
        oscillator * (0.16 + p.energy * 0.22) +
        neighbor * (0.14 + p.coupling * 0.22) * this.resonance +
        agent.impulse * 0.52 +
        this.curiosity * 0.12;
      driveTarget *= 1 - agent.fatigue * 0.38;

      // Escapement behavior locks to the 16th grid as precision increases.
      if (agent.id === 'escapement' && p.precision > 0.55) {
        const stepPhase = (context.beat * 4) % 1;
        const tick = Math.exp(-stepPhase * (5 + p.precision * 8));
        driveTarget = driveTarget * (1 - p.precision) + tick * p.precision * 1.2;
      }
      if (agent.id === 'bellows') {
        const breath = (Math.sin(context.beat * 0.52) + 1) * 0.5;
        driveTarget = driveTarget * 0.6 + breath * (0.3 + art.bellowsBreathing * 0.55);
      }
      if (agent.id === 'flux') {
        driveTarget += art.magneticUnpin * 0.42 + art.chronoShear * 0.2;
      }

      const responsiveness = 5 + p.precision * 9 + agent.excitability * 2;
      agent.drive +=
        (clamp01(driveTarget) - agent.drive) * (1 - Math.exp(-dt * responsiveness));
    }

    return this.getSnapshot();
  }

  reset(): void {
    this.arousal = 0.18;
    this.cohesion = 0.84;
    this.fatigue = 0.06;
    this.curiosity = 0.36;
    this.phase = 0;
    this.resonance = 0.68;
    this.eventEnergy = 0;
    for (let i = 0; i < this.agents.length; i++) {
      this.agents[i].phase = (i / this.agents.length) * Math.PI * 2;
      this.agents[i].drive = 0.12;
      this.agents[i].fatigue = 0.05;
      this.agents[i].impulse = 0;
    }
  }
}
