import { SeededRandom } from '../../engine/core/SeededRandom';
import type {
  FocusDescriptor,
  FocusScale,
  MacroDefinition,
  SubsystemId,
} from '../../engine/core/types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ModuleKind =
  | 'source'
  | 'flywheel'
  | 'lift'
  | 'aqueduct'
  | 'diverter'
  | 'gate'
  | 'tines'
  | 'resonator'
  | 'chime'
  | 'drum'
  | 'collector'
  | 'return'
  | 'satellite'
  | 'ratchet'
  | 'bells'
  | 'crystal'
  | 'percussion'
  | 'loom'
  | 'pinball'
  | 'computer'
  | 'neon';

export type ConduitCurve = 'straight' | 'arc' | 'sag' | 'helix' | 'weave';
export type TransmissionKind =
  | 'gear-train'
  | 'belt'
  | 'four-bar'
  | 'camshaft'
  | 'chain'
  | 'nested-ring'
  | 'ratchet'
  | 'music-box'
  | 'bell-crank'
  | 'solenoid';

export interface ModuleSpec {
  id: string;
  label: string;
  kind: ModuleKind;
  cluster: 'lower' | 'middle' | 'upper' | 'orbit';
  position: Vec3;
  /** Rest orientation in radians. Spatial variants are not constrained to Y-up. */
  orientation?: Vec3;
  tier: number;
  scale: number;
  noteRole: number;
  register: number;
  subsystem: SubsystemId;
  focusScale: FocusScale;
  color: number;
  gain: number;
  cooldown: number;
  outputs: string[];
  tags: string[];
}

export interface ConduitSpec {
  id: string;
  from: string;
  to: string;
  kind: 'gravity' | 'lift' | 'pneumatic' | 'resonant' | 'return';
  curve: ConduitCurve;
  arc: number;
  radius: number;
  turns: number;
  speed: number;
  weight: number;
}

export interface TransmissionSpec {
  id: string;
  label: string;
  from: string;
  to: string;
  kind: TransmissionKind;
  /** Signed angular ratio from the upstream prime mover. */
  ratio: number;
  /** Teeth, lugs or cam lobes that can emit one mechanical pulse per crossing. */
  pulses: number;
  /** Mechanical energy delivered to the downstream module [0..1]. */
  efficiency: number;
  /** Visual scale of the local transmission assembly. */
  scale: number;
  /** Musical/lighting section in which this path is foregrounded. */
  section: number;
  color: number;
}

export interface EnergySourceSpec {
  id: string;
  moduleId: string;
  label: string;
  kind: string;
  rate: number;
  energy: number;
}

export interface BindingSpec {
  id: string;
  source: string;
  target: string;
  mode: string;
  weight: number;
  enabled: boolean;
}

export interface RoutingLaneSpec {
  id: string;
  label: string;
  moduleId: string;
  edgeId: string;
  stepBias: number;
}

export interface ModalFlowBlueprint {
  moduleCount: number;
  modules: ModuleSpec[];
  /** Scene language. V9 uses its Cornell room; newer variants use an open void stage. */
  environment?: 'cornell-relay' | 'open-pinball';
  /** Color/motion language for open-stage light, particles and atmospheric electricity. */
  environmentTheme?: 'arcade' | 'constellation' | 'plasma' | 'glacial';
  /** Work-specific ball population; lower counts make teaching/ambient graphs easier to read. */
  marbleCount?: number;
  /** Offset conduit mouths around each oriented housing instead of sharing node centres. */
  spatialPorts?: boolean;
  /** Suggested macro-shot radius for camera framing and unconstrained drone flight. */
  cameraEnvelopeRadius?: number;
  conduits: ConduitSpec[];
  /** Non-marble energy paths: meshed gears, belts, chains, cams and linkages. */
  transmissions: TransmissionSpec[];
  sources: EnergySourceSpec[];
  bindings: BindingSpec[];
  focusTargets: FocusDescriptor[];
  routingLanes: RoutingLaneSpec[];
  programSteps: number;
  defaultProgram: boolean[][];
}

export const DEFAULT_MARBLE_COUNT = 72;
export const DEFAULT_MODAL_FLOW_MODULES = 20;
export const MAX_MODAL_FLOW_MODULES = 96;
export const ROUTING_LANE_COUNT = 8;
export const MODAL_FLOW_PROGRAM_STEPS = 32;
export const MODAL_FLOW_TAU = Math.PI * 2;

