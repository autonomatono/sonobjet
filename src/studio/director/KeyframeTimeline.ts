import type { BehaviorMapEntry, PostFxState } from '../../engine/core/types';
import {
  BEHAVIOR_PROFILES,
  blendArticulation,
  clampArticulation,
  type ArticulationState,
  type BehaviorId,
} from '../articulation/ArticulationRig';
import { BehaviorPresetBank, type BlendedPresetState } from '../articulation/BehaviorPresetBank';
import { DEFAULT_BEHAVIOR_MAPS } from '../articulation/MechanismEcology';

export type Vec3Tuple = [number, number, number];
export type CameraInterpolation =
  | 'CUT'
  | 'SMOOTH_SPLINE'
  | 'ORBIT_ARC'
  | 'VERTIGO';
export type MilestoneEase = 'LINEAR' | 'SMOOTHER' | 'STEP';

export interface CameraKeyframe {
  id: string;
  beat: number;
  label: string;
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
  roll: number;
  interpolation: CameraInterpolation;
  jointId?: string;
}

export interface LookKeyframe {
  id: string;
  beat: number;
  label: string;
  fx: PostFxState;
}

export interface MachineMilestone {
  id: string;
  beat: number;
  presetId: string;
  blendBeats: number;
  ease: MilestoneEase;
  label: string;
}

export interface DirectorProject {
  version: number;
  bars: number;
  bpm: number;
  name: string;
  cameraKeys: CameraKeyframe[];
  lookKeys: LookKeyframe[];
  milestones: MachineMilestone[];
  behaviorMaps: BehaviorMapEntry[];
}

export interface CameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
  roll: number;
  keyId: string;
  nextKeyId: string;
  label: string;
  interpolation: CameraInterpolation;
  t: number;
}

export interface MilestoneEvaluation extends BlendedPresetState {
  label: string;
  beat: number;
  activeId: string;
  nextId: string;
}

export type JointResolver = (id: string) => Vec3Tuple | null;

export const DEFAULT_POST_FX: PostFxState = {
  glitch: 0.015,
  lensDistort: 0.045,
  aberration: 0.08,
  grain: 0.07,
  bleachGrade: 0.2,
  starkThreshold: 0,
  bloomStrength: 0.88,
  linocut: 0,
  neonGlow: 0.08,
  palette: 0,
  exposure: 1.18,
  lightRig: 0,
  lightIntensity: 1,
  shadowStrength: 0.62,
};

export const POST_FX_KEYS: Array<keyof PostFxState> = [
  'glitch',
  'lensDistort',
  'aberration',
  'grain',
  'bleachGrade',
  'starkThreshold',
  'bloomStrength',
  'linocut',
  'neonGlow',
  'palette',
  'exposure',
  'lightRig',
  'lightIntensity',
  'shadowStrength',
];

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoother = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const lerp3 = (a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const catmull = (a: number, b: number, c: number, d: number, t: number): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3)
  );
};

const catmull3 = (
  p0: Vec3Tuple,
  p1: Vec3Tuple,
  p2: Vec3Tuple,
  p3: Vec3Tuple,
  t: number,
): Vec3Tuple => [
  catmull(p0[0], p1[0], p2[0], p3[0], t),
  catmull(p0[1], p1[1], p2[1], p3[1], t),
  catmull(p0[2], p1[2], p2[2], p3[2], t),
];

const add3 = (a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];

const distance = (a: Vec3Tuple, b: Vec3Tuple): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const cloneVec = (v: Vec3Tuple): Vec3Tuple => [v[0], v[1], v[2]];

const isVec3 = (value: unknown): value is Vec3Tuple =>
  Array.isArray(value) &&
  value.length >= 3 &&
  value.slice(0, 3).every((n) => typeof n === 'number' && Number.isFinite(n));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ensureZeroBeat = <T extends { id: string; beat: number }>(
  rows: T[],
  prefix: string,
): T[] => {
  if (rows.length === 0 || rows[0].beat === 0) return rows;
  const first = structuredClone(rows[0]);
  first.id = `${prefix}-zero`;
  first.beat = 0;
  return [first, ...rows];
};

