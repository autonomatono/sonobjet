import type {
  FocusDescriptor,
  MacroDefinition,
  PhysicalPartSnapshot,
  SubsystemId,
} from '../../engine/core/types';

export type Vec2Tuple = [number, number];

export const LANE_COUNT = 12;
export const PROGRAM_STEPS = 64;
export const PROGRAM_STEPS_PER_BEAT = 2;
export const DEFAULT_MARBLE_COUNT = 216;
export const QUEUE_CAPACITY = 16;
export const MARBLE_RADIUS = 0.105;
export const TAU = Math.PI * 2;

export const PHYSICS_MACRO_DEFINITIONS: MacroDefinition[] = [
  {
    id: 'gravityScale',
    label: 'GRAVITY',
    min: 0.2,
    max: 2,
    defaultValue: 1,
    description: 'Global gravity scale for free-falling steel marbles.',
  },
  {
    id: 'marbleBounce',
    label: 'MARBLE RESTITUTION',
    min: 0,
    max: 0.85,
    defaultValue: 0.34,
    description: 'Elastic rebound from instrument bars, rails and other marbles.',
  },
  {
    id: 'trackFriction',
    label: 'TRACK FRICTION',
    min: 0,
    max: 1,
    defaultValue: 0.16,
    description: 'Tangential energy loss while marbles roll along chutes and funnels.',
  },
  {
    id: 'gateDuration',
    label: 'GATE OPEN TIME',
    min: 0.03,
    max: 0.35,
    defaultValue: 0.11,
    unit: 's',
    description: 'How long a programming-wheel pin holds a marble gate open.',
  },
  {
    id: 'timeScale',
    label: 'PHYSICS TIME SCALE',
    min: 0.25,
    max: 2,
    defaultValue: 1,
    description: 'Simulation speed multiplier for the custom fixed-step marble solver.',
  },
  {
    id: 'releaseVelocity',
    label: 'GATE KICK',
    min: 0,
    max: 3,
    defaultValue: 0.48,
    description: 'Downward velocity imparted when a gate releases a marble.',
  },
  {
    id: 'liftSpeed',
    label: 'BUCKET LIFT SPEED',
    min: 0.3,
    max: 2.5,
    defaultValue: 1.05,
    description: 'Conveyor speed for recycling marbles from the funnel to the top reservoir.',
  },
  {
    id: 'pendulumDrive',
    label: 'PENDULUM GOVERNOR DRIVE',
    min: 0,
    max: 1.5,
    defaultValue: 0.72,
    description: 'How strongly the crank forces the oscillating timekeeper pendulum.',
  },
  {
    id: 'scoreBlend',
    label: 'SCORE ENGINE BLEND',
    min: 0,
    max: 1,
    defaultValue: 0.32,
    description: 'How much of the preserved 96-bar score remains audible beneath marble impacts.',
  },
  {
    id: 'marbleBlend',
    label: 'MARBLE IMPACT BLEND',
    min: 0,
    max: 1.2,
    defaultValue: 0.82,
    description: 'Velocity of synth voices triggered by physical marble/instrument collisions.',
  },
];

export const PHYSICS_MACRO_IDS = PHYSICS_MACRO_DEFINITIONS.map((macro) => macro.id);

export type SegmentKind =
  | 'TUBE'
  | 'GATE'
  | 'INSTRUMENT'
  | 'FUNNEL'
  | 'RAIL'
  | 'WALL'
  | 'RAMP'
  | 'TRACK';

export interface MarbleSegmentSpec {
  id: string;
  kind: SegmentKind;
  a: Vec2Tuple;
  b: Vec2Tuple;
  radius: number;
  lane?: number;
  gateId?: string;
  instrumentId?: string;
  subsystem?: SubsystemId;
  pitchRatio?: number;
  restitution?: number;
  friction?: number;
}

export interface MarbleGateSpec {
  id: string;
  label: string;
  lane: number;
  x: number;
  y: number;
  width: number;
}

export interface MarbleInstrumentSpec {
  id: string;
  label: string;
  lane: number;
  kind: 'VIBRAPHONE' | 'KICK' | 'SNARE' | 'HI_HAT' | 'CYMBAL' | 'BASS';
  subsystem: SubsystemId;
  pitchRatio: number;
  x: number;
  y: number;
  width: number;
}

export interface MarbleQueueSpec {
  id: string;
  lane: number;
  x: number;
  topY: number;
  gateY: number;
  capacity: number;
}

