import { SeededRandom } from '../../engine/core/SeededRandom';
import type {
  AnticipationCue,
  ImpulseEvent,
  SectionDefinition,
} from '../../engine/core/types';
import type { ShotCutDirective } from '../../kit/camera/CinemaDirector';
import {
  computeRatchetBurstOffsets,
  evaluateBreakChop,
} from '../../kit/sequencer/IDMSequencer';

export const GANTZ_TOTAL_BARS = 96;

export const GANTZ_SECTIONS: SectionDefinition[] = [
  {
    id: 'stasis-seed',
    name: 'I. SINGULARITY SEED & CRYSTALLINE WAKE',
    startBar: 0,
    endBar: 12,
    intensity: 0.28,
    description:
      'Folded Monolith, Glass-Armonica quartz shimmer, naked Seed Motif (C-Db-Ab-G-F), Bar 6 shockwave into Cantilever unfold',
  },
  {
    id: 'asymmetric-loom',
    name: 'II. CANTILEVER STRIKERS & ACID WEAVE',
    startBar: 12,
    endBar: 28,
    intensity: 0.66,
    description:
      '16-bar (2x8) Call/Response kinetic groove; Bass + liquid 303 Acid-Squelch & Glitch-Chirp weave enter at Bar 20',
  },
  {
    id: 'larynx-aria',
    name: 'III. INVERTED CATHEDRAL ARIA & BRIDGE',
    startBar: 28,
    endBar: 52,
    intensity: 0.86,
    description:
      '24-bar (3x8) complete Aria cycles inside the hollow 18m shell + Bars 44–51 ethereal suspension & C7b9 glitch-cadence bridge',
  },
  {
    id: 'flywheel-cadenza',
    name: 'IV. QUANTIZED SHATTER & VERTIGO ZOLLY',
    startBar: 52,
    endBar: 64,
    intensity: 0.82,
    description:
      '8-bar Gantz-Graf stop-start cubic shatter cadenza + 4-bar 2-octave Vertigo Zolly riser & 2-beat dead silence',
  },
  {
    id: 'apex-convergence',
    name: 'V. SINGULARITY CROWN CONVERGENCE',
    startBar: 64,
    endBar: 80,
    intensity: 1.0,
    description:
      'Full 16-bar (2x8) thematic climax: octave-doubled Seed Motif + Acid counterpoint + Glass halos completing full C7b9 cadence',
  },
  {
    id: 'exhaustion',
    name: 'VI. ENTROPIC DISSOLVE & MONOLITH FOLD',
    startBar: 80,
    endBar: 96,
    intensity: 0.3,
    description:
      '16-bar Fm9 resolution, Glass-Armonica quartz echoes, glitch memory sparks & 8-bar pullback folding into silence',
  },
];

// --- MUSICAL ARCHITECTURE IN F PHRYGIAN / F MINOR ---
// 4-Chord 8-Bar Progression: Fm(add b9) -> Db Lydian(#11) -> Bbm9 -> C7(b9,#9)
const CHORD_CYCLE_8BAR: Array<{
  chord: number[];
  bassRoot: number;
  bassFifth: number;
  acidArp: number[];
}> = [
  // Bars 0..1: F minor (add 9 / b9)
  {
    chord: [53, 56, 60, 65, 67],
    bassRoot: 29,
    bassFifth: 36,
    acidArp: [41, 48, 53, 54, 56, 60, 65, 56],
  },
  // Bars 2..3: Db Lydian (#11) — poignant Warp lift
  {
    chord: [49, 56, 60, 65, 67],
    bassRoot: 25,
    bassFifth: 32,
    acidArp: [37, 44, 49, 55, 56, 60, 67, 60],
  },
  // Bars 4..5: Bb minor 9
  {
    chord: [46, 53, 58, 60, 65],
    bassRoot: 34,
    bassFifth: 29,
    acidArp: [46, 53, 58, 60, 61, 65, 58, 53],
  },
  // Bars 6..7: C7 Phrygian Dominant (E natural + Db + Eb tension resolving to Fm!)
  {
    chord: [48, 52, 58, 61, 63],
    bassRoot: 24,
    bassFifth: 30,
    acidArp: [36, 48, 52, 58, 61, 64, 61, 52],
  },
];

interface MelodicNote {
  barOffset: number; // 0..7 within 8-bar phrase
  step16: number; // 0..15
  midi: number;
  durBeats: number;
  vowel: number;
}

// Authored 8-Bar Thematic Melody built directly from the Seed Motif (C5 - Db5 - Ab4 - G4 - F4)
const ARIA_MELODY_8BAR: MelodicNote[] = [
  // Phrase A1 (Seed Motif Question over Fm): C5 -> Db5 -> Ab4 -> G4 -> F4
  { barOffset: 0, step16: 0, midi: 72, durBeats: 1.5, vowel: 0.1 },
  { barOffset: 0, step16: 6, midi: 73, durBeats: 1.0, vowel: 0.45 },
  { barOffset: 0, step16: 10, midi: 68, durBeats: 1.5, vowel: 0.72 },
  { barOffset: 1, step16: 0, midi: 67, durBeats: 1.0, vowel: 0.3 },
  { barOffset: 1, step16: 4, midi: 65, durBeats: 2.5, vowel: 0.85 },

  // Phrase A2 (Rising Leap over Db Lydian #11): C5 -> Db5 -> F5 -> Eb5 -> C5
  { barOffset: 2, step16: 0, midi: 72, durBeats: 1.5, vowel: 0.15 },
  { barOffset: 2, step16: 6, midi: 73, durBeats: 1.0, vowel: 0.5 },
  { barOffset: 2, step16: 10, midi: 77, durBeats: 2.0, vowel: 0.05 },
  { barOffset: 3, step16: 2, midi: 75, durBeats: 1.5, vowel: 0.35 },
  { barOffset: 3, step16: 8, midi: 72, durBeats: 2.0, vowel: 0.75 },

  // Phrase B1 (Yearning Descent over Bbm9): Db5 -> C5 -> Bb4 -> Ab4 -> F4
  { barOffset: 4, step16: 0, midi: 73, durBeats: 1.5, vowel: 0.2 },
  { barOffset: 4, step16: 6, midi: 72, durBeats: 1.0, vowel: 0.45 },
  { barOffset: 4, step16: 10, midi: 70, durBeats: 1.5, vowel: 0.65 },
  { barOffset: 5, step16: 0, midi: 68, durBeats: 1.5, vowel: 0.8 },
  { barOffset: 5, step16: 6, midi: 65, durBeats: 2.2, vowel: 0.95 },

  // Phrase B2 (Phrygian Cadence over C7b9): G4 -> Ab4 -> Gb4 -> E4 leading tone!
  { barOffset: 6, step16: 0, midi: 67, durBeats: 1.5, vowel: 0.25 },
  { barOffset: 6, step16: 6, midi: 68, durBeats: 1.5, vowel: 0.5 },
  { barOffset: 6, step16: 12, midi: 66, durBeats: 1.5, vowel: 0.75 },
  { barOffset: 7, step16: 2, midi: 64, durBeats: 2.8, vowel: 0.45 },
];