export const MODAL_FLOW_MACROS: MacroDefinition[] = [
  {
    id: 'flowRate',
    label: 'MARBLE RELEASE RATE',
    min: 0.1,
    max: 2.2,
    defaultValue: 0.82,
    description: 'Governor cadence and marbles released per second from the reservoir.',
  },
  {
    id: 'gravity',
    label: 'GRAVITY / POTENTIAL HEAD',
    min: 4,
    max: 18,
    defaultValue: 9.8,
    description: 'Acceleration used by energy conservation on descending conduits.',
  },
  {
    id: 'gateDuty',
    label: 'GATE DUTY / THINNING',
    min: 0.05,
    max: 0.95,
    defaultValue: 0.46,
    description: 'Escapement open ratio; lower values create more silence and anticipation.',
  },
  {
    id: 'liftTorque',
    label: 'HELIX LIFT TORQUE',
    min: 0.4,
    max: 2.4,
    defaultValue: 1.18,
    description: 'Motorized ascent velocity and flywheel transmission energy.',
  },
  {
    id: 'marbleRestitution',
    label: 'MARBLE RESTITUTION',
    min: 0,
    max: 0.9,
    defaultValue: 0.34,
    description: 'Elastic energy preserved in same-conduit marble collisions.',
  },
  {
    id: 'eventQuantize',
    label: 'PHYSICS NOTE GRID',
    min: 0,
    max: 1,
    defaultValue: 1,
    description: 'Above 0.5, free physics notes wait for the next musical grid line; disable for fully free timing.',
  },
  {
    id: 'phraseDensity',
    label: 'PHRASE DENSITY',
    min: 0.18,
    max: 1.35,
    defaultValue: 0.62,
    description: 'Maximum audible physics events per second before phrase rests.',
  },
  {
    id: 'registerSpread',
    label: 'REGISTER SPREAD',
    min: 0.4,
    max: 2,
    defaultValue: 1,
    description: 'How strongly elevation and module tier spread notes across octaves.',
  },
  {
    id: 'timbreBloom',
    label: 'TIMBRE BLOOM',
    min: 0,
    max: 1,
    defaultValue: 0.54,
    description: 'Adds longer decays and brighter metallic voices to high-energy impacts.',
  },
  {
    id: 'droneSpeed',
    label: 'DRONE FLIGHT SPEED',
    min: 0.3,
    max: 3,
    defaultValue: 1,
    description: 'Base speed of the inertial DRONE PILOT camera.',
  },
  {
    id: 'cameraFollow',
    label: 'CAMERA FOLLOW / DRIFT',
    min: 0,
    max: 1,
    defaultValue: 0.38,
    description: 'How eagerly cinematic shots drift toward the most energetic marble.',
  },
];

export const MODAL_FLOW_MACRO_IDS = new Set(MODAL_FLOW_MACROS.map((m) => m.id));

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const module = (
  spec: Omit<ModuleSpec, 'outputs'>,
): ModuleSpec => ({ ...spec, outputs: [] });

const conduit = (
  id: string,
  from: string,
  to: string,
  kind: ConduitSpec['kind'],
  curve: ConduitCurve,
  options: Partial<Pick<ConduitSpec, 'arc' | 'radius' | 'turns' | 'speed' | 'weight'>> = {},
): ConduitSpec => ({
  id: `conduit-${id}`,
  from,
  to,
  kind,
  curve,
  arc: options.arc ?? 0.5,
  radius: options.radius ?? 0.48,
  turns: options.turns ?? 2,
  speed: options.speed ?? 1,
  weight: options.weight ?? 1,
});

