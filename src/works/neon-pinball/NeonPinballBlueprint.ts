import { SeededRandom } from '../../engine/core/SeededRandom';
import type { FocusDescriptor } from '../../engine/core/types';
import {
  MODAL_FLOW_PROGRAM_STEPS,
  ROUTING_LANE_COUNT,
  type BindingSpec,
  type ConduitCurve,
  type ConduitSpec,
  type EnergySourceSpec,
  type ModalFlowBlueprint,
  type ModuleKind,
  type ModuleSpec,
  type RoutingLaneSpec,
  type TransmissionKind,
  type TransmissionSpec,
  type Vec3,
} from '../modal-flow/ModalFlowBlueprint';

export const DEFAULT_NEON_PINBALL_MODULES = 32;
export const MIN_NEON_PINBALL_MODULES = 20;
export const MAX_NEON_PINBALL_MODULES = 72;

const COLORS = {
  cyan: 0x66edff,
  magenta: 0xff5bc8,
  amber: 0xffb347,
  acid: 0xaaff55,
  violet: 0x9b7bff,
  red: 0xff5a4f,
  ice: 0xb8f3ff,
  brass: 0xe7b76b,
};

interface NodeOptions {
  orientation?: Vec3;
  cluster?: ModuleSpec['cluster'];
  tier?: number;
  scale?: number;
  noteRole?: number;
  register?: number;
  subsystem?: ModuleSpec['subsystem'];
  focusScale?: ModuleSpec['focusScale'];
  color?: number;
  gain?: number;
  cooldown?: number;
  tags?: string[];
}

const node = (
  id: string,
  label: string,
  kind: ModuleKind,
  position: Vec3,
  options: NodeOptions = {},
): ModuleSpec => ({
  id,
  label,
  kind,
  cluster: options.cluster ?? 'middle',
  position,
  orientation: options.orientation,
  tier: options.tier ?? 1,
  scale: options.scale ?? 1,
  noteRole: options.noteRole ?? 0,
  register: options.register ?? 0,
  subsystem: options.subsystem ?? 'modal-clang',
  focusScale: options.focusScale ?? 'MODULE',
  color: options.color ?? COLORS.cyan,
  gain: options.gain ?? 0.9,
  cooldown: options.cooldown ?? 0.18,
  outputs: [],
  tags: ['v10', 'spatial', ...(options.tags ?? [])],
});

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
  arc: options.arc ?? 1.25,
  radius: options.radius ?? 0.62,
  turns: options.turns ?? 2,
  speed: options.speed ?? 1,
  weight: options.weight ?? 1,
});

const transmission = (
  id: string,
  label: string,
  from: string,
  to: string,
  kind: TransmissionKind,
  ratio: number,
  pulses: number,
  section: number,
  color: number,
  scale = 1,
  efficiency = 0.82,
): TransmissionSpec => ({
  id: `transmission-${id}`,
  label,
  from,
  to,
  kind,
  ratio,
  pulses,
  efficiency,
  scale,
  section,
  color,
});

/**
 * Twenty fixed organs form a hanging analog-computer / pinball instrument.
 * Their local up axes deliberately disagree: tubes enter from arbitrary faces,
 * bells hang from a tilted arc, and the loom, ratchets and crystal buses occupy
 * depth as aggressively as width or height.
 */
