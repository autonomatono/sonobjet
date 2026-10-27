import type { PostFxState, SubsystemId, WorkDefinition } from '../../engine/core/types';
import {
  MODAL_FLOW_WORK_MACROS,
  MODAL_FLOW_WORK_PATCHES,
  ModalFlowSceneInstance,
  type ModalFlowVariantConfig,
} from '../modal-flow/ModalFlowWork';
import {
  createNeonPinballBlueprint,
  DEFAULT_NEON_PINBALL_MODULES,
  MAX_NEON_PINBALL_MODULES,
  MIN_NEON_PINBALL_MODULES,
} from './NeonPinballBlueprint';
import { NeonPinballComposer } from './NeonPinballComposer';
import {
  evaluateNeonPinballCues,
  NEON_PINBALL_BPM,
  NEON_PINBALL_SECTIONS,
  NEON_PINBALL_TOTAL_BARS,
} from './NeonPinballScore';

const CAMERA_LABELS = [
  '[0] AUTO // OPEN MACHINE ORBIT',
  '1 // DRONE PILOT',
  '2 // PINBALL SWITCHYARD',
  '3 // RATCHET REGISTER',
  '4 // BREAK PERCUSSION MATRIX',
  '5 // MUSIC-BOX DATA LOOM',
  '6 // CRYSTAL MEMORY BUS',
  '7 // CURVED BELL CHOIR',
  '8 // SOUND-ACTIVE NEON',
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
    case 'sub-rupture':
      return 'resonator-bowl';
    case 'break-shred':
      return 'vibraphone-tines';
    case 'piston-snap':
    case 'spine-shear':
      return 'pinball-playfield';
    case 'modal-clang':
    case 'fin-cascade':
      return 'chime-orchard';
    case 'glass-armonica':
      return 'crystal-bank-a';
    case 'acid-squelch':
      return 'acid-dial-bank';
    case 'arc-discharge':
      return 'neon-reed-array';
    case 'glitch-chirp':
      return 'music-box-loom';
    case 'core-implode':
      return 'drum-ring';
    default:
      return 'analog-logic-core';
  }
};

const sectionLooks: Array<Pick<
  PostFxState,
  'neonGlow' | 'lightRig' | 'palette' | 'shadowStrength' | 'exposure'
>> = [
  { neonGlow: 0.44, lightRig: 1, palette: 4, shadowStrength: 0.82, exposure: 1.08 },
  { neonGlow: 0.72, lightRig: 2, palette: 1, shadowStrength: 0.6, exposure: 1.16 },
  { neonGlow: 1.02, lightRig: 2, palette: 2, shadowStrength: 0.52, exposure: 1.12 },
  { neonGlow: 0.82, lightRig: 1, palette: 2, shadowStrength: 0.9, exposure: 1.06 },
  { neonGlow: 1.28, lightRig: 2, palette: 1, shadowStrength: 0.58, exposure: 1.2 },
  { neonGlow: 0.56, lightRig: 1, palette: 4, shadowStrength: 0.88, exposure: 1.02 },
];

export const NEON_PINBALL_VARIANT: ModalFlowVariantConfig = {
  name: 'NEON PINBALL // BREAKCORE COMPUTER',
  hudTitle: 'NEON PINBALL // OPEN-SPACE DRONE',
  configName: 'NEON PINBALL CONFIG // BREAKCORE COMPUTER',
  physicsName: 'NEON PINBALL // BALLS + RATCHETS + LOOM + CRYSTAL REGISTRY',
  version: 10,
  defaultModuleCount: DEFAULT_NEON_PINBALL_MODULES,
  minModuleCount: MIN_NEON_PINBALL_MODULES,
  maxModuleCount: MAX_NEON_PINBALL_MODULES,
  sections: NEON_PINBALL_SECTIONS,
  createBlueprint: createNeonPinballBlueprint,
  createComposer: () => new NeonPinballComposer(),
  evaluateEnergyCues: evaluateNeonPinballCues,
  cameraFocusByMode: CAMERA_FOCUS,
  quantizeStep64: 4,
  moduleForSubsystem,
  locusScale: 14,
  sectionLook: (index) => {
    const look = sectionLooks[index] ?? sectionLooks[0];
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
  if (macro.id === 'flowRate') return { ...macro, defaultValue: 1.18 };
  if (macro.id === 'gateDuty') return { ...macro, defaultValue: 0.62 };
  if (macro.id === 'phraseDensity') return { ...macro, defaultValue: 1.04, label: 'PHYSICS FILL DENSITY' };
  if (macro.id === 'registerSpread') return { ...macro, defaultValue: 1.22 };
  if (macro.id === 'timbreBloom') return { ...macro, defaultValue: 0.78 };
  if (macro.id === 'cameraFollow') return { ...macro, defaultValue: 0.28 };
  return { ...macro };
});

export const NeonPinballWork: WorkDefinition = {
  id: 'neon-pinball',
  title: 'NEON PINBALL // BREAKCORE COMPUTER',
  subtitle:
    'Open-Space Retrofuturistic Pinball Automaton // Ratchets, Bells, Crystals, Break Solenoids and a Music-Box Data Loom',
  author: 'SONOBJET ENGINE // V10',
  bpm: NEON_PINBALL_BPM,
  bars: NEON_PINBALL_TOTAL_BARS,
  sections: NEON_PINBALL_SECTIONS,
  macros,
  defaultPatches: MODAL_FLOW_WORK_PATCHES.map((patch) => ({ ...patch })),
  cameraModeLabels: CAMERA_LABELS,
  createInstance: () => new ModalFlowSceneInstance(NEON_PINBALL_VARIANT),
};