const CORE_MODULES: ModuleSpec[] = [
  module({
    id: 'source-reservoir',
    label: 'SOURCE RESERVOIR',
    kind: 'source',
    cluster: 'lower',
    position: { x: 0, y: -2.25, z: 0.9 },
    tier: 0,
    scale: 1.25,
    noteRole: 0,
    register: -1,
    subsystem: 'sub-rupture',
    focusScale: 'MODULE',
    color: 0x6c93a8,
    gain: 0.55,
    cooldown: 0.72,
    tags: ['reservoir', 'source', 'marble'],
  }),
  module({
    id: 'crank-flywheel',
    label: 'CRANK + FLYWHEEL',
    kind: 'flywheel',
    cluster: 'lower',
    position: { x: -4.1, y: -1.55, z: 1.25 },
    tier: 0,
    scale: 1.1,
    noteRole: 1,
    register: -1,
    subsystem: 'piston-snap',
    focusScale: 'MODULE',
    color: 0xb07842,
    gain: 0.62,
    cooldown: 0.68,
    tags: ['crank', 'transmission', 'energy'],
  }),
  module({
    id: 'helix-lift',
    label: 'HELIX LIFT',
    kind: 'lift',
    cluster: 'middle',
    position: { x: -4.35, y: 2.35, z: 0.6 },
    tier: 1,
    scale: 1.05,
    noteRole: 2,
    register: 0,
    subsystem: 'sub-rupture',
    focusScale: 'MODULE',
    color: 0xc18d4e,
    gain: 0.7,
    cooldown: 0.62,
    tags: ['lift', 'helix', 'energy'],
  }),
  module({
    id: 'upper-aqueduct',
    label: 'UPPER AQUEDUCT',
    kind: 'aqueduct',
    cluster: 'upper',
    position: { x: -1.4, y: 4.35, z: -0.35 },
    tier: 2,
    scale: 1.3,
    noteRole: 3,
    register: 1,
    subsystem: 'arc-discharge',
    focusScale: 'CLUSTER',
    color: 0x7bb0c7,
    gain: 0.72,
    cooldown: 0.7,
    tags: ['aqueduct', 'conduit', 'head'],
  }),
  module({
    id: 'tri-diverter',
    label: 'THREE-WAY DIVERTER',
    kind: 'diverter',
    cluster: 'upper',
    position: { x: 0.7, y: 4.75, z: -0.65 },
    tier: 2,
    scale: 0.95,
    noteRole: 4,
    register: 1,
    subsystem: 'glitch-chirp',
    focusScale: 'PORT',
    color: 0xd4a553,
    gain: 0.74,
    cooldown: 0.48,
    tags: ['diverter', 'routing', 'port'],
  }),
  module({
    id: 'gate-bank',
    label: '12-LANE GATE BANK',
    kind: 'gate',
    cluster: 'middle',
    position: { x: 3.05, y: 3.05, z: -1.35 },
    tier: 2,
    scale: 1.15,
    noteRole: 5,
    register: 1,
    subsystem: 'piston-snap',
    focusScale: 'MODULE',
    color: 0x9c6f4a,
    gain: 0.88,
    cooldown: 0.34,
    tags: ['gate', 'escapement', 'legacy', 'module'],
  }),
  module({
    id: 'vibraphone-tines',
    label: 'VIBRAPHONE TINES',
    kind: 'tines',
    cluster: 'middle',
    position: { x: 4.75, y: 1.35, z: -2.35 },
    tier: 1,
    scale: 1.2,
    noteRole: 6,
    register: 2,
    subsystem: 'modal-clang',
    focusScale: 'MODULE',
    color: 0x8ad0c8,
    gain: 1.05,
    cooldown: 0.26,
    tags: ['tine', 'melody', 'strike'],
  }),
  module({
    id: 'resonator-bowl',
    label: 'RESONATOR BOWL',
    kind: 'resonator',
    cluster: 'middle',
    position: { x: 3.25, y: 0.4, z: 2.45 },
    tier: 1,
    scale: 1.35,
    noteRole: 4,
    register: 1,
    subsystem: 'glass-armonica',
    focusScale: 'MODULE',
    color: 0x86b6dc,
    gain: 1.12,
    cooldown: 0.42,
    tags: ['resonator', 'bowl', 'sustain'],
  }),
  module({
    id: 'chime-orchard',
    label: 'CHIME ORCHARD',
    kind: 'chime',
    cluster: 'orbit',
    position: { x: 0.5, y: 2.7, z: 4.55 },
    tier: 2,
    scale: 1.1,
    noteRole: 2,
    register: 2,
    subsystem: 'fin-cascade',
    focusScale: 'MODULE',
    color: 0xb8d8a8,
    gain: 1.0,
    cooldown: 0.3,
    tags: ['chime', 'orchard', 'high'],
  }),
  module({
    id: 'drum-ring',
    label: 'DRUM RING',
    kind: 'drum',
    cluster: 'middle',
    position: { x: -2.45, y: 0.85, z: 3.65 },
    tier: 1,
    scale: 1.15,
    noteRole: 0,
    register: 0,
    subsystem: 'core-implode',
    focusScale: 'MODULE',
    color: 0xb56b55,
    gain: 0.95,
    cooldown: 0.38,
    tags: ['drum', 'percussion', 'low'],
  }),
  module({
    id: 'collector-funnel',
    label: 'COLLECTOR FUNNEL',
    kind: 'collector',
    cluster: 'lower',
    position: { x: 0.15, y: -2.55, z: 3.05 },
    tier: 0,
    scale: 1.3,
    noteRole: 1,
    register: -1,
    subsystem: 'sub-rupture',
    focusScale: 'CLUSTER',
    color: 0x6f8b9c,
    gain: 0.6,
    cooldown: 0.75,
    tags: ['collector', 'funnel', 'recycle'],
  }),
  module({
    id: 'return-conduit',
    label: 'RETURN SPIRAL',
    kind: 'return',
    cluster: 'lower',
    position: { x: -2.3, y: -2.05, z: 1.1 },
    tier: 0,
    scale: 1.0,
    noteRole: 3,
    register: -1,
    subsystem: 'piston-snap',
    focusScale: 'CONDUIT',
    color: 0x7d9d83,
    gain: 0.58,
    cooldown: 0.8,
    tags: ['return', 'conduit', 'cycle'],
  }),
];

const CORE_CONDUITS: ConduitSpec[] = [
  conduit('source-flywheel', 'source-reservoir', 'crank-flywheel', 'gravity', 'sag', { arc: 0.4, speed: 0.95 }),
  conduit('flywheel-lift', 'crank-flywheel', 'helix-lift', 'lift', 'helix', { arc: 0.25, radius: 0.62, turns: 3, speed: 1.1 }),
  conduit('lift-aqueduct', 'helix-lift', 'upper-aqueduct', 'pneumatic', 'arc', { arc: 0.9, speed: 1.05 }),
  conduit('aqueduct-diverter', 'upper-aqueduct', 'tri-diverter', 'gravity', 'sag', { arc: 0.35, speed: 1.0 }),
  conduit('diverter-gate', 'tri-diverter', 'gate-bank', 'gravity', 'arc', { arc: 0.7, speed: 1.05 }),
  conduit('diverter-chime', 'tri-diverter', 'chime-orchard', 'pneumatic', 'arc', { arc: 1.1, radius: 0.35, speed: 0.95 }),
  conduit('diverter-drum', 'tri-diverter', 'drum-ring', 'gravity', 'sag', { arc: 0.9, speed: 1.0 }),
  conduit('diverter-resonator', 'tri-diverter', 'resonator-bowl', 'resonant', 'arc', { arc: 1.25, speed: 0.9 }),
  conduit('diverter-bypass', 'tri-diverter', 'collector-funnel', 'gravity', 'sag', { arc: 0.5, speed: 0.85, weight: 0.5 }),
  conduit('gate-tines', 'gate-bank', 'vibraphone-tines', 'gravity', 'sag', { arc: 0.55, speed: 1.1 }),
  conduit('gate-resonator', 'gate-bank', 'resonator-bowl', 'resonant', 'arc', { arc: 0.85, speed: 0.95 }),
  conduit('gate-bypass', 'gate-bank', 'collector-funnel', 'gravity', 'sag', { arc: 0.7, speed: 0.8, weight: 0.5 }),
  conduit('tines-collector', 'vibraphone-tines', 'collector-funnel', 'gravity', 'sag', { arc: 0.8, speed: 1.0 }),
  conduit('resonator-collector', 'resonator-bowl', 'collector-funnel', 'resonant', 'arc', { arc: 0.6, speed: 0.9 }),
  conduit('chime-collector', 'chime-orchard', 'collector-funnel', 'gravity', 'sag', { arc: 1.0, speed: 0.9 }),
  conduit('drum-collector', 'drum-ring', 'collector-funnel', 'gravity', 'sag', { arc: 0.75, speed: 1.0 }),
  conduit('collector-return', 'collector-funnel', 'return-conduit', 'gravity', 'sag', { arc: 0.35, speed: 0.9 }),
  conduit('return-source', 'return-conduit', 'source-reservoir', 'return', 'helix', { arc: 0.2, radius: 0.42, turns: 2, speed: 0.85 }),
];

