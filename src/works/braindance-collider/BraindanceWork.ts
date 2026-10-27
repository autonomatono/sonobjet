import type { PostFxState, SubsystemId, WorkDefinition } from '../../engine/core/types';
import { NeonPinballComposer } from '../neon-pinball/NeonPinballComposer';
import {
  MODAL_FLOW_WORK_MACROS,
  MODAL_FLOW_WORK_PATCHES,
  ModalFlowSceneInstance,
  type ModalFlowVariantConfig,
} from '../modal-flow/ModalFlowWork';
import {
  createBraindanceBlueprint,
  DEFAULT_BRAINDANCE_MODULES,
  MAX_BRAINDANCE_MODULES,
  MIN_BRAINDANCE_MODULES,
} from './BraindanceBlueprint';
import {
  BRAINDANCE_BARS,
  BRAINDANCE_BPM,
  BRAINDANCE_SECTIONS,
  evaluateBraindanceCues,
} from './BraindanceScore';

const CAMERA_LABELS = [
  '[0] AUTO // WHOLE COLLIDER',
  '1 // DRONE PILOT',
  '2 // PINBALL TOPOLOGY',
  '3 // RECURSIVE RATCHET',
  '4 // BREAK FOUNDRY',
  '5 // RECURSIVE LOOM',
  '6 // CRYSTAL ERROR BUS',
  '7 // FRACTAL BELLS',
  '8 // PLASMA WEATHER',
];

const CAMERA_FOCUS: Record<number, string> = {
  2: 'focus-switchyard-cluster',
  3: 'focus-ratchet-register',
  4: 'focus-percussion-matrix',
  5: 'focus-music-box-loom',
  6: 'focus-crystal-bus',
  7: 'focus-bell-choir',
  8: 'focus-neon-reeds',
};

const moduleForSubsystem = (subsystem: SubsystemId): string => {
  switch (subsystem) {
    case 'break-shred': return 'vibraphone-tines';
    case 'sub-rupture': return 'resonator-bowl';
    case 'acid-squelch': return 'acid-dial-bank';
    case 'glass-armonica': return 'crystal-bank-a';
    case 'modal-clang':
    case 'fin-cascade': return 'chime-orchard';
    case 'arc-discharge': return 'neon-reed-array';
    case 'glitch-chirp': return 'music-box-loom';
    case 'piston-snap': return 'pinball-playfield';
    default: return 'analog-logic-core';
  }
};

const looks: Array<Pick<
  PostFxState,
  'neonGlow' | 'lightRig' | 'palette' | 'shadowStrength' | 'exposure'
>> = [
  { neonGlow: 0.72, lightRig: 2, palette: 2, shadowStrength: 0.72, exposure: 1.08 },
  { neonGlow: 0.94, lightRig: 1, palette: 1, shadowStrength: 0.84, exposure: 1.12 },
  { neonGlow: 1.08, lightRig: 2, palette: 2, shadowStrength: 0.52, exposure: 1.08 },
  { neonGlow: 0.92, lightRig: 1, palette: 4, shadowStrength: 0.94, exposure: 1.02 },
  { neonGlow: 1.42, lightRig: 2, palette: 1, shadowStrength: 0.46, exposure: 1.18 },
  { neonGlow: 0.76, lightRig: 0, palette: 2, shadowStrength: 0.76, exposure: 1.04 },
];

export const BRAINDANCE_VARIANT: ModalFlowVariantConfig = {
  name: 'CHAOS VECTOR // BRAINDANCE COLLIDER',
  hudTitle: 'CHAOS VECTOR // COLLIDER DRONE',
  configName: 'CHAOS VECTOR CONFIG // RECURSIVE BREAK COLLIDER',
  physicsName: 'CHAOS VECTOR // POLYMETER + PLASMA MECHANISM REGISTRY',
  version: 11,
  defaultModuleCount: DEFAULT_BRAINDANCE_MODULES,
  minModuleCount: MIN_BRAINDANCE_MODULES,
  maxModuleCount: MAX_BRAINDANCE_MODULES,
  sections: BRAINDANCE_SECTIONS,
  createBlueprint: createBraindanceBlueprint,
  createComposer: () => new NeonPinballComposer('chaos'),
  evaluateEnergyCues: evaluateBraindanceCues,
  cameraFocusByMode: CAMERA_FOCUS,
  moduleForSubsystem,
  quantizeStep64: 2,
  locusScale: 19,
  sectionLook: (index) => {
    const look = looks[index] ?? looks[0];
    return {
      neon: look.neonGlow,
      lightRig: look.lightRig,
      palette: look.palette,
      shadow: look.shadowStrength,
      exposure: look.exposure,
    };
  },
};

const macros = MODAL_FLOW_WORK_MACROS.map((macro) => {
  if (macro.id === 'flowRate') return { ...macro, defaultValue: 1.7, label: 'COLLIDER BALL RATE' };
  if (macro.id === 'gateDuty') return { ...macro, defaultValue: 0.74, label: 'RECURSIVE GATE DUTY' };
  if (macro.id === 'liftTorque') return { ...macro, defaultValue: 1.8 };
  if (macro.id === 'eventQuantize') return { ...macro, defaultValue: 1, label: 'MICROGRID / FREE' };
  if (macro.id === 'phraseDensity') return { ...macro, defaultValue: 1.28, label: 'COLLISION FILL DENSITY' };
  if (macro.id === 'registerSpread') return { ...macro, defaultValue: 1.62 };
  if (macro.id === 'timbreBloom') return { ...macro, defaultValue: 0.62 };
  if (macro.id === 'cameraFollow') return { ...macro, defaultValue: 0.5 };
  return { ...macro };
});

export const BraindanceWork: WorkDefinition = {
  id: 'braindance-collider',
  title: 'CHAOS VECTOR // BRAINDANCE COLLIDER',
  subtitle: 'Original Algorithmic Jungle, Crooked Acid, Recursive Microcuts and Polychrome Plasma',
  author: 'SONOBJET ENGINE // V11 STUDY 02',
  bpm: BRAINDANCE_BPM,
  bars: BRAINDANCE_BARS,
  sections: BRAINDANCE_SECTIONS,
  macros,
  defaultPatches: MODAL_FLOW_WORK_PATCHES.map((patch) => ({ ...patch, amount: patch.amount * 1.15 })),
  cameraModeLabels: CAMERA_LABELS,
  createInstance: () => new ModalFlowSceneInstance(BRAINDANCE_VARIANT),
};
