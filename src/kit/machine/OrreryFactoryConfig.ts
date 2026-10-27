import type { FocusDescriptor, MacroDefinition } from '../../engine/core/types';
import type {
  EdgeKind,
  EnergySourceSpec,
  EnergyWaveform,
  MachineClusterSpec,
  MachineEdgeSpec,
  MachineGraphConfig,
  MachineModuleSpec,
  MachinePortSpec,
  PortKind,
  ScoreBindingMode,
  ScoreBindingSpec,
  TransferMode,
} from './MachineGraph';

export const GRAPH_MACRO_DEFINITIONS: MacroDefinition[] = [
  {
    id: 'networkCoupling',
    label: 'CONDUIT NETWORK COUPLING',
    min: 0,
    max: 1,
    defaultValue: 0.62,
    description: 'How strongly energy in one module propagates through shared ducts, shafts and data conduits.',
  },
  {
    id: 'flowRate',
    label: 'ENERGY FLOW RATE',
    min: 0.05,
    max: 2,
    defaultValue: 0.78,
    description: 'Speed and throughput of visible flow beads travelling through every conduit.',
  },
  {
    id: 'energyChaos',
    label: 'SOURCE TURBULENCE',
    min: 0,
    max: 1,
    defaultValue: 0.31,
    description: 'Nonlinear source instability, turbulent transfer and phase leakage between clusters.',
  },
  {
    id: 'narrativeScale',
    label: 'NARRATIVE SCALE',
    min: 0.2,
    max: 3,
    defaultValue: 1.18,
    description: 'Camera and behavior bias between macro architecture, cluster relationships and port detail.',
  },
  {
    id: 'moduleDensity',
    label: 'MODULE DENSITY / LOAD',
    min: 0.2,
    max: 2,
    defaultValue: 0.82,
    description: 'Mechanical load, damping and perceived crowding across the whole installation.',
  },
  {
    id: 'focusDrift',
    label: 'FOCUS DRIFT',
    min: 0,
    max: 1,
    defaultValue: 0.4,
    description: 'How far the auto-camera drifts from its selected focus target while orbiting.',
  },
];

export const GRAPH_MACRO_IDS = GRAPH_MACRO_DEFINITIONS.map((d) => d.id);

export const DEFAULT_MODULE_COUNT = 72;
export const MAX_MODULE_COUNT = 256;

export const portJointId = (moduleId: string, portId: string): string =>
  `${moduleId}:port:${portId}`;

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const fract = (value: number): number => value - Math.floor(value);
const rand = (seed: number): number => fract(Math.sin(seed * 12.9898 + 78.233) * 43758.5453);

interface ClusterDefinition {
  id: string;
  label: string;
  description: string;
  radius: number;
  tier: number;
}

const CLUSTERS: ClusterDefinition[] = [
  {
    id: 'V5_REFERENCE',
    label: 'V5 REFERENCE CORE',
    description: 'The preserved CHRONO // AUTOMATON movement as a load-bearing reference assembly.',
    radius: 0.92,
    tier: -0.18,
  },
  {
    id: 'MAINSPRING',
    label: 'MAINSPRING GALLERY',
    description: 'Continuous torque reservoirs and antique clockwork power trains.',
    radius: 1.48,
    tier: -0.88,
  },
  {
    id: 'ESCAPEMENT',
    label: 'ESCAPEMENT LAWN',
    description: 'Interlocking gear trees, pallet forks and phase-locked regulators.',
    radius: 2.03,
    tier: -0.58,
  },
  {
    id: 'MARBLEWORKS',
    label: 'MARBLEWORKS RING',
    description: 'Wintergatan-inspired gates, lifts, inclined rails and marble sequencers.',
    radius: 2.58,
    tier: -0.28,
  },
  {
    id: 'PNEUMATIC',
    label: 'PNEUMATIC DUCTS',
    description: 'Bellows, reservoirs, pressure regulators and ducted organ wind.',
    radius: 3.13,
    tier: 0.02,
  },
  {
    id: 'PIPE_ORGAN',
    label: 'CENTRAL EUROPEAN ORGAN',
    description: 'Ranked resonator pipes, iris valves and tuned reed chambers.',
    radius: 3.68,
    tier: 0.32,
  },
  {
    id: 'COMB_CHOIR',
    label: 'TUNED COMB CHOIR',
    description: 'Music-box combs, pluckers and sympathetic harmonic galleries.',
    radius: 4.23,
    tier: 0.62,
  },
  {
    id: 'OPTICAL_ORRERY',
    label: 'CELESTIAL ORRERY',
    description: 'Merlin-style planetary arms, lenses and counter-rotating astronomical rings.',
    radius: 4.78,
    tier: 0.92,
  },
  {
    id: 'FLUX_DUCTS',
    label: 'MAGNETIC FLUX DUCTS',
    description: 'Plasma torque axles, induction coils and turbulent cross-cluster conduits.',
    radius: 5.33,
    tier: 1.22,
  },
  {
    id: 'PERIPHERY',
    label: 'PERIPHERAL DATA MILL',
    description: 'Addressable outrigger modules, score relays and long-distance marble returns.',
    radius: 5.88,
    tier: 1.52,
  },
];