const TRANSMISSIONS: TransmissionSpec[] = [
  {
    id: 'transmission-crank-lift-gears',
    label: 'CRANK → LIFT REDUCTION CASCADE',
    from: 'crank-flywheel',
    to: 'helix-lift',
    kind: 'gear-train',
    ratio: -2.35,
    pulses: 12,
    efficiency: 0.92,
    scale: 1.05,
    section: 1,
    color: 0xe0a85a,
  },
  {
    id: 'transmission-lift-aqueduct-belt',
    label: 'LIFT → AQUEDUCT CROSSED BELT',
    from: 'helix-lift',
    to: 'upper-aqueduct',
    kind: 'belt',
    ratio: -0.72,
    pulses: 5,
    efficiency: 0.78,
    scale: 0.82,
    section: 1,
    color: 0xff704f,
  },
  {
    id: 'transmission-aqueduct-diverter-gears',
    label: 'AQUEDUCT → DIVERTER BEVEL TRAIN',
    from: 'upper-aqueduct',
    to: 'tri-diverter',
    kind: 'gear-train',
    ratio: -1.4,
    pulses: 9,
    efficiency: 0.84,
    scale: 0.74,
    section: 2,
    color: 0x72d9ff,
  },
  {
    id: 'transmission-diverter-gate-cam',
    label: 'DIVERTER → GATE PIN CAMSHAFT',
    from: 'tri-diverter',
    to: 'gate-bank',
    kind: 'camshaft',
    ratio: 1.25,
    pulses: 5,
    efficiency: 0.81,
    scale: 0.84,
    section: 3,
    color: 0xf6c761,
  },
  {
    id: 'transmission-gate-tines-linkage',
    label: 'GATE → TINE FOUR-BAR STRIKER',
    from: 'gate-bank',
    to: 'vibraphone-tines',
    kind: 'four-bar',
    ratio: 0.78,
    pulses: 4,
    efficiency: 0.76,
    scale: 0.86,
    section: 3,
    color: 0x9ef5d5,
  },
  {
    id: 'transmission-tines-bowl-nested',
    label: 'TINES → BOWL NESTED RESONATOR',
    from: 'vibraphone-tines',
    to: 'resonator-bowl',
    kind: 'nested-ring',
    ratio: -0.56,
    pulses: 3,
    efficiency: 0.72,
    scale: 0.9,
    section: 4,
    color: 0xb99cff,
  },
  {
    id: 'transmission-diverter-chime-belt',
    label: 'DIVERTER → CHIME PITCH BELT',
    from: 'tri-diverter',
    to: 'chime-orchard',
    kind: 'belt',
    ratio: 1.6,
    pulses: 7,
    efficiency: 0.7,
    scale: 0.78,
    section: 2,
    color: 0x77f4ff,
  },
  {
    id: 'transmission-diverter-drum-linkage',
    label: 'DIVERTER → DRUM ROCKER LINKAGE',
    from: 'tri-diverter',
    to: 'drum-ring',
    kind: 'four-bar',
    ratio: 0.82,
    pulses: 4,
    efficiency: 0.74,
    scale: 0.9,
    section: 4,
    color: 0xff8c6b,
  },
  {
    id: 'transmission-collector-return-chain',
    label: 'COLLECTOR → RETURN LADDER CHAIN',
    from: 'collector-funnel',
    to: 'return-conduit',
    kind: 'chain',
    ratio: -1,
    pulses: 8,
    efficiency: 0.88,
    scale: 0.74,
    section: 5,
    color: 0xa8d5a4,
  },
  {
    id: 'transmission-return-crank-gears',
    label: 'RETURN → CRANK REGENERATOR',
    from: 'return-conduit',
    to: 'crank-flywheel',
    kind: 'gear-train',
    ratio: 0.5,
    pulses: 10,
    efficiency: 0.66,
    scale: 0.68,
    section: 0,
    color: 0xffbd70,
  },
];