const parseVec = (value: unknown, fallback: Vec3Tuple): Vec3Tuple =>
  isVec3(value) ? [value[0], value[1], value[2]] : cloneVec(fallback);

const parsePostFx = (value: unknown): PostFxState => {
  const row = isRecord(value) ? value : {};
  const fx = { ...DEFAULT_POST_FX };
  for (const key of POST_FX_KEYS) {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) fx[key] = v;
  }
  return fx;
};

const look = (
  glitch: number,
  aberration: number,
  grain: number,
  bloom: number,
  stark = 0,
): PostFxState => ({
  ...DEFAULT_POST_FX,
  glitch,
  lensDistort: 0.035 + aberration * 0.075,
  aberration,
  grain,
  bleachGrade: 0.2 + stark * 0.16,
  starkThreshold: stark,
  bloomStrength: bloom,
});

const CAMERA_INTERPOLATIONS: CameraInterpolation[] = [
  'CUT',
  'SMOOTH_SPLINE',
  'ORBIT_ARC',
  'VERTIGO',
];

const JOINT_MACROS: Record<number, string> = {
  4: 'balanceWheel',
  8: 'chronoBarrel',
  12: 'hammerHead0',
  16: 'combBank0',
  20: 'chronoCage',
};

function createDefaultCameraKeys(bars: number): CameraKeyframe[] {
  const count = 24;
  const actRadius = [9.2, 7.1, 5.4, 3.5, 5.9, 10.2];
  const actHeight = [1.9, 1.15, 0.55, 0.25, 0.9, 2.6];
  const interpolationCycle: CameraInterpolation[] = [
    'CUT',
    'SMOOTH_SPLINE',
    'SMOOTH_SPLINE',
    'ORBIT_ARC',
    'SMOOTH_SPLINE',
    'VERTIGO',
  ];
  const keys: CameraKeyframe[] = [];
  for (let i = 0; i < count; i++) {
    const bar = Math.round((i / count) * bars);
    const act = Math.min(5, Math.floor(bar / 16));
    const a = i * 0.61 + act * 0.42;
    const radius = actRadius[act] + Math.sin(i * 1.7) * 0.55;
    const jointId = JOINT_MACROS[i];
    const isJointMacro = Boolean(jointId);
    keys.push({
      id: `cam-${String(i + 1).padStart(2, '0')}`,
      beat: bar * 4,
      label: `SHOT ${String(i + 1).padStart(2, '0')} // ${
        isJointMacro ? `${jointId?.toUpperCase()} MACRO` : `ACT ${act + 1} FLIGHT`
      }`,
      position: isJointMacro
        ? [Math.sin(a) * 1.35, 0.42 + Math.sin(i) * 0.18, Math.cos(a) * 1.35]
        : [Math.sin(a) * radius, actHeight[act] + Math.sin(i * 0.8) * 0.55, Math.cos(a) * radius],
      target: isJointMacro ? [0, 0, 0] : [0, 0.15 + Math.sin(i * 0.4) * 0.35, 0],
      fov: isJointMacro ? 24 + (i % 3) * 4 : 32 + (i % 5) * 6,
      roll: Math.sin(i * 0.9) * 0.075,
      interpolation: interpolationCycle[i % interpolationCycle.length],
      jointId,
    });
  }
  return keys;
}

function createDefaultLookKeys(bars: number): LookKeyframe[] {
  const specs: Array<[number, PostFxState, string]> = [
    [0, { ...look(0, 0.05, 0.06, 0.72), lightRig: 1, shadowStrength: 0.88 }, 'CORNELL SHADOW WAKE'],
    [12, { ...look(0.01, 0.07, 0.07, 0.9), palette: 1 }, 'BRASS + CORNELL'],
    [28, { ...look(0, 0, 0.11, 0.28), linocut: 0.82, palette: 3, lightRig: 1 }, 'LINO RELIEF ARIA'],
    [44, { ...look(0, 0.05, 0.03, 1.3), neonGlow: 0.72, palette: 2, lightRig: 2 }, 'SUSPENDED NEON HALO'],
    [52, { ...look(0.11, 0.2, 0.09, 1.12, 0.08), palette: 2 }, 'BRIEF CADENZA TEAR'],
    [64, { ...look(0.025, 0.1, 0.04, 1.4), neonGlow: 0.92, palette: 1, lightRig: 2 }, 'NEON CORNELL CROWN'],
    [80, { ...look(0, 0.04, 0.08, 0.82), palette: 4, lightRig: 0 }, 'SODIUM RELEASE'],
    [Math.max(0, bars - 4), { ...look(0, 0.02, 0.055, 0.68), palette: 0 }, 'FINAL CLEAN LOCK'],
  ];
  return specs.map(([bar, fx, label], i) => ({
    id: `look-${String(i + 1).padStart(2, '0')}`,
    beat: bar * 4,
    label,
    fx,
  }));
}

