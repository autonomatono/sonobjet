import type { SectionDefinition, SubsystemId } from '../../engine/core/types';
import type { ModalFlowEnergyCue } from '../modal-flow/ModalFlowScore';

export const SPATIAL_TRANCE_BPM = 126;
export const SPATIAL_TRANCE_BARS = 48;

export const SPATIAL_TRANCE_SECTIONS: SectionDefinition[] = [
  { id: 'clock', name: 'I. CLOCK POINT', startBar: 0, endBar: 8, intensity: 0.3, description: 'One source point enters the graph. Each pulse and illuminated edge can be followed by eye.' },
  { id: 'route', name: 'II. ROUTE TRIANGLE', startBar: 8, endBar: 16, intensity: 0.48, description: 'The router opens three note paths and establishes a transparent four-on-the-floor trance pulse.' },
  { id: 'melody', name: 'III. MELODY TETRAHEDRON', startBar: 16, endBar: 24, intensity: 0.62, description: 'Two crystal vertices exchange a simple C-minor sequence across a helical edge.' },
  { id: 'harmony', name: 'IV. HARMONY CUBE', startBar: 24, endBar: 32, intensity: 0.72, description: 'Chord, bass and melody vertices form a readable three-dimensional harmonic loop.' },
  { id: 'aurora', name: 'V. LIGHT PHASE', startBar: 32, endBar: 40, intensity: 0.82, description: 'Liquid-neon pulses, moving chromatic lights and constellation lines answer the notes.' },
  { id: 'return', name: 'VI. LOOP RESOLUTION', startBar: 40, endBar: 48, intensity: 0.42, description: 'Paths close through the collector and return edge, leaving the clock point alone.' },
];

const SCALE = [0, 2, 3, 5, 7, 8, 10] as const;
const ROOT = 48; // C3
const midi = (degree: number, octave = 0): number => {
  const wrapped = ((degree % SCALE.length) + SCALE.length) % SCALE.length;
  return ROOT + SCALE[wrapped] + (Math.floor(degree / SCALE.length) + octave) * 12;
};

export function evaluateSpatialTranceCues(
  step64: number,
  bar: number,
  sectionIndex: number,
): ModalFlowEnergyCue[] {
  const cues: ModalFlowEnergyCue[] = [];
  const section = SPATIAL_TRANCE_SECTIONS[sectionIndex] ?? SPATIAL_TRANCE_SECTIONS[0];
  const localBar = bar - section.startBar;
  const push = (
    lane: string,
    moduleId: string,
    subsystem: SubsystemId,
    energy: number,
    data: Partial<ModalFlowEnergyCue> = {},
  ): void => {
    cues.push({
      id: `lumen-${bar}-${step64}-${lane}-${cues.length}`,
      moduleId,
      subsystem,
      energy,
      label: section.name,
      ...data,
    });
  };

  // A legible quarter-note clock. Every kick corresponds to the large bass vertex.
  if (step64 % 16 === 0 && !(sectionIndex === 5 && localBar > 5 && step64 > 16)) {
    push('clock', 'resonator-bowl', 'sub-rupture', 0.62 + section.intensity * 0.24, {
      midiNote: midi(sectionIndex >= 3 ? [0, -2, -4, -2][bar % 4] : 0, -1),
      noteIndex: bar % 4,
    });
  }

  // A quiet offbeat pulse makes the path easy to hear and see.
  if (sectionIndex >= 1 && sectionIndex <= 4 && step64 % 16 === 8) {
    push('offbeat', 'vibraphone-tines', 'fin-cascade', 0.38 + section.intensity * 0.2, {
      noteIndex: (bar + step64 / 8) % 8,
      sliceIndex: 9,
    });
  }

  const melodyGrid = sectionIndex < 2 ? 16 : sectionIndex === 4 ? 4 : 8;
  if (sectionIndex >= 2 && step64 % melodyGrid === (bar % 2 ? melodyGrid / 2 : 0)) {
    const contour = [0, 2, 4, 5, 7, 5, 3, 2, 0, -1, 2, 4, 6, 4, 2, 1];
    const index = (localBar * 8 + Math.floor(step64 / Math.max(1, melodyGrid))) % contour.length;
    const degree = contour[index];
    push('melody', index % 2 === 0 ? 'crystal-bank-a' : 'crystal-bank-b', 'glass-armonica', 0.46 + section.intensity * 0.2, {
      noteIndex: degree,
      midiNote: midi(degree, 1),
    });
  }

  // One chord per bar: deliberately slower than the geometry so causality reads clearly.
  if (sectionIndex >= 3 && step64 === 0) {
    const roots = [0, 5, 3, 6];
    const root = roots[bar % roots.length];
    push('chord', 'analog-logic-core', 'bellows-choir', 0.5 + section.intensity * 0.18, {
      noteIndex: root,
      chordNotes: [midi(root), midi(root + 2), midi(root + 4), midi(root + 7)],
    });
  }

  if (sectionIndex >= 1 && sectionIndex <= 4 && [4, 20, 36, 52].includes(step64)) {
    const degree = [0, -2, 3, 5, 2, -1][(bar + Math.floor(step64 / 16)) % 6];
    push('sequence', 'music-box-loom', 'acid-squelch', 0.38 + section.intensity * 0.18, {
      noteIndex: degree,
      midiNote: midi(degree, -1),
    });
  }

  if ((sectionIndex >= 1 && step64 % 8 === 0) || (sectionIndex === 0 && step64 === 0)) {
    push('light', 'neon-reed-array', 'arc-discharge', 0.22 + section.intensity * 0.3, {
      noteIndex: (bar + step64 / 8) % 12,
    });
  }

  if (step64 === 56 && bar % 4 === 3 && sectionIndex > 0 && sectionIndex < 5) {
    push('cadence', 'bell-ratchet-relay', 'modal-clang', 0.58, {
      noteIndex: 7,
      midiNote: midi(7, 2),
    });
  }
  return cues;
}
