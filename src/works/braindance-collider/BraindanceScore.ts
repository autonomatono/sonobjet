import type { SectionDefinition, SubsystemId } from '../../engine/core/types';
import type { ModalFlowEnergyCue } from '../modal-flow/ModalFlowScore';
import { evaluateNeonPinballCues } from '../neon-pinball/NeonPinballScore';

export const BRAINDANCE_BPM = 188;
export const BRAINDANCE_BARS = 72;

export const BRAINDANCE_SECTIONS: SectionDefinition[] = [
  { id: 'checksum', name: 'I. CHECKSUM SWARM', startBar: 0, endBar: 12, intensity: 0.62, description: 'Prime-numbered relay checks establish a crooked kick lattice around a rotating plasma checksum.' },
  { id: 'recursive-break', name: 'II. RECURSIVE BREAK FOUNDRY', startBar: 12, endBar: 24, intensity: 0.96, description: 'Break solenoids feed their own ratchet register through asymmetric 3/5/7 subdivisions.' },
  { id: 'acid-topology', name: 'III. ACID TOPOLOGY ERROR', startBar: 24, endBar: 36, intensity: 1.08, description: 'The analog patch computer folds acid control voltage through crystal memory and wrong-way tubes.' },
  { id: 'microtiming', name: 'IV. MICRORHYTHM COLLIDER', startBar: 36, endBar: 48, intensity: 1.2, description: 'Quantized physical hits alternate with intentionally free electric exceptions and reverse microcuts.' },
  { id: 'plasma', name: 'V. POLYCHROME PLASMA WEATHER', startBar: 48, endBar: 60, intensity: 1.24, description: 'Moving color volumes, Tesla branches, liquid tube light and all mechanism families converge.' },
  { id: 'garbage-collect', name: 'VI. BEAUTIFUL GARBAGE COLLECT', startBar: 60, endBar: 72, intensity: 0.74, description: 'The collider sheds layers in irrational groups before a final impossible return-loop cadence.' },
];

const SCALE = [0, 1, 3, 5, 6, 8, 10] as const;
const midi = (degree: number, octave = 0): number => {
  const wrapped = ((degree % SCALE.length) + SCALE.length) % SCALE.length;
  return 41 + SCALE[wrapped] + (Math.floor(degree / SCALE.length) + octave) * 12;
};

export function evaluateBraindanceCues(
  step64: number,
  bar: number,
  sectionIndex: number,
): ModalFlowEnergyCue[] {
  const section = BRAINDANCE_SECTIONS[sectionIndex] ?? BRAINDANCE_SECTIONS[0];
  const localBar = bar - section.startBar;
  const mappedSections = [1, 3, 2, 3, 4, 5];
  const mappedStarts = [8, 32, 20, 32, 44, 56];
  const mappedLengths = [12, 12, 12, 12, 12, 8];
  const mappedSection = mappedSections[sectionIndex] ?? 3;
  const mappedBar = mappedStarts[sectionIndex] + (localBar % mappedLengths[sectionIndex]);
  const cues = evaluateNeonPinballCues(step64, mappedBar, mappedSection).map((cue, index) => ({
    ...cue,
    id: `collider-base-${bar}-${step64}-${index}`,
    label: section.name,
    energy: Math.min(1.45, cue.energy * (0.88 + section.intensity * 0.24)),
  }));

  const push = (
    lane: string,
    moduleId: string,
    subsystem: SubsystemId,
    energy: number,
    data: Partial<ModalFlowEnergyCue> = {},
  ): void => {
    cues.push({
      id: `collider-${bar}-${step64}-${lane}-${cues.length}`,
      moduleId,
      subsystem,
      energy,
      label: section.name,
      ...data,
    });
  };

  // Co-prime pulse streams produce a coherent but constantly changing composite.
  if (sectionIndex >= 1 && step64 % 3 === (bar % 3)) {
    const n = Math.floor(step64 / 3);
    push('three', 'gate-bank', 'break-shred', 0.34 + section.intensity * 0.28, {
      noteIndex: n,
      sliceIndex: (n * 5 + bar) % 16,
      reverse: (n + bar) % 7 === 0,
      ratchetStep: n % 8,
      ratchetTotal: 8,
    });
  }
  if (sectionIndex >= 2 && step64 % 5 === (bar * 2) % 5) {
    const degree = [0, 3, -1, 6, 2, 8, 5][(bar + Math.floor(step64 / 5)) % 7];
    push('five', 'acid-dial-bank', 'acid-squelch', 0.42 + section.intensity * 0.24, {
      noteIndex: degree,
      midiNote: midi(degree, -1),
    });
  }
  if (sectionIndex >= 2 && step64 % 7 === (bar + 2) % 7) {
    const degree = (bar * 3 + step64) % 14;
    push('seven', degree % 2 ? 'crystal-bank-a' : 'crystal-bank-b', 'glass-armonica', 0.35 + section.intensity * 0.22, {
      noteIndex: degree,
      midiNote: midi(degree, 2),
    });
  }

  // Deliberately unquantized exception voices: the runtime bypasses the grid for
  // electric arc and glitch-chirp events while normal physical notes stay locked.
  if (sectionIndex >= 3 && (step64 === 13 || step64 === 47 || (bar % 4 === 3 && step64 === 61))) {
    push('free-electric', step64 === 47 ? 'music-box-loom' : 'neon-reed-array', step64 === 47 ? 'glitch-chirp' : 'arc-discharge', 0.82, {
      noteIndex: bar + step64,
      midiNote: midi((bar + step64) % 12, 1),
      reverse: step64 === 47,
    });
  }

  if (sectionIndex === 5 && localBar === 11 && step64 >= 32) {
    const n = step64 - 32;
    const targets = ['pinball-playfield', 'vibraphone-tines', 'gate-bank', 'music-box-loom'];
    push('final-collect', targets[n % targets.length], 'break-shred', 0.64 + n / 64, {
      noteIndex: n,
      sliceIndex: (n * 11) % 16,
      reverse: n % 5 === 4,
      ratchetStep: n,
      ratchetTotal: 32,
    });
  }
  return cues;
}
