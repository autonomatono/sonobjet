import type { PostFxState } from '../../engine/core/types';

/** Twelve inspectable, scrubbable mechanical degrees of freedom. */
export interface ArticulationState {
  [key: string]: number;
  chassisUnfold: number;
  armorSplit: number;
  barrelEngage: number;
  combFan: number;
  strikerReach: number;
  bellowsBreathing: number;
  irisAperture: number;
  magneticUnpin: number;
  chronoShear: number;
  overclockSpeed: number;
  camAnticipation: number;
  tetherTension: number;
}

export interface ArticulationDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  step: number;
  description: string;
}

export type BehaviorId =
  | 'PRECISION_ESCAPEMENT'
  | 'BARREL_AUTOMATON_PLAY'
  | 'PENDULUM_BREATH'
  | 'ZERO_G_DISASSEMBLY'
  | 'OVERCLOCK_CADENZA'
  | 'BROKEN_MAINSPRING';

export interface BehaviorProfile {
  id: BehaviorId;
  label: string;
  description: string;
  energy: number;
  precision: number;
  coupling: number;
  noise: number;
  fatigueGain: number;
  recovery: number;
  phaseSpread: number;
  cohesionBias: number;
}

export const ARTICULATION_DEFINITIONS: ArticulationDefinition[] = [
  {
    id: 'chassisUnfold',
    label: 'CHASSIS UNFOLD',
    min: 0,
    max: 1,
    defaultValue: 0.14,
    step: 0.01,
    description: 'Sealed reliquary → open skeletonized movement bridges.',
  },
  {
    id: 'armorSplit',
    label: 'CERAMIC ARMOR',
    min: 0,
    max: 1,
    defaultValue: 0.1,
    step: 0.01,
    description: 'Hinged Cunningham carapace shells on pantograph brackets.',
  },
  {
    id: 'barrelEngage',
    label: 'CHRONO BARREL',
    min: 0,
    max: 1,
    defaultValue: 0.25,
    step: 0.01,
    description: 'Programme cylinder raise, pin engagement and optical read-ring.',
  },
  {
    id: 'combFan',
    label: 'TUNED COMB FAN',
    min: 0,
    max: 1,
    defaultValue: 0.18,
    step: 0.01,
    description: 'Folds graduated steel/quartz music-box tine banks radially.',
  },
  {
    id: 'strikerReach',
    label: 'STRIKER REACH',
    min: 0,
    max: 1,
    defaultValue: 0.2,
    step: 0.01,
    description: 'Four-bar crank-rocker reach and hammer drop posture.',
  },
  {
    id: 'bellowsBreathing',
    label: 'BELLOWS BREATH',
    min: 0,
    max: 1,
    defaultValue: 0.32,
    step: 0.01,
    description: 'Eccentric crank stroke through pleated acoustic bellows.',
  },
  {
    id: 'irisAperture',
    label: 'IRIS APERTURE',
    min: 0,
    max: 1,
    defaultValue: 0.42,
    step: 0.01,
    description: 'Formant resonator pipe mechanical iris opening.',
  },
  {
    id: 'magneticUnpin',
    label: 'MAGNETIC UNPIN',
    min: 0,
    max: 1,
    defaultValue: 0,
    step: 0.01,
    description: 'Future anomaly: subassemblies slide along flux rails.',
  },
  {
    id: 'chronoShear',
    label: 'CHRONO SHEAR',
    min: 0,
    max: 1,
    defaultValue: 0,
    step: 0.01,
    description: 'Differential time-rate split between inner and outer trains.',
  },
  {
    id: 'overclockSpeed',
    label: 'OVERCLOCK',
    min: 0,
    max: 2,
    defaultValue: 0.35,
    step: 0.01,
    description: 'Escapement and gear train kinetic multiplier.',
  },
  {
    id: 'camAnticipation',
    label: 'CAM ANTICIPATION',
    min: 0,
    max: 1,
    defaultValue: 0.4,
    step: 0.01,
    description: 'How far ahead cam-followers lift before acoustic strikes.',
  },
  {
    id: 'tetherTension',
    label: 'TETHER TENSION',
    min: 0,
    max: 1,
    defaultValue: 0.65,
    step: 0.01,
    description: 'Plasma torque-axle stiffness between unpinned bearings.',
  },
];

export const ARTICULATION_KEYS = ARTICULATION_DEFINITIONS.map((d) => d.id);