const CORE_NODES: ModuleSpec[] = [
  node('source-reservoir', 'MAGNETIC BALL RESERVOIR', 'source', { x: -1.4, y: -7.2, z: 4.8 }, {
    orientation: { x: 0.55, y: -0.25, z: 0.42 }, cluster: 'lower', tier: 0, scale: 1.35,
    noteRole: 0, register: -1, subsystem: 'sub-rupture', color: COLORS.ice, gain: 0.62,
    tags: ['marble', 'source', 'magnetic'],
  }),
  node('crank-flywheel', 'VECTOR FLYWHEEL', 'flywheel', { x: -8.4, y: -3.8, z: 2.8 }, {
    orientation: { x: 0.22, y: 0.88, z: 1.1 }, cluster: 'lower', tier: 0, scale: 1.3,
    noteRole: 1, register: -1, subsystem: 'piston-snap', color: COLORS.amber,
    tags: ['flywheel', 'prime-mover', 'analog'],
  }),
  node('helix-lift', 'OBLIQUE COIL LIFT', 'lift', { x: -8.1, y: 2.3, z: -1.7 }, {
    orientation: { x: 0.78, y: -0.32, z: 0.64 }, cluster: 'middle', tier: 1, scale: 1.28,
    noteRole: 2, subsystem: 'sub-rupture', color: COLORS.red,
    tags: ['lift', 'coil', 'nonvertical'],
  }),
  node('upper-aqueduct', 'VECTOR TUBE MANIFOLD', 'aqueduct', { x: -3.9, y: 7.4, z: -5.1 }, {
    orientation: { x: 1.08, y: 0.18, z: -0.48 }, cluster: 'upper', tier: 2, scale: 1.38,
    noteRole: 3, register: 1, subsystem: 'arc-discharge', color: COLORS.cyan,
    focusScale: 'CLUSTER', tags: ['tube', 'manifold', 'pressure'],
  }),
  node('tri-diverter', 'PINBALL SWITCHYARD', 'diverter', { x: 1.1, y: 6.2, z: -7.4 }, {
    orientation: { x: -0.52, y: 0.72, z: 0.92 }, cluster: 'upper', tier: 2, scale: 1.22,
    noteRole: 4, register: 1, subsystem: 'glitch-chirp', color: COLORS.magenta,
    focusScale: 'PORT', tags: ['pinball', 'router', 'switchyard'],
  }),
  node('gate-bank', 'RATCHET LOGIC REGISTER', 'ratchet', { x: 6.8, y: 5.2, z: -5.5 }, {
    orientation: { x: 0.42, y: -0.85, z: 1.18 }, cluster: 'upper', tier: 2, scale: 1.28,
    noteRole: 5, register: 1, subsystem: 'break-shred', color: COLORS.amber,
    tags: ['ratchet', 'logic', 'register', 'percussion'],
  }),
  node('vibraphone-tines', 'BREAK PERCUSSION MATRIX', 'percussion', { x: 9.3, y: 0.2, z: -1.1 }, {
    orientation: { x: -0.72, y: 0.22, z: 0.58 }, cluster: 'middle', tier: 1, scale: 1.45,
    noteRole: 6, register: 0, subsystem: 'break-shred', color: COLORS.red, gain: 1.15,
    tags: ['drums', 'cymbals', 'breakcore', 'solenoid'],
  }),
  node('resonator-bowl', 'SUB BASS RESONATOR', 'resonator', { x: 4.7, y: -5.8, z: 3.8 }, {
    orientation: { x: 0.88, y: 0.42, z: -0.55 }, cluster: 'lower', tier: 0, scale: 1.6,
    noteRole: 0, register: -2, subsystem: 'sub-rupture', color: COLORS.violet, gain: 1.22,
    tags: ['bass', 'resonator', 'sub'],
  }),
  node('chime-orchard', 'CURVED BELL CHOIR', 'bells', { x: 2.4, y: 4.5, z: 8.8 }, {
    orientation: { x: 0.96, y: -0.42, z: 0.78 }, cluster: 'orbit', tier: 2, scale: 1.42,
    noteRole: 2, register: 2, subsystem: 'modal-clang', color: COLORS.brass, gain: 1.1,
    tags: ['bells', 'choir', 'row', 'strikers'],
  }),
  node('drum-ring', 'ORBITAL CYMBAL BATTERY', 'drum', { x: -5.8, y: -0.7, z: 8.3 }, {
    orientation: { x: 1.22, y: 0.4, z: -0.35 }, cluster: 'orbit', tier: 1, scale: 1.34,
    noteRole: 1, subsystem: 'core-implode', color: COLORS.red, gain: 1.08,
    tags: ['drum', 'cymbal', 'percussion'],
  }),
  node('collector-funnel', 'MAGNETIC BALL COLLECTOR', 'collector', { x: 0.6, y: -8.3, z: -4.2 }, {
    orientation: { x: -0.6, y: 0.58, z: -0.35 }, cluster: 'lower', tier: 0, scale: 1.45,
    noteRole: 1, register: -1, subsystem: 'core-implode', color: COLORS.ice,
    tags: ['collector', 'magnet', 'return'],
  }),
  node('return-conduit', 'TOROIDAL RETURN COIL', 'return', { x: -6.8, y: -6.2, z: -3.8 }, {
    orientation: { x: 1.05, y: -0.72, z: 0.24 }, cluster: 'lower', tier: 0, scale: 1.2,
    noteRole: 3, register: -1, subsystem: 'piston-snap', color: COLORS.acid,
    focusScale: 'CONDUIT', tags: ['return', 'coil', 'regenerator'],
  }),
  node('music-box-loom', 'MUSIC-BOX DATA LOOM', 'loom', { x: 8.2, y: 1.7, z: 4.5 }, {
    orientation: { x: -0.38, y: 0.95, z: 0.72 }, cluster: 'middle', tier: 1, scale: 1.42,
    noteRole: 4, register: 1, subsystem: 'glitch-chirp', color: COLORS.magenta,
    tags: ['music-box', 'loom', 'pinned-cylinder', 'comb'],
  }),
  node('analog-logic-core', 'ANALOG PATCH COMPUTER', 'computer', { x: 0, y: 0.2, z: 0 }, {
    orientation: { x: 0.28, y: 0.62, z: -0.42 }, cluster: 'middle', tier: 1, scale: 1.52,
    noteRole: 3, register: 0, subsystem: 'acid-squelch', color: COLORS.acid,
    tags: ['computer', 'patchbay', 'vacuum-tube', 'logic'],
  }),
  node('pinball-playfield', 'VERTICAL PINBALL FIELD', 'pinball', { x: 5.9, y: 0.8, z: -8.2 }, {
    orientation: { x: -0.18, y: -0.72, z: 1.26 }, cluster: 'middle', tier: 1, scale: 1.5,
    noteRole: 5, register: 1, subsystem: 'piston-snap', color: COLORS.cyan,
    tags: ['pinball', 'bumpers', 'flippers', 'solenoid'],
  }),
  node('crystal-bank-a', 'CRYSTAL MEMORY A', 'crystal', { x: -1.8, y: 2.2, z: -9.5 }, {
    orientation: { x: 0.85, y: 0.35, z: -0.94 }, cluster: 'middle', tier: 1, scale: 1.26,
    noteRole: 6, register: 2, subsystem: 'glass-armonica', color: COLORS.violet,
    tags: ['crystal', 'memory', 'neon', 'harmonic'],
  }),
  node('crystal-bank-b', 'CRYSTAL MEMORY B', 'crystal', { x: -8.8, y: 1.2, z: 5.7 }, {
    orientation: { x: -0.62, y: 1.1, z: 0.34 }, cluster: 'orbit', tier: 2, scale: 1.34,
    noteRole: 8, register: 2, subsystem: 'glass-armonica', color: COLORS.cyan,
    tags: ['crystal', 'memory', 'neon', 'harmonic'],
  }),
  node('acid-dial-bank', 'ACID CV DIAL BANK', 'computer', { x: -2.7, y: -3.9, z: -8.7 }, {
    orientation: { x: 0.48, y: -1.02, z: 0.67 }, cluster: 'lower', tier: 0, scale: 1.18,
    noteRole: -2, register: -1, subsystem: 'acid-squelch', color: COLORS.acid,
    tags: ['acid', 'cv', 'sequencer', 'dial'],
  }),
  node('neon-reed-array', 'SOUND-ACTIVE NEON REEDS', 'neon', { x: 9.5, y: 5.9, z: 2.6 }, {
    orientation: { x: 0.62, y: 0.32, z: 0.96 }, cluster: 'upper', tier: 2, scale: 1.35,
    noteRole: 7, register: 2, subsystem: 'arc-discharge', color: COLORS.magenta,
    tags: ['neon', 'reeds', 'sound-reactive', 'light'],
  }),
  node('bell-ratchet-relay', 'BELL RATCHET RELAY', 'ratchet', { x: -6.2, y: 7.6, z: 3.6 }, {
    orientation: { x: -0.8, y: 0.46, z: -0.72 }, cluster: 'upper', tier: 2, scale: 1.12,
    noteRole: 9, register: 2, subsystem: 'fin-cascade', color: COLORS.brass,
    tags: ['ratchet', 'bell', 'relay', 'counter'],
  }),
];