function createDefaultMilestones(): MachineMilestone[] {
  const specs: Array<[number, string, number, MilestoneEase, string]> = [
    [0, 'M1', 4, 'SMOOTHER', 'SEALED OBJECT'],
    [12, 'M2', 8, 'SMOOTHER', 'CLOCKWORK AWAKENING'],
    [28, 'M3', 8, 'LINEAR', 'BARREL LOOM'],
    [40, 'M4', 12, 'SMOOTHER', 'OPEN RESONATOR'],
    [52, 'M5', 6, 'LINEAR', 'MAGNETIC UNPIN'],
    [60, 'M6', 4, 'STEP', 'OVERCLOCK LOCK'],
    [64, 'M7', 10, 'SMOOTHER', 'PARADOX CROWN'],
    [76, 'M6', 8, 'LINEAR', 'SECOND CADENZA'],
    [88, 'M4', 10, 'SMOOTHER', 'RESONATOR MEMORY'],
    [94, 'M8', 4, 'SMOOTHER', 'WOUND-DOWN'],
  ];
  return specs.map(([bar, presetId, blendBeats, ease, label], i) => ({
    id: `milestone-${String(i + 1).padStart(2, '0')}`,
    beat: bar * 4,
    presetId,
    blendBeats,
    ease,
    label,
  }));
}

export function createDefaultDirectorProject(
  bars = 96,
  bpm = 164,
): DirectorProject {
  return {
    version: 1,
    bars,
    bpm,
    name: 'DEFAULT // THE TIME-TRAVELED AUTOMATON',
    cameraKeys: createDefaultCameraKeys(bars),
    lookKeys: createDefaultLookKeys(bars),
    milestones: createDefaultMilestones(),
    behaviorMaps: DEFAULT_BEHAVIOR_MAPS.map((m) => ({ ...m })),
  };
}

const parseCameraKey = (row: unknown, index: number): CameraKeyframe | null => {
  if (!isRecord(row)) return null;
  const beat = typeof row.beat === 'number' ? row.beat : index * 4;
  const interpolation =
    typeof row.interpolation === 'string' &&
    CAMERA_INTERPOLATIONS.includes(row.interpolation as CameraInterpolation)
      ? (row.interpolation as CameraInterpolation)
      : 'SMOOTH_SPLINE';
  return {
    id: typeof row.id === 'string' ? row.id : `cam-import-${index}`,
    beat: Math.max(0, beat),
    label: typeof row.label === 'string' ? row.label : `IMPORTED SHOT ${index + 1}`,
    position: parseVec(row.position, [0, 1.5, 8]),
    target: parseVec(row.target, [0, 0, 0]),
    fov: typeof row.fov === 'number' ? clamp(row.fov, 8, 95) : 42,
    roll: typeof row.roll === 'number' ? clamp(row.roll, -0.8, 0.8) : 0,
    interpolation,
    jointId: typeof row.jointId === 'string' ? row.jointId : undefined,
  };
};

const parseLookKey = (row: unknown, index: number): LookKeyframe | null => {
  if (!isRecord(row)) return null;
  return {
    id: typeof row.id === 'string' ? row.id : `look-import-${index}`,
    beat: Math.max(0, typeof row.beat === 'number' ? row.beat : index * 16),
    label: typeof row.label === 'string' ? row.label : `IMPORTED LOOK ${index + 1}`,
    fx: parsePostFx(row.fx),
  };
};

