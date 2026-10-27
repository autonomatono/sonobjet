import type { PostFxState } from '../../engine/core/types';
import {
  BEHAVIOR_PROFILES,
  blendArticulation,
  blendPostFx,
  clampArticulation,
  createDefaultArticulation,
  type ArticulationState,
  type BehaviorId,
  type MachinePreset,
} from './ArticulationRig';

const withArticulation = (
  overrides: Partial<ArticulationState>,
): ArticulationState =>
  clampArticulation({ ...createDefaultArticulation(), ...overrides });

const look = (
  glitch: number,
  aberration: number,
  grain: number,
  bloomStrength: number,
  starkThreshold = 0,
): Partial<PostFxState> => ({
  glitch,
  lensDistort: 0.06 + aberration * 0.08,
  aberration,
  grain,
  bleachGrade: 0.28,
  starkThreshold,
  bloomStrength,
});

/** Eight authored milestones spanning sealed object → temporal paradox → rest. */
export const BUILT_IN_PRESETS: MachinePreset[] = [
  {
    id: 'M1',
    name: 'M1 // SEALED RELIQUARY',
    caption: 'Cold ceramic case; only the balance wheel breathes.',
    articulation: withArticulation({
      chassisUnfold: 0.04,
      armorSplit: 0.02,
      barrelEngage: 0.08,
      combFan: 0.04,
      strikerReach: 0.05,
      bellowsBreathing: 0.12,
      irisAperture: 0.14,
      magneticUnpin: 0,
      chronoShear: 0,
      overclockSpeed: 0.12,
      camAnticipation: 0.18,
      tetherTension: 0.9,
    }),
    behavior: 'PRECISION_ESCAPEMENT',
    transitionSec: 3.2,
    postFx: look(0.02, 0.14, 0.12, 0.7),
  },
  {
    id: 'M2',
    name: 'M2 // CLOCKWORK AWAKENING',
    caption: 'Bridges separate; the escapement finds 164 BPM.',
    articulation: withArticulation({
      chassisUnfold: 0.38,
      armorSplit: 0.24,
      barrelEngage: 0.52,
      combFan: 0.3,
      strikerReach: 0.34,
      bellowsBreathing: 0.4,
      irisAperture: 0.42,
      magneticUnpin: 0,
      chronoShear: 0,
      overclockSpeed: 0.42,
      camAnticipation: 0.62,
      tetherTension: 0.85,
    }),
    behavior: 'PRECISION_ESCAPEMENT',
    transitionSec: 2.4,
    postFx: look(0.09, 0.2, 0.14, 0.86),
  },
  {
    id: 'M3',
    name: 'M3 // PROGRAMME BARREL LOOM',
    caption: 'Pinned brass score cylinder drives every follower.',
    articulation: withArticulation({
      chassisUnfold: 0.58,
      armorSplit: 0.46,
      barrelEngage: 0.92,
      combFan: 0.58,
      strikerReach: 0.66,
      bellowsBreathing: 0.55,
      irisAperture: 0.5,
      magneticUnpin: 0,
      chronoShear: 0.04,
      overclockSpeed: 0.68,
      camAnticipation: 0.96,
      tetherTension: 0.82,
    }),
    behavior: 'BARREL_AUTOMATON_PLAY',
    transitionSec: 2.0,
    postFx: look(0.16, 0.28, 0.16, 0.98),
  },
  {
    id: 'M4',
    name: 'M4 // OPEN RESONATOR ARIA',
    caption: 'Comb fan, bellows and iris open into a breathing instrument.',
    articulation: withArticulation({
      chassisUnfold: 0.78,
      armorSplit: 0.72,
      barrelEngage: 0.72,
      combFan: 0.88,
      strikerReach: 0.42,
      bellowsBreathing: 0.94,
      irisAperture: 0.88,
      magneticUnpin: 0.02,
      chronoShear: 0.08,
      overclockSpeed: 0.34,
      camAnticipation: 0.68,
      tetherTension: 0.76,
    }),
    behavior: 'PENDULUM_BREATH',
    transitionSec: 3.8,
    postFx: look(0.06, 0.22, 0.1, 1.12),
  },
  {
    id: 'M5',
    name: 'M5 // MAGNETIC LEVITATION',
    caption: 'Bearings unpin along flux rails, held by plasma torque-axles.',
    articulation: withArticulation({
      chassisUnfold: 0.86,
      armorSplit: 0.82,
      barrelEngage: 0.78,
      combFan: 0.72,
      strikerReach: 0.58,
      bellowsBreathing: 0.66,
      irisAperture: 0.62,
      magneticUnpin: 0.72,
      chronoShear: 0.3,
      overclockSpeed: 0.55,
      camAnticipation: 0.58,
      tetherTension: 0.96,
    }),
    behavior: 'ZERO_G_DISASSEMBLY',
    transitionSec: 4.2,
    postFx: look(0.24, 0.38, 0.18, 1.18),
  },
  {
    id: 'M6',
    name: 'M6 // OVERCLOCKED CADENZA',
    caption: 'Geneva indexer hammers the 64th-note stop-start drill.',
    articulation: withArticulation({
      chassisUnfold: 0.82,
      armorSplit: 0.7,
      barrelEngage: 1,
      combFan: 0.92,
      strikerReach: 1,
      bellowsBreathing: 0.82,
      irisAperture: 0.28,
      magneticUnpin: 0.24,
      chronoShear: 0.48,
      overclockSpeed: 1.75,
      camAnticipation: 1,
      tetherTension: 0.72,
    }),
    behavior: 'OVERCLOCK_CADENZA',
    transitionSec: 0.9,
    postFx: look(0.78, 0.66, 0.3, 1.2, 0.4),
  },
  {
    id: 'M7',
    name: 'M7 // TEMPORAL PARADOX CROWN',
    caption: 'Inner and outer trains split into differential time rates.',
    articulation: withArticulation({
      chassisUnfold: 1,
      armorSplit: 0.96,
      barrelEngage: 0.94,
      combFan: 1,
      strikerReach: 0.86,
      bellowsBreathing: 0.78,
      irisAperture: 0.74,
      magneticUnpin: 0.54,
      chronoShear: 0.9,
      overclockSpeed: 1.18,
      camAnticipation: 0.82,
      tetherTension: 0.88,
    }),
    behavior: 'ZERO_G_DISASSEMBLY',
    transitionSec: 2.8,
    postFx: look(0.36, 0.54, 0.2, 1.34, 0.12),
  },
  {
    id: 'M8',
    name: 'M8 // WOUND-DOWN RELIQUARY',
    caption: 'Mainspring slackens; the machine remembers how to close.',
    articulation: withArticulation({
      chassisUnfold: 0.18,
      armorSplit: 0.12,
      barrelEngage: 0.14,
      combFan: 0.12,
      strikerReach: 0.08,
      bellowsBreathing: 0.2,
      irisAperture: 0.18,
      magneticUnpin: 0,
      chronoShear: 0.02,
      overclockSpeed: 0.05,
      camAnticipation: 0.1,
      tetherTension: 1,
    }),
    behavior: 'BROKEN_MAINSPRING',
    transitionSec: 5.5,
    postFx: look(0.03, 0.12, 0.13, 0.74),
  },
];