const CORE_CONDUITS: ConduitSpec[] = [
  conduit('source-flywheel', 'source-reservoir', 'crank-flywheel', 'gravity', 'weave', { arc: 1.1, radius: 0.7, turns: 2, speed: 1.08 }),
  conduit('flywheel-lift', 'crank-flywheel', 'helix-lift', 'lift', 'helix', { arc: 0.9, radius: 0.82, turns: 4, speed: 1.22 }),
  conduit('lift-manifold', 'helix-lift', 'upper-aqueduct', 'pneumatic', 'weave', { arc: 1.6, radius: 0.72, turns: 3, speed: 1.18 }),
  conduit('manifold-switchyard', 'upper-aqueduct', 'tri-diverter', 'gravity', 'arc', { arc: 1.55, radius: 0.55, speed: 1.16 }),
  conduit('switchyard-gate', 'tri-diverter', 'gate-bank', 'pneumatic', 'weave', { arc: 1.1, radius: 0.68, turns: 2, speed: 1.2 }),
  conduit('switchyard-pinball', 'tri-diverter', 'pinball-playfield', 'gravity', 'helix', { arc: 0.8, radius: 0.54, turns: 2, speed: 1.3 }),
  conduit('switchyard-loom', 'tri-diverter', 'music-box-loom', 'pneumatic', 'weave', { arc: 1.7, radius: 0.72, turns: 3, speed: 1.08 }),
  conduit('switchyard-crystal', 'tri-diverter', 'crystal-bank-a', 'resonant', 'helix', { arc: 1.25, radius: 0.65, turns: 3, speed: 0.96 }),
  conduit('switchyard-bypass', 'tri-diverter', 'collector-funnel', 'gravity', 'sag', { arc: 2.1, radius: 0.5, speed: 0.92, weight: 0.35 }),
  conduit('gate-percussion', 'gate-bank', 'vibraphone-tines', 'gravity', 'weave', { arc: 1.3, radius: 0.58, turns: 2, speed: 1.35 }),
  conduit('gate-neon', 'gate-bank', 'neon-reed-array', 'resonant', 'arc', { arc: 1.5, radius: 0.45, speed: 1.0 }),
  conduit('percussion-loom', 'vibraphone-tines', 'music-box-loom', 'resonant', 'helix', { arc: 1.2, radius: 0.48, turns: 2, speed: 1.12 }),
  conduit('percussion-collector', 'vibraphone-tines', 'collector-funnel', 'gravity', 'weave', { arc: 1.9, radius: 0.72, turns: 3, speed: 1.15 }),
  conduit('pinball-bells', 'pinball-playfield', 'chime-orchard', 'pneumatic', 'arc', { arc: 2.2, radius: 0.62, speed: 1.12 }),
  conduit('pinball-drum', 'pinball-playfield', 'drum-ring', 'gravity', 'helix', { arc: 1.4, radius: 0.76, turns: 3, speed: 1.05 }),
  conduit('loom-computer', 'music-box-loom', 'analog-logic-core', 'resonant', 'weave', { arc: 1.1, radius: 0.62, turns: 3, speed: 0.98 }),
  conduit('computer-acid', 'analog-logic-core', 'acid-dial-bank', 'pneumatic', 'helix', { arc: 0.8, radius: 0.66, turns: 3, speed: 1.08 }),
  conduit('acid-resonator', 'acid-dial-bank', 'resonator-bowl', 'resonant', 'weave', { arc: 1.4, radius: 0.58, turns: 2, speed: 0.94 }),
  conduit('crystal-a-b', 'crystal-bank-a', 'crystal-bank-b', 'resonant', 'helix', { arc: 2.4, radius: 0.82, turns: 5, speed: 0.92 }),
  conduit('crystal-b-resonator', 'crystal-bank-b', 'resonator-bowl', 'resonant', 'weave', { arc: 1.8, radius: 0.64, turns: 3, speed: 0.96 }),
  conduit('neon-bell-relay', 'neon-reed-array', 'bell-ratchet-relay', 'resonant', 'arc', { arc: 1.6, radius: 0.48, speed: 1.02 }),
  conduit('bell-relay-choir', 'bell-ratchet-relay', 'chime-orchard', 'gravity', 'weave', { arc: 1.2, radius: 0.52, turns: 2, speed: 1.08 }),
  conduit('bells-collector', 'chime-orchard', 'collector-funnel', 'gravity', 'helix', { arc: 2.3, radius: 0.76, turns: 4, speed: 1.02 }),
  conduit('drums-collector', 'drum-ring', 'collector-funnel', 'gravity', 'weave', { arc: 1.7, radius: 0.64, turns: 2, speed: 1.16 }),
  conduit('resonator-collector', 'resonator-bowl', 'collector-funnel', 'resonant', 'arc', { arc: 1.1, radius: 0.46, speed: 0.9 }),
  conduit('collector-return', 'collector-funnel', 'return-conduit', 'return', 'helix', { arc: 0.8, radius: 0.72, turns: 3, speed: 1.0 }),
  conduit('return-source', 'return-conduit', 'source-reservoir', 'return', 'weave', { arc: 1.35, radius: 0.62, turns: 3, speed: 1.05 }),
];

