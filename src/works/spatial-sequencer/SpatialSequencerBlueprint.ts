import type { FocusDescriptor, SubsystemId } from '../../engine/core/types';
import {
  MODAL_FLOW_PROGRAM_STEPS,
  ROUTING_LANE_COUNT,
  type BindingSpec,
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

export type SpatialSequencerTheme = 'lumen' | 'antarctic';

export const DEFAULT_LUMEN_MODULES = 18;
export const DEFAULT_ANTARCTIC_MODULES = 24;
export const MIN_SPATIAL_SEQUENCER_MODULES = 18;
export const MAX_SPATIAL_SEQUENCER_MODULES = 40;

const COLOR = {
  cyan: 0x62e9ff,
  gold: 0xffd26f,
  mint: 0x86ffcf,
  pink: 0xff78bd,
  violet: 0xab94ff,
  white: 0xf3fbff,
  ice: 0xbcefff,
  deepIce: 0x6d94e8,
};

interface NodeOptions {
  orientation: Vec3;
  scale: number;
  noteRole: number;
  register: number;
  subsystem: SubsystemId;
  color: number;
  cluster?: ModuleSpec['cluster'];
  tier?: number;
  focusScale?: ModuleSpec['focusScale'];
  gain?: number;
  tags?: string[];
}

const node = (
  id: string,
  label: string,
  kind: ModuleKind,
  position: Vec3,
  options: NodeOptions,
): ModuleSpec => ({
  id,
  label,
  kind,
  cluster: options.cluster ?? 'middle',
  position,
  orientation: options.orientation,
  tier: options.tier ?? 1,
  scale: options.scale,
  noteRole: options.noteRole,
  register: options.register,
  subsystem: options.subsystem,
  focusScale: options.focusScale ?? 'MODULE',
  color: options.color,
  gain: options.gain ?? 0.82,
  cooldown: 0.24,
  outputs: [],
  tags: ['spatial-sequencer', ...(options.tags ?? [])],
});

const edge = (
  id: string,
  from: string,
  to: string,
  kind: ConduitSpec['kind'],
  curve: ConduitSpec['curve'],
  arc: number,
  radius = 0.42,
  turns = 2,
  speed = 0.92,
  weight = 1,
): ConduitSpec => ({
  id: `conduit-${id}`,
  from,
  to,
  kind,
  curve,
  arc,
  radius,
  turns,
  speed,
  weight,
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
): TransmissionSpec => ({
  id: `transmission-${id}`,
  label,
  from,
  to,
  kind,
  ratio,
  pulses,
  efficiency: 0.84,
  scale,
  section,
  color,
});

function positions(theme: SpatialSequencerTheme): Vec3[] {
  if (theme === 'antarctic') {
    return [
      { x: -9.5, y: -5.8, z: 2.4 },
      { x: -7.2, y: -3.6, z: -0.8 },
      { x: -6.4, y: 0.4, z: -4.5 },
      { x: -3.8, y: 5.4, z: -6.8 },
      { x: 0, y: 8.4, z: -4.2 },
      { x: 3.5, y: 5.6, z: -0.4 },
      { x: 7.6, y: 2.4, z: 2.5 },
      { x: 8.8, y: -3.4, z: 5.4 },
      { x: 4.8, y: 2.2, z: 8.4 },
      { x: -0.6, y: -0.8, z: 9.6 },
      { x: 2.2, y: -8.6, z: 4.1 },
      { x: -4.6, y: -8.1, z: 0.2 },
      { x: -1.2, y: 2.2, z: -9.4 },
      { x: -8.8, y: 2.1, z: 5.3 },
      { x: 0.4, y: 0.2, z: 0.3 },
      { x: 9.2, y: 7.2, z: -1.4 },
      { x: 6.1, y: -5.8, z: -5.7 },
      { x: -5.2, y: 7.8, z: 3.7 },
    ];
  }
  // A legible 3D geometric sequencer: four large corners, six mid-size relays,
  // then small note vertices. The graph can be read from a macro camera.
  return [
    { x: -9, y: -5.4, z: 4.2 },
    { x: -7, y: -2.7, z: 0 },
    { x: -5, y: 0.2, z: -4.2 },
    { x: -2.8, y: 3.2, z: -7.2 },
    { x: 0, y: 6.2, z: -5 },
    { x: 3.2, y: 3.4, z: -2.2 },
    { x: 7.4, y: 0.4, z: 0.4 },
    { x: 9.2, y: -3.2, z: 3.6 },
    { x: 4.8, y: 3.6, z: 6.7 },
    { x: 0, y: 0.2, z: 8.8 },
    { x: 2.5, y: -7.2, z: 3.5 },
    { x: -4.4, y: -7.4, z: 0.4 },
    { x: -1.2, y: 1.3, z: -9.4 },
    { x: -8.2, y: 2.2, z: 5.7 },
    { x: 0, y: 0, z: 0 },
    { x: 8.7, y: 6.4, z: -0.8 },
    { x: 5.8, y: -5.7, z: -5.8 },
    { x: -5.5, y: 7.1, z: 3.4 },
  ];
}

function coreNodes(theme: SpatialSequencerTheme): ModuleSpec[] {
  const p = positions(theme);
  const ice = theme === 'antarctic';
  const labels = ice
    ? [
        'SUBGLACIAL RESERVOIR', 'TIDAL FLYWHEEL', 'BRINE ASCENT', 'ICE SHELF MANIFOLD',
        'AURORA ROUTER', 'FROST GATE', 'ICE PERCUSSION', 'ABYSSAL RESONATOR',
        'GLACIER BELL ARC', 'SNOWFALL CYMBALS', 'MELTWATER COLLECTOR', 'DEEP RETURN CURRENT',
        'BLUE-ICE MEMORY', 'VIOLET-ICE MEMORY', 'UNDERWATER COMPUTER', 'AURORA REEDS',
        'TIDE-CODE LOOM', 'DISTANT ICE BELLS',
      ]
    : [
        'CLOCK SOURCE', 'PHASE FLYWHEEL', 'ASCENDING EDGE', 'UPPER ROUTE',
        '3D NOTE ROUTER', 'QUANTIZED GATE', 'PULSE VOICE', 'BASS VERTEX',
        'CHORD VERTEX', 'HI-HAT VERTEX', 'RETURN SINK', 'LOOP EDGE',
        'MELODY NODE A', 'MELODY NODE B', 'HARMONY PROCESSOR', 'LIGHT PHASE',
        'PATTERN LOOM', 'CADENCE BELLS',
      ];
  const kinds: ModuleKind[] = [
    'source', 'flywheel', 'lift', 'aqueduct', 'diverter', 'gate', 'percussion',
    'resonator', 'bells', 'drum', 'collector', 'return', 'crystal', 'crystal',
    'computer', 'neon', 'loom', 'bells',
  ];
  const scales = [2.6, 1.25, 0.72, 1.7, 0.92, 0.48, 1.9, 2.2, 1.35, 0.62, 1.55, 0.76, 0.52, 1.05, 2.35, 0.58, 1.4, 0.44];
  const subsystems: SubsystemId[] = [
    'sub-rupture', 'piston-snap', 'sub-rupture', 'arc-discharge', 'glitch-chirp',
    'piston-snap', ice ? 'glass-armonica' : 'fin-cascade', 'sub-rupture',
    'modal-clang', 'fin-cascade', 'core-implode', 'piston-snap', 'glass-armonica',
    'glass-armonica', ice ? 'bellows-choir' : 'acid-squelch', 'arc-discharge',
    'glitch-chirp', 'modal-clang',
  ];
  const colors = ice
    ? [COLOR.ice, COLOR.deepIce, COLOR.cyan, COLOR.white, COLOR.violet, COLOR.ice, COLOR.white, COLOR.deepIce, COLOR.violet, COLOR.cyan, COLOR.ice, COLOR.deepIce, COLOR.cyan, COLOR.violet, COLOR.white, COLOR.mint, COLOR.deepIce, COLOR.white]
    : [COLOR.gold, COLOR.cyan, COLOR.mint, COLOR.pink, COLOR.violet, COLOR.gold, COLOR.pink, COLOR.cyan, COLOR.gold, COLOR.white, COLOR.mint, COLOR.violet, COLOR.cyan, COLOR.pink, COLOR.gold, COLOR.mint, COLOR.violet, COLOR.white];
  const ids = [
    'source-reservoir', 'crank-flywheel', 'helix-lift', 'upper-aqueduct',
    'tri-diverter', 'gate-bank', 'vibraphone-tines', 'resonator-bowl',
    'chime-orchard', 'drum-ring', 'collector-funnel', 'return-conduit',
    'crystal-bank-a', 'crystal-bank-b', 'analog-logic-core', 'neon-reed-array',
    'music-box-loom', 'bell-ratchet-relay',
  ];
  return ids.map((id, index) => node(id, labels[index], kinds[index], p[index], {
    orientation: {
      x: (index % 5 - 2) * (ice ? 0.22 : 0.31),
      y: (index * 0.47) % 1.7 - 0.85,
      z: (index % 7 - 3) * (ice ? 0.14 : 0.24),
    },
    scale: scales[index],
    noteRole: index - 4,
    register: index < 4 ? -1 : index > 11 ? 2 : 0,
    subsystem: subsystems[index],
    color: colors[index],
    cluster: index < 4 || index === 10 || index === 11 ? 'lower' : index < 9 ? 'upper' : 'orbit',
    tier: index % 3,
    focusScale: index === 4 ? 'CLUSTER' : index === 15 ? 'PORT' : 'MODULE',
    tags: [ice ? 'ice' : 'geometry', index < 12 ? 'causal-spine' : 'note-vertex'],
  }));
}

function coreEdges(theme: SpatialSequencerTheme): ConduitSpec[] {
  const slow = theme === 'antarctic' ? 0.58 : 0.88;
  return [
    edge('source-clock', 'source-reservoir', 'crank-flywheel', 'gravity', 'arc', 0.8, 0.38, 1, slow),
    edge('clock-lift', 'crank-flywheel', 'helix-lift', 'lift', 'helix', 0.9, 0.5, 3, slow),
    edge('lift-upper', 'helix-lift', 'upper-aqueduct', 'pneumatic', 'arc', 1.1, 0.4, 1, slow),
    edge('upper-router', 'upper-aqueduct', 'tri-diverter', 'gravity', 'straight', 0.1, 0.2, 1, slow),
    edge('router-gate', 'tri-diverter', 'gate-bank', 'pneumatic', 'arc', 0.8, 0.36, 1, slow),
    edge('router-melody-a', 'tri-diverter', 'crystal-bank-a', 'resonant', 'helix', 1.2, 0.48, 2, slow),
    edge('router-melody-b', 'tri-diverter', 'crystal-bank-b', 'resonant', 'weave', 1.1, 0.42, 2, slow),
    edge('router-harmony', 'tri-diverter', 'analog-logic-core', 'resonant', 'straight', 0.2, 0.24, 1, slow),
    edge('router-light', 'tri-diverter', 'neon-reed-array', 'pneumatic', 'arc', 1.4, 0.42, 1, slow),
    edge('gate-pulse', 'gate-bank', 'vibraphone-tines', 'gravity', 'straight', 0.1, 0.22, 1, slow),
    edge('gate-loom', 'gate-bank', 'music-box-loom', 'resonant', 'weave', 0.8, 0.36, 2, slow),
    edge('pulse-bass', 'vibraphone-tines', 'resonator-bowl', 'resonant', 'arc', 0.7, 0.32, 1, slow),
    edge('pulse-chord', 'vibraphone-tines', 'chime-orchard', 'pneumatic', 'arc', 1.1, 0.38, 1, slow),
    edge('melody-a-b', 'crystal-bank-a', 'crystal-bank-b', 'resonant', 'helix', 1.5, 0.5, 3, slow),
    edge('melody-b-chord', 'crystal-bank-b', 'chime-orchard', 'resonant', 'arc', 1.1, 0.4, 1, slow),
    edge('harmony-bells', 'analog-logic-core', 'bell-ratchet-relay', 'resonant', 'weave', 1, 0.4, 2, slow),
    edge('light-drums', 'neon-reed-array', 'drum-ring', 'pneumatic', 'helix', 1.3, 0.46, 2, slow),
    edge('loom-bells', 'music-box-loom', 'bell-ratchet-relay', 'resonant', 'arc', 0.9, 0.32, 1, slow),
    edge('bass-sink', 'resonator-bowl', 'collector-funnel', 'gravity', 'sag', 1.6, 0.42, 1, slow),
    edge('chord-sink', 'chime-orchard', 'collector-funnel', 'gravity', 'arc', 1.4, 0.42, 1, slow),
    edge('drum-sink', 'drum-ring', 'collector-funnel', 'gravity', 'sag', 1.2, 0.38, 1, slow),
    edge('bells-sink', 'bell-ratchet-relay', 'collector-funnel', 'gravity', 'arc', 1.2, 0.36, 1, slow),
    edge('sink-return', 'collector-funnel', 'return-conduit', 'return', 'helix', 0.8, 0.5, 3, slow),
    edge('return-source', 'return-conduit', 'source-reservoir', 'return', 'arc', 1, 0.38, 1, slow),
  ];
}

function transmissions(theme: SpatialSequencerTheme): TransmissionSpec[] {
  const ice = theme === 'antarctic';
  const c = ice ? COLOR.ice : COLOR.gold;
  return [
    transmission('clock-lift', 'CLOCK → ASCENT', 'crank-flywheel', 'helix-lift', 'gear-train', -2, 12, 0, c, 1.25),
    transmission('lift-router', 'ASCENT → ROUTER', 'helix-lift', 'tri-diverter', 'belt', 0.75, 8, 0, ice ? COLOR.deepIce : COLOR.cyan),
    transmission('router-gate', 'ROUTER → GRID GATE', 'tri-diverter', 'gate-bank', 'ratchet', 1.25, 16, 1, ice ? COLOR.white : COLOR.gold),
    transmission('gate-pulse', 'GRID GATE → PULSE', 'gate-bank', 'vibraphone-tines', 'solenoid', 1.5, 16, 2, ice ? COLOR.ice : COLOR.pink),
    transmission('melody-memory', 'MELODY A → B', 'crystal-bank-a', 'crystal-bank-b', 'nested-ring', -0.5, 7, 2, ice ? COLOR.violet : COLOR.cyan),
    transmission('harmony-loom', 'HARMONY → LOOM', 'analog-logic-core', 'music-box-loom', 'music-box', 0.62, 12, 3, ice ? COLOR.deepIce : COLOR.violet),
    transmission('loom-bells', 'LOOM → CADENCE', 'music-box-loom', 'bell-ratchet-relay', 'bell-crank', -0.75, 8, 4, ice ? COLOR.white : COLOR.gold),
    transmission('return-clock', 'RETURN → CLOCK', 'return-conduit', 'crank-flywheel', 'belt', 0.4, 8, 5, ice ? COLOR.cyan : COLOR.mint),
  ];
}

function makeProgram(theme: SpatialSequencerTheme): boolean[][] {
  return Array.from({ length: ROUTING_LANE_COUNT }, (_, lane) =>
    Array.from({ length: MODAL_FLOW_PROGRAM_STEPS }, (_, step) => {
      if (theme === 'antarctic') return (step + lane * 4) % 16 === 0;
      const phase = (step + lane * 3) % 16;
      return phase === 0 || phase === 6 || (lane % 3 === 0 && phase === 11);
    }),
  );
}

function focuses(theme: SpatialSequencerTheme, extras: string[]): FocusDescriptor[] {
  const ice = theme === 'antarctic';
  const result: FocusDescriptor[] = [
    { id: 'focus-macro', label: ice ? 'WHOLE SUBGLACIAL CONSTELLATION' : 'WHOLE 3D NOTE GRAPH', scale: 'MACRO', jointId: 'root', priority: 1, tags: ['macro', 'spatial'] },
    { id: 'focus-source', label: ice ? 'SUBGLACIAL RESERVOIR' : 'CLOCK SOURCE', scale: 'MODULE', jointId: 'module:source-reservoir', moduleId: 'source-reservoir', priority: 0.9, tags: ['source', 'clock'] },
    { id: 'focus-router', label: ice ? 'AURORA ROUTER' : '3D NOTE ROUTER', scale: 'CLUSTER', jointId: 'module:tri-diverter', clusterId: 'upper', priority: 0.98, tags: ['router', 'graph'] },
    { id: 'focus-gate', label: ice ? 'FROST GATE' : 'QUANTIZED GATE', scale: 'MODULE', jointId: 'module:gate-bank', moduleId: 'gate-bank', priority: 0.94, tags: ['gate', 'grid'] },
    { id: 'focus-melody', label: ice ? 'BLUE-ICE MEMORY' : 'MELODY EDGE A → B', scale: 'CONDUIT', edgeId: 'conduit-melody-a-b', priority: 0.92, tags: ['melody', 'conduit'] },
    { id: 'focus-harmony', label: ice ? 'UNDERWATER COMPUTER' : 'HARMONY PROCESSOR', scale: 'MODULE', jointId: 'module:analog-logic-core', moduleId: 'analog-logic-core', priority: 0.88, tags: ['harmony', 'computer'] },
    { id: 'focus-light', label: ice ? 'AURORA REEDS' : 'LIGHT PHASE', scale: 'PORT', jointId: 'port:neon-reed-array', moduleId: 'neon-reed-array', priority: 0.84, tags: ['light', 'port'] },
    { id: 'focus-return', label: ice ? 'DEEP RETURN CURRENT' : 'LOOP RETURN EDGE', scale: 'CONDUIT', edgeId: 'conduit-return-source', priority: 0.8, tags: ['return', 'loop'] },
  ];
  extras.slice(0, 2).forEach((id, index) => result.push({
    id: `focus-${id}`,
    label: ice ? `SNOW CRYSTAL ${index + 1}` : `EXTENSION NODE ${index + 1}`,
    scale: 'MODULE',
    jointId: `module:${id}`,
    moduleId: id,
    priority: 0.7 - index * 0.05,
    tags: ['extension', ice ? 'snow' : 'note'],
  }));
  return result;
}

export function createSpatialSequencerBlueprint(
  theme: SpatialSequencerTheme,
  requestedCount = theme === 'antarctic' ? DEFAULT_ANTARCTIC_MODULES : DEFAULT_LUMEN_MODULES,
): ModalFlowBlueprint {
  const total = Math.max(
    MIN_SPATIAL_SEQUENCER_MODULES,
    Math.min(MAX_SPATIAL_SEQUENCER_MODULES, Math.round(requestedCount)),
  );
  const modules = coreNodes(theme);
  const conduits = coreEdges(theme);
  const extras: string[] = [];
  for (let i = modules.length; i < total; i++) {
    const n = i - 18;
    const id = `${theme === 'antarctic' ? 'snow-crystal' : 'extension-note'}-${n + 1}`;
    extras.push(id);
    const angle = n * 2.39996323 + (theme === 'antarctic' ? 0.8 : 0.2);
    const radius = 10.5 + (n % 4) * 0.8;
    modules.push(node(
      id,
      theme === 'antarctic' ? `SNOW CRYSTAL ${n + 1}` : `EXTENSION NOTE ${n + 1}`,
      n % 4 === 3 ? 'neon' : 'crystal',
      {
        x: Math.cos(angle) * radius,
        y: Math.sin(n * 1.618) * (theme === 'antarctic' ? 7.8 : 6.2),
        z: Math.sin(angle) * radius,
      },
      {
        orientation: { x: angle * 0.3, y: n * 0.41, z: -angle * 0.2 },
        scale: 0.34 + (n % 6) * 0.22,
        noteRole: n + 8,
        register: 2,
        subsystem: n % 4 === 3 ? 'arc-discharge' : 'glass-armonica',
        color: theme === 'antarctic'
          ? [COLOR.ice, COLOR.deepIce, COLOR.violet, COLOR.white][n % 4]
          : [COLOR.cyan, COLOR.pink, COLOR.mint, COLOR.violet][n % 4],
        cluster: 'orbit',
        tier: 2,
        tags: [theme === 'antarctic' ? 'snow' : 'note', 'extension'],
      },
    ));
    conduits.push(edge(
      `router-${id}`,
      'tri-diverter',
      id,
      'resonant',
      n % 2 === 0 ? 'helix' : 'weave',
      1.1 + (n % 3) * 0.35,
      0.34 + (n % 3) * 0.1,
      2 + n % 3,
      theme === 'antarctic' ? 0.48 : 0.82,
    ));
    conduits.push(edge(
      `${id}-sink`,
      id,
      'collector-funnel',
      'gravity',
      'arc',
      1 + (n % 4) * 0.25,
      0.32,
      1,
      theme === 'antarctic' ? 0.46 : 0.78,
    ));
  }

  const moduleMap = new Map(modules.map((item) => [item.id, item]));
  for (const conduit of conduits) moduleMap.get(conduit.from)?.outputs.push(conduit.id);

  const routingLanes: RoutingLaneSpec[] = [
    { id: 'lane-gate', label: theme === 'antarctic' ? 'FROST GATE' : 'GRID GATE', moduleId: 'gate-bank', edgeId: 'conduit-router-gate', stepBias: 0 },
    { id: 'lane-melody-a', label: 'MELODY A', moduleId: 'crystal-bank-a', edgeId: 'conduit-router-melody-a', stepBias: 4 },
    { id: 'lane-melody-b', label: 'MELODY B', moduleId: 'crystal-bank-b', edgeId: 'conduit-router-melody-b', stepBias: 8 },
    { id: 'lane-harmony', label: 'HARMONY', moduleId: 'analog-logic-core', edgeId: 'conduit-router-harmony', stepBias: 12 },
    { id: 'lane-light', label: theme === 'antarctic' ? 'AURORA' : 'LIGHT PHASE', moduleId: 'neon-reed-array', edgeId: 'conduit-router-light', stepBias: 16 },
    { id: 'lane-pulse', label: theme === 'antarctic' ? 'ICE PULSE' : 'PULSE VOICE', moduleId: 'vibraphone-tines', edgeId: 'conduit-gate-pulse', stepBias: 20 },
    { id: 'lane-loom', label: 'PATTERN LOOM', moduleId: 'music-box-loom', edgeId: 'conduit-gate-loom', stepBias: 24 },
    { id: 'lane-return', label: 'RETURN LOOP', moduleId: 'collector-funnel', edgeId: 'conduit-sink-return', stepBias: 28 },
  ];

  const sources: EnergySourceSpec[] = [
    { id: 'source-clock', moduleId: 'crank-flywheel', label: theme === 'antarctic' ? 'TIDAL CLOCK' : 'MASTER CLOCK', kind: 'temporal', rate: theme === 'antarctic' ? 0.45 : 1.4, energy: 1 },
    { id: 'source-router', moduleId: 'tri-diverter', label: 'GEOMETRIC ROUTER', kind: 'program', rate: 1.1, energy: 0.9 },
    { id: 'source-melody', moduleId: 'crystal-bank-a', label: theme === 'antarctic' ? 'ICE MEMORY' : 'MELODY MEMORY', kind: 'harmonic', rate: 0.8, energy: 0.8 },
    { id: 'source-light', moduleId: 'neon-reed-array', label: theme === 'antarctic' ? 'AURORA FIELD' : 'LIGHT PHASE', kind: 'photonic', rate: 1.2, energy: 0.8 },
  ];
  const bindings: BindingSpec[] = [
    { id: 'bind-clock-flow', source: 'energy:clock', target: 'flowRate', mode: 'multiply', weight: 0.82, enabled: true },
    { id: 'bind-router-gate', source: 'energy:router', target: 'gateDuty', mode: 'bias', weight: 0.74, enabled: true },
    { id: 'bind-melody-register', source: 'energy:melody', target: 'music:registerSpread', mode: 'bias', weight: 0.7, enabled: true },
    { id: 'bind-light-bloom', source: 'energy:light', target: 'music:timbreBloom', mode: 'add', weight: 0.9, enabled: true },
  ];

  return {
    moduleCount: modules.length,
    modules,
    environment: 'open-pinball',
    environmentTheme: theme === 'antarctic' ? 'glacial' : 'constellation',
    marbleCount: theme === 'antarctic' ? 18 : 28,
    spatialPorts: true,
    cameraEnvelopeRadius: theme === 'antarctic' ? 15.8 : 14.2,
    conduits,
    transmissions: transmissions(theme),
    sources,
    bindings,
    focusTargets: focuses(theme, extras),
    routingLanes,
    programSteps: MODAL_FLOW_PROGRAM_STEPS,
    defaultProgram: makeProgram(theme),
  };
}
