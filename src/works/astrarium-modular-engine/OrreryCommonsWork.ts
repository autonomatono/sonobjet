import type {
  AnticipationCue,
  BehaviorMapEntry,
  GraphMacroSnapshot,
  ImpulseEvent,
  MachineGraphSnapshot,
  PatchRoute,
  RigJointDescriptor,
  ScoreBindingPatch,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import type { GraphStepContext } from '../../kit/machine/MachineGraph';
import { GRAPH_MACRO_DEFINITIONS } from '../../kit/machine/OrreryFactoryConfig';
import {
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
  GANTZ_TOTAL_BARS,
} from '../gantz-tecton/GantzScore';
import { ChronoAutomatonWork } from '../chrono-automaton/ChronoAutomatonWork';
import { ModularMachine } from './ModularMachine';

const GRAPH_PATCHES: PatchRoute[] = [
  {
    id: 'v6-mp-span-coupling',
    source: 'mediapipe.handSpan',
    target: 'networkCoupling',
    amount: 0.3,
    slew: 0.06,
    enabled: true,
  },
  {
    id: 'v6-mp-pinch-flow',
    source: 'mediapipe.leftPinch',
    target: 'flowRate',
    amount: 0.44,
    slew: 0.04,
    enabled: true,
  },
  {
    id: 'v6-mic-turbulence',
    source: 'mic.energy',
    target: 'energyChaos',
    amount: 0.55,
    slew: 0.05,
    enabled: true,
  },
  {
    id: 'v6-mouse-narrative',
    source: 'mouse.y',
    target: 'narrativeScale',
    amount: 0.3,
    slew: 0.08,
    enabled: true,
  },
  {
    id: 'v6-chaos-density',
    source: 'chaos.y',
    target: 'moduleDensity',
    amount: 0.09,
    slew: 0.18,
    enabled: true,
  },
  {
    id: 'v6-gesture-focus',
    source: 'mediapipe.velocity',
    target: 'focusDrift',
    amount: 0.34,
    slew: 0.07,
    enabled: true,
  },
];

class AstrariumSceneInstance implements WorkSceneInstance {
  private readonly machine = new ModularMachine();
  private ctx: WorkRuntimeContext | null = null;

  init(ctx: WorkRuntimeContext): void {
    this.ctx = ctx;
    this.machine.attach(ctx.scene);
    this.machine.setCameraMode(0);
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
    this.machine.applyAnticipation({ ...cue, intensity: cue.intensity * gain });
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    const gain = ctx.matrix.getTarget('behaviorGain', 1);
    this.machine.triggerImpulse({ ...event, velocity: event.velocity * gain }, event.beat);

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
    const section = GANTZ_SECTIONS[transport.sectionIndex] ?? GANTZ_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);
    const graphContext: GraphStepContext = {
      dt,
      elapsed,
      beat: transport.beat,
      bar: transport.bar,
      step16: transport.step16,
      scoreIntensity: section.intensity,
      networkCoupling: ctx.matrix.getTarget('networkCoupling', 0.62),
      flowRate: ctx.matrix.getTarget('flowRate', 0.78),
      energyChaos: ctx.matrix.getTarget('energyChaos', 0.31),
      narrativeScale: ctx.matrix.getTarget('narrativeScale', 1.18),
      moduleDensity: ctx.matrix.getTarget('moduleDensity', 0.82),
      behaviorMode: this.machine.getBehaviorId(),
    };
    this.machine.update({
      graphContext,
      transport,
      articulation: this.machine.getArticulationState(),
      camera: ctx.camera,
      focusDrift: ctx.matrix.getTarget('focusDrift', 0.4),
    });

    const base = this.machine.getPostFxState();
    const optical = ctx.matrix.getTarget('opticalStylize', 0.46);
    const stutter = ctx.matrix.getSource('punch.stutter');
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    ctx.setPostFx?.({
      glitch: Math.min(1.35, (base.glitch ?? 0.04) * (0.6 + optical * 1.15) + stutter * 0.58),
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
    this.machine.setCameraMode(mode);
  }

  getCameraMode(): number {
    return this.machine.getCameraMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.machine.orbitCamera(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.machine.zoomCamera(delta);
  }

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    this.machine.setPointerStrain(x, y, tension, active);
  }

  getArticulationState(): Record<string, number> {
    return this.machine.getArticulationState();
  }

  setArticulationState(state: Record<string, number>): void {
    this.machine.setArticulationState(state);
  }

  getBehaviorId(): string {
    return this.machine.getBehaviorId();
  }

  setBehaviorId(id: string): void {
    this.machine.setBehaviorId(id);
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.machine.getJointDescriptors();
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    return this.machine.getJointWorldPosition(id);
  }

  getEcologySnapshot(): Record<string, number> {
    return this.machine.getEcologySnapshot();
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.machine.setBehaviorMaps(maps);
  }

  getMachineGraphSnapshot(): MachineGraphSnapshot {
    return this.machine.getMachineGraphSnapshot(this.getGraphMacroSnapshots());
  }

  setGraphMacro(id: string, value: number): void {
    this.ctx?.matrix.setMacroBase(id, value);
  }

  updateGraphBinding(id: string, patch: ScoreBindingPatch): void {
    this.machine.updateGraphBinding(id, patch);
  }

  setFocusTarget(id: string): void {
    this.machine.setFocusTarget(id);
  }

  growMachine(count: number): void {
    this.machine.growMachine(count);
  }

  rebuildMachine(moduleCount: number): void {
    this.machine.rebuildMachine(moduleCount);
  }

  exportGraphConfig(): string {
    return this.machine.exportGraphConfig();
  }

  importGraphConfig(raw: string): void {
    this.machine.importGraphConfig(raw);
  }

  getMetrics() {
    return this.machine.getMetrics();
  }

  dispose(): void {
    this.machine.dispose();
    this.ctx = null;
  }

  private getGraphMacroSnapshots(): GraphMacroSnapshot[] {
    const ids = new Set(GRAPH_MACRO_DEFINITIONS.map((definition) => definition.id));
    const definitions =
      this.ctx?.matrix.getMacroDefinitions().filter((definition) => ids.has(definition.id)) ??
      GRAPH_MACRO_DEFINITIONS;
    return definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      min: definition.min,
      max: definition.max,
      value: this.ctx?.matrix.getMacroBase(definition.id) ?? definition.defaultValue,
    }));
  }
}

export const OrreryCommonsWork: WorkDefinition = {
  id: 'astrarium-modular-engine',
  title: 'ASTRARIUM // MODULAR ENGINE',
  subtitle:
    'Addressable Machine-Building Kit // Many-to-Many Score Ecology // Conduits, Energy & Multi-Scale Focus',
  author: 'SONOBJET ENGINE // V6',
  bpm: 164,
  bars: GANTZ_TOTAL_BARS,
  sections: GANTZ_SECTIONS,
  macros: [...ChronoAutomatonWork.macros, ...GRAPH_MACRO_DEFINITIONS],
  defaultPatches: [...ChronoAutomatonWork.defaultPatches, ...GRAPH_PATCHES],
  createInstance: () => new AstrariumSceneInstance(),
};