export interface BlendedPresetState {
  articulation: ArticulationState;
  behavior: BehaviorId;
  postFx: Partial<PostFxState>;
  transitionSec: number;
  fromId: string;
  toId: string;
  t: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class BehaviorPresetBank {
  private readonly presets = new Map<string, MachinePreset>();

  constructor(initial: MachinePreset[] = BUILT_IN_PRESETS) {
    for (const preset of initial) this.upsert(preset);
  }

  list(): MachinePreset[] {
    return Array.from(this.presets.values()).map((p) => this.clone(p));
  }

  get(id: string): MachinePreset | undefined {
    const p = this.presets.get(id);
    return p ? this.clone(p) : undefined;
  }

  require(id: string): MachinePreset {
    const p = this.presets.get(id);
    if (!p) throw new Error(`Unknown machine preset: ${id}`);
    return this.clone(p);
  }

  upsert(preset: MachinePreset): void {
    this.presets.set(preset.id, this.clone(preset));
  }

  duplicate(id: string, newId: string, name?: string): MachinePreset | null {
    const source = this.presets.get(id);
    if (!source || this.presets.has(newId)) return null;
    const copy: MachinePreset = {
      ...this.clone(source),
      id: newId,
      name: name ?? `${source.name} COPY`,
    };
    this.upsert(copy);
    return this.clone(copy);
  }

  remove(id: string): boolean {
    if (this.presets.size <= 1) return false;
    return this.presets.delete(id);
  }

  blend(fromId: string, toId: string, t: number): BlendedPresetState {
    const from = this.presets.get(fromId) ?? this.presets.get('M1');
    const to = this.presets.get(toId) ?? from;
    if (!from || !to) throw new Error('Preset bank is empty');
    const x = Math.max(0, Math.min(1, t));
    return {
      articulation: blendArticulation(from.articulation, to.articulation, x),
      behavior: x < 0.5 ? from.behavior : to.behavior,
      postFx: blendPostFx(from.postFx ?? {}, to.postFx ?? {}, x),
      transitionSec: from.transitionSec + (to.transitionSec - from.transitionSec) * x,
      fromId: from.id,
      toId: to.id,
      t: x,
    };
  }

  exportJSON(): string {
    return JSON.stringify(
      { version: 1, presets: this.list() },
      null,
      2,
    );
  }

  importJSON(raw: string, merge = true): MachinePreset[] {
    const parsed: unknown = JSON.parse(raw);
    const rows: unknown[] = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.presets)
        ? parsed.presets
        : [];
    if (rows.length === 0) throw new Error('No presets found in JSON');

    const imported: MachinePreset[] = [];
    for (const row of rows) {
      if (!isRecord(row) || typeof row.id !== 'string') continue;
      const behavior =
        typeof row.behavior === 'string' &&
        row.behavior in BEHAVIOR_PROFILES
          ? (row.behavior as BehaviorId)
          : 'PRECISION_ESCAPEMENT';
      const articulation = clampArticulation(
        isRecord(row.articulation)
          ? (row.articulation as Record<string, number>)
          : {},
      );
      imported.push({
        id: row.id,
        name: typeof row.name === 'string' ? row.name : row.id,
        caption: typeof row.caption === 'string' ? row.caption : '',
        articulation,
        behavior,
        transitionSec:
          typeof row.transitionSec === 'number' ? row.transitionSec : 2,
        postFx: isRecord(row.postFx)
          ? (row.postFx as Partial<PostFxState>)
          : undefined,
      });
    }
    if (imported.length === 0) throw new Error('No valid presets found in JSON');
    if (!merge) this.presets.clear();
    for (const preset of imported) this.upsert(preset);
    return imported;
  }

  private clone(preset: MachinePreset): MachinePreset {
    return {
      ...preset,
      articulation: { ...preset.articulation },
      postFx: preset.postFx ? { ...preset.postFx } : undefined,
    };
  }
}
