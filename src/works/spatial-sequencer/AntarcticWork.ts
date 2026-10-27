import type { PostFxState, SubsystemId, WorkDefinition } from '../../engine/core/types';
import { NeonPinballComposer } from '../neon-pinball/NeonPinballComposer';
import {
  MODAL_FLOW_WORK_MACROS,
  MODAL_FLOW_WORK_PATCHES,
  ModalFlowSceneInstance,
  type ModalFlowVariantConfig,
} from '../modal-flow/ModalFlowWork';
import {
  createSpatialSequencerBlueprint,
  DEFAULT_ANTARCTIC_MODULES,
  MAX_SPATIAL_SEQUENCER_MODULES,
  MIN_SPATIAL_SEQUENCER_MODULES,
} from './SpatialSequencerBlueprint';
import {
  ANTARCTIC_BARS,
  ANTARCTIC_BPM,
  ANTARCTIC_SECTIONS,
  evaluateAntarcticCues,
} from './AntarcticScore';

const CAMERA_LABELS = [
  '[0] AUTO // WHITE HORIZON',
  '1 // DRONE PILOT',
  '2 // AURORA ROUTER',
  '3 // FROST GATE',
  '4 // BLUE-ICE MEMORY',
  '5 // UNDERWATER COMPUTER',
  '6 // AURORA REEDS',
  '7 // DEEP RETURN CURRENT',
  '8 // SUBGLACIAL RESERVOIR',
];

const CAMERA_FOCUS: Record<number, string> = {
  2: 'focus-router',
  3: 'focus-gate',
  4: 'focus-melody',
  5: 'focus-harmony',
  6: 'focus-light',
  7: 'focus-return',
  8: 'focus-source',
};

const moduleForSubsystem = (subsystem: SubsystemId): string => {
  switch (subsystem) {
    case 'sub-rupture': return 'resonator-bowl';
    case 'glass-armonica': return 'crystal-bank-a';
    case 'bellows-choir': return 'analog-logic-core';
    case 'modal-clang': return 'bell-ratchet-relay';
    case 'arc-discharge': return 'neon-reed-array';
    case 'glitch-chirp': return 'music-box-loom';
    default: return 'crystal-bank-b';
  }
};

const looks: Array<Pick<
  PostFxState,
  'neonGlow' | 'lightRig' | 'palette' | 'shadowStrength' | 'exposure'
>> = [
  { neonGlow: 0.36, lightRig: 0, palette: 0, shadowStrength: 0.42, exposure: 1.06 },
  { neonGlow: 0.48, lightRig: 2, palette: 0, shadowStrength: 0.36, exposure: 1.02 },
  { neonGlow: 0.62, lightRig: 2, palette: 2, shadowStrength: 0.32, exposure: 1.04 },
  { neonGlow: 0.94, lightRig: 2, palette: 2, shadowStrength: 0.28, exposure: 1.08 },
  { neonGlow: 0.58, lightRig: 1, palette: 4, shadowStrength: 0.5, exposure: 0.96 },
  { neonGlow: 0.28, lightRig: 0, palette: 0, shadowStrength: 0.4, exposure: 1.02 },
];

export const ANTARCTIC_VARIANT: ModalFlowVariantConfig = {
  name: 'ANTARCTICA // SUBGLACIAL LIGHT',
  hudTitle: 'ANTARCTICA // QUIET DRONE',
  configName: 'ANTARCTICA CONFIG // ICE + WATER + AURORA',
  physicsName: 'ANTARCTICA // TIDE + ICE MEMORY + AURORA REGISTRY',
  version: 11,
  defaultModuleCount: DEFAULT_ANTARCTIC_MODULES,
  minModuleCount: MIN_SPATIAL_SEQUENCER_MODULES,
  maxModuleCount: MAX_SPATIAL_SEQUENCER_MODULES,
  sections: ANTARCTIC_SECTIONS,
  createBlueprint: (count) => createSpatialSequencerBlueprint('antarctic', count),
  createComposer: () => new NeonPinballComposer('ambient'),
  evaluateEnergyCues: evaluateAntarcticCues,
  cameraFocusByMode: CAMERA_FOCUS,
  moduleForSubsystem,
  quantizeStep64: 8,
  locusScale: 16,
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
  if (macro.id === 'flowRate') return { ...macro, defaultValue: 0.22, label: 'TIDAL FLOW RATE' };
  if (macro.id === 'gravity') return { ...macro, defaultValue: 5.2, label: 'SUBGLACIAL GRAVITY' };
  if (macro.id === 'gateDuty') return { ...macro, defaultValue: 0.28, label: 'FROST GATE DUTY' };
  if (macro.id === 'eventQuantize') return { ...macro, defaultValue: 1, label: 'SLOW NOTE GRID / FREE' };
  if (macro.id === 'phraseDensity') return { ...macro, defaultValue: 0.2, label: 'FREE ICE EVENT DENSITY' };
  if (macro.id === 'registerSpread') return { ...macro, defaultValue: 1.45 };
  if (macro.id === 'timbreBloom') return { ...macro, defaultValue: 0.94, label: 'ICE DECAY / BLOOM' };
  if (macro.id === 'droneSpeed') return { ...macro, defaultValue: 0.42 };
  if (macro.id === 'cameraFollow') return { ...macro, defaultValue: 0.08 };
  return { ...macro };
});

export const AntarcticWork: WorkDefinition = {
  id: 'antarctica',
  title: 'ANTARCTICA // SUBGLACIAL LIGHT',
  subtitle: 'Ice Stillness, Snow Crystals, Underwater Pressure and Slow Aurora Physics',
  author: 'SONOBJET ENGINE // V11 STUDY 03',
  bpm: ANTARCTIC_BPM,
  bars: ANTARCTIC_BARS,
  sections: ANTARCTIC_SECTIONS,
  macros,
  defaultPatches: MODAL_FLOW_WORK_PATCHES.map((patch) => ({ ...patch, amount: patch.amount * 0.45 })),
  cameraModeLabels: CAMERA_LABELS,
  createInstance: () => new ModalFlowSceneInstance(ANTARCTIC_VARIANT),
};