const TRANSMISSIONS: TransmissionSpec[] = [
  transmission('flywheel-lift-gears', 'VECTOR FLYWHEEL → COIL LIFT', 'crank-flywheel', 'helix-lift', 'gear-train', -2.8, 16, 0, COLORS.amber, 1.15, 0.93),
  transmission('lift-manifold-belt', 'COIL LIFT → PRESSURE MANIFOLD', 'helix-lift', 'upper-aqueduct', 'belt', -0.68, 9, 0, COLORS.red, 1.05),
  transmission('manifold-switchyard-chain', 'MANIFOLD → PINBALL SWITCHYARD', 'upper-aqueduct', 'tri-diverter', 'chain', 1.35, 12, 1, COLORS.cyan, 1.0),
  transmission('switchyard-register-ratchet', 'SWITCHYARD → LOGIC RATCHET', 'tri-diverter', 'gate-bank', 'ratchet', 1.75, 24, 1, COLORS.amber, 1.22, 0.88),
  transmission('register-percussion-solenoid', 'RATCHET → BREAK SOLENOIDS', 'gate-bank', 'vibraphone-tines', 'solenoid', 2.4, 32, 2, COLORS.red, 1.18, 0.86),
  transmission('switchyard-pinball-cam', 'SWITCHYARD → PINBALL FLIPPERS', 'tri-diverter', 'pinball-playfield', 'camshaft', 1.6, 11, 2, COLORS.cyan, 1.06),
  transmission('pinball-bells-crank', 'PINBALL → CURVED BELL CHOIR', 'pinball-playfield', 'chime-orchard', 'bell-crank', -0.74, 9, 2, COLORS.brass, 1.12),
  transmission('percussion-loom', 'BREAK MATRIX → DATA LOOM', 'vibraphone-tines', 'music-box-loom', 'music-box', 0.62, 18, 3, COLORS.magenta, 1.2),
  transmission('loom-computer-belt', 'DATA LOOM → ANALOG COMPUTER', 'music-box-loom', 'analog-logic-core', 'belt', -1.25, 13, 3, COLORS.magenta, 1.0),
  transmission('computer-acid-cam', 'ANALOG COMPUTER → ACID DIALS', 'analog-logic-core', 'acid-dial-bank', 'camshaft', 1.42, 16, 4, COLORS.acid, 1.05),
  transmission('switchyard-crystal-ring', 'SWITCHYARD → CRYSTAL MEMORY A', 'tri-diverter', 'crystal-bank-a', 'nested-ring', -0.52, 7, 3, COLORS.violet, 1.15),
  transmission('crystal-memory-bus', 'CRYSTAL MEMORY A → B', 'crystal-bank-a', 'crystal-bank-b', 'nested-ring', -1.6, 12, 4, COLORS.cyan, 1.24),
  transmission('crystal-bass-linkage', 'CRYSTAL MEMORY → SUB RESONATOR', 'crystal-bank-b', 'resonator-bowl', 'four-bar', 0.72, 8, 4, COLORS.violet, 1.08),
  transmission('register-neon-chain', 'LOGIC RATCHET → NEON REEDS', 'gate-bank', 'neon-reed-array', 'chain', 1.9, 20, 4, COLORS.magenta, 1.12),
  transmission('neon-bell-ratchet', 'NEON REEDS → BELL COUNTER', 'neon-reed-array', 'bell-ratchet-relay', 'ratchet', -1.3, 18, 5, COLORS.brass, 1.0),
  transmission('collector-return-gears', 'MAGNETIC COLLECTOR → RETURN COIL', 'collector-funnel', 'return-conduit', 'gear-train', -1.1, 14, 5, COLORS.acid, 1.08, 0.91),
  transmission('return-flywheel-belt', 'RETURN COIL → VECTOR FLYWHEEL', 'return-conduit', 'crank-flywheel', 'belt', 0.48, 10, 5, COLORS.amber, 0.95, 0.74),
];

