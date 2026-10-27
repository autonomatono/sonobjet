import { SeededRandom } from '../../engine/core/SeededRandom';
import type { ImpulseEvent, SectionDefinition } from '../../engine/core/types';
import {
  computeRatchetBurstOffsets,
  euclideanPattern,
  evaluateBreakChop,
} from '../../kit/sequencer/IDMSequencer';

export const GANTZ_SECTIONS: SectionDefinition[] = [
  {
    id: 'ignition',
    name: 'I. PNEUMATIC IGNITION',
    startBar: 0,
    endBar: 8,
    intensity: 0.35,
    description: 'Isolated hydraulic snaps, tense chamber silence, bouncing-ball steel pawls',
  },
  {
    id: 'fracture-break',
    name: 'II. FRACTURE BREAK',
    startBar: 8,
    endBar: 24,
    intensity: 0.76,
    description: 'Syncopated 16-slice breakcore chop interlocked with tectonic spine shears',
  },
  {
    id: 'hyper-drill',
    name: 'III. HYPER-DRILL AGGLOMERATE',
    startBar: 24,
    endBar: 40,
    intensity: 1.0,
    description: 'Exponential 12x micro-ratchet drills, folded monolith bass, arc discharges',
  },
  {
    id: 'cad-disassembly',
    name: 'IV. SUSPENDED DISASSEMBLY',
    startBar: 40,
    endBar: 52,
    intensity: 0.48,
    description: 'Exploded-CAD suspension, reversed ghost slices, resonant titanium plate modes',
  },
  {
    id: 'terminal-lock',
    name: 'V. TERMINAL TECTONIC LOCK',
    startBar: 52,
    endBar: 64,
    intensity: 0.96,
    description: 'Polyrhythmic overload converging on razor-sharp mechanical dead-stop lock',
  },
];

export interface ScoreEvalParams {
  chaos: number; // 0..1
  drillDensity: number; // 0..1
  forceRatchet: boolean;
  forceReverse: boolean;
  step64DurSec: number;
}

/**
 * Generates sample-accurate unified ImpulseEvents for a given 1/64-note grid tick.
 */