const ARCHETYPES = [
  'GEAR_TREE',
  'ESCAPEMENT',
  'MARBLE_GATE',
  'BELLOWS',
  'PIPE_ORGAN',
  'TUNED_COMB',
  'IRIS_VALVE',
  'FLUX_COIL',
  'ORRERY_ARM',
  'CHRONO_CORE',
] as const;

type Archetype = (typeof ARCHETYPES)[number];

const ARCHETYPE_TAGS: Record<Archetype, string[]> = {
  GEAR_TREE: ['gear', 'mechanical', 'percussion', 'torque', 'energy'],
  ESCAPEMENT: ['escapement', 'mechanical', 'clock', 'percussion', 'phase'],
  MARBLE_GATE: ['marble', 'flow', 'percussion', 'sequence', 'mechanical'],
  BELLOWS: ['pneumatic', 'breath', 'wind', 'energy', 'choir'],
  PIPE_ORGAN: ['pipe', 'resonant', 'choir', 'harmonic', 'pneumatic'],
  TUNED_COMB: ['comb', 'resonant', 'harmonic', 'melodic', 'pluck'],
  IRIS_VALVE: ['iris', 'optical', 'resonant', 'port', 'phase'],
  FLUX_COIL: ['flux', 'magnetic', 'energy', 'turbulent', 'data'],
  ORRERY_ARM: ['orrery', 'macro', 'optical', 'phase', 'celestial'],
  CHRONO_CORE: ['reference', 'v5', 'macro', 'clock', 'energy'],
};

const PORT_KIND_BY_ARCHETYPE: Record<Archetype, PortKind> = {
  GEAR_TREE: 'mechanical',
  ESCAPEMENT: 'mechanical',
  MARBLE_GATE: 'marble',
  BELLOWS: 'pneumatic',
  PIPE_ORGAN: 'audio',
  TUNED_COMB: 'audio',
  IRIS_VALVE: 'optical',
  FLUX_COIL: 'magnetic',
  ORRERY_ARM: 'data',
  CHRONO_CORE: 'mechanical',
};

const EDGE_KIND_BY_ARCHETYPE: Record<Archetype, EdgeKind> = {
  GEAR_TREE: 'MECHANICAL',
  ESCAPEMENT: 'MECHANICAL',
  MARBLE_GATE: 'MARBLE',
  BELLOWS: 'PNEUMATIC',
  PIPE_ORGAN: 'AUDIO',
  TUNED_COMB: 'AUDIO',
  IRIS_VALVE: 'OPTICAL',
  FLUX_COIL: 'MAGNETIC',
  ORRERY_ARM: 'DATA',
  CHRONO_CORE: 'MECHANICAL',
};

const TRANSFER_MODES: TransferMode[] = [
  'LINEAR',
  'GATE',
  'RESONANT',
  'TURBULENT',
  'RATCHET',
];