const SOURCES: EnergySourceSpec[] = [
  { id: 'source-flywheel', moduleId: 'crank-flywheel', label: 'VECTOR FLYWHEEL INERTIA', kind: 'kinetic', rate: 1.2, energy: 1.2 },
  { id: 'source-pinball', moduleId: 'tri-diverter', label: 'PINBALL SWITCH BUS', kind: 'material', rate: 2.4, energy: 1.3 },
  { id: 'source-ratchet', moduleId: 'gate-bank', label: 'RATCHET CLOCK', kind: 'temporal', rate: 3.2, energy: 1.1 },
  { id: 'source-breaks', moduleId: 'vibraphone-tines', label: 'BREAK SOLENOID BUS', kind: 'percussive', rate: 4.8, energy: 1.4 },
  { id: 'source-loom', moduleId: 'music-box-loom', label: 'PINNED DATA CYLINDER', kind: 'program', rate: 2.1, energy: 1.0 },
  { id: 'source-crystal-a', moduleId: 'crystal-bank-a', label: 'CRYSTAL MEMORY A', kind: 'harmonic', rate: 1.4, energy: 0.9 },
  { id: 'source-crystal-b', moduleId: 'crystal-bank-b', label: 'CRYSTAL MEMORY B', kind: 'harmonic', rate: 1.1, energy: 0.9 },
  { id: 'source-neon', moduleId: 'neon-reed-array', label: 'AUDIO-REACTIVE NEON', kind: 'photonic', rate: 2.6, energy: 1.1 },
  { id: 'source-return', moduleId: 'return-conduit', label: 'TOROIDAL RETURN PRESSURE', kind: 'material', rate: 1, energy: 0.8 },
];