const SOURCES: EnergySourceSpec[] = [
  { id: 'source-crank', moduleId: 'crank-flywheel', label: 'HAND CRANK TORQUE', kind: 'mechanical', rate: 0.8, energy: 1 },
  { id: 'source-gravity', moduleId: 'upper-aqueduct', label: 'GRAVITY HEAD', kind: 'potential', rate: 1.2, energy: 1 },
  { id: 'source-flywheel', moduleId: 'crank-flywheel', label: 'FLYWHEEL INERTIA', kind: 'kinetic', rate: 0.65, energy: 0.8 },
  { id: 'source-governor', moduleId: 'helix-lift', label: 'PENDULUM GOVERNOR', kind: 'temporal', rate: 0.5, energy: 0.7 },
  { id: 'source-marble-flow', moduleId: 'tri-diverter', label: 'MARBLE FLOW', kind: 'material', rate: 1.4, energy: 1.1 },
  { id: 'source-resonance', moduleId: 'resonator-bowl', label: 'BOWL RESONANCE', kind: 'acoustic', rate: 0.7, energy: 0.9 },
  { id: 'source-chime', moduleId: 'chime-orchard', label: 'CHIME FEEDBACK', kind: 'acoustic', rate: 0.55, energy: 0.75 },
  { id: 'source-return', moduleId: 'return-conduit', label: 'RETURN PRESSURE', kind: 'material', rate: 0.9, energy: 0.8 },
];

const BINDINGS: BindingSpec[] = [
  { id: 'bind-crank-flow', source: 'energy:crank', target: 'flowRate', mode: 'multiply', weight: 0.9, enabled: true },
  { id: 'bind-gravity-head', source: 'energy:gravity', target: 'gravity', mode: 'multiply', weight: 1, enabled: true },
  { id: 'bind-governor-gate', source: 'energy:governor', target: 'gateDuty', mode: 'bias', weight: 0.7, enabled: true },
  { id: 'bind-flywheel-lift', source: 'energy:flywheel', target: 'helix-lift', mode: 'drive', weight: 1.1, enabled: true },
  { id: 'bind-flow-diverter', source: 'energy:marble-flow', target: 'tri-diverter', mode: 'drive', weight: 1.2, enabled: true },
  { id: 'bind-flow-phrase', source: 'energy:marble-flow', target: 'music:phraseDensity', mode: 'gate', weight: 0.75, enabled: true },
  { id: 'bind-resonance-register', source: 'energy:resonance', target: 'music:registerSpread', mode: 'bias', weight: 0.8, enabled: true },
  { id: 'bind-resonance-timbre', source: 'energy:resonance', target: 'music:timbreBloom', mode: 'add', weight: 0.65, enabled: true },
  { id: 'bind-chime-timbre', source: 'energy:chime', target: 'music:timbreBloom', mode: 'add', weight: 0.55, enabled: true },
  { id: 'bind-chime-register', source: 'energy:chime', target: 'music:registerSpread', mode: 'bias', weight: 0.6, enabled: true },
  { id: 'bind-return-camera', source: 'energy:return', target: 'camera:follow', mode: 'bias', weight: 0.5, enabled: true },
  { id: 'bind-gate-phrase', source: 'energy:governor', target: 'music:phraseDensity', mode: 'gate', weight: 0.6, enabled: true },
  { id: 'bind-gravity-gate', source: 'energy:gravity', target: 'gate-bank', mode: 'drive', weight: 0.7, enabled: true },
  { id: 'bind-crank-resonator', source: 'energy:crank', target: 'resonator-bowl', mode: 'excite', weight: 0.55, enabled: true },
  { id: 'bind-flow-collector', source: 'energy:marble-flow', target: 'collector-funnel', mode: 'drive', weight: 0.8, enabled: true },
  { id: 'bind-resonance-chime', source: 'energy:resonance', target: 'chime-orchard', mode: 'excite', weight: 0.5, enabled: true },
];

export function createDefaultRoutingProgram(): boolean[][] {
  const program: boolean[][] = [];
  for (let lane = 0; lane < ROUTING_LANE_COUNT; lane++) {
    const row: boolean[] = [];
    for (let step = 0; step < MODAL_FLOW_PROGRAM_STEPS; step++) {
      const h = SeededRandom.hashStep(step, lane, 0x5f10a);
      const pulse = (step + lane * 3) % 8;
      row.push(pulse < 3 || (lane === 0 && step % 8 === 0) || h > 0.86);
    }
    program.push(row);
  }
  return program;
}

