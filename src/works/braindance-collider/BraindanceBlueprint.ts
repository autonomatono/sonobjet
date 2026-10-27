import {
  createNeonPinballBlueprint,
  MAX_NEON_PINBALL_MODULES,
  MIN_NEON_PINBALL_MODULES,
} from '../neon-pinball/NeonPinballBlueprint';
import type {
  ConduitSpec,
  ModalFlowBlueprint,
  TransmissionSpec,
} from '../modal-flow/ModalFlowBlueprint';

export const DEFAULT_BRAINDANCE_MODULES = 40;
export const MIN_BRAINDANCE_MODULES = Math.max(24, MIN_NEON_PINBALL_MODULES);
export const MAX_BRAINDANCE_MODULES = MAX_NEON_PINBALL_MODULES;

const COLORS = [
  0x32efff,
  0xff365f,
  0xd9ff32,
  0xff47d7,
  0x6f57ff,
  0xffa52f,
  0x57ffc0,
  0xf9fbff,
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * V10's pinball organs are thrown through a non-linear spatial transform rather
 * than replaced. This variation keeps the learned causal machinery but makes a
 * larger, less symmetrical collider with dramatically different object scales.
 */
export function createBraindanceBlueprint(moduleCount = DEFAULT_BRAINDANCE_MODULES): ModalFlowBlueprint {
  const count = clamp(Math.round(moduleCount), MIN_BRAINDANCE_MODULES, MAX_BRAINDANCE_MODULES);
  const blueprint = createNeonPinballBlueprint(count);
  blueprint.environmentTheme = 'plasma';
  blueprint.marbleCount = 96;
  blueprint.cameraEnvelopeRadius = 18.5;

  blueprint.modules.forEach((module, index) => {
    const { x, y, z } = module.position;
    const twist = y * 0.085 + index * 0.037;
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);
    module.position = {
      x: (x * cos - z * sin) * (index % 3 === 0 ? 1.3 : 1.05),
      y: y * (index % 5 === 0 ? 1.42 : 1.16) + Math.sin(index * 1.7) * 1.2,
      z: (x * sin + z * cos) * (index % 4 === 1 ? 1.35 : 1.08),
    };
    module.orientation = {
      x: (module.orientation?.x ?? 0) + Math.sin(index * 1.3) * 0.48,
      y: (module.orientation?.y ?? 0) + twist * 0.7,
      z: (module.orientation?.z ?? 0) + Math.cos(index * 0.9) * 0.52,
    };
    const scaleFactor = [0.46, 0.72, 1.08, 1.65, 2.35, 0.58, 1.28][index % 7];
    module.scale = clamp(module.scale * scaleFactor, 0.25, 3.9);
    module.color = COLORS[(index * 3 + Math.floor(index / 4)) % COLORS.length];
    module.tags.push('braindance', 'scale-contrast', 'plasma');
  });

  const crossPairs: Array<[string, string]> = [
    ['orbital-crystal-1', 'music-box-loom'],
    ['orbital-crystal-3', 'gate-bank'],
    ['orbital-crystal-5', 'pinball-playfield'],
    ['orbital-crystal-7', 'analog-logic-core'],
    ['orbital-crystal-9', 'vibraphone-tines'],
    ['orbital-crystal-11', 'chime-orchard'],
    ['crystal-bank-b', 'neon-reed-array'],
    ['acid-dial-bank', 'bell-ratchet-relay'],
  ];
  const ids = new Set(blueprint.modules.map((module) => module.id));
  const extraConduits: ConduitSpec[] = crossPairs
    .filter(([from, to]) => ids.has(from) && ids.has(to))
    .map(([from, to], index) => ({
      id: `conduit-chaos-cross-${index + 1}`,
      from,
      to,
      kind: index % 3 === 0 ? 'pneumatic' : 'resonant',
      curve: index % 2 === 0 ? 'weave' : 'helix',
      arc: 1.4 + (index % 4) * 0.45,
      radius: 0.5 + (index % 3) * 0.18,
      turns: 3 + (index % 4),
      speed: 1.2 + (index % 3) * 0.22,
      weight: 0.7,
    }));
  blueprint.conduits.push(...extraConduits);

  const extraTransmissions: TransmissionSpec[] = [
    {
      id: 'transmission-chaos-cross-ratchet',
      label: 'CRYSTAL ORBIT → BREAK RATCHET',
      from: ids.has('orbital-crystal-3') ? 'orbital-crystal-3' : 'crystal-bank-a',
      to: 'gate-bank',
      kind: 'ratchet',
      ratio: -2.7,
      pulses: 31,
      efficiency: 0.82,
      scale: 1.6,
      section: 2,
      color: COLORS[2],
    },
    {
      id: 'transmission-chaos-cross-solenoid',
      label: 'PINBALL FIELD → BREAK MATRIX',
      from: 'pinball-playfield',
      to: 'vibraphone-tines',
      kind: 'solenoid',
      ratio: 3.4,
      pulses: 48,
      efficiency: 0.86,
      scale: 1.45,
      section: 3,
      color: COLORS[1],
    },
    {
      id: 'transmission-chaos-cross-loom',
      label: 'ACID COMPUTER → RECURSIVE LOOM',
      from: 'acid-dial-bank',
      to: 'music-box-loom',
      kind: 'music-box',
      ratio: -1.75,
      pulses: 29,
      efficiency: 0.78,
      scale: 1.55,
      section: 4,
      color: COLORS[3],
    },
    {
      id: 'transmission-chaos-cross-bells',
      label: 'NEON BUS → FRACTAL BELLS',
      from: 'neon-reed-array',
      to: 'chime-orchard',
      kind: 'bell-crank',
      ratio: 1.9,
      pulses: 17,
      efficiency: 0.8,
      scale: 1.35,
      section: 5,
      color: COLORS[5],
    },
  ];
  blueprint.transmissions.push(...extraTransmissions);

  for (const module of blueprint.modules) module.outputs = [];
  for (const conduit of blueprint.conduits) {
    blueprint.modules.find((module) => module.id === conduit.from)?.outputs.push(conduit.id);
  }
  return blueprint;
}
