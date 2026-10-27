import type { SectionDefinition, SubsystemId } from '../../engine/core/types';
import type { ModalFlowEnergyCue } from '../modal-flow/ModalFlowScore';

export const ANTARCTIC_BPM = 54;
export const ANTARCTIC_BARS = 48;

export const ANTARCTIC_SECTIONS: SectionDefinition[] = [
  { id: 'white-horizon', name: 'I. WHITE HORIZON', startBar: 0, endBar: 8, intensity: 0.16, description: 'Windless snow light and one distant crystal harmonic establish scale and silence.' },
  { id: 'under-ice', name: 'II. UNDER THE SHELF', startBar: 8, endBar: 16, intensity: 0.26, description: 'Slow subglacial pressure and muted underwater chords move beneath translucent ice.' },
  { id: 'brine', name: 'III. BRINE CHANNELS', startBar: 16, endBar: 24, intensity: 0.34, description: 'Liquid cyan signals drift through tubes as ice memories answer several seconds apart.' },
  { id: 'aurora', name: 'IV. AURORA WITHOUT WIND', startBar: 24, endBar: 32, intensity: 0.42, description: 'Moving pastel lights blend over snow particles, crystal arcs and a quiet harmonic field.' },
  { id: 'deep-water', name: 'V. BLUE PRESSURE', startBar: 32, endBar: 40, intensity: 0.38, description: 'Abyssal bass and whale-like chord spacing reveal the dark water below the machine.' },
  { id: 'stillness', name: 'VI. RETURN TO STILLNESS', startBar: 40, endBar: 48, intensity: 0.12, description: 'The return current slows; aurora, snow and glass overtones disappear into a white horizon.' },
];

const SCALE = [0, 2, 4, 7, 9] as const; // open D pentatonic
const midi = (degree: number, octave = 0): number => {
  const wrapped = ((degree % SCALE.length) + SCALE.length) % SCALE.length;
  return 38 + SCALE[wrapped] + (Math.floor(degree / SCALE.length) + octave) * 12;
};

export function evaluateAntarcticCues(
  step64: number,
  bar: number,
  sectionIndex: number,
): ModalFlowEnergyCue[] {
  const cues: ModalFlowEnergyCue[] = [];
  const section = ANTARCTIC_SECTIONS[sectionIndex] ?? ANTARCTIC_SECTIONS[0];
  const localBar = bar - section.startBar;
  const push = (
    lane: string,
    moduleId: string,
    subsystem: SubsystemId,
    energy: number,
    data: Partial<ModalFlowEnergyCue> = {},
  ): void => {
    cues.push({
      id: `antarctica-${bar}-${step64}-${lane}-${cues.length}`,
      moduleId,
      subsystem,
      energy,
      label: section.name,
      ...data,
    });
  };

  // Bass pressure is intentionally rare: two soft events per bar at the busiest.
  if (step64 === 0 && (sectionIndex > 0 || bar % 2 === 0)) {
    const roots = [0, -2, -1, -3];
    push('pressure', 'resonator-bowl', 'sub-rupture', 0.28 + section.intensity * 0.32, {
      noteIndex: roots[bar % roots.length],
      midiNote: midi(roots[bar % roots.length], -1),
    });
  }

  const crystalSteps = sectionIndex === 0 || sectionIndex === 5 ? [16] : [8, 40];
  if (crystalSteps.includes(step64) && (bar + step64 / 8) % 2 === 0) {
    const contour = [0, 2, 4, 7, 5, 3, 9, 7, 4, 2, -1, 1];
    const index = (bar * 2 + Math.floor(step64 / 32)) % contour.length;
    const degree = contour[index];
    push('ice-memory', index % 2 ? 'crystal-bank-a' : 'crystal-bank-b', 'glass-armonica', 0.28 + section.intensity * 0.32, {
      noteIndex: degree,
      midiNote: midi(degree, 2),
    });
  }

  if (step64 === 0 && bar % 4 === 0 && sectionIndex >= 1 && sectionIndex <= 4) {
    const root = [0, -1, 2, -2][Math.floor(bar / 4) % 4];
    push('underwater-chord', 'analog-logic-core', 'bellows-choir', 0.32 + section.intensity * 0.24, {
      noteIndex: root,
      chordNotes: [midi(root, 0), midi(root + 2, 0), midi(root + 4, 1), midi(root + 7, 1)],
    });
  }

  if (sectionIndex === 3 && [0, 16, 32, 48].includes(step64)) {
    push('aurora', 'neon-reed-array', 'arc-discharge', 0.2 + (step64 / 64) * 0.16, {
      noteIndex: localBar + step64 / 16,
    });
  } else if (step64 === 32 && bar % 2 === 1) {
    push('aurora-breath', 'neon-reed-array', 'arc-discharge', 0.16 + section.intensity * 0.2, {
      noteIndex: bar,
    });
  }

  if (step64 === 56 && bar % 4 === 3 && sectionIndex > 0 && sectionIndex < 5) {
    const degree = [4, 7, 9, 5][Math.floor(bar / 4) % 4];
    push('distant-bell', 'bell-ratchet-relay', 'modal-clang', 0.3 + section.intensity * 0.26, {
      noteIndex: degree,
      midiNote: midi(degree, 2),
    });
  }

  // A single slow loom tick marks long-form movement without turning into a beat.
  if (step64 === 24 && bar % 3 === 2 && sectionIndex >= 2 && sectionIndex <= 4) {
    push('tide-code', 'music-box-loom', 'glitch-chirp', 0.16, {
      noteIndex: bar % 5,
      midiNote: midi(bar % 5, 1),
    });
  }
  return cues;
}
