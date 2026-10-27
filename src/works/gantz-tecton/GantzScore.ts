import { SeededRandom } from '../../engine/core/SeededRandom';
import type {
  AnticipationCue,
  ImpulseEvent,
  SectionDefinition,
} from '../../engine/core/types';
import {
  computeRatchetBurstOffsets,
  evaluateBreakChop,
} from '../../kit/sequencer/IDMSequencer';

export const GANTZ_SECTIONS: SectionDefinition[] = [
  {
    id: 'stasis-seed',
    name: 'I. LATENT BREATH & SEED MOTIF',
    startBar: 0,
    endBar: 12,
    intensity: 0.25,
    description:
      'Chamber silence, metabolic breath, naked plucked Seed Motif (C-Db-Ab-G-F), first anvil slam',
  },
  {
    id: 'asymmetric-loom',
    name: 'II. ASYMMETRIC LOOM (CALL / RESPONSE)',
    startBar: 12,
    endBar: 28,
    intensity: 0.65,
    description:
      '3+3+4+3+3 biomechanical groove: Right Siege-Hammer Call vs Left Mantis-Harp Response + Bass entry',
  },
  {
    id: 'larynx-aria',
    name: 'III. LARYNX ARIA OVER BREAKCORE',
    startBar: 28,
    endBar: 48,
    intensity: 0.86,
    description:
      'Soaring F-Phrygian vocal-formant melody & bellows polychords over structured breakcore + Bar 44 choir suspension',
  },
  {
    id: 'flywheel-cadenza',
    name: 'IV. FLYWHEEL CADENZA & RISER',
    startBar: 48,
    endBar: 60,
    intensity: 0.78,
    description:
      'Exposed steel stop-start ratchets, 4-bar pitch/density riser, and 2-beat pre-climax dead silence',
  },
  {
    id: 'apex-convergence',
    name: 'V. APEX CONVERGENCE',
    startBar: 60,
    endBar: 72,
    intensity: 1.0,
    description:
      'Full thematic recapitulation: octave-doubled Seed Motif + polychords + ferocious breakcore & anvil sparks',
  },
  {
    id: 'exhaustion',
    name: 'VI. EXHAUSTION & STILLNESS',
    startBar: 72,
    endBar: 80,
    intensity: 0.28,
    description:
      'Coasting flywheel, panting rib-vents, fragile final Seed Motif echo into terminal latch lock',
  },
];