const parseMilestone = (row: unknown, index: number): MachineMilestone | null => {
  if (!isRecord(row)) return null;
  const ease =
    row.ease === 'LINEAR' || row.ease === 'STEP' || row.ease === 'SMOOTHER'
      ? row.ease
      : 'SMOOTHER';
  return {
    id: typeof row.id === 'string' ? row.id : `milestone-import-${index}`,
    beat: Math.max(0, typeof row.beat === 'number' ? row.beat : index * 32),
    presetId: typeof row.presetId === 'string' ? row.presetId : 'M1',
    blendBeats: Math.max(0, typeof row.blendBeats === 'number' ? row.blendBeats : 8),
    ease,
    label: typeof row.label === 'string' ? row.label : `IMPORTED MILESTONE ${index + 1}`,
  };
};

const parseBehaviorMap = (row: unknown, index: number): BehaviorMapEntry | null => {
  if (!isRecord(row)) return null;
  return {
    id: typeof row.id === 'string' ? row.id : `map-import-${index}`,
    source: typeof row.source === 'string' ? row.source : 'sub-rupture',
    target: typeof row.target === 'string' ? row.target : 'strikers',
    gain: typeof row.gain === 'number' ? row.gain : 1,
    enabled: row.enabled !== false,
  };
};

export class KeyframeTimeline {
  private project: DirectorProject;
  private idCounter = 1000;

  constructor(project = createDefaultDirectorProject()) {
    this.project = this.normalize(project);
  }

  getProject(): DirectorProject {
    return structuredClone(this.project);
  }

  getCameraKeys(): CameraKeyframe[] {
    return this.project.cameraKeys.map((k) => ({
      ...k,
      position: cloneVec(k.position),
      target: cloneVec(k.target),
    }));
  }

  getLookKeys(): LookKeyframe[] {
    return this.project.lookKeys.map((k) => ({ ...k, fx: { ...k.fx } }));
  }

  getMilestones(): MachineMilestone[] {
    return this.project.milestones.map((m) => ({ ...m }));
  }

  getBehaviorMaps(): BehaviorMapEntry[] {
    return this.project.behaviorMaps.map((m) => ({ ...m }));
  }

  getTotalBeats(): number {
    return this.project.bars * 4;
  }

  getBars(): number {
    return this.project.bars;
  }

  getBpm(): number {
    return this.project.bpm;
  }

  newId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  setProject(project: DirectorProject): void {
    this.project = this.normalize(project);
  }

  replaceWithImported(raw: string): DirectorProject {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('Director project must be a JSON object');
    this.setProject(this.normalize(parsed as unknown as DirectorProject));
    return this.getProject();
  }

  exportJSON(): string {
    return JSON.stringify(this.project, null, 2);
  }

  reset(): void {
    this.project = createDefaultDirectorProject(this.project.bars, this.project.bpm);
  }

  addCameraKey(key: Omit<CameraKeyframe, 'id'>): CameraKeyframe {
    const created: CameraKeyframe = {
      ...key,
      id: this.newId('cam'),
      position: cloneVec(key.position),
      target: cloneVec(key.target),
      beat: this.wrapBeat(key.beat),
    };
    this.project.cameraKeys.push(created);
    this.sortAll();
    return { ...created };
  }

  updateCameraKey(id: string, patch: Partial<CameraKeyframe>): boolean {
    const key = this.project.cameraKeys.find((k) => k.id === id);
    if (!key) return false;
    Object.assign(key, patch, { id: key.id });
    if (patch.position) key.position = cloneVec(patch.position);
    if (patch.target) key.target = cloneVec(patch.target);
    key.beat = this.wrapBeat(key.beat);
    this.sortAll();
    return true;
  }

  deleteCameraKey(id: string): boolean {
    const before = this.project.cameraKeys.length;
    this.project.cameraKeys = this.project.cameraKeys.filter((k) => k.id !== id);
    return this.project.cameraKeys.length !== before;
  }