const BINDINGS: BindingSpec[] = [
  { id: 'bind-flow-pinball', source: 'energy:pinball', target: 'flowRate', mode: 'multiply', weight: 1.15, enabled: true },
  { id: 'bind-ratchet-gate', source: 'energy:ratchet', target: 'gateDuty', mode: 'bias', weight: 0.92, enabled: true },
  { id: 'bind-break-density', source: 'energy:breaks', target: 'music:phraseDensity', mode: 'gate', weight: 1.25, enabled: true },
  { id: 'bind-loom-density', source: 'energy:loom', target: 'music:phraseDensity', mode: 'multiply', weight: 0.82, enabled: true },
  { id: 'bind-crystal-register-a', source: 'energy:crystal-a', target: 'music:registerSpread', mode: 'bias', weight: 0.86, enabled: true },
  { id: 'bind-crystal-register-b', source: 'energy:crystal-b', target: 'music:registerSpread', mode: 'bias', weight: 0.78, enabled: true },
  { id: 'bind-crystal-bloom', source: 'energy:crystal-a', target: 'music:timbreBloom', mode: 'add', weight: 1.08, enabled: true },
  { id: 'bind-neon-bloom', source: 'energy:neon', target: 'music:timbreBloom', mode: 'add', weight: 0.88, enabled: true },
  { id: 'bind-flywheel-lift', source: 'energy:flywheel', target: 'helix-lift', mode: 'drive', weight: 1.12, enabled: true },
  { id: 'bind-pinball-switchyard', source: 'energy:pinball', target: 'tri-diverter', mode: 'drive', weight: 1.22, enabled: true },
  { id: 'bind-break-matrix', source: 'energy:breaks', target: 'vibraphone-tines', mode: 'excite', weight: 1.3, enabled: true },
  { id: 'bind-loom-computer', source: 'energy:loom', target: 'analog-logic-core', mode: 'drive', weight: 0.9, enabled: true },
  { id: 'bind-neon-reeds', source: 'energy:neon', target: 'neon-reed-array', mode: 'excite', weight: 1.2, enabled: true },
  { id: 'bind-return-camera', source: 'energy:return', target: 'camera:follow', mode: 'bias', weight: 0.62, enabled: true },
  { id: 'bind-break-camera', source: 'energy:breaks', target: 'camera:follow', mode: 'add', weight: 0.52, enabled: true },
  { id: 'bind-pinball-gravity', source: 'energy:pinball', target: 'gravity', mode: 'multiply', weight: 0.72, enabled: true },
];

