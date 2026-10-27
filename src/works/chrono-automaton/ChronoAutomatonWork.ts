import type {
  AnticipationCue,
  BehaviorMapEntry,
  ImpulseEvent,
  MacroDefinition,
  PatchRoute,
  RigJointDescriptor,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import {
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
  GANTZ_TOTAL_BARS,
} from '../gantz-tecton/GantzScore';
import { ChronoAutomaton } from './ChronoAutomaton';
import { ClockworkCameraDirector } from './ClockworkCameraDirector';

const V5_MACROS: MacroDefinition[] = [
  {
    id: 'opticalStylize',
    label: 'OPTICAL GRADE & GLITCH',
    min: 0,
    max: 1,
    defaultValue: 0.46,
    description: 'TSL scan-band glitch, anamorphic warp, RGB dispersion, bleach bypass and grain.',
  },
  {
    id: 'fractureChaos',
    label: 'SCORE MUTATION',
    min: 0,
    max: 1,
    defaultValue: 0.38,
    description: 'Breakcore turnaround variation and S&H glitch-chirp probability.',
  },
  {
    id: 'drillDensity',
    label: 'RATCHET DENSITY',
    min: 0,
    max: 1,
    defaultValue: 0.56,
    description: '64th micro-ratchet multiplier and stutter grain speed.',
  },
  {
    id: 'metallicTension',
    label: 'ACID / RESONANCE Q',
    min: 0,
    max: 1,
    defaultValue: 0.48,
    description: '303 acid diode Q, glass-armonica FM shimmer and formant resonance.',
  },
  {
    id: 'brutalDrive',
    label: 'WAVEFOLD SATURATION',
    min: 0,
    max: 1,
    defaultValue: 0.32,
    description: 'AudioWorklet West-Coast wavefolder and sub-bass grit.',
  },
  {
    id: 'decayScale',
    label: 'VOICE DECAY',
    min: 0.4,
    max: 1.8,
    defaultValue: 1,
    description: 'Global procedural synth decay multiplier.',
  },
  {
    id: 'behaviorGain',
    label: 'ECOLOGY EXCITATION',
    min: 0.2,
    max: 1.8,
    defaultValue: 1,
    description: 'How strongly score and live impulses excite the mechanical ecology.',
  },
  {
    id: 'cameraTrauma',
    label: 'CAMERA SHOCK',
    min: 0,
    max: 1.4,
    defaultValue: 0.68,
    description: 'Impact shock transmitted into the procedural clockwork camera.',
  },
];

const V5_PATCHES: PatchRoute[] = [
  {
    id: 'v5-mp-span-optical',
    source: 'mediapipe.handSpan',
    target: 'opticalStylize',
    amount: 0.42,
    slew: 0.05,
    enabled: true,
  },
  {
    id: 'v5-mp-pinch-drill',
    source: 'mediapipe.leftPinch',
    target: 'drillDensity',
    amount: 0.55,
    slew: 0.035,
    enabled: true,
  },
  {
    id: 'v5-mp-pinch-alloy',
    source: 'mediapipe.rightPinch',
    target: 'metallicTension',
    amount: 0.6,
    slew: 0.035,
    enabled: true,
  },
  {
    id: 'v5-strain-behavior',
    source: 'mouse.strain',
    target: 'behaviorGain',
    amount: 0.32,
    slew: 0.04,
    enabled: true,
  },
  {
    id: 'v5-mic-chaos',
    source: 'mic.energy',
    target: 'fractureChaos',
    amount: 0.72,
    slew: 0.04,
    enabled: true,
  },
  {
    id: 'v5-chaos-excitation',
    source: 'chaos.x',
    target: 'behaviorGain',
    amount: 0.1,
    slew: 0.16,
    enabled: true,
  },
];

class ChronoSceneInstance implements WorkSceneInstance {
  private machine: ChronoAutomaton | null = null;
  private readonly cameraDirector = new ClockworkCameraDirector();

  init(ctx: WorkRuntimeContext): void {
    this.machine = new ChronoAutomaton();
    ctx.scene.add(this.machine.root);
    this.cameraDirector.setMode(0);
  }

  scheduleStep(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void {
    const halftime = ctx.matrix.getSource('punch.halftime') > 0.5;
    const bundle = evaluateGantzStepBundle(step64, bar, audioTime, {
      chaos: ctx.matrix.getTarget('fractureChaos', 0.38),
      drillDensity: ctx.matrix.getTarget('drillDensity', 0.56),
      forceRatchet: ctx.matrix.getSource('punch.ratchet') > 0.5,
      forceReverse: ctx.matrix.getSource('punch.reverse-slice') > 0.5,
      step64DurSec: ctx.clock.getStep64DurationSec(halftime ? 0.5 : 1),
    });

    const synthMacros = {
      metallicTension: ctx.matrix.getTarget('metallicTension', 0.48),
      brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.32),
      decayScale: ctx.matrix.getTarget('decayScale', 1),
      strain: 0,
    };
    for (const cue of bundle.anticipations) ctx.clock.queueAnticipationCue(cue);
    for (const event of bundle.events) {
      ctx.audio.triggerImpulse(event, synthMacros);
      ctx.clock.queueVisualEvent(event);
    }
  }

  triggerAnticipation(cue: AnticipationCue, ctx: WorkRuntimeContext): void {
    const gain = ctx.matrix.getTarget('behaviorGain', 1);
    this.machine?.applyAnticipation({ ...cue, intensity: cue.intensity * gain });
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    if (!this.machine) return;
    const gain = ctx.matrix.getTarget('behaviorGain', 1);
    this.machine.applyImpulse({ ...event, velocity: event.velocity * gain });

    if (
      event.subsystem === 'sub-rupture' ||
      event.subsystem === 'spine-shear' ||
      event.subsystem === 'core-implode' ||
      event.subsystem === 'break-shred'
    ) {
      const trauma = ctx.matrix.getTarget('cameraTrauma', 0.68);
      this.cameraDirector.addShock(event.velocity * trauma, event.locus);
    }

    // Live events need immediate audio; score events were scheduled in lookahead.
    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, {
        metallicTension: ctx.matrix.getTarget('metallicTension', 0.48),
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.32),
        decayScale: ctx.matrix.getTarget('decayScale', 1),
        strain: 0,
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    if (!this.machine) return;
    const section = GANTZ_SECTIONS[transport.sectionIndex] ?? GANTZ_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);

    this.machine.update({
      dt,
      elapsed,
      transport,
      scoreIntensity: section.intensity,
    });
    this.cameraDirector.update(ctx.camera, dt, elapsed, transport, this.machine);

    const optical = ctx.matrix.getTarget('opticalStylize', 0.46);
    const stutter = ctx.matrix.getSource('punch.stutter');
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const base = this.machine.getPostFxState();
    ctx.setPostFx?.({
      glitch: Math.min(
        1.35,
        (base.glitch ?? 0.04) * (0.6 + optical * 1.15) + stutter * 0.58,
      ),
      lensDistort: (base.lensDistort ?? 0.06) + optical * 0.1,
      aberration: (base.aberration ?? 0.18) + optical * 0.26,
      grain: (base.grain ?? 0.12) + optical * 0.18,
      bleachGrade: (base.bleachGrade ?? 0.3) + optical * 0.2,
      starkThreshold: hardLock ? 0.62 : (base.starkThreshold ?? 0),
      bloomStrength: (base.bloomStrength ?? 0.9) + optical * 0.14,
    });

    // Preserve the Section IV fix: strain is exclusively intentional pointer drag,
    // and comb resonance is exclusively an actively held [F] punch.
    const combScream = ctx.matrix.getSource('punch.comb-scream');
    const pointerStrain = ctx.matrix.getSource('mouse.strain');
    const metallic = ctx.matrix.getTarget('metallicTension', 0.48);
    ctx.audio.updateContinuous(
      {
        metallicTension: metallic,
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.32),
        decayScale: ctx.matrix.getTarget('decayScale', 1),
        strain: pointerStrain > 0.12 ? pointerStrain * 0.55 : 0,
      },
      {
        stutterGate: stutter,
        grainMs: 9 + (1 - ctx.matrix.getTarget('drillDensity', 0.56)) * 42,
        combMix: combScream * 0.75,
        combFreq: 174.61 + metallic * 523.25,
        combFeedback: 0.68 + combScream * 0.23,
        crush: ctx.matrix.getTarget('brutalDrive', 0.32) * 0.4,
      },
    );
  }

  setCameraMode(mode: number): void {
    this.cameraDirector.setMode(mode);
  }

  getCameraMode(): number {
    return this.cameraDirector.getMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.cameraDirector.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cameraDirector.zoom(delta);
  }

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    this.machine?.setPointerStrain(x, y, tension, active);
  }

  getArticulationState(): Record<string, number> {
    return this.machine ? { ...this.machine.getArticulationState() } : {};
  }

  setArticulationState(state: Record<string, number>): void {
    this.machine?.setArticulationState(state);
  }

  getBehaviorId(): string {
    return this.machine?.getBehaviorId() ?? 'PRECISION_ESCAPEMENT';
  }

  setBehaviorId(id: string): void {
    this.machine?.setBehaviorId(id);
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.machine?.getJointDescriptors() ?? [];
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    return this.machine?.getJointWorldPosition(id) ?? null;
  }

  getEcologySnapshot(): Record<string, number> {
    return this.machine?.getEcologySnapshot() ?? {};
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.machine?.setBehaviorMaps(maps);
  }

  getMetrics() {
    const metrics = this.machine?.getMetrics() ?? {
      activeInstances: 0,
      structuralStress: 0,
      kineticEnergy: 0,
      behavioralState: 'DORMANT',
    };
    return {
      ...metrics,
      activeShotBadge: this.cameraDirector.getActiveShotBadge(),
    };
  }

  dispose(): void {
    if (this.machine) {
      this.machine.root.removeFromParent();
      this.machine.dispose();
      this.machine = null;
    }
  }
}

export const ChronoAutomatonWork: WorkDefinition = {
  id: 'chrono-automaton',
  title: 'CHRONO // AUTOMATON',
  subtitle:
    'Time-Traveled Self-Playing Clockwork Automaton // Ecological Behavior Rig // 96-Bar Score',
  author: 'SONOBJET ENGINE // V5',
  bpm: 164,
  bars: GANTZ_TOTAL_BARS,
  sections: GANTZ_SECTIONS,
  macros: V5_MACROS,
  defaultPatches: V5_PATCHES,
  createInstance: () => new ChronoSceneInstance(),
};