export interface ScoreEvalParams {
  chaos: number;
  drillDensity: number;
  forceRatchet: boolean;
  forceReverse: boolean;
  step64DurSec: number;
}

export interface StepScheduleBundle {
  events: ImpulseEvent[];
  anticipations: AnticipationCue[];
}

/**
 * Evaluates the authored 96-bar 6-Act F-Phrygian composition with complete
 * 8-bar hypermetric phrasing, sculpted section transitions, and 14 synthesis voices.
 */
export function evaluateGantzStepBundle(
  step64: number,
  barInput: number,
  audioTime: number,
  params: ScoreEvalParams,
): StepScheduleBundle {
  const bar = ((barInput % GANTZ_TOTAL_BARS) + GANTZ_TOTAL_BARS) % GANTZ_TOTAL_BARS;
  const events: ImpulseEvent[] = [];
  const anticipations: AnticipationCue[] = [];

  const is16th = step64 % 4 === 0;
  const step16 = Math.floor(step64 / 4);
  const beat = bar * 4 + step64 / 16;
  const beatSec = params.step64DurSec * 16;
  const step16Sec = params.step64DurSec * 4;

  const hA = SeededRandom.hashStep(bar * 16 + step16, 11, 707);
  const hB = SeededRandom.hashStep(bar * 16 + step16, 23, 808);
  const hGlitch = SeededRandom.hashStep(bar * 16 + step16, 37, 919);

  const section =
    GANTZ_SECTIONS.find((s) => bar >= s.startBar && bar < s.endBar) ??
    GANTZ_SECTIONS[0];

  const emit = (
    partial: Omit<ImpulseEvent, 'audioTime' | 'beat' | 'origin'>,
    offsetSec = 0,
  ) => {
    events.push({
      ...partial,
      audioTime: audioTime + offsetSec,
      beat,
      origin: 'score',
    });
  };

  const emitWindup = (
    targetSubsystem: ImpulseEvent['subsystem'],
    intensity: number,
    leadSteps16: number,
    audibleInhale = false,
  ) => {
    const durSec = leadSteps16 * step16Sec;
    anticipations.push({
      targetSubsystem,
      intensity,
      leadTimeSec: durSec,
      audioTime,
    });
    if (audibleInhale) {
      emit({
        subsystem: 'windup-inhale',
        velocity: intensity * 0.85,
        pitchRatio: 1.0,
        durationSec: durSec,
        decay: 1.0,
        locus: [0.4, 0.3, 0.3],
      });
    }
  };

  // Live Performer Force-Ratchet Override (`[S] 64TH DRILL`)
  if (params.forceRatchet && step64 % 2 === 0) {
    emit({
      subsystem: step64 % 8 === 0 ? 'spine-shear' : 'fin-cascade',
      velocity: 0.82,
      pitchRatio: 0.9 + (step64 % 16) * 0.055,
      sliceIndex: step64 % 16,
      decay: 0.42,
      locus: [Math.sin(step64 * 0.6) * 0.75, 0.2, 0.4],
    });
  }

  // Sub-16th steps: Act IV Bar 62 32nd/64th accelerating riser frenzy!
  if (!is16th) {
    if (section.id === 'flywheel-cadenza' && bar >= 62 && bar < 63) {
      if (step64 % 2 === 0) {
        const climbMidi = 65 + Math.floor((step64 / 64) * 12);
        emit({
          subsystem: 'fin-cascade',
          velocity: 0.62 + (step64 / 64) * 0.35,
          pitchRatio: 1.0 + (step64 / 64) * 0.9,
          midiNote: climbMidi,
          decay: 0.35,
          sliceIndex: (step64 >> 2) % 16,
          locus: [Math.cos(step64) * 0.8, 0.3, 0.3],
        });
      }
    }
    return { events, anticipations };
  }

  // ============================================================================
  // ACT I (Bars 0..11): SINGULARITY SEED & CRYSTALLINE WAKE
  // ============================================================================
  if (section.id === 'stasis-seed') {
    if (bar % 4 === 0 && step16 === 0) {
      emit({
        subsystem: 'bellows-choir',
        velocity: 0.54,
        pitchRatio: 1,
        chordNotes: [41, 48, 53, 56],
        durationSec: beatSec * 6.5,
        decay: 1.4,
        locus: [0, 0.1, 0],
      });
    }

    // Eerie Cunningham Glass-Armonica quartz halos in Bars 1, 5, 9
    if ((bar === 1 || bar === 5 || bar === 9) && step16 === 0) {
      emit({
        subsystem: 'glass-armonica',
        velocity: 0.72,
        pitchRatio: 1,
        midiNote: bar === 5 ? 73 : 72, // C5 / Db5 ghostly halo
        durationSec: beatSec * 5.2,
        decay: 1.3,
        locus: [0.45, 0.6, 0.2],
      });
    }

    // Sparse digital telemetry glitch-chirps in the dark
    if ((bar === 1 || bar === 7) && step16 === 11) {
      emit({
        subsystem: 'glitch-chirp',
        velocity: 0.56,
        pitchRatio: 1.15,
        midiNote: 72,
        decay: 0.85,
        sliceIndex: bar,
        locus: [-0.6, 0.5, 0.3],
      });
    }

    // Bars 2..3: Naked Plucked Crystalline Chime introduces the 5-note SEED MOTIF (C5-Db5-Ab4-G4-F4)!
    const seedIntro: Array<[number, number, number]> = [
      [2, 0, 72], // C5
      [2, 6, 73], // Db5
      [2, 11, 68], // Ab4
      [3, 2, 67], // G4
      [3, 6, 65], // F4
    ];
    for (const [b, s, midi] of seedIntro) {
      if (bar === b && step16 === s) {
        emit({
          subsystem: 'modal-clang',
          velocity: 0.86,
          pitchRatio: 1,
          midiNote: midi,
          durationSec: 1.45,
          decay: 1.5,
          sliceIndex: midi - 60,
          locus: [-0.68, 0.15, 0.35],
        });
      }
    }

    // Bar 5 Step 12: Wind-up -> Bar 6 Step 0: FIRST SHOCKWAVE UNLOCKING CANTILEVER ARMS!
    if (bar === 5 && step16 === 12) {
      emitWindup('sub-rupture', 1.2, 4, true);
    }
    if (bar === 6 && step16 === 0) {
      emit({
        subsystem: 'sub-rupture',
        velocity: 1.25,
        pitchRatio: 1.0,
        decay: 1.2,
        locus: [0.7, -0.5, 0.4],
      });
    }
    if (bar === 6 && step16 === 4) {
      const pawlOffsets = computeRatchetBurstOffsets(7, beatSec * 2.2, 1.24);
      pawlOffsets.forEach((off, idx) => {
        emit(
          {
            subsystem: 'fin-cascade',
            velocity: 0.85 * Math.pow(0.84, idx),
            pitchRatio: 1.35 - idx * 0.06,
            decay: 0.65,
            sliceIndex: 14 - idx * 2,
            locus: [-0.6, 0.2, 0.3],
            ratchetStep: idx,
            ratchetTotal: 7,
          },
          off,
        );
      });
    }

    // Bars 8..9: Awakening Formant Reed answers the Seed Motif an octave lower!
    const larynxAwake: Array<[number, number, number, number]> = [
      [8, 4, 60, 0.15],
      [8, 10, 61, 0.5],
      [9, 0, 56, 0.78],
      [9, 6, 55, 0.4],
      [9, 10, 53, 0.92],
    ];
    for (const [b, s, midi, vw] of larynxAwake) {
      if (bar === b && step16 === s) {
        emit({
          subsystem: 'larynx-lead',
          velocity: 0.78,
          pitchRatio: 1,
          midiNote: midi,
          vowel: vw,
          durationSec: beatSec * 1.4,
          decay: 1.1,
          locus: [0, 0.45, 0.4],
        });
      }
    }

    if (bar >= 10 && step16 % 2 === 0) {
      emit({
        subsystem: 'fin-cascade',
        velocity: 0.35 + ((bar - 10) * 16 + step16) * 0.018,
        pitchRatio: 0.9 + (step16 % 4) * 0.12,
        decay: 0.45,
        sliceIndex: step16,
        locus: [0.1, -0.2, 0.2],
      });
    }
    if (bar === 11 && step16 === 10) {
      emitWindup('sub-rupture', 1.25, 6, true);
    }

    return { events, anticipations };
  }

  // ============================================================================
  // ACT II (Bars 12..27, 16 Bars = 2x8): CANTILEVER STRIKERS & ACID WEAVE
  // ============================================================================
  if (section.id === 'asymmetric-loom') {
    const isCallBar = bar % 2 === 0;

    if (!isCallBar && step16 === 14) {
      emitWindup('sub-rupture', 1.0, 2, false);
    }

    if (isCallBar) {
      if (step16 === 0 || step16 === 6 || step16 === 10) {
        emit({
          subsystem: 'sub-rupture',
          velocity: step16 === 0 ? 1.15 : 0.92,
          pitchRatio: 1.0,
          decay: 0.92,
          locus: [0.65, -0.45, 0.4],
        });
      }
      if (step16 === 4 || step16 === 13) {
        emit({
          subsystem: 'spine-shear',
          velocity: 1.04,
          pitchRatio: step16 === 13 ? 1.12 : 0.98,
          decay: 0.85,
          locus: [0.55, 0.2, 0.3],
        });
      }
      if (step16 === 3) {
        emit({
          subsystem: 'piston-snap',
          velocity: 0.72,
          pitchRatio: 0.95,
          decay: 0.65,
          locus: [0.45, 0.35, 0.2],
        });
      }
    } else {
      if (step16 === 0) {
        emit({
          subsystem: 'sub-rupture',
          velocity: 0.88,
          pitchRatio: 1.0,
          decay: 0.8,
          locus: [0.5, -0.4, 0.3],
        });
      }

      const responseHarp: Record<number, number> = {
        2: 72,
        5: 73,
        7: 68,
        11: 67,
        14: 65,
      };
      if (responseHarp[step16] !== undefined) {
        emit({
          subsystem: 'modal-clang',
          velocity: 0.78,
          pitchRatio: 1,
          midiNote: responseHarp[step16] + (bar >= 20 ? 12 : 0),
          durationSec: 0.42,
          decay: 0.85,
          sliceIndex: responseHarp[step16] - 60,
          locus: [-0.72, 0.25, 0.35],
        });
      }

      if ([4, 8, 10, 12, 15].includes(step16)) {
        const chop = evaluateBreakChop(bar, step16, params.chaos * 0.45, 2002);
        emit({
          subsystem: 'break-shred',
          velocity: step16 === 4 || step16 === 12 ? 0.95 : 0.72,
          pitchRatio: chop.pitchRatio,
          decay: 0.9,
          sliceIndex: step16 === 4 || step16 === 12 ? 4 : chop.sliceIndex,
          reverse: params.forceReverse || (bar === 27 && step16 >= 12),
          locus: [-0.45, 0.1, 0.4],
        });
      }
    }

    // Second 8-bar half (Bars 20..27): Enter Monolith Bass + Liquid 303 Acid-Squelch + Glitch-Chirps!
    if (bar >= 20) {
      const harmony = CHORD_CYCLE_8BAR[Math.floor(((bar - 20) % 8) / 2)];
      if (step16 === 0 || step16 === 6 || step16 === 10 || step16 === 14) {
        const note =
          step16 === 10
            ? harmony.bassFifth
            : step16 === 14
              ? harmony.bassRoot + 12
              : harmony.bassRoot;
        emit({
          subsystem: 'core-implode',
          velocity: step16 === 0 ? 0.95 : 0.78,
          pitchRatio: 1,
          midiNote: note,
          durationSec: step16Sec * 3.2,
          decay: 0.85,
          locus: [0, -0.35, 0.2],
        });
      }

      // Percolating off-beat 303 Acid-Squelch counter-line!
      if ([1, 5, 9, 11, 15].includes(step16) && (isCallBar || hA < 0.72)) {
        const arpNote = harmony.acidArp[(step16 + bar) % harmony.acidArp.length];
        emit({
          subsystem: 'acid-squelch',
          velocity: step16 === 9 ? 0.94 : 0.72,
          pitchRatio: 1,
          midiNote: arpNote,
          vowel: step16 === 15 ? 0.8 : 0.2, // Glide accent on step 15!
          durationSec: step16Sec * 1.65,
          decay: 0.9,
          locus: [Math.sin(step16) * 0.7, -0.1, 0.4],
        });
      }

      // Crisp digital glitch-chirp artifacts at 2-bar seams
      if (bar % 2 === 1 && step16 === 13 && hGlitch < 0.55 + params.chaos * 0.35) {
        emit({
          subsystem: 'glitch-chirp',
          velocity: 0.74,
          pitchRatio: 1.25,
          midiNote: 77,
          decay: 0.8,
          sliceIndex: bar + step16,
          locus: [0.65, 0.55, 0.3],
        });
      }
    }

    if (bar === 27 && step16 === 12) {
      emitWindup('larynx-lead', 1.15, 4, true);
      const fillOffsets = computeRatchetBurstOffsets(
        6 + Math.floor(params.drillDensity * 4),
        step16Sec * 3.8,
        0.76,
      );
      fillOffsets.forEach((off, idx) => {
        emit(
          {
            subsystem: idx % 2 === 0 ? 'spine-shear' : 'fin-cascade',
            velocity: 0.92,
            pitchRatio: 0.95 + idx * 0.09,
            decay: 0.4,
            sliceIndex: idx * 2,
            locus: [(idx % 2 === 0 ? 1 : -1) * 0.65, 0.25, 0.3],
            ratchetStep: idx,
            ratchetTotal: fillOffsets.length,
          },
          off,
        );
      });
    }

    return { events, anticipations };
  }

  // ============================================================================
  // ACT III (Bars 28..51, 24 Bars = 3 FULL 8-Bar Phrases!):
  // Pass 1 (28..35): Intimate Aria
  // Pass 2 (36..43): Soaring Aria + Acid/Glass Halos
  // Pass 3 (44..51): Ethereal Suspension (44..47) -> Sculpted Glitch-Cadence Bridge (48..51) into Act IV!
  // ============================================================================
  if (section.id === 'larynx-aria') {
    const relBar = bar - 28;
    const cycleBar = relBar % 8; // Completes 0..7 three full times (ends cleanly on cycleBar=7 at Bar 51!)
    const harmony = CHORD_CYCLE_8BAR[Math.floor(cycleBar / 2)];
    const isSuspension = bar >= 44 && bar < 48; // 4-bar beatless Fm -> Db#11 levitation!
    const isDeconstructBridge = bar >= 48 && bar < 52; // 4-bar Bbm9 -> C7b9 glitch-cadence bridge!

    // 1. Lush Polychord Change every 2 bars (shorter gated chord stabs in Bar 50..51 bridge!)
    if (cycleBar % 2 === 0 && step16 === 0) {
      emit({
        subsystem: 'bellows-choir',
        velocity: isSuspension ? 1.06 : 0.88,
        pitchRatio: 1,
        chordNotes: harmony.chord,
        durationSec: bar === 50 ? beatSec * 3.6 : beatSec * 7.8,
        decay: 1.3,
        locus: [0, 0.2, 0],
      });

      // Ethereal Glass-Armonica quartz shimmer on chord changes in Pass 2 & Pass 3!
      if (relBar >= 8) {
        emit({
          subsystem: 'glass-armonica',
          velocity: isSuspension ? 0.92 : 0.68,
          pitchRatio: 1,
          midiNote: harmony.chord[harmony.chord.length - 1] + 12,
          durationSec: beatSec * 6.5,
          decay: 1.25,
          locus: [-0.5, 0.65, 0.2],
        });
      }
    }

    // 2. Complete 8-Bar Thematic Melody (never cut mid-phrase!)
    for (const mNote of ARIA_MELODY_8BAR) {
      if (mNote.barOffset === cycleBar && mNote.step16 === step16) {
        emit({
          subsystem: 'larynx-lead',
          velocity: 0.96,
          pitchRatio: 1,
          midiNote: mNote.midi + (relBar >= 8 ? 0 : -12),
          vowel: mNote.vowel,
          durationSec: mNote.durBeats * beatSec,
          decay: 1.15,
          locus: [0, 0.5, 0.45],
        });
        if (relBar >= 8 && step16 === 0) {
          emit({
            subsystem: 'modal-clang',
            velocity: 0.58,
            pitchRatio: 1,
            midiNote: mNote.midi,
            durationSec: 0.85,
            decay: 1.1,
            sliceIndex: mNote.midi - 60,
            locus: [-0.68, 0.2, 0.3],
          });
        }
      }
    }

    // Pure beatless suspension across Bars 44..47 (Fm -> Db#11)
    if (isSuspension) {
      if (step16 === 0) {
        emit({
          subsystem: 'core-implode',
          velocity: 0.84,
          pitchRatio: 1,
          midiNote: harmony.bassRoot,
          durationSec: beatSec * 3.8,
          decay: 1.4,
          locus: [0, -0.3, 0],
        });
      }
      return { events, anticipations };
    }

    // SCULPTED 4-BAR DECONSTRUCTION BRIDGE INTO ACT IV (Bars 48..51: Bbm9 -> C7b9 -> F!)
    if (isDeconstructBridge) {
      const bridgeProgress = ((bar - 48) * 16 + step16) / 64; // 0..1 across Bars 48..51
      if (step16 === 0 || (bar >= 50 && step16 === 8)) {
        emit({
          subsystem: 'core-implode',
          velocity: 0.88,
          pitchRatio: 1,
          midiNote: harmony.bassRoot,
          durationSec: beatSec * 1.9,
          decay: 1.0,
          locus: [0, -0.35, 0.2],
        });
      }

      // Progressive glitch-chirp & acid gating that organically previews Act IV's mechanical world!
      if (
        (bar === 48 && (step16 === 7 || step16 === 14)) ||
        (bar === 49 && step16 % 4 === 2) ||
        (bar === 50 && step16 % 2 === 0)
      ) {
        emit({
          subsystem: step16 % 4 === 0 ? 'acid-squelch' : 'glitch-chirp',
          velocity: 0.62 + bridgeProgress * 0.35,
          pitchRatio: 1.0 + bridgeProgress * 0.4,
          midiNote: harmony.acidArp[step16 % harmony.acidArp.length],
          durationSec: step16Sec * 1.4,
          decay: 0.7,
          sliceIndex: step16,
          locus: [Math.cos(step16) * 0.7, 0.3, 0.4],
        });
      }

      // Bar 51 (C7b9 resolving to Act IV's F at Bar 52!):
      // Beats 1..2 let the E4 leading-tone melody ring; Beats 3..4 execute a crisp mechanical handoff!
      if (bar === 51) {
        if (step16 === 8 || step16 === 11) {
          emit({
            subsystem: 'piston-snap',
            velocity: 0.95,
            pitchRatio: step16 === 8 ? 0.9 : 1.15,
            decay: 0.55,
            locus: [0.5, 0.2, 0.4],
          });
        }
        if (step16 === 12) {
          emitWindup('sub-rupture', 1.25, 4, true);
          const handoffOffsets = computeRatchetBurstOffsets(6, step16Sec * 3.7, 0.74);
          handoffOffsets.forEach((off, idx) => {
            emit(
              {
                subsystem: idx % 2 === 0 ? 'spine-shear' : 'glitch-chirp',
                velocity: 0.88 + idx * 0.04,
                pitchRatio: 1.0 + idx * 0.1,
                midiNote: 64 + idx, // Leading tone E4 climbing into F!
                decay: 0.42,
                sliceIndex: idx * 2,
                locus: [(idx % 2 === 0 ? -1 : 1) * 0.7, 0.35, 0.4],
                ratchetStep: idx,
                ratchetTotal: 6,
              },
              off,
            );
          });
        }
      }
      return { events, anticipations };
    }

    // Standard Act III Pass 1 & Pass 2 Groove (Bars 28..43)
    if ([0, 6, 10, 12].includes(step16)) {
      emit({
        subsystem: 'core-implode',
        velocity: step16 === 0 ? 0.92 : 0.74,
        pitchRatio: 1,
        midiNote: step16 === 10 ? harmony.bassFifth : harmony.bassRoot,
        durationSec: step16Sec * 3.0,
        decay: 0.85,
        locus: [0, -0.35, 0.2],
      });
    }

    // Pass 2 (Bars 36..43): Add bubbling Acid-Squelch 16th filigree!
    if (relBar >= 8 && [3, 7, 11, 15].includes(step16)) {
      emit({
        subsystem: 'acid-squelch',
        velocity: 0.68,
        pitchRatio: 1,
        midiNote: harmony.acidArp[(step16 + cycleBar) % harmony.acidArp.length],
        vowel: 0.4,
        durationSec: step16Sec * 1.5,
        decay: 0.85,
        locus: [0.55, -0.15, 0.35],
      });
    }

    if (step16 === 14 && cycleBar % 2 === 1) {
      emitWindup('sub-rupture', 0.95, 2, false);
    }

    if (step16 === 0 || step16 === 10 || (step16 === 7 && cycleBar % 2 === 0)) {
      emit({
        subsystem: 'sub-rupture',
        velocity: step16 === 0 ? 1.1 : 0.88,
        pitchRatio: 1,
        decay: 0.88,
        locus: [0.65, -0.45, 0.4],
      });
    }

    const isTurnaroundBar = cycleBar === 3 || cycleBar === 7;
    if (step16 === 4 || step16 === 12) {
      if (isTurnaroundBar && step16 === 12) {
        const bursts = 4 + Math.floor(params.drillDensity * 6);
        const offsets = computeRatchetBurstOffsets(bursts, step16Sec * 3.8, 0.78);
        offsets.forEach((off, idx) => {
          emit(
            {
              subsystem: idx % 2 === 0 ? 'spine-shear' : 'break-shred',
              velocity: 0.95 * Math.pow(0.94, idx),
              pitchRatio: 1.0 + idx * 0.08,
              decay: 0.42,
              sliceIndex: 4,
              reverse: params.forceReverse,
              locus: [0.55, 0.2, 0.3],
              ratchetStep: idx,
              ratchetTotal: bursts,
            },
            off,
          );
        });
      } else {
        emit({
          subsystem: 'spine-shear',
          velocity: 1.02,
          pitchRatio: 1.0,
          decay: 0.85,
          locus: [0.55, 0.2, 0.3],
        });
      }
    }

    if (step16 % 2 === 0 || (isTurnaroundBar && hA < 0.7)) {
      const chop = evaluateBreakChop(bar, step16, params.chaos * 0.55, 303);
      emit({
        subsystem: 'break-shred',
        velocity: 0.72,
        pitchRatio: chop.pitchRatio,
        decay: 0.85,
        sliceIndex: chop.sliceIndex,
        reverse: params.forceReverse || chop.reverse,
        locus: [-0.45, 0.15, 0.35],
      });
    }

    return { events, anticipations };
  }

  // ============================================================================
  // ACT IV (Bars 52..63, 12 Bars): QUANTIZED SHATTER CADENZA (52..59) & RISER (60..63)
  // ============================================================================
  if (section.id === 'flywheel-cadenza') {
    if (bar < 60) {
      if (step16 >= 12) {
        if (step16 === 12) {
          emit({
            subsystem: 'piston-snap',
            velocity: 1.12,
            pitchRatio: 0.75,
            decay: 0.35,
            locus: [0, -0.2, 0.5],
          });
        }
        if (step16 === 14) {
          emitWindup('sub-rupture', 1.15, 2, false);
        }
        return { events, anticipations };
      }

      if (step16 === 0 || step16 === 5) {
        emit({
          subsystem: 'sub-rupture',
          velocity: 1.2,
          pitchRatio: 1.0,
          decay: 0.75,
          locus: [0.7, -0.5, 0.4],
        });
      }

      // Glitch-Chirp & Acid accents punctuating the cadenza pockets!
      if (step16 === 2) {
        emit({
          subsystem: bar % 2 === 0 ? 'glitch-chirp' : 'acid-squelch',
          velocity: 0.88,
          pitchRatio: 1.2,
          midiNote: bar % 2 === 0 ? 77 : 41, // High F5 chirp vs Low F2 acid stab!
          vowel: 0.75,
          durationSec: step16Sec * 1.5,
          decay: 0.65,
          sliceIndex: bar * 3,
          locus: [-0.65, 0.4, 0.35],
        });
      }

      if (step16 === 3 || step16 === 8) {
        const count = 5 + ((bar - 52) % 4) * 2;
        const curve = bar % 2 === 0 ? 0.7 : 1.28;
        const offsets = computeRatchetBurstOffsets(count, step16Sec * 2.8, curve);
        const motifPitches = [72, 73, 68, 67, 65, 77];
        const baseMidi = motifPitches[(bar + step16) % motifPitches.length];

        offsets.forEach((off, idx) => {
          emit(
            {
              subsystem: idx === 0 ? 'modal-clang' : 'fin-cascade',
              velocity: 0.92 * Math.pow(0.92, idx),
              pitchRatio: 1 + idx * 0.08,
              midiNote: baseMidi,
              durationSec: 0.22,
              decay: 0.45,
              sliceIndex: (idx * 3) % 16,
              locus: [(idx % 2 === 0 ? -1 : 1) * 0.75, 0.25, 0.35],
              ratchetStep: idx,
              ratchetTotal: count,
            },
            off,
          );
        });
      }

      if (step16 === 10) {
        emit({
          subsystem: 'arc-discharge',
          velocity: 0.95,
          pitchRatio: 1.1 + (bar % 3) * 0.25,
          decay: 0.65,
          locus: [0, -0.7, -0.4],
        });
      }
      return { events, anticipations };
    }

    // PART B (Bars 60..63): 3.5-BAR VERTIGO PITCH/GLITCH RISER -> 2 BEATS DEAD SILENCE!
    if (bar === 63 && step16 >= 8) {
      if (step16 === 8) {
        emitWindup('sub-rupture', 1.45, 8, true);
      }
      return { events, anticipations };
    }

    const riserProgress = ((bar - 60) * 16 + step16) / 56;
    const triggerModulo = bar === 60 ? 2 : 1;
    if (step16 % triggerModulo === 0) {
      const climbMidi = 53 + Math.round(riserProgress * 24);
      emit({
        subsystem:
          step16 % 8 === 6
            ? 'glitch-chirp'
            : step16 % 4 === 0
              ? 'spine-shear'
              : 'modal-clang',
        velocity: 0.55 + riserProgress * 0.65,
        pitchRatio: 0.85 + riserProgress * 1.1,
        midiNote: climbMidi,
        durationSec: 0.2,
        decay: 0.45,
        sliceIndex: Math.floor(riserProgress * 15),
        locus: [Math.sin(step16 * 0.8) * 0.7, riserProgress * 0.6, 0.4],
      });
    }
    return { events, anticipations };
  }

  // ============================================================================
  // ACT V (Bars 64..79, 16 FULL Bars = 2 COMPLETE 8-Bar Thematic Cycles!):
  // Pass 1 (64..71): Singularity Crown Convergence
  // Pass 2 (72..79): Ecstatic Second Pass with Acid + Glass Counterpoint & Full Bar 78..79 C7b9 Cadence!
  // ============================================================================
  if (section.id === 'apex-convergence') {
    const relBar = bar - 64;
    const cycleBar = relBar % 8; // Completes 0..7 TWICE cleanly (ends at Bar 79, cycleBar=7!)
    const isSecondPass = relBar >= 8;
    const harmony = CHORD_CYCLE_8BAR[Math.floor(cycleBar / 2)];

    // 1. Massive Polychordal Wall of Sound + Crystalline Glass Halo on Pass 2!
    if (cycleBar % 2 === 0 && step16 === 0) {
      emit({
        subsystem: 'bellows-choir',
        velocity: 1.18,
        pitchRatio: 1,
        chordNotes: [...harmony.chord, harmony.chord[0] + 12],
        durationSec: beatSec * 7.9,
        decay: 1.4,
        locus: [0, 0.25, 0],
      });
      emit({
        subsystem: 'arc-discharge',
        velocity: 1.05,
        pitchRatio: 1.2,
        decay: 0.9,
        locus: [0, 0.6, -0.3],
      });
      if (isSecondPass) {
        emit({
          subsystem: 'glass-armonica',
          velocity: 0.95,
          pitchRatio: 1,
          midiNote: harmony.chord[2] + 12,
          durationSec: beatSec * 7.2,
          decay: 1.35,
          locus: [0.5, 0.75, 0.2],
        });
      }
    }

    // 2. Octave-Doubled Seed Motif Unison (completes ALL 8 bars in both Pass 1 & Pass 2!)
    for (const mNote of ARIA_MELODY_8BAR) {
      if (mNote.barOffset === cycleBar && mNote.step16 === step16) {
        emit({
          subsystem: 'larynx-lead',
          velocity: 1.12,
          pitchRatio: 1,
          midiNote: mNote.midi,
          vowel: mNote.vowel,
          durationSec: mNote.durBeats * beatSec,
          decay: 1.2,
          locus: [0, 0.5, 0.5],
        });
        emit({
          subsystem: 'modal-clang',
          velocity: 0.88,
          pitchRatio: 1,
          midiNote: mNote.midi + 12,
          durationSec: 0.65,
          decay: 1.0,
          sliceIndex: mNote.midi - 60,
          locus: [-0.72, 0.3, 0.35],
        });
      }
    }

    // 3. Driving Monolith Bass + Blistering 303 Acid Counterpoint!
    if ([0, 3, 6, 10, 13].includes(step16)) {
      emit({
        subsystem: 'core-implode',
        velocity: step16 === 0 ? 1.15 : 0.88,
        pitchRatio: 1,
        midiNote: step16 === 10 ? harmony.bassFifth : harmony.bassRoot,
        durationSec: step16Sec * 2.6,
        decay: 0.9,
        locus: [0, -0.4, 0.2],
      });
    }

    if ([2, 5, 9, 11, 14].includes(step16) && (isSecondPass || step16 === 9 || step16 === 14)) {
      emit({
        subsystem: 'acid-squelch',
        velocity: 0.86,
        pitchRatio: 1,
        midiNote:
          harmony.acidArp[(step16 + cycleBar) % harmony.acidArp.length] +
          (isSecondPass && step16 === 14 ? 12 : 0),
        vowel: step16 === 14 ? 0.85 : 0.35,
        durationSec: step16Sec * 1.5,
        decay: 0.88,
        locus: [-0.55, -0.2, 0.4],
      });
    }

    if (cycleBar % 2 === 1 && step16 === 11 && hGlitch < 0.65) {
      emit({
        subsystem: 'glitch-chirp',
        velocity: 0.85,
        pitchRatio: 1.35,
        midiNote: 84,
        decay: 0.75,
        sliceIndex: bar + step16,
        locus: [0.72, 0.6, 0.35],
      });
    }

    // 4. Full Striker + Breakcore Fury (with grand cadential climax fill in Bar 79!)
    if (step16 === 14) {
      emitWindup('sub-rupture', 1.18, 2, false);
    }
    if ([0, 6, 10].includes(step16)) {
      emit({
        subsystem: 'sub-rupture',
        velocity: step16 === 0 ? 1.28 : 1.05,
        pitchRatio: 1.0,
        decay: 0.95,
        locus: [0.7, -0.5, 0.45],
      });
    }
    if (step16 === 4 || step16 === 12) {
      if (bar === 79 && step16 === 12) {
        // Grand final cadential drum/glitch roll resolving Act V onto Act VI's Fm9 at Bar 80!
        const finalBursts = 8;
        const offsets = computeRatchetBurstOffsets(finalBursts, step16Sec * 3.85, 0.82);
        offsets.forEach((off, idx) => {
          emit(
            {
              subsystem: idx % 3 === 2 ? 'glitch-chirp' : 'spine-shear',
              velocity: 1.1 * Math.pow(0.95, idx),
              pitchRatio: 1.05 - idx * 0.03,
              decay: 0.5,
              sliceIndex: idx * 2,
              locus: [(idx % 2 === 0 ? 1 : -1) * 0.68, 0.3, 0.4],
              ratchetStep: idx,
              ratchetTotal: finalBursts,
            },
            off,
          );
        });
      } else {
        emit({
          subsystem: 'spine-shear',
          velocity: 1.16,
          pitchRatio: 1.04,
          decay: 0.9,
          locus: [0.6, 0.25, 0.35],
        });
      }
    }

    const chop = evaluateBreakChop(bar, step16, 0.65 + params.chaos * 0.35, 909);
    if (chop.ratchetCount > 1 && (step16 === 7 || step16 === 15)) {
      const rHits = Math.min(
        8,
        Math.max(3, Math.round(chop.ratchetCount * (0.7 + params.drillDensity))),
      );
      const offsets = computeRatchetBurstOffsets(rHits, step16Sec * 1.9, 0.76);
      offsets.forEach((off, idx) => {
        emit(
          {
            subsystem: idx % 2 === 0 ? 'break-shred' : 'fin-cascade',
            velocity: 0.92 * Math.pow(0.93, idx),
            pitchRatio: chop.pitchRatio * (1 + idx * 0.07),
            decay: 0.42,
            sliceIndex: chop.sliceIndex,
            reverse: params.forceReverse || chop.reverse,
            locus: [-0.55, 0.2, 0.35],
            ratchetStep: idx,
            ratchetTotal: rHits,
          },
          off,
        );
      });
    } else if (step16 % 2 === 0 || hB < 0.55) {
      emit({
        subsystem: 'break-shred',
        velocity: 0.84,
        pitchRatio: chop.pitchRatio,
        decay: 0.88,
        sliceIndex: chop.sliceIndex,
        reverse: params.forceReverse || chop.reverse,
        locus: [-0.5, 0.15, 0.35],
      });
    }

    return { events, anticipations };
  }

  // ============================================================================
  // ACT VI (Bars 80..95, 16 Bars): ENTROPIC DISSOLVE & MONOLITH FOLD
  // ============================================================================
  const relEnd = bar - 80;

  // Bar 80 Step 0: Cathartic Fm9 tonic resolution after Bar 79's C7b9 climax!
  if (relEnd === 0 && step16 === 0) {
    emit({
      subsystem: 'sub-rupture',
      velocity: 1.2,
      pitchRatio: 1.0,
      decay: 1.6,
      locus: [0.65, -0.5, 0.4],
    });
    emit({
      subsystem: 'bellows-choir',
      velocity: 0.92,
      pitchRatio: 1,
      chordNotes: [41, 53, 56, 60, 67], // Resolved Fm9!
      durationSec: beatSec * 16,
      decay: 1.8,
      locus: [0, 0.15, 0],
    });
    emit({
      subsystem: 'glass-armonica',
      velocity: 0.88,
      pitchRatio: 1,
      midiNote: 79, // G5 crystalline 9th shimmer
      durationSec: beatSec * 12,
      decay: 1.6,
      locus: [0.4, 0.7, 0.2],
    });
  }

  if (relEnd === 4 && step16 === 0) {
    emit({
      subsystem: 'glass-armonica',
      velocity: 0.72,
      pitchRatio: 1,
      midiNote: 72, // C5 fifth halo
      durationSec: beatSec * 12,
      decay: 1.5,
      locus: [-0.4, 0.65, 0.2],
    });
  }

  // Decelerating mechanical coast-down across Bars 80..86
  if (relEnd < 7 && step16 % (relEnd < 2 ? 3 : relEnd < 4 ? 5 : 8) === 0) {
    emit({
      subsystem: 'fin-cascade',
      velocity: 0.55 * (1 - relEnd * 0.12),
      pitchRatio: 0.92 - relEnd * 0.06,
      decay: 0.8,
      sliceIndex: 4,
      locus: [0.1, -0.25, 0.2],
    });
  }

  // Faint dying glitch-chirp memory sparks in Bars 83 & 87
  if ((bar === 83 || bar === 87) && step16 === 10) {
    emit({
      subsystem: 'glitch-chirp',
      velocity: 0.42,
      pitchRatio: 0.85,
      midiNote: 65,
      decay: 0.9,
      sliceIndex: bar,
      locus: [0.3, 0.4, 0.2],
    });
  }

  // Bars 89..92: Fragile final Seed Motif echo (C5 - Db5 - Ab4 - G4 - F4) folding into stillness
  const farewellSeed: Array<[number, number, number]> = [
    [89, 0, 72],
    [89, 10, 73],
    [90, 6, 68],
    [91, 2, 67],
    [91, 12, 65],
  ];
  for (const [b, s, midi] of farewellSeed) {
    if (bar === b && step16 === s) {
      emit({
        subsystem: 'modal-clang',
        velocity: 0.68,
        pitchRatio: 1,
        midiNote: midi,
        durationSec: 2.3,
        decay: 1.85,
        sliceIndex: midi - 60,
        locus: [-0.65, 0.2, 0.35],
      });
    }
  }

  // Bar 95 Step 8: Quiet terminal precision lock into FOLDED_MONOLITH
  if (bar === 95 && step16 === 8) {
    emit({
      subsystem: 'piston-snap',
      velocity: 0.52,
      pitchRatio: 0.68,
      decay: 0.5,
      locus: [0, 0.3, 0.4],
    });
  }

  return { events, anticipations };
}