function createFocusTargets(satelliteIds: string[]): FocusDescriptor[] {
  const targets: FocusDescriptor[] = [
    {
      id: 'focus-macro',
      label: 'WHOLE MODAL FLOW',
      scale: 'MACRO',
      jointId: 'root',
      priority: 1,
      tags: ['macro', 'installation'],
    },
    {
      id: 'focus-upper-cluster',
      label: 'UPPER AQUEDUCT CLUSTER',
      scale: 'CLUSTER',
      jointId: 'module:upper-aqueduct',
      clusterId: 'upper',
      priority: 0.9,
      tags: ['cluster', 'upper', 'pipes'],
    },
    {
      id: 'focus-lower-cluster',
      label: 'COLLECTOR + RETURN CLUSTER',
      scale: 'CLUSTER',
      jointId: 'module:collector-funnel',
      clusterId: 'lower',
      priority: 0.85,
      tags: ['cluster', 'lower', 'recycle'],
    },
    {
      id: 'focus-gate-bank',
      label: '12-LANE GATE BANK',
      scale: 'MODULE',
      jointId: 'module:gate-bank',
      moduleId: 'gate-bank',
      priority: 0.95,
      tags: ['module', 'legacy', 'gate'],
    },
    {
      id: 'focus-helix-lift',
      label: 'HELIX LIFT',
      scale: 'MODULE',
      jointId: 'module:helix-lift',
      moduleId: 'helix-lift',
      priority: 0.9,
      tags: ['module', 'lift'],
    },
    {
      id: 'focus-resonator-bowl',
      label: 'RESONATOR BOWL',
      scale: 'MODULE',
      jointId: 'module:resonator-bowl',
      moduleId: 'resonator-bowl',
      priority: 0.9,
      tags: ['module', 'resonator'],
    },
    {
      id: 'focus-chime-orchard',
      label: 'CHIME ORCHARD',
      scale: 'MODULE',
      jointId: 'module:chime-orchard',
      moduleId: 'chime-orchard',
      priority: 0.86,
      tags: ['module', 'chime'],
    },
    {
      id: 'focus-div-port',
      label: 'DIVERTER TRIPLE PORT',
      scale: 'PORT',
      jointId: 'port:tri-diverter',
      moduleId: 'tri-diverter',
      priority: 0.82,
      tags: ['port', 'routing'],
    },
    {
      id: 'focus-gate-port',
      label: 'GATE ESCAPEMENT PORT',
      scale: 'PORT',
      jointId: 'port:gate-bank',
      moduleId: 'gate-bank',
      priority: 0.84,
      tags: ['port', 'escapement'],
    },
    {
      id: 'focus-lift-port',
      label: 'HELIX INLET PORT',
      scale: 'PORT',
      jointId: 'port:helix-lift',
      moduleId: 'helix-lift',
      priority: 0.78,
      tags: ['port', 'lift'],
    },
    {
      id: 'focus-helix-conduit',
      label: 'HELIX LIFT CONDUIT',
      scale: 'CONDUIT',
      edgeId: 'conduit-flywheel-lift',
      priority: 0.88,
      tags: ['conduit', 'helix'],
    },
    {
      id: 'focus-aqueduct-conduit',
      label: 'UPPER AQUEDUCT CONDUIT',
      scale: 'CONDUIT',
      edgeId: 'conduit-aqueduct-diverter',
      priority: 0.8,
      tags: ['conduit', 'aqueduct'],
    },
    {
      id: 'focus-return-conduit',
      label: 'RETURN SPIRAL CONDUIT',
      scale: 'CONDUIT',
      edgeId: 'conduit-return-source',
      priority: 0.76,
      tags: ['conduit', 'return'],
    },
    {
      id: 'focus-gear-cascade',
      label: 'CRANK / LIFT GEAR CASCADE',
      scale: 'CONDUIT',
      jointId: 'transmission:transmission-crank-lift-gears',
      edgeId: 'transmission-crank-lift-gears',
      priority: 0.93,
      tags: ['transmission', 'gear', 'interlock'],
    },
    {
      id: 'focus-four-bar',
      label: 'GATE / TINE FOUR-BAR',
      scale: 'CONDUIT',
      jointId: 'transmission:transmission-gate-tines-linkage',
      edgeId: 'transmission-gate-tines-linkage',
      priority: 0.9,
      tags: ['transmission', 'linkage', 'striker'],
    },
    {
      id: 'focus-nested-resonator',
      label: 'NESTED RESONATOR RELAY',
      scale: 'MODULE',
      jointId: 'transmission:transmission-tines-bowl-nested',
      moduleId: 'resonator-bowl',
      priority: 0.88,
      tags: ['transmission', 'nested-ring', 'resonator'],
    },
    {
      id: 'focus-shadow-chain',
      label: 'RETURN LADDER / SHADOW CHAIN',
      scale: 'CONDUIT',
      jointId: 'transmission:transmission-collector-return-chain',
      edgeId: 'transmission-collector-return-chain',
      priority: 0.82,
      tags: ['transmission', 'chain', 'shadow'],
    },
  ];
  for (let i = 0; i < Math.min(4, satelliteIds.length); i++) {
    const id = satelliteIds[i];
    targets.push({
      id: `focus-${id}`,
      label: `SATELLITE RESONATOR ${i + 1}`,
      scale: i === 0 ? 'MODULE' : 'PORT',
      jointId: `module:${id}`,
      moduleId: id,
      priority: 0.7 - i * 0.05,
      tags: ['satellite', 'resonator', 'orbit'],
    });
  }
  return targets;
}

/**
 * Builds a 3D modular instrument. The first 12 units are the fixed installation;
 * the remaining units are repeatable resonator pods arranged on a golden-angle
 * spiral, each with its own input, output and inter-pod resonant link.
 */
