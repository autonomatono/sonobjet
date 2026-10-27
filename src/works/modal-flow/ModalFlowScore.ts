import type { ImpulseEvent, SectionDefinition } from '../../engine/core/types';

/**
 * V8 is not the preserved 96-bar F-Phrygian film score. It is a short, bright
 * D-Lydian marble composition whose notes are emitted by physical events. The
 * transport below only supplies section shape and sparse governor energy cues;
 * the melody itself is assembled in ModalFlowComposer from impacts, gate
 * releases, collisions and lift events.
 */
export const MODAL_FLOW_TOTAL_BARS = 48;
export const MODAL_FLOW_BPM = 132;

export const MODAL_FLOW_SECTIONS: SectionDefinition[] = [
  {
    id: 'wind-empty-pipes',
    name: 'I. WIND THROUGH EMPTY PIPES',
    startBar: 0,
    endBar: 8,
    intensity: 0.22,
    description:
      'A few marbles wake the crank, flywheel and governor. Low strikes, long rests, and wide drone shots establish the room.',
  },
  {
    id: 'first-marble',
    name: 'II. THE FIRST MARBLE',
    startBar: 8,
    endBar: 16,
    intensity: 0.44,
    description:
      'The helix lift catches. Single-file marbles climb into the aqueduct; the first D-Lydian phrase appears one impact at a time.',
  },
  {
    id: 'aqueduct-canon',
    name: 'III. AQUEDUCT CANON',
    startBar: 16,
    endBar: 24,
    intensity: 0.66,
    description:
      'Three-way diverters split the flow. Gate, chime and resonator modules answer each other in a sparse physical canon.',
  },
  {
    id: 'gate-bank-minuet',
    name: 'IV. GATE BANK MINUET',
    startBar: 24,
    endBar: 32,
    intensity: 0.8,
    description:
      'The old twelve-lane gate bank is now one 3D module. Its escapement, tine bank and tuned bowls trade a stricter phrase.',
  },
  {
    id: 'resonator-chorus',
    name: 'V. RESONATOR CHORUS',
    startBar: 32,
    endBar: 40,
    intensity: 1.0,
    description:
      'Satellite resonators join the flow. Collisions and routing events bloom into the brightest register, still rationed by phrase rests.',
  },
  {
    id: 'return-source',
    name: 'VI. RETURN TO THE SOURCE',
    startBar: 40,
    endBar: 48,
    intensity: 0.34,
    description:
      'The collector and return conduit dominate. Marbles fall back into the reservoir; the theme dissolves into low metallic pulses.',
  },
];

/** D Lydian: D E F# G# A B C#. The #4 is the bright hinge of the new melody. */
export const MODAL_FLOW_ROOT_MIDI = 50; // D3
export const MODAL_FLOW_SCALE = [0, 2, 4, 6, 7, 9, 11] as const;

/**
 * Four physical phrases. These are scale-degree contours, not scheduled notes:
 * a marble impact advances the cursor only when the phrase gate allows it.
 */
export const MODAL_FLOW_THEME_PHRASES: readonly (readonly number[])[] = [
  [0, 2, 4, 6, 4, 2, 0, -1],
  [4, 6, 7, 6, 4, 2, 1, 0],
  [7, 6, 4, 2, 4, 6, 7, 9],
  [6, 4, 2, 1, 0, 2, 4, 2],
  [0, 4, 7, 6, 4, 2, 1, -2],
  [2, 4, 6, 9, 7, 6, 4, 2],
];

export interface ModalFlowEnergyCue {
  id: string;
  moduleId: string;
  subsystem: ImpulseEvent['subsystem'];
  energy: number;
  label: string;
  /** Sequencer metadata travels through a physical actuator before synthesis. */
  noteIndex?: number;
  midiNote?: number;
  chordNotes?: number[];
  sliceIndex?: number;
  reverse?: boolean;
  ratchetStep?: number;
  ratchetTotal?: number;
}

const ENERGY_TARGETS: Array<{
  moduleId: string;
  subsystem: ImpulseEvent['subsystem'];
}> = [
  { moduleId: 'crank-flywheel', subsystem: 'piston-snap' },
  { moduleId: 'helix-lift', subsystem: 'sub-rupture' },
  { moduleId: 'upper-aqueduct', subsystem: 'arc-discharge' },
  { moduleId: 'tri-diverter', subsystem: 'glitch-chirp' },
  { moduleId: 'gate-bank', subsystem: 'piston-snap' },
  { moduleId: 'resonator-bowl', subsystem: 'glass-armonica' },
];

/**
 * Two sparse governor injections per bar. These are visual/physical events,
 * not audio notes: Clock delivers them back through triggerImpulse, which
 * winds the machine rather than sounding a synth voice.
 */
export function evaluateModalFlowEnergyCue(
  step64: number,
  bar: number,
  sectionIndex: number,
): ModalFlowEnergyCue | null {
  if (step64 % 32 !== 0) return null;
  const section = MODAL_FLOW_SECTIONS[sectionIndex] ?? MODAL_FLOW_SECTIONS[0];
  const half = step64 === 0 ? 0 : 1;
  const target = ENERGY_TARGETS[(bar * 2 + half + sectionIndex) % ENERGY_TARGETS.length];
  const energy = Math.min(1, 0.2 + section.intensity * 0.58 + half * 0.08);
  return {
    id: `flow-energy-${bar}-${step64}`,
    moduleId: target.moduleId,
    subsystem: target.subsystem,
    energy,
    label: section.name,
  };
}

export function isModalFlowScaleNote(midiNote: number): boolean {
  const semitone = ((Math.round(midiNote) - MODAL_FLOW_ROOT_MIDI) % 12 + 12) % 12;
  return (MODAL_FLOW_SCALE as readonly number[]).includes(semitone);
}

export function modalFlowDegreeToMidi(degree: number, octaveShift = 0): number {
  const scaleLength = MODAL_FLOW_SCALE.length;
  const wrapped = ((degree % scaleLength) + scaleLength) % scaleLength;
  const octave = Math.floor(degree / scaleLength) + octaveShift;
  return MODAL_FLOW_ROOT_MIDI + MODAL_FLOW_SCALE[wrapped] + octave * 12;
}