const clusterJointId = (id: string): string => `cluster:${id.toLowerCase()}`;
const moduleJointId = (id: string): string => `module:${id}`;

function createPorts(archetype: Archetype, index: number): MachinePortSpec[] {
  const primary = PORT_KIND_BY_ARCHETYPE[archetype];
  return [
    {
      id: 'in',
      kind: primary,
      direction: 'in',
      localPosition: [-0.34, 0, 0],
      capacity: 0.8 + rand(index + 11) * 0.4,
    },
    {
      id: 'out',
      kind: primary,
      direction: 'out',
      localPosition: [0.34, 0, 0],
      capacity: 0.8 + rand(index + 23) * 0.4,
    },
    {
      id: 'vent',
      kind: archetype === 'MARBLE_GATE' ? 'marble' : archetype === 'FLUX_COIL' ? 'magnetic' : 'pneumatic',
      direction: 'bidir',
      localPosition: [0, 0.31, 0],
      capacity: 0.55 + rand(index + 37) * 0.35,
    },
    {
      id: 'axis',
      kind: 'data',
      direction: 'bidir',
      localPosition: [0, -0.31, 0],
      capacity: 0.45 + rand(index + 53) * 0.3,
    },
  ];
}

function createModule(
  index: number,
  cluster: ClusterDefinition,
  clusterIndex: number,
  slot: number,
  slotCount: number,
  override?: Partial<MachineModuleSpec>,
): MachineModuleSpec {
  const archetype = (override?.archetype as Archetype | undefined) ??
    ARCHETYPES[(index + clusterIndex + 8) % (ARCHETYPES.length - 1)];
  const angle = (slot / Math.max(1, slotCount)) * TAU + clusterIndex * 0.41;
  const radius = cluster.radius + (rand(index * 3 + 7) - 0.5) * 0.28;
  const id = override?.id ?? `m${String(index).padStart(3, '0')}`;
  return {
    id,
    label: override?.label ?? `${archetype.replaceAll('_', ' ')} ${String(index).padStart(3, '0')}`,
    archetype,
    cluster: cluster.id,
    jointId: override?.jointId ?? moduleJointId(id),
    parentJointId: override?.parentJointId ?? clusterJointId(cluster.id),
    position: override?.position ?? [
      Math.cos(angle) * radius,
      Math.sin(angle * 3 + clusterIndex) * 0.2,
      Math.sin(angle) * radius,
    ],
    rotation: override?.rotation ?? [0, -angle + Math.PI * 0.5, 0],
    scale: override?.scale ?? 0.62 + rand(index * 7 + 3) * 0.34,
    tags: override?.tags ?? [
      'module',
      cluster.id.toLowerCase(),
      archetype.toLowerCase(),
      ...ARCHETYPE_TAGS[archetype],
    ],
    capacity: override?.capacity ?? 0.8 + rand(index * 9 + 5) * 0.7,
    threshold: override?.threshold ?? 0.12 + rand(index * 13 + 17) * 0.18,
    baseFrequency: override?.baseFrequency ?? 0.12 + rand(index * 17 + 19) * 0.42,
    ports: override?.ports ?? createPorts(archetype, index),
  };
}

function firstModuleInCluster(
  modules: MachineModuleSpec[],
  clusterId: string,
  fallbackIndex: number,
): string {
  return (
    modules.find((m) => m.cluster === clusterId)?.id ??
    modules[Math.min(fallbackIndex, modules.length - 1)].id
  );
}

function binding(
  id: string,
  source: string,
  targetLabel: string,
  target: ScoreBindingSpec['target'],
  mode: ScoreBindingMode,
  weight: number,
): ScoreBindingSpec {
  return {
    id,
    source,
    targetLabel,
    target,
    mode,
    weight,
    enabled: true,
  };
}