  addLookKey(key: Omit<LookKeyframe, 'id'>): LookKeyframe {
    const created: LookKeyframe = {
      ...key,
      id: this.newId('look'),
      fx: { ...key.fx },
      beat: this.wrapBeat(key.beat),
    };
    this.project.lookKeys.push(created);
    this.sortAll();
    return { ...created };
  }

  updateLookKey(id: string, patch: Partial<LookKeyframe>): boolean {
    const key = this.project.lookKeys.find((k) => k.id === id);
    if (!key) return false;
    Object.assign(key, patch, { id: key.id });
    if (patch.fx) key.fx = { ...key.fx, ...patch.fx };
    key.beat = this.wrapBeat(key.beat);
    this.sortAll();
    return true;
  }

  deleteLookKey(id: string): boolean {
    const before = this.project.lookKeys.length;
    this.project.lookKeys = this.project.lookKeys.filter((k) => k.id !== id);
    return this.project.lookKeys.length !== before;
  }

  addMilestone(milestone: Omit<MachineMilestone, 'id'>): MachineMilestone {
    const created: MachineMilestone = {
      ...milestone,
      id: this.newId('milestone'),
      beat: this.wrapBeat(milestone.beat),
    };
    this.project.milestones.push(created);
    this.sortAll();
    return { ...created };
  }

  updateMilestone(id: string, patch: Partial<MachineMilestone>): boolean {
    const milestone = this.project.milestones.find((m) => m.id === id);
    if (!milestone) return false;
    Object.assign(milestone, patch, { id: milestone.id });
    milestone.beat = this.wrapBeat(milestone.beat);
    this.sortAll();
    return true;
  }

  deleteMilestone(id: string): boolean {
    const before = this.project.milestones.length;
    this.project.milestones = this.project.milestones.filter((m) => m.id !== id);
    return this.project.milestones.length !== before;
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.project.behaviorMaps = maps.map((m) => ({ ...m }));
  }

  updateBehaviorMap(id: string, patch: Partial<BehaviorMapEntry>): boolean {
    const map = this.project.behaviorMaps.find((m) => m.id === id);
    if (!map) return false;
    Object.assign(map, patch, { id: map.id });
    return true;
  }

  evaluateCamera(beat: number, resolveJoint?: JointResolver): CameraPose {
    const keys = this.project.cameraKeys;
    if (keys.length === 0) {
      return {
        position: [0, 1.5, 8],
        target: [0, 0, 0],
        fov: 45,
        roll: 0,
        keyId: '',
        nextKeyId: '',
        label: 'NO CAMERA KEYS',
        interpolation: 'CUT',
        t: 0,
      };
    }
    const query = this.wrapBeat(beat);
    const prevIndex = this.findPreviousIndex(keys, query);
    const nextIndex = (prevIndex + 1) % keys.length;
    const prev = keys[prevIndex];
    const next = keys[nextIndex];
    const span = this.forwardDistance(prev.beat, next.beat);
    const rawT = span > 0.0001 ? this.forwardDistance(prev.beat, query) / span : 0;
    const t = clamp(rawT, 0, 1);
    const interpolation = prev.interpolation;

    const prevPos = this.resolvePosition(prev, resolveJoint);
    const nextPos = this.resolvePosition(next, resolveJoint);
    const prevTarget = this.resolveTarget(prev, resolveJoint);
    const nextTarget = this.resolveTarget(next, resolveJoint);

    let position: Vec3Tuple;
    let target: Vec3Tuple;
    let fov = lerp(prev.fov, next.fov, t);
    let roll = lerp(prev.roll, next.roll, t);

    if (interpolation === 'CUT') {
      position = cloneVec(prevPos);
      target = cloneVec(prevTarget);
      fov = prev.fov;
      roll = prev.roll;
    } else if (interpolation === 'ORBIT_ARC') {
      const midTarget = lerp3(prevTarget, nextTarget, t);
      const arcLift = Math.sin(Math.PI * t) * distance(prevPos, nextPos) * 0.18;
      position = lerp3(prevPos, nextPos, smoother(t));
      position[1] += arcLift;
      target = midTarget;
    } else if (interpolation === 'VERTIGO') {
      target = lerp3(prevTarget, nextTarget, smoother(t));
      fov = lerp(prev.fov, next.fov, smoother(t));
      const half = (fov * Math.PI) / 360;
      const framedWidth = 2.05;
      const dist = framedWidth / Math.max(0.08, Math.tan(half));
      const direction = lerp3(prevPos, nextPos, t);
      const len = Math.max(0.001, Math.hypot(direction[0], direction[1], direction[2]));
      position = [
        (direction[0] / len) * dist,
        (direction[1] / len) * dist * 0.35,
        (direction[2] / len) * dist,
      ];
      position = add3(position, target);
      roll = lerp(prev.roll, next.roll, smoother(t)) + Math.sin(t * Math.PI) * 0.05;
    } else {
      const p0 = this.resolvePosition(keys[(prevIndex - 1 + keys.length) % keys.length], resolveJoint);
      const p3 = this.resolvePosition(keys[(nextIndex + 1) % keys.length], resolveJoint);
      const q0 = this.resolveTarget(keys[(prevIndex - 1 + keys.length) % keys.length], resolveJoint);
      const q3 = this.resolveTarget(keys[(nextIndex + 1) % keys.length], resolveJoint);
      position = catmull3(p0, prevPos, nextPos, p3, t);
      target = catmull3(q0, prevTarget, nextTarget, q3, t);
    }

    return {
      position,
      target,
      fov,
      roll,
      keyId: prev.id,
      nextKeyId: next.id,
      label: `${prev.label} → ${next.label}`,
      interpolation,
      t,
    };
  }