export function createModalFlowBlueprint(
  moduleCount = DEFAULT_MODAL_FLOW_MODULES,
): ModalFlowBlueprint {
  const total = clamp(Math.round(moduleCount), 12, MAX_MODAL_FLOW_MODULES);
  const modules: ModuleSpec[] = CORE_MODULES.map((m) => ({
    ...m,
    position: { ...m.position },
    orientation: m.orientation ? { ...m.orientation } : undefined,
    outputs: [],
    tags: [...m.tags],
  }));
  const conduits: ConduitSpec[] = CORE_CONDUITS.map((c) => ({ ...c }));
  const satelliteIds: string[] = [];

  for (let i = 0; i < total - CORE_MODULES.length; i++) {
    const angle = i * 2.39996323;
    const radius = 5.15 + (i % 7) * 0.34;
    const elevation = 0.4 + (i % 5) * 0.62 + Math.floor(i / 12) * 0.18;
    const id = `satellite-${i + 1}`;
    satelliteIds.push(id);
    modules.push(
      module({
        id,
        label: `SATELLITE RESONATOR ${i + 1}`,
        kind: 'satellite',
        cluster: 'orbit',
        position: {
          x: Math.cos(angle) * radius,
          y: elevation,
          z: Math.sin(angle) * radius,
        },
        tier: 1 + (i % 3),
        scale: 0.62 + (i % 4) * 0.07,
        noteRole: i % 7,
        register: 1 + (Math.floor(i / 7) % 2),
        subsystem: i % 3 === 0 ? 'glass-armonica' : i % 3 === 1 ? 'fin-cascade' : 'glitch-chirp',
        focusScale: i % 3 === 0 ? 'MODULE' : 'PORT',
        color: [0x8ec3d8, 0xb6d5a0, 0xd3a5c4, 0xe0b879][i % 4],
        gain: 0.82 + (i % 5) * 0.06,
        cooldown: 0.34 + (i % 4) * 0.05,
        tags: ['satellite', 'resonator', 'modular', 'kit'],
      }),
    );
    const input = conduit(
      `diverter-${id}`,
      'tri-diverter',
      id,
      i % 2 === 0 ? 'pneumatic' : 'resonant',
      'arc',
      { arc: 0.8 + (i % 4) * 0.18, radius: 0.3, speed: 0.85 + (i % 3) * 0.06 },
    );
    conduits.push(input);
    const nextId = i + 1 < total - CORE_MODULES.length ? `satellite-${i + 2}` : 'collector-funnel';
    conduits.push(
      conduit(
        `${id}-${nextId}`,
        id,
        nextId,
        'resonant',
        nextId === 'collector-funnel' ? 'sag' : 'arc',
        { arc: 0.65 + (i % 3) * 0.16, speed: 0.85 },
      ),
    );
  }

  const byId = new Map(modules.map((m) => [m.id, m]));
  for (const c of conduits) {
    byId.get(c.from)?.outputs.push(c.id);
  }

  const routingLanes: RoutingLaneSpec[] = [
    {
      id: 'lane-lift',
      label: 'LIFT / GOVERNOR',
      moduleId: 'helix-lift',
      edgeId: 'conduit-diverter-gate',
      stepBias: 0,
    },
    {
      id: 'lane-aqueduct',
      label: 'AQUEDUCT',
      moduleId: 'upper-aqueduct',
      edgeId: 'conduit-diverter-gate',
      stepBias: 2,
    },
    {
      id: 'lane-gate-a',
      label: 'GATE BANK A',
      moduleId: 'gate-bank',
      edgeId: 'conduit-diverter-gate',
      stepBias: 4,
    },
    {
      id: 'lane-gate-b',
      label: 'GATE BANK B',
      moduleId: 'gate-bank',
      edgeId: 'conduit-diverter-chime',
      stepBias: 6,
    },
    {
      id: 'lane-chime',
      label: 'CHIME ORCHARD',
      moduleId: 'chime-orchard',
      edgeId: 'conduit-diverter-chime',
      stepBias: 8,
    },
    {
      id: 'lane-drum',
      label: 'DRUM RING',
      moduleId: 'drum-ring',
      edgeId: 'conduit-diverter-drum',
      stepBias: 10,
    },
    {
      id: 'lane-resonator',
      label: 'RESONATOR FIELD',
      moduleId: satelliteIds[0] ?? 'resonator-bowl',
      edgeId: satelliteIds[0]
        ? `conduit-diverter-${satelliteIds[0]}`
        : 'conduit-diverter-resonator',
      stepBias: 12,
    },
    {
      id: 'lane-bypass',
      label: 'SILENT BYPASS',
      moduleId: 'collector-funnel',
      edgeId: 'conduit-diverter-bypass',
      stepBias: 14,
    },
  ];

  return {
    moduleCount: total,
    modules,
    environment: 'cornell-relay',
    environmentTheme: 'arcade',
    marbleCount: DEFAULT_MARBLE_COUNT,
    spatialPorts: false,
    cameraEnvelopeRadius: 8.2,
    conduits,
    transmissions: TRANSMISSIONS.map((transmission) => ({ ...transmission })),
    sources: SOURCES.map((s) => ({ ...s })),
    bindings: BINDINGS.map((b) => ({ ...b })),
    focusTargets: createFocusTargets(satelliteIds),
    routingLanes,
    programSteps: MODAL_FLOW_PROGRAM_STEPS,
    defaultProgram: createDefaultRoutingProgram(),
  };
}

export interface ConduitSampler {
  sample(edge: ConduitSpec, t: number): Vec3;
  points(edge: ConduitSpec, count?: number): Vec3[];
  endpoints(edge: ConduitSpec): [Vec3, Vec3];
}

