import type { SectionDefinition, SubsystemId } from '../../engine/core/types';
import type { ModalFlowEnergyCue } from '../modal-flow/ModalFlowScore';

export const NEON_PINBALL_BPM = 174;
export const NEON_PINBALL_TOTAL_BARS = 64;

export const NEON_PINBALL_SECTIONS: SectionDefinition[] = [
  {
    id: 'cold-boot-attract',
    name: 'I. COLD BOOT / ATTRACT MODE',
    startBar: 0,
    endBar: 8,
    intensity: 0.36,
    description: 'The analog computer boots one relay at a time. Magnetic balls wake the flywheel; isolated kicks, bell codes and crystal checks establish the motif.',
  },
  {
    id: 'pinball-break-in',
    name: 'II. PINBALL BREAK-IN',
    startBar: 8,
    endBar: 20,
    intensity: 0.72,
    description: 'The switchyard releases a rolling two-step break. Solenoids, ratchets and pinball bumpers physically chop the first drum-and-bass groove.',
  },
  {
    id: 'crystal-memory',
    name: 'III. CRYSTAL MEMORY BUS',
    startBar: 20,
    endBar: 32,
    intensity: 0.82,
    description: 'Sound-active crystals answer the break with glass arpeggios while the music-box loom reads pinned cylinders into the analog patch computer.',
  },
  {
    id: 'ratchet-overflow',
    name: 'IV. RATCHET BUFFER OVERFLOW',
    startBar: 32,
    endBar: 44,
    intensity: 1,
    description: 'The logic register overruns. Thirty-second and sixty-fourth-note ratchets fracture the amen bus while bells and flippers punch holes through it.',
  },
  {
    id: 'neon-high-score',
    name: 'V. NEON HIGH-SCORE CASCADE',
    startBar: 44,
    endBar: 56,
    intensity: 1.12,
    description: 'All buses converge: sub pressure, acid CV, crystal memory, break solenoids and the curved bell choir drive abundant sound-activated neon.',
  },
  {
    id: 'tilt-powerdown',
    name: 'VI. TILT / MAGNETIC POWER-DOWN',
    startBar: 56,
    endBar: 64,
    intensity: 0.48,
    description: 'A final impossible fill trips TILT. Balls drain through the toroidal return coil while the crystal chord and score lamps decay in open space.',
  },
];

const SCALE = [0, 2, 3, 5, 7, 9, 10] as const; // D Dorian / minor breakcore palette
const ROOT = 38; // D2

const note = (degree: number, octave = 0): number => {
  const wrapped = ((degree % SCALE.length) + SCALE.length) % SCALE.length;
  const oct = Math.floor(degree / SCALE.length) + octave;
  return ROOT + SCALE[wrapped] + oct * 12;
};

const includes = (steps: readonly number[], step: number): boolean => steps.includes(step);

interface CueOptions {
  noteIndex?: number;
  midiNote?: number;
  sliceIndex?: number;
  reverse?: boolean;
  ratchetStep?: number;
  ratchetTotal?: number;
}

/**
 * This is a mechanical program, not a parallel MIDI backing track. Every item
 * below names the machine organ that receives energy at the grid point. The
 * physics layer emits an event from that actual actuation; only then can the
 * breakcore composer turn it into sound.
 */
