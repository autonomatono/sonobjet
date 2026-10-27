import type {
  AnticipationCue,
  BehaviorMapEntry,
  ImpulseEvent,
  MachineGraphSnapshot,
  PatchRoute,
  PhysicsMacroSnapshot,
  PhysicsStudioSnapshot,
  RigJointDescriptor,
  ScoreBindingPatch,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import type { PhysicsImpactEvent } from '../../kit/physics/MarblePhysics';
import { PHYSICS_MACRO_DEFINITIONS, PHYSICS_MACRO_IDS } from '../../kit/physics/MarbleBlueprint';
import {
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
  GANTZ_TOTAL_BARS,
} from '../gantz-tecton/GantzScore';
import { ChronoAutomatonWork } from '../chrono-automaton/ChronoAutomatonWork';
import { MarblePendulumMachine } from './MarblePendulumMachine';

const MARBLE_PATCHES: PatchRoute[] = [
  {
    id: 'v7-mp-span-gate',
    source: 'mediapipe.handSpan',
    target: 'gateDuration',
    amount: 0.22,
    slew: 0.05,
    enabled: true,
  },
  {
    id: 'v7-mp-pinch-bounce',
    source: 'mediapipe.leftPinch',
    target: 'marbleBounce',
    amount: 0.38,
    slew: 0.04,
    enabled: true,
  },
  {
    id: 'v7-mic-release',
    source: 'mic.energy',
    target: 'releaseVelocity',
    amount: 0.34,
    slew: 0.05,
    enabled: true,
  },
  {
    id: 'v7-chaos-friction',
    source: 'chaos.x',
    target: 'trackFriction',
    amount: 0.09,
    slew: 0.16,
    enabled: true,
  },
  {
    id: 'v7-mouse-pendulum',
    source: 'mouse.y',
    target: 'pendulumDrive',
    amount: 0.26,
    slew: 0.08,
    enabled: true,
  },
  {
    id: 'v7-gesture-lift',
    source: 'mediapipe.velocity',
    target: 'liftSpeed',
    amount: 0.32,
    slew: 0.07,
    enabled: true,
  },
];

const MARBLE_MACROS = [...ChronoAutomatonWork.macros, ...PHYSICS_MACRO_DEFINITIONS];
const MARBLE_DEFAULT_PATCHES = [...ChronoAutomatonWork.defaultPatches, ...MARBLE_PATCHES];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

class MarbleSceneInstance implements WorkSceneInstance {
  private readonly machine = new MarblePendulumMachine();
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
    const synthMacros = this.synthMacros(ctx);
    const scoreBlend = ctx.matrix.getTarget('scoreBlend', 0.32);
    for (const cue of bundle.anticipations) ctx.clock.queueAnticipationCue(cue);
    for (const event of bundle.events) {
      ctx.audio.triggerImpulse({ ...event, velocity: event.velocity * scoreBlend }, synthMacros);
      ctx.clock.queueVisualEvent(event);
    }
  }

  triggerAnticipation(cue: AnticipationCue, ctx: WorkRuntimeContext): void {
    const gain = ctx.matrix.getTarget('behaviorGain', 1);
    this.machine.applyAnticipation({ ...cue, intensity: cue.intensity * gain });
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    this.machine.triggerImpulse(event);
    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, this.synthMacros(ctx));
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
    const macros = this.collectMacros(ctx);
    const result = this.machine.update({
      dt,
      elapsed,
      transport,
      macros,
      scoreIntensity: section.intensity,
      audioTime: ctx.audio.getCurrentTime(),
      camera: ctx.camera,
    });
    const synthMacros = this.synthMacros(ctx);
    const marbleBlend = ctx.matrix.getTarget('marbleBlend', 0.82);
    for (const impact of result.impacts) {
      const audioEvent = this.impactToImpulse(impact, transport, marbleBlend, 0);
      ctx.audio.triggerImpulse(audioEvent, synthMacros);
      const visualEvent: ImpulseEvent = {
        ...audioEvent,
        audioTime: ctx.audio.getCurrentTime() + 0.001,
        origin: 'sensor',
      };
      ctx.clock.queueVisualEvent(visualEvent);
    }

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
    return this.machine.getMachineGraphSnapshot(this.getPhysicsMacros());
  }

  setGraphMacro(id: string, value: number): void {
    this.setPhysicsMacro(id, value);
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

  getPhysicsSnapshot(): PhysicsStudioSnapshot {
    return this.machine.getPhysicsSnapshot(this.getPhysicsMacros());
  }

  setPhysicsMacro(id: string, value: number): void {
    this.ctx?.matrix.setMacroBase(id, value);
    this.machine.setPhysicsMacro(id, value);
  }

  toggleProgrammingPin(lane: number, step: number, enabled?: boolean): void {
    this.machine.toggleProgrammingPin(lane, step, enabled);
  }

  resetPhysics(): void {
    this.machine.resetPhysics();
  }

  dropMarbles(count: number): void {
    this.machine.dropMarbles(count);
  }

  exportPhysicsProgram(): string {
    return this.machine.exportPhysicsProgram();
  }

  importPhysicsProgram(raw: string): void {
    this.machine.importPhysicsProgram(raw);
  }

  getMetrics() {
    return this.machine.getMetrics();
  }

  dispose(): void {
    this.machine.dispose();
    this.ctx = null;
  }

  private synthMacros(ctx: WorkRuntimeContext) {
    return {
      metallicTension: ctx.matrix.getTarget('metallicTension', 0.48),
      brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.32),
      decayScale: ctx.matrix.getTarget('decayScale', 1),
      strain: 0,
    };
  }

  private collectMacros(ctx: WorkRuntimeContext): Record<string, number> {
    const macros: Record<string, number> = {};
    for (const definition of ctx.matrix.getMacroDefinitions()) {
      macros[definition.id] = ctx.matrix.getTarget(definition.id, definition.defaultValue);
    }
    return macros;
  }

  private getPhysicsMacros(): PhysicsMacroSnapshot[] {
    const ids = new Set(PHYSICS_MACRO_IDS);
    const definitions =
      this.ctx?.matrix.getMacroDefinitions().filter((definition) => ids.has(definition.id)) ??
      PHYSICS_MACRO_DEFINITIONS;
    return definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      min: definition.min,
      max: definition.max,
      value: this.ctx?.matrix.getMacroBase(definition.id) ?? definition.defaultValue,
    }));
  }

  private impactToImpulse(
    impact: PhysicsImpactEvent,
    transport: TransportState,
    marbleBlend: number,
    audioTime: number,
  ): ImpulseEvent {
    return {
      subsystem: impact.subsystem,
      velocity: clamp(impact.velocity * 0.55 * marbleBlend, 0.08, 1.25),
      pitchRatio: impact.pitchRatio,
      decay: clamp(0.55 + impact.energy * 0.5, 0.4, 1.4),
      sliceIndex: impact.lane,
      locus: [
        clamp(impact.x / 5.5, -1, 1),
        clamp(impact.y / 5.5, -1, 1),
        (impact.lane - 5.5) / 5.5,
      ],
      audioTime,
      beat: transport.beat,
      origin: 'sensor',
    };
  }
}

export const MarblePendulumWork: WorkDefinition = {
  id: 'marble-pendulum',
  title: 'PENDULUM // MARBLE ENGINE',
  subtitle:
    'Hand-Cranked Gravity Instrument // Custom Steel-Marble Physics // 12 Programmable Gates',
  author: 'SONOBJET ENGINE // V7',
  bpm: 164,
  bars: GANTZ_TOTAL_BARS,
  sections: GANTZ_SECTIONS,
  macros: MARBLE_MACROS,
  defaultPatches: MARBLE_DEFAULT_PATCHES,
  createInstance: () => new MarbleSceneInstance(),
};