/** Shared geometry source for the solver, tube meshes and camera endpoints. */
export function createConduitSampler(blueprint: ModalFlowBlueprint): ConduitSampler {
  const modules = new Map(blueprint.modules.map((m) => [m.id, m]));
  const hash = (value: string): number => {
    let result = 2166136261;
    for (let i = 0; i < value.length; i++) {
      result ^= value.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0) / 0xffffffff;
  };
  const endpoint = (edge: ConduitSpec, outgoing: boolean): Vec3 => {
    const module = modules.get(outgoing ? edge.from : edge.to);
    if (!module) return { x: 0, y: 0, z: 0 };
    if (!blueprint.spatialPorts) return { ...module.position };
    const seed = hash(`${edge.id}:${outgoing ? 'out' : 'in'}`);
    const azimuth = seed * MODAL_FLOW_TAU;
    const elevation = (hash(`${edge.id}:elevation:${outgoing ? 1 : 0}`) - 0.5) * 1.5;
    const cosElevation = Math.cos(elevation);
    const local = {
      x: Math.cos(azimuth) * cosElevation * module.scale * 0.62,
      y: Math.sin(elevation) * module.scale * 0.62,
      z: Math.sin(azimuth) * cosElevation * module.scale * 0.62,
    };
    const rotation = module.orientation ?? { x: 0, y: 0, z: 0 };
    // XYZ Euler rotation without importing the render layer into the blueprint.
    const cx = Math.cos(rotation.x);
    const sx = Math.sin(rotation.x);
    const cy = Math.cos(rotation.y);
    const sy = Math.sin(rotation.y);
    const cz = Math.cos(rotation.z);
    const sz = Math.sin(rotation.z);
    const x1 = local.x;
    const y1 = local.y * cx - local.z * sx;
    const z1 = local.y * sx + local.z * cx;
    const x2 = x1 * cy + z1 * sy;
    const y2 = y1;
    const z2 = -x1 * sy + z1 * cy;
    return {
      x: module.position.x + x2 * cz - y2 * sz,
      y: module.position.y + x2 * sz + y2 * cz,
      z: module.position.z + z2,
    };
  };
  const endpoints = (edge: ConduitSpec): [Vec3, Vec3] => [
    endpoint(edge, true),
    endpoint(edge, false),
  ];
  const sample = (edge: ConduitSpec, t: number): Vec3 => {
    const [a, b] = endpoints(edge);
    const u = clamp(t, 0, 1);
    const envelope = Math.sin(Math.PI * u);
    const x = lerp(a.x, b.x, u);
    const y = lerp(a.y, b.y, u);
    const z = lerp(a.z, b.z, u);

    // Preserve the V8/V9 vertical-plane conduit language for those blueprints.
    if (!blueprint.spatialPorts) {
      if (edge.curve === 'helix') {
        const angle = u * MODAL_FLOW_TAU * edge.turns;
        return {
          x: x + Math.cos(angle) * edge.radius * envelope,
          y: y + edge.arc * envelope,
          z: z + Math.sin(angle) * edge.radius * envelope,
        };
      }
      if (edge.curve === 'arc') return { x, y: y + edge.arc * envelope, z };
      if (edge.curve === 'sag') return { x, y: y - edge.arc * envelope, z };
      return { x, y, z };
    }

    // Spatial variants bend around a deterministic local frame derived from
    // each edge. No global up-axis is privileged, so tube mouths and curves can
    // approach a housing from any direction.
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dz = b.z - a.z;
    const length = Math.max(0.0001, Math.hypot(dx, dy, dz));
    dx /= length;
    dy /= length;
    dz /= length;
    const phase = hash(`${edge.id}:frame`) * MODAL_FLOW_TAU;
    let rx = Math.cos(phase);
    let ry = Math.sin(phase * 1.37);
    let rz = Math.sin(phase);
    let sx = dy * rz - dz * ry;
    let sy = dz * rx - dx * rz;
    let sz = dx * ry - dy * rx;
    let sideLength = Math.hypot(sx, sy, sz);
    if (sideLength < 0.001) {
      rx = 0;
      ry = 1;
      rz = 0;
      sx = dy * rz - dz * ry;
      sy = dz * rx - dx * rz;
      sz = dx * ry - dy * rx;
      sideLength = Math.max(0.001, Math.hypot(sx, sy, sz));
    }
    sx /= sideLength;
    sy /= sideLength;
    sz /= sideLength;
    const nx = sy * dz - sz * dy;
    const ny = sz * dx - sx * dz;
    const nz = sx * dy - sy * dx;
    let sideAmount = 0;
    let normalAmount = 0;
    if (edge.curve === 'arc') {
      normalAmount = edge.arc * envelope;
      sideAmount = edge.arc * 0.16 * Math.sin(u * MODAL_FLOW_TAU) * envelope;
    } else if (edge.curve === 'sag') {
      normalAmount = -edge.arc * envelope;
      sideAmount = edge.arc * 0.24 * Math.sin(u * MODAL_FLOW_TAU) * envelope;
    } else if (edge.curve === 'helix') {
      const angle = u * MODAL_FLOW_TAU * edge.turns + phase;
      sideAmount = Math.cos(angle) * edge.radius * envelope;
      normalAmount = (Math.sin(angle) * edge.radius + edge.arc * 0.35) * envelope;
    } else if (edge.curve === 'weave') {
      const angle = u * MODAL_FLOW_TAU * Math.max(1, edge.turns) + phase;
      sideAmount = Math.sin(angle) * (edge.radius + edge.arc * 0.18) * envelope;
      normalAmount = (Math.cos(angle * 0.5) * edge.radius * 0.68 + edge.arc) * envelope;
    }
    return {
      x: x + sx * sideAmount + nx * normalAmount,
      y: y + sy * sideAmount + ny * normalAmount,
      z: z + sz * sideAmount + nz * normalAmount,
    };
  };
  return {
    sample,
    points: (edge, count = 24) =>
      Array.from({ length: count + 1 }, (_, i) => sample(edge, i / count)),
    endpoints,
  };
}