/** Deterministic, scalable installation blueprint. No score event owns a single part. */
export function createOrreryFactoryConfig(requestedCount = DEFAULT_MODULE_COUNT): MachineGraphConfig {
  const moduleCount = clamp(Math.round(requestedCount), 12, MAX_MODULE_COUNT);
  const clusters: MachineClusterSpec[] = CLUSTERS.map((c, i) => ({
    id: c.id,
    label: c.label,
    jointId: clusterJointId(c.id),
    scale: i === 0 ? 'MACRO' : 'CLUSTER',
    description: c.description,
  }));

  const modules: MachineModuleSpec[] = [];
  modules.push(
    createModule(0, CLUSTERS[0], 0, 0, 2, {
      id: 'v5-core',
      label: 'V5 CHRONO CORE // REFERENCE',
      archetype: 'CHRONO_CORE',
      position: [-0.42, 0, 0],
      rotation: [0, 0, 0],
      scale: 0.82,
      capacity: 1.35,
      threshold: 0.16,
      baseFrequency: 0.18,
    }),
    createModule(1, CLUSTERS[0], 0, 1, 2, {
      id: 'v5-satellite',
      label: 'V5 COMB / IRIS SATELLITE',
      archetype: 'CHRONO_CORE',
      position: [0.42, 0.12, 0],
      rotation: [0, 0.32, 0],
      scale: 0.7,
      capacity: 1.1,
      threshold: 0.14,
      baseFrequency: 0.23,
    }),
  );

  const outerClusterCount = CLUSTERS.length - 1;
  const slotsPerCluster = Math.ceil((moduleCount - 2) / outerClusterCount);
  for (let index = 2; index < moduleCount; index++) {
    const clusterIndex = 1 + ((index - 2) % outerClusterCount);
    const slot = Math.floor((index - 2) / outerClusterCount);
    modules.push(createModule(index, CLUSTERS[clusterIndex], clusterIndex, slot, slotsPerCluster));
  }

  const edges: MachineEdgeSpec[] = [];
  const jumps = [1, 7, 17];
  for (let i = 0; i < modules.length; i++) {
    const from = modules[i];
    const fromArchetype = from.archetype as Archetype;
    for (let j = 0; j < jumps.length; j++) {
      const to = modules[(i + jumps[j]) % modules.length];
      if (to.id === from.id) continue;
      const fromPort = j === 0 ? 'out' : j === 1 ? 'vent' : 'axis';
      const toPort = j === 0 ? 'in' : j === 1 ? 'vent' : 'axis';
      edges.push({
        id: `edge-${i}-${j}`,
        fromModule: from.id,
        fromPort,
        toModule: to.id,
        toPort,
        kind: EDGE_KIND_BY_ARCHETYPE[fromArchetype],
        transfer: TRANSFER_MODES[(i + j) % TRANSFER_MODES.length],
        weight: 0.34 + rand(i * 19 + j * 31) * 0.62,
        latency: rand(i * 29 + j * 41) * 0.075,
        curvature: 0.08 + rand(i * 37 + j * 47) * 0.34,
        enabled: true,
        label: `${EDGE_KIND_BY_ARCHETYPE[fromArchetype]} ${String(i).padStart(3, '0')}→${String((i + jumps[j]) % modules.length).padStart(3, '0')}`,
      });
    }
  }

  const sourceDefinitions: Array<[string, string, EnergyWaveform, number, number]> = [
    ['source-v5-barrel', 'V5_REFERENCE', 'CONTINUOUS', 0.76, 1.35],
    ['source-mainspring-a', 'MAINSPRING', 'CONTINUOUS', 0.92, 1.4],
    ['source-mainspring-b', 'MAINSPRING', 'BAR', 0.54, 1.1],
    ['source-escapement', 'ESCAPEMENT', 'BEAT', 0.88, 1.25],
    ['source-marble-lift', 'MARBLEWORKS', 'PULSE', 0.84, 1.2],
    ['source-wind-reservoir', 'PNEUMATIC', 'CONTINUOUS', 0.74, 1.5],
    ['source-organ-wind', 'PIPE_ORGAN', 'BAR', 0.63, 1.3],
    ['source-comb-resonance', 'COMB_CHOIR', 'CHAOTIC', 0.48, 1.05],
    ['source-photonic-arc', 'OPTICAL_ORRERY', 'PULSE', 0.71, 1.15],
    ['source-flux-inductor', 'FLUX_DUCTS', 'CHAOTIC', 0.58, 1.25],
    ['source-data-lattice', 'PERIPHERY', 'BEAT', 0.66, 1.1],
    ['source-gravity-well', 'PERIPHERY', 'CONTINUOUS', 0.44, 1.6],
  ];
  const sources: EnergySourceSpec[] = sourceDefinitions.map(([id, clusterId, waveform, rate, capacity], i) => ({
    id,
    moduleId: firstModuleInCluster(modules, clusterId, i),
    label: id.replace('source-', '').replaceAll('-', ' ').toUpperCase(),
    kind: waveform === 'CHAOTIC' ? 'TURBULENT GENERATOR' : waveform === 'BEAT' ? 'RHYTHMIC PRIME MOVER' : 'PRIME MOVER',
    waveform,
    rate,
    capacity,
    phase: rand(i * 59 + 61) * 4,
  }));

  const bindings: ScoreBindingSpec[] = [
    binding('bind-intensity-all', 'score.intensity', 'ALL ENERGY MODULES', { tags: ['energy'], limit: 64 }, 'EXCITE', 0.52),
    binding('bind-beat-percussion', 'beat', 'PERCUSSIVE CLUSTERS', { tags: ['percussion'], limit: 48 }, 'EXCITE', 0.76),
    binding('bind-bar-celestial', 'bar', 'ORRERY + FLUX', { clusters: ['OPTICAL_ORRERY', 'FLUX_DUCTS'] }, 'PHASE', 0.61),
    binding('bind-any-resonance', 'any', 'ALL RESONANT PARTS', { tags: ['resonant'], limit: 72 }, 'FOCUS', 0.22),
    binding('bind-sub-rupture', 'sub-rupture', 'MARBLE + BELLOWS + GEARS', { tags: ['marble', 'pneumatic', 'gear'] }, 'EXCITE', 1.02),
    binding('bind-spine-shear', 'spine-shear', 'FLUX + GEAR TREES', { tags: ['flux', 'gear'], limit: 54 }, 'ENERGY', 0.88),
    binding('bind-piston-snap', 'piston-snap', 'PNEUMATIC ORGANS', { tags: ['pneumatic', 'wind'] }, 'EXCITE', 0.94),
    binding('bind-break-shred', 'break-shred', 'MARBLE + DATA MILL', { tags: ['marble', 'data'], limit: 40 }, 'INHIBIT', 0.67),
    binding('bind-modal-clang', 'modal-clang', 'COMBS + IRIS VALVES', { archetypes: ['TUNED_COMB', 'IRIS_VALVE'] }, 'PHASE', 0.79),
    binding('bind-glass-armonica', 'glass-armonica', 'OPTICAL HARMONICS', { tags: ['optical', 'harmonic'] }, 'PHASE', 0.64),
    binding('bind-larynx-lead', 'larynx-lead', 'PIPE CHOIR', { tags: ['pipe', 'choir'] }, 'ENERGY', 0.83),
    binding('bind-bellows-choir', 'bellows-choir', 'WIND + RESONATOR PIPES', { archetypes: ['BELLOWS', 'PIPE_ORGAN'] }, 'EXCITE', 0.91),
    binding('bind-windup-inhale', 'windup-inhale', 'MAINSPRING + V5 CORE', { clusters: ['MAINSPRING', 'V5_REFERENCE'] }, 'ENERGY', 0.73),
    binding('bind-acid-squelch', 'acid-squelch', 'MAGNETIC TURBULENCE', { tags: ['magnetic', 'turbulent'] }, 'INHIBIT', 0.58),
    binding('bind-glitch-chirp', 'glitch-chirp', 'ADDRESSABLE PORTS', { tags: ['port', 'data'], limit: 36 }, 'FOCUS', 0.69),
    binding('bind-arc-discharge', 'arc-discharge', 'FLUX + ORRERY ARMS', { tags: ['flux', 'orrery'] }, 'ENERGY', 0.86),
    binding('bind-live-keyboard', 'origin:keyboard', 'LIVE MARBLE + COMBS', { tags: ['marble', 'comb'], limit: 32 }, 'FOCUS', 0.97),
    binding('bind-high-velocity', 'velocity:0.8', 'LARGE SCALE MODULES', { scaleMin: 0.78, limit: 56 }, 'ENERGY', 0.72),
    binding('bind-reference-v5', 'core-implode', 'V5 REFERENCE ASSEMBLIES', { archetypes: ['CHRONO_CORE'] }, 'EXCITE', 1.08),
  ];

  const conduitFocusA = edges[0]?.id ?? 'edge-0-0';
  const conduitFocusB = edges[Math.min(edges.length - 1, 31)]?.id ?? conduitFocusA;
  const focusTargets: FocusDescriptor[] = [
    {
      id: 'focus-macro',
      label: 'MACRO // WHOLE ASTRARIUM',
      scale: 'MACRO',
      jointId: 'macroFrame',
      priority: 0.96,
      tags: ['macro', 'orrery'],
    },
    {
      id: 'focus-reference',
      label: 'CLUSTER // V5 REFERENCE CORE',
      scale: 'CLUSTER',
      jointId: clusterJointId('V5_REFERENCE'),
      clusterId: 'V5_REFERENCE',
      priority: 0.9,
      tags: ['reference', 'core'],
    },
    {
      id: 'focus-marble-ring',
      label: 'CLUSTER // MARBLEWORKS RING',
      scale: 'CLUSTER',
      jointId: clusterJointId('MARBLEWORKS'),
      clusterId: 'MARBLEWORKS',
      priority: 0.82,
      tags: ['marble', 'flow'],
    },
    {
      id: 'focus-organ',
      label: 'CLUSTER // CENTRAL EUROPEAN ORGAN',
      scale: 'CLUSTER',
      jointId: clusterJointId('PIPE_ORGAN'),
      clusterId: 'PIPE_ORGAN',
      priority: 0.78,
      tags: ['pipe', 'choir'],
    },
    {
      id: 'focus-v5-core',
      label: 'MODULE // V5 CHRONO CORE',
      scale: 'MODULE',
      jointId: moduleJointId('v5-core'),
      moduleId: 'v5-core',
      priority: 0.88,
      tags: ['reference', 'module'],
    },
    {
      id: 'focus-v5-satellite',
      label: 'MODULE // COMB / IRIS SATELLITE',
      scale: 'MODULE',
      jointId: moduleJointId('v5-satellite'),
      moduleId: 'v5-satellite',
      priority: 0.75,
      tags: ['comb', 'iris'],
    },
    {
      id: 'focus-port-core',
      label: 'PORT // V5 OUTPUT BEARING',
      scale: 'PORT',
      jointId: portJointId('v5-core', 'out'),
      moduleId: 'v5-core',
      priority: 0.7,
      tags: ['port', 'mechanical'],
    },
    {
      id: 'focus-port-marble',
      label: 'PORT // MARBLE VENT',
      scale: 'PORT',
      jointId: portJointId('m002', 'vent'),
      moduleId: 'm002',
      priority: 0.68,
      tags: ['port', 'marble'],
    },
    {
      id: 'focus-conduit-main',
      label: 'CONDUIT // PRIMARY TORQUE DUCT',
      scale: 'CONDUIT',
      edgeId: conduitFocusA,
      priority: 0.8,
      tags: ['conduit', 'flow'],
    },
    {
      id: 'focus-conduit-cross',
      label: 'CONDUIT // CROSS-CLUSTER RETURN',
      scale: 'CONDUIT',
      edgeId: conduitFocusB,
      priority: 0.74,
      tags: ['conduit', 'return'],
    },
  ];

  return {
    version: 2,
    name: 'ASTRARIUM // MODULAR ENGINE',
    moduleCount: modules.length,
    clusters,
    modules,
    edges,
    sources,
    bindings,
    focusTargets,
  };
}