  evaluateLook(beat: number): { fx: PostFxState; keyId: string; label: string } {
    const keys = this.project.lookKeys;
    if (keys.length === 0) {
      return { fx: { ...DEFAULT_POST_FX }, keyId: '', label: 'DEFAULT LOOK' };
    }
    const query = this.wrapBeat(beat);
    const prevIndex = this.findPreviousIndex(keys, query);
    const nextIndex = (prevIndex + 1) % keys.length;
    const prev = keys[prevIndex];
    const next = keys[nextIndex];
    const span = this.forwardDistance(prev.beat, next.beat);
    const t = span > 0.0001 ? smoother(this.forwardDistance(prev.beat, query) / span) : 0;
    const fx = { ...DEFAULT_POST_FX };
    for (const key of POST_FX_KEYS) fx[key] = lerp(prev.fx[key], next.fx[key], t);
    return { fx, keyId: prev.id, label: `${prev.label} → ${next.label}` };
  }

  evaluateMilestone(
    beat: number,
    bank: BehaviorPresetBank = new BehaviorPresetBank(),
  ): MilestoneEvaluation {
    const milestones = this.project.milestones;
    if (milestones.length === 0) {
      const fallback = bank.blend('M1', 'M1', 1);
      return {
        ...fallback,
        label: 'NO MILESTONES',
        beat: 0,
        activeId: fallback.fromId,
        nextId: fallback.toId,
      };
    }
    const query = this.wrapBeat(beat);
    const activeIndex = this.findPreviousIndex(milestones, query);
    const nextIndex = (activeIndex + 1) % milestones.length;
    const active = milestones[activeIndex];
    const next = milestones[nextIndex];
    const segmentBeats = Math.max(0.001, this.forwardDistance(active.beat, next.beat));
    const elapsedBeats = this.forwardDistance(active.beat, query);
    const blendStartBeats = Math.max(0, segmentBeats - Math.max(0.001, active.blendBeats));
    const blendSpan = Math.max(0.001, segmentBeats - blendStartBeats);
    let rawT =
      elapsedBeats >= blendStartBeats
        ? (elapsedBeats - blendStartBeats) / blendSpan
        : 0;
    if (active.ease === 'SMOOTHER') rawT = smoother(rawT);
    else if (active.ease === 'STEP') rawT = rawT >= 1 ? 1 : 0;
    const t = clamp(rawT, 0, 1);
    const blended = bank.blend(active.presetId, next.presetId, t);
    return {
      ...blended,
      label: `${active.label} → ${next.label}`,
      beat: query,
      activeId: active.id,
      nextId: next.id,
    };
  }