function makeProgram(): boolean[][] {
  return Array.from({ length: ROUTING_LANE_COUNT }, (_, lane) =>
    Array.from({ length: MODAL_FLOW_PROGRAM_STEPS }, (_, step) => {
      const base = [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30].includes((step + lane * 3) % 32);
      return base || SeededRandom.hashStep(step, lane, 0x10b10) > 0.9;
    }),
  );
}

function focusTargets(satellites: string[]): FocusDescriptor[] {
  const targets: FocusDescriptor[] = [
    { id: 'focus-macro', label: 'WHOLE OPEN PINBALL COMPUTER', scale: 'MACRO', jointId: 'root', priority: 1, tags: ['macro', 'open', 'pinball'] },
    { id: 'focus-switchyard-cluster', label: 'PINBALL SWITCHYARD + LOGIC', scale: 'CLUSTER', jointId: 'module:tri-diverter', clusterId: 'upper', priority: 0.96, tags: ['cluster', 'pinball', 'ratchet'] },
    { id: 'focus-ratchet-register', label: 'RATCHET LOGIC REGISTER', scale: 'MODULE', jointId: 'module:gate-bank', moduleId: 'gate-bank', priority: 0.98, tags: ['module', 'ratchet', 'logic'] },
    { id: 'focus-percussion-matrix', label: 'BREAK PERCUSSION MATRIX', scale: 'MODULE', jointId: 'module:vibraphone-tines', moduleId: 'vibraphone-tines', priority: 0.98, tags: ['module', 'percussion', 'breakcore'] },
    { id: 'focus-music-box-loom', label: 'MUSIC-BOX DATA LOOM', scale: 'MODULE', jointId: 'module:music-box-loom', moduleId: 'music-box-loom', priority: 0.94, tags: ['module', 'loom', 'music-box'] },
    { id: 'focus-crystal-bus', label: 'CRYSTAL MEMORY BUS', scale: 'CONDUIT', jointId: 'transmission:transmission-crystal-memory-bus', edgeId: 'transmission-crystal-memory-bus', priority: 0.94, tags: ['conduit', 'crystal', 'neon'] },
    { id: 'focus-bell-choir', label: 'CURVED BELL CHOIR', scale: 'MODULE', jointId: 'module:chime-orchard', moduleId: 'chime-orchard', priority: 0.9, tags: ['module', 'bells', 'striker'] },
    { id: 'focus-neon-reeds', label: 'SOUND-ACTIVE NEON REEDS', scale: 'PORT', jointId: 'port:neon-reed-array', moduleId: 'neon-reed-array', priority: 0.91, tags: ['port', 'neon', 'light'] },
    { id: 'focus-pinball-port', label: 'PINBALL BUMPER PORT', scale: 'PORT', jointId: 'port:pinball-playfield', moduleId: 'pinball-playfield', priority: 0.9, tags: ['port', 'pinball', 'bumper'] },
    { id: 'focus-return-coil', label: 'TOROIDAL RETURN COIL', scale: 'CONDUIT', edgeId: 'conduit-return-source', priority: 0.82, tags: ['conduit', 'return', 'coil'] },
  ];
  satellites.slice(0, 3).forEach((id, index) => {
    targets.push({
      id: `focus-${id}`,
      label: `ORBITAL CRYSTAL ${index + 1}`,
      scale: 'MODULE',
      jointId: `module:${id}`,
      moduleId: id,
      priority: 0.76 - index * 0.05,
      tags: ['module', 'crystal', 'orbit'],
    });
  });
  return targets;
}