export interface MarbleBlueprint {
  name: string;
  version: number;
  laneCount: number;
  stepCount: number;
  stepsPerBeat: number;
  marbleRadius: number;
  queueTopY: number;
  gateY: number;
  instrumentY: number;
  collectorY: number;
  world: { minX: number; maxX: number; minY: number; maxY: number };
  laneXs: number[];
  laneLabels: string[];
  instrumentLabels: string[];
  gates: MarbleGateSpec[];
  instruments: MarbleInstrumentSpec[];
  queues: MarbleQueueSpec[];
  segments: MarbleSegmentSpec[];
  liftPath: Vec2Tuple[];
  parts: PhysicalPartSnapshot[];
  focusTargets: FocusDescriptor[];
}

const NOTE_RATIOS = [1, 16 / 15, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];
const NOTE_LABELS = ['F4', 'Gb4', 'Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5'];

const PERCUSSION: Array<{
  label: string;
  kind: MarbleInstrumentSpec['kind'];
  subsystem: SubsystemId;
  pitchRatio: number;
}> = [
  { label: 'KICK', kind: 'KICK', subsystem: 'sub-rupture', pitchRatio: 0.5 },
  { label: 'SNARE', kind: 'SNARE', subsystem: 'piston-snap', pitchRatio: 1.15 },
  { label: 'HI-HAT', kind: 'HI_HAT', subsystem: 'break-shred', pitchRatio: 1.8 },
  { label: 'SIZZLE', kind: 'CYMBAL', subsystem: 'glass-armonica', pitchRatio: 2.4 },
];

export const LANE_XS: number[] = Array.from(
  { length: LANE_COUNT },
  (_, index) => -4.4 + index * 0.8,
);

export const LANE_LABELS: string[] = [
  ...NOTE_LABELS,
  ...PERCUSSION.map((entry) => entry.label),
];

export const INSTRUMENT_LABELS: string[] = LANE_LABELS.map(
  (label, index) => (index < 8 ? `VIBE ${label}` : label),
);

function segment(spec: MarbleSegmentSpec): MarbleSegmentSpec {
  return spec;
}

function createPart(
  id: string,
  label: string,
  kind: string,
  jointId: string,
  tags: string[],
  parentId = 'frame',
): PhysicalPartSnapshot {
  return {
    id,
    label,
    kind,
    jointId,
    parentId,
    state: 'IDLE',
    energy: 0,
    tags,
  };
}

export function createPhysicsFocusTargets(): FocusDescriptor[] {
  return [
    {
      id: 'focus-machine',
      label: 'MACRO // WHOLE MARBLE ENGINE',
      scale: 'MACRO',
      jointId: 'frame',
      priority: 0.98,
      tags: ['machine', 'wide'],
    },
    {
      id: 'focus-program-wheel',
      label: 'CLUSTER // PINNED PROGRAMMING WHEEL',
      scale: 'CLUSTER',
      jointId: 'programWheel',
      clusterId: 'sequencer',
      priority: 0.94,
      tags: ['wheel', 'pins', 'score'],
    },
    {
      id: 'focus-gate-bank',
      label: 'CLUSTER // TWELVE MARBLE GATES',
      scale: 'CLUSTER',
      jointId: 'gateBank',
      clusterId: 'gates',
      priority: 0.88,
      tags: ['gates', 'release'],
    },
    {
      id: 'focus-instrument-bank',
      label: 'CLUSTER // VIBRAPHONE & PERCUSSION',
      scale: 'CLUSTER',
      jointId: 'instrumentBank',
      clusterId: 'instruments',
      priority: 0.9,
      tags: ['instruments', 'impact'],
    },
    {
      id: 'focus-flywheel',
      label: 'MODULE // HAND-CRANK FLYWHEEL',
      scale: 'MODULE',
      jointId: 'flywheel',
      moduleId: 'flywheel',
      priority: 0.86,
      tags: ['drive', 'crank'],
    },
    {
      id: 'focus-pendulum',
      label: 'MODULE // PENDULUM GOVERNOR',
      scale: 'MODULE',
      jointId: 'pendulum',
      moduleId: 'pendulum',
      priority: 0.84,
      tags: ['governor', 'time'],
    },
    {
      id: 'focus-lift',
      label: 'MODULE // BUCKET LIFT',
      scale: 'MODULE',
      jointId: 'liftChain',
      moduleId: 'lift',
      priority: 0.8,
      tags: ['recycle', 'lift'],
    },
    {
      id: 'focus-funnel',
      label: 'MODULE // COLLECTOR FUNNEL',
      scale: 'MODULE',
      jointId: 'funnel',
      moduleId: 'funnel',
      priority: 0.76,
      tags: ['collector', 'funnel'],
    },
    {
      id: 'focus-gate-00',
      label: 'PORT // FIRST MARBLE GATE',
      scale: 'PORT',
      jointId: 'gate0',
      moduleId: 'gate0',
      priority: 0.72,
      tags: ['gate', 'port'],
    },
    {
      id: 'focus-gate-07',
      label: 'PORT // UPPER VIBRAPHONE GATE',
      scale: 'PORT',
      jointId: 'gate7',
      moduleId: 'gate7',
      priority: 0.7,
      tags: ['gate', 'port'],
    },
    {
      id: 'focus-instrument-03',
      label: 'PORT // VIBE Bb4 BAR',
      scale: 'PORT',
      jointId: 'instrument3',
      moduleId: 'instrument3',
      priority: 0.68,
      tags: ['instrument', 'bar'],
    },
    {
      id: 'focus-tube-00',
      label: 'CONDUIT // FIRST FEEDER TUBE',
      scale: 'CONDUIT',
      edgeId: 'tube0',
      jointId: 'trackFrame',
      priority: 0.74,
      tags: ['tube', 'conduit'],
    },
    {
      id: 'focus-lift-path',
      label: 'CONDUIT // MARBLE RETURN LIFT',
      scale: 'CONDUIT',
      edgeId: 'liftPath',
      jointId: 'liftChain',
      priority: 0.78,
      tags: ['lift', 'conduit'],
    },
  ];
}