// --- MUSICAL ARCHITECTURE IN F PHRYGIAN / F MINOR ---
// 4-Chord 8-Bar Progression: Fm(add b9) -> Db Lydian(#11) -> Bbm9 -> C7(b9,#9)
const CHORD_CYCLE_8BAR: Array<{
  chord: number[];
  bassRoot: number;
  bassFifth: number;
}> = [
  // Bars 0..1: F minor (add 9 / b9)
  { chord: [53, 56, 60, 65, 67], bassRoot: 29, bassFifth: 36 },
  // Bars 2..3: Db Lydian (#11) — poignant Warp lift
  { chord: [49, 56, 60, 65, 67], bassRoot: 25, bassFifth: 32 },
  // Bars 4..5: Bb minor 9
  { chord: [46, 53, 58, 60, 65], bassRoot: 34, bassFifth: 29 },
  // Bars 6..7: C7 Phrygian Dominant (E natural + Db + Eb tension)
  { chord: [48, 52, 58, 61, 63], bassRoot: 24, bassFifth: 30 },
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
  { barOffset: 0, step16: 0, midi: 72, durBeats: 1.5, vowel: 0.1 }, // C5 'AH'
  { barOffset: 0, step16: 6, midi: 73, durBeats: 1.0, vowel: 0.45 }, // Db5 'EE'
  { barOffset: 0, step16: 10, midi: 68, durBeats: 1.5, vowel: 0.72 }, // Ab4 'OH'
  { barOffset: 1, step16: 0, midi: 67, durBeats: 1.0, vowel: 0.3 }, // G4
  { barOffset: 1, step16: 4, midi: 65, durBeats: 2.5, vowel: 0.85 }, // F4 'OO'

  // Phrase A2 (Rising Leap over Db Lydian #11): C5 -> Db5 -> F5 -> Eb5 -> C5
  { barOffset: 2, step16: 0, midi: 72, durBeats: 1.5, vowel: 0.15 }, // C5
  { barOffset: 2, step16: 6, midi: 73, durBeats: 1.0, vowel: 0.5 }, // Db5
  { barOffset: 2, step16: 10, midi: 77, durBeats: 2.0, vowel: 0.05 }, // F5 soar!
  { barOffset: 3, step16: 2, midi: 75, durBeats: 1.5, vowel: 0.35 }, // Eb5
  { barOffset: 3, step16: 8, midi: 72, durBeats: 2.0, vowel: 0.75 }, // C5

  // Phrase B1 (Yearning Descent over Bbm9): Db5 -> C5 -> Bb4 -> Ab4 -> F4
  { barOffset: 4, step16: 0, midi: 73, durBeats: 1.5, vowel: 0.2 }, // Db5
  { barOffset: 4, step16: 6, midi: 72, durBeats: 1.0, vowel: 0.45 }, // C5
  { barOffset: 4, step16: 10, midi: 70, durBeats: 1.5, vowel: 0.65 }, // Bb4
  { barOffset: 5, step16: 0, midi: 68, durBeats: 1.5, vowel: 0.8 }, // Ab4
  { barOffset: 5, step16: 6, midi: 65, durBeats: 2.2, vowel: 0.95 }, // F4

  // Phrase B2 (Phrygian Cadence over C7b9): G4 -> Ab4 -> Gb4 -> E4 -> F4 anticipation
  { barOffset: 6, step16: 0, midi: 67, durBeats: 1.5, vowel: 0.25 }, // G4
  { barOffset: 6, step16: 6, midi: 68, durBeats: 1.5, vowel: 0.5 }, // Ab4
  { barOffset: 6, step16: 12, midi: 66, durBeats: 1.5, vowel: 0.75 }, // Gb4 (b2!)
  { barOffset: 7, step16: 2, midi: 64, durBeats: 2.5, vowel: 0.45 }, // E4 leading tone!
];

export interface ScoreEvalParams {
  chaos: number; // 0..1
  drillDensity: number; // 0..1
  forceRatchet: boolean;
  forceReverse: boolean;
  step64DurSec: number;
}

export interface StepScheduleBundle {
  events: ImpulseEvent[];
  anticipations: AnticipationCue[];
}

/**
 * Evaluates the authored 80-bar 6-Act F-Phrygian biomechanical composition,
 * returning both sample-accurate ImpulseEvents and pre-strike AnticipationCues.
 */