export function evaluateGantzStep(
  step64: number,
  bar: number,
  audioTime: number,
  params: ScoreEvalParams,
): ImpulseEvent[] {
  const events: ImpulseEvent[] = [];
  const isQuarter16 = step64 % 4 === 0;
  const step16 = Math.floor(step64 / 4);
  const global16 = bar * 16 + step16;
  const beat = bar * 4 + step64 / 16;

  const hA = SeededRandom.hashStep(global16, 11, 707);
  const hB = SeededRandom.hashStep(global16, 23, 808);
  const hC = SeededRandom.hashStep(bar * 64 + step64, 37, 909);

  const section =
    GANTZ_SECTIONS.find((s) => bar >= s.startBar && bar < s.endBar) ??
    GANTZ_SECTIONS[0];

  // Bar 63 beats 3.5..4: Stark Autechre dead-stop mechanical lock before loop!
  if (bar === 63 && step64 >= 52) {
    if (step64 === 52) {
      events.push({
        subsystem: 'piston-snap',
        velocity: 1.25,
        pitchRatio: 0.65,
        decay: 0.4,
        locus: [0, 0, 1],
        audioTime,
        beat,
        origin: 'score',
      });
    }
    return events;
  }

  const pushImpulse = (
    partial: Omit<ImpulseEvent, 'audioTime' | 'beat' | 'origin'>,
    timeOffset = 0,
  ) => {
    events.push({
      ...partial,
      audioTime: audioTime + timeOffset,
      beat,
      origin: 'score',
    });
  };

  // Live Force-Ratchet Punch-In: fires furious 64th-note machine-gun bursts on every grid tick!
  if (params.forceRatchet && step64 % 2 === 0) {
    const panX = Math.sin(step64 * 0.7) * 0.85;
    pushImpulse({
      subsystem: step64 % 4 === 0 ? 'spine-shear' : 'fin-cascade',
      velocity: 0.82,
      pitchRatio: 0.9 + (step64 % 16) * 0.06,
      decay: 0.42,
      locus: [panX, 0.2, 0.4],
    });
  }

  // Only evaluate primary compositional lanes on 16th boundaries (sub-64ths come via exact ratchet offsets)
  if (!isQuarter16) {
    // Occasional off-grid 64th micro-glitch ticks in high-intensity movements
    if (
      (section.id === 'hyper-drill' || section.id === 'terminal-lock') &&
      hC < 0.09 * (0.4 + params.drillDensity)
    ) {
      pushImpulse({
        subsystem: 'fin-cascade',
        velocity: 0.48 + hC * 0.4,
        pitchRatio: 1.3 + hB * 0.9,
        decay: 0.35,
        locus: [(hA - 0.5) * 1.8, (hB - 0.5) * 1.4, 0.3],
      });
    }
    return events;
  }

  const step16Sec = params.step64DurSec * 4;

  // --- MOVEMENT I: PNEUMATIC IGNITION (Stark Gantz-style mechanical convulsions) ---
  if (section.id === 'ignition') {
    const ignitionKickSteps = [0, 7, 10];
    if (ignitionKickSteps.includes(step16) && (bar % 2 === 0 || step16 === 0)) {
      pushImpulse({
        subsystem: 'sub-rupture',
        velocity: 1.05,
        pitchRatio: 1.0,
        decay: 0.95,
        locus: [0, -0.3, 0.6],
      });
    }

    if (step16 === 4 || (step16 === 13 && bar % 2 === 1)) {
      pushImpulse({
        subsystem: 'piston-snap',
        velocity: 0.92,
        pitchRatio: 0.85 + (bar % 3) * 0.22,
        decay: 0.9,
        locus: [step16 === 4 ? -0.75 : 0.75, 0.3, 0.2],
      });
    }

    // Signature bouncing-ball accelerating steel ratchet burst every 2 bars!
    if ((step16 === 11 || step16 === 14) && hA < 0.68) {
      const burstCount = 5 + Math.floor(params.drillDensity * 6);
      const offsets = computeRatchetBurstOffsets(
        burstCount,
        step16Sec * 1.85,
        0.74,
      );
      offsets.forEach((off, idx) => {
        pushImpulse(
          {
            subsystem: idx === 0 ? 'modal-clang' : 'fin-cascade',
            velocity: 0.88 * Math.pow(0.92, idx),
            pitchRatio: 0.95 + idx * 0.11,
            decay: 0.65,
            locus: [Math.cos(idx) * 0.8, Math.sin(idx) * 0.6, 0.4],
            ratchetStep: idx,
            ratchetTotal: burstCount,
          },
          off,
        );
      });
    }

    if (bar >= 4 && step16 === 12) {
      pushImpulse({
        subsystem: 'spine-shear',
        velocity: 1.0,
        pitchRatio: 1.05,
        decay: 0.85,
        locus: [0.6, 0.4, 0],
      });
    }
    return events;
  }

  // --- MOVEMENT IV: SUSPENDED CAD DISASSEMBLY (Atmospheric Exploded Half-Time) ---
  if (section.id === 'cad-disassembly') {
    if (step16 === 0 || (step16 === 9 && bar % 2 === 1)) {
      pushImpulse({
        subsystem: 'core-implode',
        velocity: 0.95,
        pitchRatio: bar % 4 === 3 ? 1.189 : 1.0,
        decay: 1.45,
        locus: [0, 0, 0],
      });
    }

    const modalEuclid = euclideanPattern(5, 16, bar % 5);
    if (modalEuclid[step16]) {
      const scaleRatios = [1.0, 1.122, 1.334, 1.498, 1.781];
      pushImpulse({
        subsystem: 'modal-clang',
        velocity: 0.62 + hA * 0.25,
        pitchRatio: scaleRatios[(step16 + bar) % scaleRatios.length],
        decay: 1.35,
        locus: [Math.sin(step16) * 0.85, Math.cos(step16) * 0.65, 0.2],
      });
    }

    if (step16 === 8) {
      pushImpulse({
        subsystem: 'break-shred',
        velocity: 0.78,
        pitchRatio: 0.68,
        decay: 1.3,
        sliceIndex: 4,
        reverse: true,
        locus: [-0.5, 0.3, 0.5],
      });
    }

    if (step16 === 15 && hB < 0.7) {
      pushImpulse({
        subsystem: 'arc-discharge',
        velocity: 0.85,
        pitchRatio: 1.4,
        decay: 1.1,
        locus: [0.7, 0.7, -0.3],
      });
    }
    return events;
  }

  // --- MOVEMENTS II, III, V: FULL IDM / BREAKCORE ASSAULT ---
  const intensity = section.intensity;
  const effectiveChaos = Math.min(1, params.chaos * 0.7 + intensity * 0.35);

  // 1. Chopped 16-Slice Procedural Breakcore Engine
  const chop = evaluateBreakChop(bar, step16, effectiveChaos, 1997);
  const reverseSlice = params.forceReverse || chop.reverse;

  const playBreakStep =
    step16 % 2 === 0 || hA < 0.55 + params.drillDensity * 0.35;
  if (playBreakStep) {
    const rCount =
      section.id === 'hyper-drill' || section.id === 'terminal-lock'
        ? Math.min(10, Math.round(chop.ratchetCount * (0.6 + params.drillDensity)))
        : 1;

    if (rCount <= 1) {
      pushImpulse({
        subsystem: 'break-shred',
        velocity: step16 % 4 === 0 ? 0.96 : 0.74,
        pitchRatio: chop.pitchRatio,
        decay: 0.95,
        sliceIndex: chop.sliceIndex,
        reverse: reverseSlice,
        locus: [((chop.sliceIndex % 5) - 2) * 0.38, 0.1, 0.4],
      });
    } else {
      const offsets = computeRatchetBurstOffsets(rCount, step16Sec, 0.82);
      offsets.forEach((off, idx) => {
        pushImpulse(
          {
            subsystem: idx % 2 === 0 ? 'break-shred' : 'spine-shear',
            velocity: 0.88 * Math.pow(0.93, idx),
            pitchRatio: chop.pitchRatio * (1 + idx * 0.08),
            decay: 0.45,
            sliceIndex: chop.sliceIndex,
            reverse: reverseSlice,
            locus: [Math.sin(idx * 1.7) * 0.85, Math.cos(idx * 1.3) * 0.6, 0.3],
            ratchetStep: idx,
            ratchetTotal: rCount,
          },
          off,
        );
      });
    }
  }

  // 2. Heavy Seismic Sub-Rupture Kick Anchors + Syncopated Off-Grid Punches
  const kickMask =
    bar % 4 === 3
      ? [0, 3, 6, 10, 14]
      : [0, 2, 10, ...(hB < 0.45 ? [7] : [])];
  if (kickMask.includes(step16)) {
    pushImpulse({
      subsystem: 'sub-rupture',
      velocity: step16 === 0 ? 1.18 : 0.95,
      pitchRatio: step16 === 14 ? 1.15 : 1.0,
      decay: 0.88,
      locus: [0, -0.4, 0.7],
    });
  }

  // 3. Brutal Spine-Shear Snares & Turnaround Drills
  if (step16 === 4 || step16 === 12 || (step16 === 15 && hA < 0.55)) {
    const isDrill =
      (bar % 2 === 1 && step16 === 12) ||
      (section.id === 'hyper-drill' && step16 === 4 && hB < 0.45);

    if (!isDrill) {
      pushImpulse({
        subsystem: 'spine-shear',
        velocity: 1.08,
        pitchRatio: 0.96 + hA * 0.2,
        decay: 0.85,
        locus: [step16 === 4 ? -0.65 : 0.65, 0.35, 0.25],
      });
    } else {
      const drillHits = 4 + Math.floor(params.drillDensity * 8);
      const offsets = computeRatchetBurstOffsets(drillHits, step16Sec * 1.9, 0.72);
      offsets.forEach((off, idx) => {
        pushImpulse(
          {
            subsystem: 'spine-shear',
            velocity: 1.0 * Math.pow(0.94, idx),
            pitchRatio: 0.92 + idx * 0.12,
            decay: 0.36,
            locus: [(idx % 2 === 0 ? 1 : -1) * 0.75, 0.4, 0.2],
            ratchetStep: idx,
            ratchetTotal: drillHits,
          },
          off,
        );
      });
    }
  }

  // 4. Folded FM Monolith Sub-Bass (Movement III & V)
  if (section.id === 'hyper-drill' || section.id === 'terminal-lock') {
    const bassEuclid = euclideanPattern(5, 16, 2);
    if (bassEuclid[step16]) {
      const bassIntervals = [1.0, 1.0, 0.891, 1.189, 1.335];
      pushImpulse({
        subsystem: 'core-implode',
        velocity: 0.86,
        pitchRatio: bassIntervals[(bar + step16) % bassIntervals.length],
        decay: 0.75,
        locus: [0, -0.2, 0],
      });
    }
  }

  // 5. Polymetric Titanium Cooling-Fin & Modal Accents
  if ((global16 % 3 === 0 && hB < 0.65) || section.id === 'terminal-lock') {
    pushImpulse({
      subsystem: global16 % 9 === 0 ? 'modal-clang' : 'fin-cascade',
      velocity: 0.62 + hC * 0.28,
      pitchRatio: 0.85 + ((global16 * 7) % 11) * 0.11,
      decay: 0.6,
      locus: [Math.cos(global16) * 0.9, Math.sin(global16) * 0.7, 0.3],
    });
  }

  // 6. High-Voltage Arc Discharges at Bar Boundaries & Climax
  if (
    (step16 === 0 && bar % 4 === 0) ||
    (section.id === 'terminal-lock' && step16 % 6 === 0 && hA < 0.6)
  ) {
    pushImpulse({
      subsystem: 'arc-discharge',
      velocity: 0.95,
      pitchRatio: 0.9 + hB * 0.8,
      decay: 0.85,
      locus: [(hA - 0.5) * 1.6, 0.8, (hB - 0.5) * 1.4],
    });
  }

  return events;
}
