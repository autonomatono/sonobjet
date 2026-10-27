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
  DEFAULT_LUMEN_MODULES,
  MAX_SPATIAL_SEQUENCER_MODULES,
  MIN_SPATIAL_SEQUENCER_MODULES,
} from './SpatialSequencerBlueprint';
import {
  evaluateSpatialTranceCues,
  SPATIAL_TRANCE_BARS,
  SPATIAL_TRANCE_BPM,
  SPATIAL_TRANCE_SECTIONS,
} from './SpatialTranceScore';

const CAMERA_LABELS = [
  '[0] AUTO // WHOLE NOTE GRAPH',
  '1 // DRONE PILOT',
  '2 // 3D NOTE ROUTER',
  '3 // QUANTIZED GATE',
  '4 // MELODY EDGE A → B',
  '5 // HARMONY PROCESSOR',
  '6 // LIGHT PHASE',
  '7 // LOOP RETURN EDGE',
  '8 // CLOCK SOURCE',
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
    case 'acid-squelch': return 'music-box-loom';
    case 'modal-clang': return 'bell-ratchet-relay';
    case 'arc-discharge': return 'neon-reed-array';
    case 'fin-cascade': return 'vibraphone-tines';
    default: return 'tri-diverter';
  }
};

const looks: Array<Pick<
  PostFxState,
  'neonGlow' | 'lightRig' | 'palette' | 'shadowStrength' | 'exposure'
>> = [
  { neonGlow: 0.42, lightRig: 0, palette: 0, shadowStrength: 0.7, exposure: 1.08 },
  { neonGlow: 0.58, lightRig: 2, palette: 2, shadowStrength: 0.58, exposure: 1.12 },
  { neonGlow: 0.7, lightRig: 2, palette: 0, shadowStrength: 0.52, exposure: 1.14 },
  { neonGlow: 0.82, lightRig: 2, palette: 2, shadowStrength: 0.48, exposure: 1.12 },
  { neonGlow: 1.04, lightRig: 2, palette: 1, shadowStrength: 0.42, exposure: 1.16 },
  { neonGlow: 0.46, lightRig: 0, palette: 0, shadowStrength: 0.76, exposure: 1.06 },
];

export const SPATIAL_TRANCE_VARIANT: ModalFlowVariantConfig = {
  name: 'LUMEN GRID // 3D GEOMETRIC SEQUENCER',
  hudTitle: 'LUMEN GRID // GRAPH READER DRONE',
  configName: 'LUMEN GRID CONFIG // SPATIAL TRANCE',
  physicsName: 'LUMEN GRID // CLOCK + ROUTER + NOTE-VERTEX REGISTRY',
  version: 11,
  defaultModuleCount: DEFAULT_LUMEN_MODULES,
  minModuleCount: MIN_SPATIAL_SEQUENCER_MODULES,
  maxModuleCount: MAX_SPATIAL_SEQUENCER_MODULES,
  sections: SPATIAL_TRANCE_SECTIONS,
  createBlueprint: (count) => createSpatialSequencerBlueprint('lumen', count),
  createComposer: () => new NeonPinballComposer('trance'),
  evaluateEnergyCues: evaluateSpatialTranceCues,
  cameraFocusByMode: CAMERA_FOCUS,
  moduleForSubsystem,
  quantizeStep64: 4,
  locusScale: 14,
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
  if (macro.id === 'flowRate') return { ...macro, defaultValue: 0.54, label: 'GRAPH PULSE RATE' };
  if (macro.id === 'eventQuantize') return { ...macro, defaultValue: 1, label: 'NOTE GRID / FREE' };
  if (macro.id === 'phraseDensity') return { ...macro, defaultValue: 0.48, label: 'UNSCRIPTED NOTE DENSITY' };
  if (macro.id === 'timbreBloom') return { ...macro, defaultValue: 0.68 };
  if (macro.id === 'cameraFollow') return { ...macro, defaultValue: 0.18 };
  return { ...macro };
});

export const SpatialTranceWork: WorkDefinition = {
  id: 'spatial-trance',
  title: 'LUMEN GRID // 3D GEOMETRIC SEQUENCER',
  subtitle: 'Legible Clock → Route → Note Graph // Ambient Trance Teaching Instrument',
  author: 'SONOBJET ENGINE // V11 STUDY 01',
  bpm: SPATIAL_TRANCE_BPM,
  bars: SPATIAL_TRANCE_BARS,
  sections: SPATIAL_TRANCE_SECTIONS,
  macros,
  defaultPatches: MODAL_FLOW_WORK_PATCHES.map((patch) => ({ ...patch })),
  cameraModeLabels: CAMERA_LABELS,
  createInstance: () => new ModalFlowSceneInstance(SPATIAL_TRANCE_VARIANT),
};