export function evaluateGantzStep(
  step64: number,
  bar: number,
  audioTime: number,
  params: ScoreEvalParams,
): ImpulseEvent[] {
  return evaluateGantzStepBundle(step64, bar, audioTime, params).events;
}

/**
 * Morph-Following Cinematography & Selective Montage Director across all 96 Bars!
 * Prioritizes fluid multi-bar flying/orbiting trajectories that follow the machine's
 * topological transformations, punctuated by earned razor-sharp structural cuts.
 */
export function evaluateGantzMontageCut(
  barInput: number,
  step16: number,
  barFraction: number,
): ShotCutDirective | null {
  const bar = ((barInput % GANTZ_TOTAL_BARS) + GANTZ_TOTAL_BARS) % GANTZ_TOTAL_BARS;

  // ACT I (Bars 0..11): Intimate 85mm Macro on Folded Monolith -> Bar 6 Hard Cut & Unfold Orbit!
  if (bar < 12) {
    if (bar === 0 && step16 === 0) {
      return { shot: 'macro-fault-seams', transition: 'hard' };
    }
    // BAR 6 STEP 0: First shockwave — hard cut out & smoothly follow the Cantilever unfold!
    if (bar === 6 && step16 === 0) {
      return { shot: 'morph-orbit', transition: 'hard' };
    }
    if (bar === 9 && step16 === 0) {
      return { shot: 'cunningham-boom-track', transition: 'morph-follow' };
    }
    return null;
  }

  // ACT II (Bars 12..27): Fluid 4-bar tracking passes following Cantilever & Helix transformations!
  if (bar < 28) {
    if (bar === 12 && step16 === 0) {
      return { shot: 'cunningham-boom-track', transition: 'morph-follow' };
    }
    if (bar === 16 && step16 === 0) {
      return { shot: 'low-horizon-dutch', transition: 'whip' };
    }
    // Bar 20: Machine twists into Non-Euclidean Helix + Acid enters -> spiral corkscrew flight!
    if (bar === 20 && step16 === 0) {
      return { shot: 'helix-corkscrew', transition: 'morph-follow' };
    }
    if (bar === 24 && step16 === 0) {
      return { shot: 'wrist-snorricam', transition: 'hard' };
    }
    if (bar === 26 && step16 === 0) {
      return { shot: 'morph-orbit', transition: 'morph-follow' };
    }
    return null;
  }

  // ACT III (Bars 28..51): Continuous Dive INSIDE the 18m Hollow Inverted Cathedral!
  if (bar < 52) {
    // Bar 28: Seamless flying penetration into the hollow Inverted Cathedral shell!
    if (bar === 28 && step16 === 0) {
      return { shot: 'interior-dive', transition: 'morph-follow' };
    }
    if (bar === 36 && step16 === 0) {
      return { shot: 'morph-orbit', transition: 'morph-follow' };
    }
    if (bar === 40 && step16 === 0) {
      return { shot: 'interior-dive', transition: 'morph-follow' };
    }
    // Bars 44..47: Beatless levitation floating high along the polar mandala axis!
    if (bar === 44 && step16 === 0) {
      return { shot: 'axial-mandala', transition: 'morph-follow' };
    }
    // Bars 48..51 (Glitch-Cadence Bridge): Corkscrew along the twisting deconstruction!
    if (bar === 48 && step16 === 0) {
      return { shot: 'helix-corkscrew', transition: 'morph-follow' };
    }
    return null;
  }

  // ACT IV (Bars 52..63): Sharp Gantz-Graf Shatter Cuts + 4-Bar Hitchcock Vertigo Zolly!
  if (bar < 64) {
    if (bar < 60) {
      if (step16 === 0) {
        const cadenzaAngles: ShotCutDirective['shot'][] = [
          'macro-fault-seams',
          'wrist-snorricam',
          'low-horizon-dutch',
          'cunningham-boom-track',
        ];
        return {
          shot: cadenzaAngles[(bar - 52) % cadenzaAngles.length],
          transition: 'hard',
        };
      }
      // Beat 4 (step16 === 12): Frozen zero-gravity cubic shatter lock — instant wide/polar cut!
      if (step16 === 12) {
        return {
          shot: bar % 2 === 0 ? 'axial-mandala' : 'morph-orbit',
          transition: 'hard',
        };
      }
      return null;
    }

    // Bars 60..63 Beat 2 (3.5 bars): HITCHCOCK VERTIGO DOLLY-ZOOM!
    const riserBars = bar - 60 + barFraction;
    if (riserBars < 3.5) {
      return {
        shot: 'interior-dive',
        transition: 'vertigo',
        rampProgress: Math.max(0, Math.min(1, riserBars / 3.5)),
      };
    }

    // Bar 63 Beats 3..4: 2-Beat Pre-Drop Dead Silence — razor macro on compressed Monolith!
    if (bar === 63 && step16 >= 8) {
      return { shot: 'macro-fault-seams', transition: 'hard' };
    }
    return null;
  }

  // ACT V (Bars 64..79): SINGULARITY CROWN — Sweeping Multi-Bar Flights + SnorriCam Bursts!
  if (bar < 80) {
    if (bar === 64 && step16 === 0) {
      return { shot: 'morph-orbit', transition: 'hard' };
    }
    if (bar === 68 && step16 === 0) {
      return { shot: 'interior-dive', transition: 'morph-follow' };
    }
    if (bar === 71 && step16 === 0) {
      return { shot: 'wrist-snorricam', transition: 'hard' };
    }
    // Pass 2 (Bars 72..79): Grand continuous sweep inside & around the Crown!
    if (bar === 72 && step16 === 0) {
      return { shot: 'helix-corkscrew', transition: 'morph-follow' };
    }
    if (bar === 76 && step16 === 0) {
      return { shot: 'low-horizon-dutch', transition: 'whip' };
    }
    if (bar === 78 && step16 === 0) {
      return { shot: 'morph-orbit', transition: 'morph-follow' };
    }
    return null;
  }

  // ACT VI (Bars 80..95): Interior Dissolve -> 8-Bar Singularity Fold & Horizon Pull-Back!
  if (bar < 88) {
    if (bar === 80 && step16 === 0) {
      return { shot: 'interior-dive', transition: 'morph-follow' };
    }
    if (bar === 84 && step16 === 0) {
      return { shot: 'macro-fault-seams', transition: 'morph-follow' };
    }
    return null;
  }

  const pullbackProgress = Math.max(
    0,
    Math.min(1, (bar - 88 + barFraction) / 8.0),
  );
  return {
    shot: 'morph-orbit',
    transition: 'epic-pullback',
    rampProgress: pullbackProgress,
  };
}