  private resolvePosition(key: CameraKeyframe, resolver?: JointResolver): Vec3Tuple {
    if (!key.jointId || !resolver) return cloneVec(key.position);
    const anchor = resolver(key.jointId);
    return anchor ? add3(key.position, anchor) : cloneVec(key.position);
  }

  private resolveTarget(key: CameraKeyframe, resolver?: JointResolver): Vec3Tuple {
    if (!key.jointId || !resolver) return cloneVec(key.target);
    const anchor = resolver(key.jointId);
    return anchor ? add3(key.target, anchor) : cloneVec(key.target);
  }

  private findPreviousIndex<T extends { beat: number }>(rows: T[], beat: number): number {
    let result = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].beat <= beat) result = i;
      else break;
    }
    return result;
  }

  private forwardDistance(from: number, to: number): number {
    const total = this.getTotalBeats();
    return to >= from ? to - from : total - from + to;
  }

  private wrapBeat(beat: number): number {
    const total = this.getTotalBeats();
    return ((beat % total) + total) % total;
  }

  private sortAll(): void {
    const byBeat = <T extends { beat: number }>(a: T, b: T): number => a.beat - b.beat;
    this.project.cameraKeys.sort(byBeat);
    this.project.lookKeys.sort(byBeat);
    this.project.milestones.sort(byBeat);
  }

  private normalize(input: DirectorProject): DirectorProject {
    const fallback = createDefaultDirectorProject();
    const bars = clamp(
      typeof input.bars === 'number' ? Math.round(input.bars) : fallback.bars,
      1,
      4096,
    );
    const bpm = clamp(typeof input.bpm === 'number' ? input.bpm : fallback.bpm, 40, 300);
    const cameraKeys = Array.isArray(input.cameraKeys)
      ? input.cameraKeys
          .map((row, i) => parseCameraKey(row, i))
          .filter((row): row is CameraKeyframe => row !== null)
      : fallback.cameraKeys;
    const lookKeys = Array.isArray(input.lookKeys)
      ? input.lookKeys
          .map((row, i) => parseLookKey(row, i))
          .filter((row): row is LookKeyframe => row !== null)
      : fallback.lookKeys;
    const milestones = Array.isArray(input.milestones)
      ? input.milestones
          .map((row, i) => parseMilestone(row, i))
          .filter((row): row is MachineMilestone => row !== null)
      : fallback.milestones;
    const behaviorMaps = Array.isArray(input.behaviorMaps)
      ? input.behaviorMaps
          .map((row, i) => parseBehaviorMap(row, i))
          .filter((row): row is BehaviorMapEntry => row !== null)
      : fallback.behaviorMaps;

    const byBeat = <T extends { beat: number }>(a: T, b: T): number => a.beat - b.beat;
    const normalizedCameraKeys = (cameraKeys.length > 0 ? cameraKeys : fallback.cameraKeys)
      .slice()
      .sort(byBeat);
    const normalizedLookKeys = (lookKeys.length > 0 ? lookKeys : fallback.lookKeys)
      .slice()
      .sort(byBeat);
    const normalizedMilestones = (milestones.length > 0 ? milestones : fallback.milestones)
      .slice()
      .sort(byBeat);

    return {
      version: 1,
      bars,
      bpm,
      name: typeof input.name === 'string' ? input.name : fallback.name,
      cameraKeys: ensureZeroBeat(normalizedCameraKeys, 'cam'),
      lookKeys: ensureZeroBeat(normalizedLookKeys, 'look'),
      milestones: ensureZeroBeat(normalizedMilestones, 'milestone'),
      behaviorMaps: behaviorMaps.length > 0 ? behaviorMaps : fallback.behaviorMaps,
    };
  }
}

/** Utility for UI preset-A/B crossfade without writing into timeline data. */
export function blendArticulationStates(
  a: Record<string, number>,
  b: Record<string, number>,
  t: number,
): ArticulationState {
  return blendArticulation(clampArticulation(a), clampArticulation(b), t);
}

export const isValidBehaviorId = (id: string): id is BehaviorId =>
  id in BEHAVIOR_PROFILES;