export const BEHAVIOR_PROFILES: Record<BehaviorId, BehaviorProfile> = {
  PRECISION_ESCAPEMENT: {
    id: 'PRECISION_ESCAPEMENT',
    label: 'PRECISION ESCAPEMENT',
    description: 'Crisp quantized 16th-note horological ticking.',
    energy: 0.28,
    precision: 0.94,
    coupling: 0.72,
    noise: 0.04,
    fatigueGain: 0.1,
    recovery: 0.34,
    phaseSpread: 0.18,
    cohesionBias: 0.22,
  },
  BARREL_AUTOMATON_PLAY: {
    id: 'BARREL_AUTOMATON_PLAY',
    label: 'BARREL AUTOMATON PLAY',
    description: 'Pinned score cylinder, cam-followers and striker linkages.',
    energy: 0.64,
    precision: 0.72,
    coupling: 0.84,
    noise: 0.12,
    fatigueGain: 0.19,
    recovery: 0.24,
    phaseSpread: 0.44,
    cohesionBias: 0.08,
  },
  PENDULUM_BREATH: {
    id: 'PENDULUM_BREATH',
    label: 'PENDULUM BREATH',
    description: 'Slow counter-balanced harmonic sway for Aria suspensions.',
    energy: 0.36,
    precision: 0.34,
    coupling: 0.92,
    noise: 0.07,
    fatigueGain: 0.06,
    recovery: 0.42,
    phaseSpread: 0.7,
    cohesionBias: 0.18,
  },
  ZERO_G_DISASSEMBLY: {
    id: 'ZERO_G_DISASSEMBLY',
    label: 'ZERO-G DISASSEMBLY',
    description: 'Tethered subassemblies unpin, precess and float on flux rails.',
    energy: 0.48,
    precision: 0.22,
    coupling: 0.55,
    noise: 0.2,
    fatigueGain: 0.12,
    recovery: 0.3,
    phaseSpread: 1.2,
    cohesionBias: -0.36,
  },
  OVERCLOCK_CADENZA: {
    id: 'OVERCLOCK_CADENZA',
    label: 'OVERCLOCK CADENZA',
    description: 'Violent stop-start Geneva ratcheting and Beat-4 dead-locks.',
    energy: 0.95,
    precision: 0.86,
    coupling: 0.48,
    noise: 0.26,
    fatigueGain: 0.34,
    recovery: 0.14,
    phaseSpread: 0.32,
    cohesionBias: -0.08,
  },
  BROKEN_MAINSPRING: {
    id: 'BROKEN_MAINSPRING',
    label: 'BROKEN MAINSPRING',
    description: 'Entropic winding down, ratchet slips and reliquary settling.',
    energy: 0.18,
    precision: 0.18,
    coupling: 0.38,
    noise: 0.15,
    fatigueGain: 0.28,
    recovery: 0.08,
    phaseSpread: 0.9,
    cohesionBias: 0.1,
  },
};

export const BEHAVIOR_IDS = Object.keys(BEHAVIOR_PROFILES) as BehaviorId[];

export function createDefaultArticulation(): ArticulationState {
  const state: ArticulationState = {
    chassisUnfold: 0,
    armorSplit: 0,
    barrelEngage: 0,
    combFan: 0,
    strikerReach: 0,
    bellowsBreathing: 0,
    irisAperture: 0,
    magneticUnpin: 0,
    chronoShear: 0,
    overclockSpeed: 0,
    camAnticipation: 0,
    tetherTension: 0.65,
  };
  for (const def of ARTICULATION_DEFINITIONS) state[def.id] = def.defaultValue;
  return state;
}

export function clampArticulation(
  input: Partial<ArticulationState> | Record<string, number>,
  base: ArticulationState = createDefaultArticulation(),
): ArticulationState {
  const result: ArticulationState = { ...base };
  for (const def of ARTICULATION_DEFINITIONS) {
    const value = input[def.id];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[def.id] = Math.max(def.min, Math.min(def.max, value));
    }
  }
  return result;
}

export function blendArticulation(
  a: ArticulationState,
  b: ArticulationState,
  t: number,
): ArticulationState {
  const x = Math.max(0, Math.min(1, t));
  const result = { ...a };
  for (const def of ARTICULATION_DEFINITIONS) {
    result[def.id] = a[def.id] + (b[def.id] - a[def.id]) * x;
  }
  return clampArticulation(result, result);
}

export function blendPostFx(
  a: Partial<PostFxState>,
  b: Partial<PostFxState>,
  t: number,
): Partial<PostFxState> {
  const keys: Array<keyof PostFxState> = [
    'glitch',
    'lensDistort',
    'aberration',
    'grain',
    'bleachGrade',
    'starkThreshold',
    'bloomStrength',
  ];
  const out: Partial<PostFxState> = {};
  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    out[key] = av + (bv - av) * Math.max(0, Math.min(1, t));
  }
  return out;
}

export interface MachinePreset {
  id: string;
  name: string;
  caption: string;
  articulation: ArticulationState;
  behavior: BehaviorId;
  transitionSec: number;
  postFx?: Partial<PostFxState>;
}