export function evaluateGantzStepBundle(
  step64: number,
  bar: number,
  audioTime: number,
  params: ScoreEvalParams,
): StepScheduleBundle {
  const events: ImpulseEvent[] = [];
  const anticipations: AnticipationCue[] = [];

  const is16th = step64 % 4 === 0;
  const step16 = Math.floor(step64 / 4);
  const beat = bar * 4 + step64 / 16;
  const beatSec = params.step64DurSec * 16;
  const step16Sec = params.step64DurSec * 4;

  const hA = SeededRandom.hashStep(bar * 16 + step16, 11, 707);
  const hB = SeededRandom.hashStep(bar * 16 + step16, 23, 808);

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

  // Sub-16th steps are reserved for Act IV's 32nd/64th accelerating riser (or ratchet offsets)
  if (!is16th) {
    if (section.id === 'flywheel-cadenza' && bar >= 58 && bar < 59) {
      // Bar 58: 32nd & 64th note frenzy right before the 2-beat silence in Bar 59!
      if (step64 % 2 === 0) {
        const climbMidi = 65 + Math.floor((step64 / 64) * 12);
        emit({
          subsystem: 'modal-clang',
          velocity: 0.72,
          pitchRatio: 1.0,
          midiNote: climbMidi,
          durationSec: 0.14,
          decay: 0.45,
          sliceIndex: step64 % 16,
          locus: [-0.65, 0.2, 0.3],
        });
      }
    }
    return { events, anticipations };
  }

  // ============================================================================
  // ACT I (Bars 0..11): LATENT BREATH & THE SEED MOTIF
  // ============================================================================
  if (section.id === 'stasis-seed') {
    // Deep subterranean F1 breath pulse on Bar 0 & Bar 4
    if ((bar === 0 || bar === 4 || bar === 8) && step16 === 0) {
      emit({
        subsystem: 'bellows-choir',
        velocity: 0.55,
        pitchRatio: 1,
        chordNotes: [41, 48, 53, 56], // Low F minor dark breath
        durationSec: beatSec * 6.5,
        decay: 1.4,
        locus: [0, 0.1, 0],
      });
    }

    // Bars 2..3: Naked Plucked Steel Harp introduces the 5-note SEED MOTIF (C5-Db5-Ab4-G4-F4)!
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
          velocity: 0.84,
          pitchRatio: 1,
          midiNote: midi,
          durationSec: 1.4,
          decay: 1.5,
          sliceIndex: midi - 60,
          locus: [-0.68, 0.15, 0.35],
        });
      }
    }

    // Bar 5 Step 12: Audible & visual Siege-Hammer wind-up -> Bar 6 Step 0: DEVASTATING ANVIL SLAM!
    if (bar === 5 && step16 === 12) {
      emitWindup('sub-rupture', 1.2, 4, true);
    }
    if (bar === 6 && step16 === 0) {
      emit({
        subsystem: 'sub-rupture',
        velocity: 1.22,
        pitchRatio: 1.0,
        decay: 1.2,
        locus: [0.7, -0.5, 0.4],
      });
      // Followed 1 beat later by a single decelerating bouncing-ball steel pawl!
    }
    if (bar === 6 && step16 === 4) {
      const pawlOffsets = computeRatchetBurstOffsets(7, beatSec * 2.2, 1.24); // >1 decelerates like a dropped steel ball!
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

    // Bars 8..9: Awakening Larynx answers the Seed Motif an octave lower!
    const larynxAwake: Array<[number, number, number, number]> = [
      [8, 4, 60, 0.15], // C4
      [8, 10, 61, 0.5], // Db4
      [9, 0, 56, 0.78], // Ab3
      [9, 6, 55, 0.4], // G3
      [9, 10, 53, 0.92], // F3
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

    // Bars 10..11: Flywheel starts ticking 16ths + giant pneumatic wind-up into Act II!
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
  // ACT II (Bars 12..27): ASYMMETRIC LOOM — STRICT CALL & RESPONSE + BASS ENTRY
  // ============================================================================
  if (section.id === 'asymmetric-loom') {
    const isCallBar = bar % 2 === 0; // Even bar = Heavy Right Siege-Hammer Call; Odd bar = Agile Left Harp/Break Response!

    // Pre-cock hammer 2 steps before each Call Bar downbeat!
    if (!isCallBar && step16 === 14) {
      emitWindup('sub-rupture', 1.0, 2, false);
    }

    if (isCallBar) {
      // CALL: Signature 3 + 3 + 4 + 3 + 3 Biomechanical Skeleton (0, 3, 6, 10, 13)
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
      // RESPONSE: Left Mantis-Raker plucks syncopated Seed-Motif variations + crisp chopped break!
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
        2: 72, // C5
        5: 73, // Db5
        7: 68, // Ab4
        11: 67, // G4
        14: 65, // F4
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

      // Tight structured breakbeat counter-phrase on steps 4, 8, 10, 12, 15
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

    // Bar 20..27: Enter Pitched Wavefolded Monolith Bassline (F1 -> Ab1 -> Gb1 -> Db1 -> C1)!
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
    }

    // Bar 27 Turnaround Fill + Windup into Act III Aria!
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
  // ACT III (Bars 28..47): BIOMECHANICAL LARYNX ARIA OVER STRUCTURED BREAKCORE
  // ============================================================================
  if (section.id === 'larynx-aria') {
    const relBar = bar - 28;
    const cycleBar = relBar % 8;
    const harmony = CHORD_CYCLE_8BAR[Math.floor(cycleBar / 2)];
    const isChoirBreakdown = bar === 44 || bar === 45; // 2-bar drumless vocal suspension!

    // 1. Lush Bellows Polychord Change every 2 bars
    if (cycleBar % 2 === 0 && step16 === 0) {
      emit({
        subsystem: 'bellows-choir',
        velocity: isChoirBreakdown ? 1.05 : 0.88,
        pitchRatio: 1,
        chordNotes: harmony.chord,
        durationSec: beatSec * 7.8,
        decay: 1.3,
        locus: [0, 0.2, 0],
      });
    }

    // 2. Soaring Larynx Formant Melody (singing the authored 8-Bar Aria!)
    for (const mNote of ARIA_MELODY_8BAR) {
      if (mNote.barOffset === cycleBar && mNote.step16 === step16) {
        emit({
          subsystem: 'larynx-lead',
          velocity: 0.96,
          pitchRatio: 1,
          midiNote: mNote.midi + (relBar >= 8 ? 0 : -12), // 1st pass intimate C4, 2nd pass soaring C5!
          vowel: mNote.vowel,
          durationSec: mNote.durBeats * beatSec,
          decay: 1.15,
          locus: [0, 0.5, 0.45],
        });
        // Subtle sympathetic steel harp shimmer doubling key melody notes on 2nd pass!
        if (relBar >= 8 && step16 === 0) {
          emit({
            subsystem: 'modal-clang',
            velocity: 0.54,
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

    // 3. Harmonic Bassline (continues underneath, holds long pedal in breakdown)
    if (isChoirBreakdown) {
      if (step16 === 0) {
        emit({
          subsystem: 'core-implode',
          velocity: 0.85,
          pitchRatio: 1,
          midiNote: harmony.bassRoot,
          durationSec: beatSec * 3.8,
          decay: 1.4,
          locus: [0, -0.3, 0],
        });
      }
      return { events, anticipations }; // Keep bars 44-45 purely vocal + chordal!
    }

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

    // 4. Structured Amen / IDM Breakbeat Architecture (with authored 4-bar turnarounds)
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

    const isTurnaroundBar = cycleBar === 3 || cycleBar === 7 || bar === 47;
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

    // Flowing 16-slice break glue
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
  // ACT IV (Bars 48..59): FLYWHEEL CADENZA (STOP-START) & 4-BAR TENSION RISER
  // ============================================================================
  if (section.id === 'flywheel-cadenza') {
    // PART A (Bars 48..55): Autechre Gantz Graf Stop-Start Mechanical Cadenza!
    // Beats 1..3 = hyper-precise spatial steel bursts; Beat 4 (steps 12..15) = TOTAL DEAD SILENCE!
    if (bar < 56) {
      if (step16 >= 12) {
        if (step16 === 12) {
          // Sharp hydraulic brake clamp click into silence!
          emit({
            subsystem: 'piston-snap',
            velocity: 1.1,
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
          velocity: 1.18,
          pitchRatio: 1.0,
          decay: 0.75,
          locus: [0.7, -0.5, 0.4],
        });
      }

      if (step16 === 3 || step16 === 8) {
        const count = 5 + (bar % 4) * 2;
        const curve = bar % 2 === 0 ? 0.7 : 1.28; // Alternate accelerating vs decelerating springs!
        const offsets = computeRatchetBurstOffsets(
          count,
          step16Sec * 2.8,
          curve,
        );
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

    // PART B (Bars 56..59): 4-BAR UNBEARABLE PITCH & DENSITY RISER -> 2 BEATS DEAD SILENCE!
    if (bar === 59 && step16 >= 8) {
      // TWO FULL BEATS OF BREATHLESS SILENCE BEFORE THE CLIMAX DROP!
      if (step16 === 8) {
        emitWindup('sub-rupture', 1.4, 8, true); // Massive pneumatic inhale cocking hammer sky-high!
      }
      return { events, anticipations };
    }

    const riserProgress = ((bar - 56) * 16 + step16) / 56; // 0..1 across 3.5 bars
    const triggerModulo = bar === 56 ? 2 : 1; // 8ths -> 16ths (+ 32nds handled above in bar 58!)
    if (step16 % triggerModulo === 0) {
      const climbMidi = 53 + Math.round(riserProgress * 24); // F3 climbing 2 full octaves to F5!
      emit({
        subsystem: step16 % 4 === 0 ? 'spine-shear' : 'modal-clang',
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
  // ACT V (Bars 60..71): APEX CONVERGENCE (THE CLIMAX)
  // ============================================================================
  if (section.id === 'apex-convergence') {
    const relBar = bar - 60;
    const cycleBar = relBar % 8;
    const harmony = CHORD_CYCLE_8BAR[Math.floor(cycleBar / 2)];

    // 1. Massive Polychordal Wall of Sound
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
    }

    // 2. Octave-Doubled Seed Motif Unison (Larynx Lead + Plucked Steel Harp together!)
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
          midiNote: mNote.midi + 12, // Shimmering octave above!
          durationSec: 0.65,
          decay: 1.0,
          sliceIndex: mNote.midi - 60,
          locus: [-0.72, 0.3, 0.35],
        });
      }
    }

    // 3. Heavy Driving Monolith Bass
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

    // 4. Full Siege-Hammer + Breakcore Fury
    if (step16 === 14) {
      emitWindup('sub-rupture', 1.15, 2, false);
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
      emit({
        subsystem: 'spine-shear',
        velocity: 1.16,
        pitchRatio: 1.04,
        decay: 0.9,
        locus: [0.6, 0.25, 0.35],
      });
    }

    const chop = evaluateBreakChop(bar, step16, 0.65 + params.chaos * 0.35, 909);
    if (chop.ratchetCount > 1 && (step16 === 7 || step16 === 15)) {
      const rHits = Math.min(8, Math.max(3, Math.round(chop.ratchetCount * (0.7 + params.drillDensity))));
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
  // ACT VI (Bars 72..79): METABOLIC EXHAUSTION & TERMINAL STILLNESS
  // ============================================================================
  const relEnd = bar - 72;

  // Final warm F-minor unresolved pedal fading into chamber air
  if (relEnd === 0 && step16 === 0) {
    emit({
      subsystem: 'sub-rupture',
      velocity: 1.15,
      pitchRatio: 1.0,
      decay: 1.5,
      locus: [0.65, -0.5, 0.4],
    });
    emit({
      subsystem: 'bellows-choir',
      velocity: 0.82,
      pitchRatio: 1,
      chordNotes: [41, 53, 56, 60, 67], // Fm9 open fifth/ninth resonance
      durationSec: beatSec * 14,
      decay: 1.8,
      locus: [0, 0.15, 0],
    });
  }

  // Coasting-down flywheel ticks slowing down across bars 72..74
  if (relEnd < 3 && step16 % (relEnd === 0 ? 3 : relEnd === 1 ? 5 : 8) === 0) {
    emit({
      subsystem: 'fin-cascade',
      velocity: 0.55 * (1 - relEnd * 0.28),
      pitchRatio: 0.9 - relEnd * 0.15,
      decay: 0.8,
      sliceIndex: 4,
      locus: [0.1, -0.25, 0.2],
    });
  }

  // Bars 74..76: Solitary, fragile recapitulation of the 5-note SEED MOTIF on Steel Harp
  const farewellSeed: Array<[number, number, number]> = [
    [74, 4, 72], // C5
    [74, 12, 73], // Db5
    [75, 4, 68], // Ab4
    [75, 12, 67], // G4
    [76, 4, 65], // F4 (Home)
  ];
  for (const [b, s, midi] of farewellSeed) {
    if (bar === b && step16 === s) {
      emit({
        subsystem: 'modal-clang',
        velocity: 0.68,
        pitchRatio: 1,
        midiNote: midi,
        durationSec: 2.1,
        decay: 1.8,
        sliceIndex: midi - 60,
        locus: [-0.65, 0.2, 0.35],
      });
    }
  }

  // Bar 79 Step 8: Quiet terminal jaw/piston latch click into stillness before loop
  if (bar === 79 && step16 === 8) {
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

/** Backwards-compatible helper returning just the ImpulseEvents array */
export function evaluateGantzStep(
  step64: number,
  bar: number,
  audioTime: number,
  params: ScoreEvalParams,
): ImpulseEvent[] {
  return evaluateGantzStepBundle(step64, bar, audioTime, params).events;
}