export function createNeonPinballBlueprint(
  moduleCount = DEFAULT_NEON_PINBALL_MODULES,
): ModalFlowBlueprint {
  const total = Math.max(
    MIN_NEON_PINBALL_MODULES,
    Math.min(MAX_NEON_PINBALL_MODULES, Math.round(moduleCount)),
  );
  const modules: ModuleSpec[] = CORE_NODES.map((module) => ({
    ...module,
    position: { ...module.position },
    orientation: module.orientation ? { ...module.orientation } : undefined,
    outputs: [],
    tags: [...module.tags],
  }));
  const conduits: ConduitSpec[] = CORE_CONDUITS.map((edge) => ({ ...edge }));
  const satellites: string[] = [];

  for (let i = 0; i < total - CORE_NODES.length; i++) {
    const id = `orbital-crystal-${i + 1}`;
    satellites.push(id);
    const angle = i * 2.39996323 + 0.4;
    const second = i * 1.61803399;
    const radius = 10.2 + (i % 4) * 0.72;
    modules.push(node(id, `ORBITAL CRYSTAL ${i + 1}`, i % 3 === 2 ? 'neon' : 'crystal', {
      x: Math.cos(angle) * radius,
      y: Math.sin(second) * 6.8 + (i % 2 === 0 ? 1.2 : -0.8),
      z: Math.sin(angle) * radius,
    }, {
      orientation: { x: angle * 0.37, y: second * 0.22, z: angle * -0.28 },
      cluster: 'orbit', tier: 1 + (i % 3), scale: 0.72 + (i % 4) * 0.1,
      noteRole: 5 + i, register: 2, subsystem: i % 3 === 2 ? 'arc-discharge' : 'glass-armonica',
      color: [COLORS.cyan, COLORS.violet, COLORS.magenta, COLORS.acid][i % 4],
      gain: 0.84 + (i % 3) * 0.08, tags: ['orbital', 'crystal', 'particle-field'],
    }));
    conduits.push(conduit(`switchyard-${id}`, 'tri-diverter', id, 'resonant', i % 2 === 0 ? 'helix' : 'weave', {
      arc: 1.4 + (i % 4) * 0.35, radius: 0.48 + (i % 3) * 0.12, turns: 2 + (i % 4), speed: 0.9 + (i % 3) * 0.06,
    }));
    const next = i + 1 < total - CORE_NODES.length ? `orbital-crystal-${i + 2}` : 'collector-funnel';
    conduits.push(conduit(`${id}-${next}`, id, next, 'resonant', 'weave', {
      arc: 1.1 + (i % 3) * 0.28, radius: 0.42 + (i % 2) * 0.16, turns: 2 + (i % 3), speed: 0.9,
    }));
  }

  const byId = new Map(modules.map((module) => [module.id, module]));
  for (const edge of conduits) byId.get(edge.from)?.outputs.push(edge.id);

  const routingLanes: RoutingLaneSpec[] = [
    { id: 'lane-kick', label: 'KICK / SUB BUS', moduleId: 'resonator-bowl', edgeId: 'conduit-switchyard-pinball', stepBias: 0 },
    { id: 'lane-snare', label: 'SNARE SOLENOIDS', moduleId: 'vibraphone-tines', edgeId: 'conduit-gate-percussion', stepBias: 4 },
    { id: 'lane-ratchet', label: 'RATCHET REGISTER', moduleId: 'gate-bank', edgeId: 'conduit-switchyard-gate', stepBias: 8 },
    { id: 'lane-loom', label: 'MUSIC-BOX LOOM', moduleId: 'music-box-loom', edgeId: 'conduit-switchyard-loom', stepBias: 12 },
    { id: 'lane-crystal-a', label: 'CRYSTAL MEMORY A', moduleId: 'crystal-bank-a', edgeId: 'conduit-switchyard-crystal', stepBias: 16 },
    { id: 'lane-bells', label: 'BELL CHOIR', moduleId: 'chime-orchard', edgeId: 'conduit-pinball-bells', stepBias: 20 },
    { id: 'lane-neon', label: 'NEON REEDS', moduleId: 'neon-reed-array', edgeId: 'conduit-gate-neon', stepBias: 24 },
    { id: 'lane-return', label: 'MAGNETIC RETURN', moduleId: 'collector-funnel', edgeId: 'conduit-switchyard-bypass', stepBias: 28 },
  ];

  return {
    moduleCount: total,
    modules,
    environment: 'open-pinball',
    spatialPorts: true,
    cameraEnvelopeRadius: 14.5,
    conduits,
    transmissions: TRANSMISSIONS.map((item) => ({ ...item })),
    sources: SOURCES.map((source) => ({ ...source })),
    bindings: BINDINGS.map((binding) => ({ ...binding })),
    focusTargets: focusTargets(satellites),
    routingLanes,
    programSteps: MODAL_FLOW_PROGRAM_STEPS,
    defaultProgram: makeProgram(),
  };
}