export function evaluateNeonPinballCues(
  step64: number,
  bar: number,
  sectionIndex: number,
): ModalFlowEnergyCue[] {
  const cues: ModalFlowEnergyCue[] = [];
  const section = NEON_PINBALL_SECTIONS[sectionIndex] ?? NEON_PINBALL_SECTIONS[0];
  const localBar = bar - section.startBar;
  const odd = bar % 2 === 1;
  const phrase = bar % 4;

  const push = (
    lane: string,
    moduleId: string,
    subsystem: SubsystemId,
    energy: number,
    options: CueOptions = {},
  ): void => {
    cues.push({
      id: `v10-${bar}-${step64}-${lane}-${cues.length}`,
      moduleId,
      subsystem,
      energy,
      label: section.name,
      ...options,
    });
  };

  // DnB spine. It begins sparse, grows into chopped two-step, then drains.
  const kickSteps = sectionIndex === 0
    ? [0, 38]
    : sectionIndex === 5
      ? (localBar < 4 ? [0, 37] : [0])
      : phrase === 3
        ? [0, 11, 26, 35, 42, 55]
        : odd
          ? [0, 22, 38, 58]
          : [0, 10, 36, 43];
  if (includes(kickSteps, step64)) {
    push('kick', 'resonator-bowl', 'sub-rupture', sectionIndex >= 3 ? 1.08 : 0.88, {
      noteIndex: (bar + step64) % 7,
      midiNote: note([0, 0, -1, 2][phrase], -1),
      sliceIndex: 0,
    });
  }

  const snareSteps = sectionIndex === 0
    ? [16, 48]
    : sectionIndex === 5 && localBar >= 5
      ? [16]
      : phrase === 3
        ? [14, 16, 31, 46, 48, 54]
        : [16, 48, ...(odd ? [46] : [30])];
  if (includes(snareSteps, step64)) {
    push('snare', 'vibraphone-tines', 'break-shred', step64 % 16 === 0 ? 1 : 0.62, {
      noteIndex: 4 + phrase,
      sliceIndex: step64 % 16 === 0 ? 4 : 7 + (bar % 3),
      reverse: step64 === 30 || step64 === 46,
    });
  }

  // Procedural break slices: the pinned music-box cylinder chooses the slice;
  // high-energy sections expose 32nd/64th microcuts without becoming random.
  const breakGrid = sectionIndex === 0 ? 16 : sectionIndex === 1 ? 8 : 4;
  if (step64 % breakGrid === (odd ? breakGrid / 2 : 0) && step64 % 16 !== 0) {
    push('break', 'music-box-loom', 'break-shred', 0.46 + section.intensity * 0.26, {
      noteIndex: (step64 / Math.max(1, breakGrid) + bar) % 12,
      sliceIndex: (bar * 5 + step64 / Math.max(1, breakGrid)) % 16,
      reverse: sectionIndex >= 3 && (step64 + bar) % 5 === 0,
    });
  }

  const overflowBurst =
    sectionIndex === 3 &&
    ((phrase === 1 && step64 >= 28 && step64 <= 35) ||
      (phrase === 3 && step64 >= 52 && step64 <= 63));
  const highScoreBurst =
    sectionIndex === 4 &&
    ((bar % 3 === 1 && step64 >= 44 && step64 <= 51) ||
      (phrase === 3 && step64 >= 58));
  if (overflowBurst || highScoreBurst) {
    const start = overflowBurst && phrase === 1 ? 28 : overflowBurst ? 52 : step64 >= 58 ? 58 : 44;
    const total = overflowBurst && phrase === 3 ? 12 : 8;
    const ratchetStep = step64 - start;
    push('ratchet', 'gate-bank', 'break-shred', 0.58 + ratchetStep / Math.max(1, total) * 0.28, {
      noteIndex: ratchetStep,
      sliceIndex: (11 + ratchetStep * 3 + bar) % 16,
      reverse: ratchetStep % 4 === 3,
      ratchetStep,
      ratchetTotal: total,
    });
  }

  // Metallic hats/cymbals are real orbital percussion hits.
  const hatGrid = sectionIndex === 0 ? 8 : sectionIndex >= 3 ? 2 : 4;
  if (step64 % hatGrid === 0 && !includes(snareSteps, step64)) {
    const open = (step64 + bar * 4) % 16 === 12;
    push('hat', 'drum-ring', 'fin-cascade', open ? 0.62 : 0.35 + section.intensity * 0.16, {
      noteIndex: step64 / hatGrid,
      sliceIndex: open ? 12 : 9,
    });
  }

  // Acid CV enters after the break-in and follows a syncopated 3-3-2 contour.
  if (sectionIndex >= 1 && sectionIndex <= 4 && includes([0, 12, 24, 34, 44, 56], step64)) {
    const degreePattern = [0, 0, 3, -1, 5, 2, 0, 6];
    const degree = degreePattern[(bar * 2 + Math.floor(step64 / 12)) % degreePattern.length];
    push('acid', 'acid-dial-bank', 'acid-squelch', 0.5 + section.intensity * 0.25, {
      noteIndex: degree,
      midiNote: note(degree, 0),
    });
  }

  // Crystal memory produces the melodic identity. Notes are still emitted only
  // after the addressed crystal has received and propagated physical energy.
  const crystalActive = sectionIndex >= 2 && sectionIndex <= 5;
  const crystalGrid = sectionIndex === 4 ? 4 : 8;
  if (crystalActive && step64 % crystalGrid === (odd ? crystalGrid / 2 : 0)) {
    const contour = [0, 2, 4, 8, 6, 4, 9, 7, 3, 5, 11, 9, 6, 4, 2, -1];
    const index = (bar * 8 + Math.floor(step64 / crystalGrid)) % contour.length;
    const degree = contour[index];
    push('crystal', (index + bar) % 2 === 0 ? 'crystal-bank-a' : 'crystal-bank-b', 'glass-armonica', 0.5 + section.intensity * 0.24, {
      noteIndex: degree,
      midiNote: note(degree, 2),
    });
  }

  // Bells answer at phrase boundaries; the final section leaves more air.
  const bellSteps = sectionIndex === 0 ? [0, 32] : sectionIndex === 5 ? [0, 48] : [8, 40];
  if (includes(bellSteps, step64) && (bar + phrase) % 2 === 0) {
    const degree = [0, 4, 6, 9][phrase];
    push('bell', 'chime-orchard', 'modal-clang', 0.62 + section.intensity * 0.22, {
      noteIndex: degree,
      midiNote: note(degree, 2),
    });
  }

  // Every strong acoustic event has a photonic consequence. The neon organ is
  // addressed rhythmically, then the machine's energy/flash response drives the
  // actual lights and emissive materials.
  if (
    (sectionIndex >= 1 && step64 % (sectionIndex >= 4 ? 4 : 8) === 0) ||
    (sectionIndex === 0 && step64 === 0)
  ) {
    push('neon', 'neon-reed-array', 'arc-discharge', 0.28 + section.intensity * 0.34, {
      noteIndex: (bar + step64 / 4) % 12,
    });
  }

  // Final TILT fill: a deterministic mechanical cascade across four organs.
  if (sectionIndex === 5 && localBar === 4 && step64 >= 48 && step64 % 2 === 0) {
    const n = (step64 - 48) / 2;
    const targets = ['pinball-playfield', 'gate-bank', 'vibraphone-tines', 'bell-ratchet-relay'];
    push('tilt', targets[n % targets.length], 'break-shred', 0.72 + n * 0.035, {
      noteIndex: n,
      sliceIndex: (n * 5 + 3) % 16,
      reverse: n % 3 === 2,
      ratchetStep: n,
      ratchetTotal: 8,
    });
  }

  return cues;
}