export function createMarbleBlueprint(): MarbleBlueprint {
  const gates: MarbleGateSpec[] = [];
  const instruments: MarbleInstrumentSpec[] = [];
  const queues: MarbleQueueSpec[] = [];
  const segments: MarbleSegmentSpec[] = [];
  const parts: PhysicalPartSnapshot[] = [];

  parts.push(
    createPart('frame', 'PLYWOOD A-FRAME', 'STRUCTURE', 'frame', ['load-bearing', 'wood'], 'root'),
    createPart('flywheel', 'HAND-CRANK FLYWHEEL', 'DRIVE', 'flywheel', ['crank', 'inertia']),
    createPart('programWheel', '64-STEP PROGRAMMING WHEEL', 'SEQUENCER', 'programWheel', ['pins', 'score']),
    createPart('pendulum', 'PENDULUM GOVERNOR', 'GOVERNOR', 'pendulum', ['timekeeper', 'physics']),
    createPart('crankRod', 'FLYWHEEL → PENDULUM PITMAN', 'LINKAGE', 'frame', ['rod', 'transmission']),
    createPart('trackFrame', 'TUBES / RAILS / FUNNEL FRAME', 'TRACK', 'trackFrame', ['conduit', 'rail']),
    createPart('liftChain', 'BUCKET RETURN LIFT', 'LIFT', 'liftChain', ['recycle', 'conveyor']),
    createPart('funnel', 'COLLECTOR FUNNEL', 'COLLECTOR', 'funnel', ['collector', 'funnel']),
    createPart('marbleField', `${DEFAULT_MARBLE_COUNT} STEEL MARBLES`, 'MARBLE_FIELD', 'marbleField', ['physics', 'marbles']),
    createPart('gateBank', 'GATE BANK', 'CLUSTER', 'gateBank', ['gates'], 'trackFrame'),
    createPart('instrumentBank', 'INSTRUMENT BANK', 'CLUSTER', 'instrumentBank', ['instruments'], 'frame'),
  );

  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const x = LANE_XS[lane];
    const gateId = `gate${lane}`;
    const instrumentId = `instrument${lane}`;
    const isVibe = lane < 8;
    const instrument: MarbleInstrumentSpec = isVibe
      ? {
          id: instrumentId,
          label: `VIBE ${NOTE_LABELS[lane]}`,
          lane,
          kind: 'VIBRAPHONE' as const,
          subsystem: 'modal-clang' as SubsystemId,
          pitchRatio: NOTE_RATIOS[lane],
          x,
          y: -1.12,
          width: 0.58,
        }
      : {
          id: instrumentId,
          label: PERCUSSION[lane - 8].label,
          lane,
          kind: PERCUSSION[lane - 8].kind,
          subsystem: PERCUSSION[lane - 8].subsystem,
          pitchRatio: PERCUSSION[lane - 8].pitchRatio,
          x,
          y: -1.12,
          width: 0.58,
        };

    gates.push({
      id: gateId,
      label: `GATE ${String(lane).padStart(2, '0')} // ${LANE_LABELS[lane]}`,
      lane,
      x,
      y: 1.25,
      width: 0.26,
    });
    instruments.push(instrument);
    queues.push({
      id: `queue${lane}`,
      lane,
      x,
      topY: 4.8,
      gateY: 1.25,
      capacity: QUEUE_CAPACITY,
    });

    segments.push(
      segment({
        id: `tube-left-${lane}`,
        kind: 'TUBE',
        a: [x - 0.135, 4.9],
        b: [x - 0.135, 1.42],
        radius: 0.026,
        lane,
        restitution: 0.22,
        friction: 0.04,
      }),
      segment({
        id: `tube-right-${lane}`,
        kind: 'TUBE',
        a: [x + 0.135, 4.9],
        b: [x + 0.135, 1.42],
        radius: 0.026,
        lane,
        restitution: 0.22,
        friction: 0.04,
      }),
      segment({
        id: `gate-segment-${lane}`,
        kind: 'GATE',
        a: [x - 0.13, 1.25],
        b: [x + 0.13, 1.25],
        radius: 0.032,
        lane,
        gateId,
        restitution: 0.06,
        friction: 0.12,
      }),
      segment({
        id: `instrument-segment-${lane}`,
        kind: 'INSTRUMENT',
        a: [x - instrument.width * 0.5, instrument.y],
        b: [x + instrument.width * 0.5, instrument.y],
        radius: 0.058,
        lane,
        instrumentId,
        subsystem: instrument.subsystem,
        pitchRatio: instrument.pitchRatio,
        restitution: isVibe ? 0.42 : 0.24,
        friction: isVibe ? 0.05 : 0.18,
      }),
    );

    parts.push(
      createPart(`tube-${lane}`, `FEEDER TUBE ${lane}`, 'CONDUIT', 'trackFrame', ['tube', 'queue'], 'trackFrame'),
      createPart(gateId, `MARBLE GATE ${lane} // ${LANE_LABELS[lane]}`, 'GATE', gateId, ['gate', 'release'], 'gateBank'),
      createPart(instrumentId, instrument.label, instrument.kind, instrumentId, ['instrument', 'impact'], 'instrumentBank'),
    );
  }

  segments.push(
    segment({
      id: 'collector-left-wall',
      kind: 'WALL',
      a: [-5.25, -1.85],
      b: [-5.25, -3.18],
      radius: 0.065,
      restitution: 0.18,
      friction: 0.08,
    }),
    segment({
      id: 'collector-right-wall',
      kind: 'WALL',
      a: [5.25, -1.85],
      b: [5.25, -3.18],
      radius: 0.065,
      restitution: 0.18,
      friction: 0.08,
    }),
    segment({
      id: 'collector-floor',
      kind: 'FUNNEL',
      a: [-5.08, -2.18],
      b: [4.95, -3.03],
      radius: 0.085,
      restitution: 0.12,
      friction: 0.035,
    }),
    segment({
      id: 'lift-intake',
      kind: 'RAMP',
      a: [4.95, -3.03],
      b: [5.28, -2.62],
      radius: 0.06,
      restitution: 0.08,
      friction: 0.03,
    }),
    segment({
      id: 'top-distributor-rail',
      kind: 'RAIL',
      a: [-4.78, 5.08],
      b: [5.0, 4.98],
      radius: 0.05,
      restitution: 0.2,
      friction: 0.05,
    }),
  );

  return {
    name: 'PENDULUM // MARBLE ENGINE',
    version: 1,
    laneCount: LANE_COUNT,
    stepCount: PROGRAM_STEPS,
    stepsPerBeat: PROGRAM_STEPS_PER_BEAT,
    marbleRadius: MARBLE_RADIUS,
  queueTopY: 4.8,
  gateY: 1.25,
    instrumentY: -1.12,
    collectorY: -2.92,
    world: { minX: -5.6, maxX: 5.6, minY: -3.8, maxY: 5.5 },
    laneXs: LANE_XS,
    laneLabels: LANE_LABELS,
    instrumentLabels: INSTRUMENT_LABELS,
    gates,
    instruments,
    queues,
    segments,
    liftPath: [
      [5.08, -3.0],
      [5.4, -2.62],
      [5.4, 4.9],
      [4.72, 5.12],
      [-4.6, 5.12],
    ],
    parts,
    focusTargets: createPhysicsFocusTargets(),
  };
}

export function pointOnPolyline(points: Vec2Tuple[], t: number): Vec2Tuple {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return [...points[0]];
  const clamped = Math.max(0, Math.min(1, t));
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    lengths.push(length);
    total += length;
  }
  if (total <= 1e-6) return [...points[0]];
  let distance = clamped * total;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const alpha = lengths[i] > 1e-6 ? distance / lengths[i] : 0;
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * alpha,
        points[i][1] + (points[i + 1][1] - points[i][1]) * alpha,
      ];
    }
    distance -= lengths[i];
  }
  return [...points[points.length - 1]];
}
