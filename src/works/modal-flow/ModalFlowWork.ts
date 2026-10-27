import * as THREE from 'three/webgpu';
import type {
  AnticipationCue,
  BehaviorMapEntry,
  GraphMacroSnapshot,
  ImpulseEvent,
  MachineGraphSnapshot,
  PatchRoute,
  PhysicsMacroSnapshot,
  PhysicsStudioSnapshot,
  RigJointDescriptor,
  ScoreBindingPatch,
  SubsystemId,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import { FreeFlyController } from '../../studio/director/FreeFlyController';
import {
  MachineCameraDirector,
  type GraphCameraState,
  type MachineCameraSource,
  type Vec3Tuple,
} from '../astrarium-modular-engine/MachineCameraDirector';
import { ChronoAutomatonWork } from '../chrono-automaton/ChronoAutomatonWork';
import {
  createModalFlowBlueprint,
  DEFAULT_MODAL_FLOW_MODULES,
  MAX_MODAL_FLOW_MODULES,
  MODAL_FLOW_MACRO_IDS,
  MODAL_FLOW_MACROS as FLOW_MACROS,
  MODAL_FLOW_PROGRAM_STEPS,
  ROUTING_LANE_COUNT,
  type BindingSpec,
  type ModalFlowBlueprint,
  type Vec3,
} from './ModalFlowBlueprint';
import { ModalFlowComposer } from './ModalFlowComposer';
import { ModalFlowMachine } from './ModalFlowMachine';
import { ModalFlowPhysics, type ModalFlowPhysicsParams } from './ModalFlowPhysics';
import {
  evaluateModalFlowEnergyCue,
  MODAL_FLOW_BPM,
  MODAL_FLOW_SECTIONS,
  MODAL_FLOW_TOTAL_BARS,
} from './ModalFlowScore';

const FLOW_PATCHES: PatchRoute[] = [
  {
    id: 'v8-hand-gate',
    source: 'mediapipe.handSpan',
    target: 'gateDuty',
    amount: 0.18,
    slew: 0.05,
    enabled: true,
  },
  {
    id: 'v8-mic-flow',
    source: 'mic.energy',
    target: 'flowRate',
    amount: 0.3,
    slew: 0.06,
    enabled: true,
  },
  {
    id: 'v8-chaos-phrase',
    source: 'chaos.x',
    target: 'phraseDensity',
    amount: 0.12,
    slew: 0.12,
    enabled: true,
  },
  {
    id: 'v8-mouse-register',
    source: 'mouse.y',
    target: 'registerSpread',
    amount: 0.22,
    slew: 0.08,
    enabled: true,
  },
  {
    id: 'v8-gesture-lift',
    source: 'mediapipe.velocity',
    target: 'liftTorque',
    amount: 0.28,
    slew: 0.07,
    enabled: true,
  },
  {
    id: 'v8-strain-bloom',
    source: 'mouse.strain',
    target: 'timbreBloom',
    amount: 0.2,
    slew: 0.1,
    enabled: false,
  },
];

const ALL_MACROS = [...ChronoAutomatonWork.macros, ...FLOW_MACROS];
const ALL_PATCHES = [...ChronoAutomatonWork.defaultPatches, ...FLOW_PATCHES];

const CAMERA_LABELS = [
  '[0] AUTO // MARBLE FOLLOW',
  '1 // DRONE PILOT',
  '2 // UPPER CLUSTER',
  '3 // GATE BANK',
  '4 // RESONATOR FIELD',
  '5 // HELIX LIFT',
  '6 // CHIME ORCHARD',
  '7 // CONDUIT TRACK',
  '8 // RETURN SPIRAL',
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const tuple = (v: Vec3): Vec3Tuple => [v.x, v.y, v.z];

function sectionIndexFromBar(bar: number): number {
  const idx = MODAL_FLOW_SECTIONS.findIndex((section) => bar >= section.startBar && bar < section.endBar);
  return idx < 0 ? 0 : idx;
}

class ModalFlowSceneInstance implements WorkSceneInstance {
  private ctx: WorkRuntimeContext | null = null;
  private blueprint: ModalFlowBlueprint;
  private physics: ModalFlowPhysics;
  private machine: ModalFlowMachine;
  private readonly composer = new ModalFlowComposer();
  private readonly cameraSource: MachineCameraSource;
  private readonly cameraDirector: MachineCameraDirector;
  private freeFly: FreeFlyController | null = null;
  private hud: HTMLDivElement | null = null;
  private bindings: BindingSpec[];

  private activeFocusId = 'focus-macro';
  private behaviorId = 'FLOW ECOLOGY';
  private behaviorMaps: BehaviorMapEntry[] = [];
  private cameraMode = 0;
  private directorEnabled = false;
  private pointerStrain = 0;
  private gaze = { x: 0, y: 0 };
  private lastPhysicsEvents = 0;
  private lastAudioEvents = 0;

  constructor() {
    this.blueprint = createModalFlowBlueprint(DEFAULT_MODAL_FLOW_MODULES);
    this.physics = new ModalFlowPhysics(this.blueprint);
    this.machine = new ModalFlowMachine(this.blueprint, this.physics);
    this.bindings = this.blueprint.bindings.map((binding) => ({ ...binding }));
    this.cameraSource = {
      getFocusTargets: () => this.blueprint.focusTargets,
      getActiveFocusId: () => this.activeFocusId,
      setActiveFocusId: (id) => {
        this.activeFocusId = id;
      },
      getJointWorldPosition: (id) => this.machine.getJointWorldPosition(id),
      getEdgeEndpoints: (edgeId) => this.getEdgeEndpoints(edgeId),
      getGraphState: (): GraphCameraState => {
        const state = this.physics.getGraphState();
        const composer = this.composer.getState(this.physics.getTime());
        return {
          phase: state.phase,
          arousal: clamp(state.arousal + composer.emitted * 0.002, 0, 1),
          cohesion: state.cohesion,
          fatigue: state.fatigue,
          curiosity: clamp(state.curiosity + (this.ctx?.matrix.getTarget('cameraFollow', 0.38) ?? 0.38) * 0.22, 0, 1),
          totalEnergy: state.totalEnergy,
        };
      },
    };
    this.cameraDirector = new MachineCameraDirector(this.cameraSource);
  }

  init(ctx: WorkRuntimeContext): void {
    this.ctx = ctx;
    this.machine.attach(ctx.scene);
    this.cameraDirector.setMode(0);
    if (ctx.canvas && typeof document !== 'undefined') {
      this.freeFly = new FreeFlyController(ctx.canvas, ctx.camera);
      this.freeFly.setMode('TIMELINE');
      this.createHud();
    }
  }

  scheduleStep(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void {
    const sectionIndex = sectionIndexFromBar(bar);
    const section = MODAL_FLOW_SECTIONS[sectionIndex] ?? MODAL_FLOW_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);
    const cue = evaluateModalFlowEnergyCue(step64, bar, sectionIndex);
    if (!cue) return;
    const module = this.blueprint.modules.find((m) => m.id === cue.moduleId);
    const locus: Vec3Tuple = module
      ? [clamp(module.position.x / 8, -1, 1), clamp(module.position.y / 6, -1, 1), clamp(module.position.z / 8, -1, 1)]
      : [0, 0, 0];
    // Score events are physical energy cues only. They become sound later when
    // the resulting marble impacts pass through ModalFlowComposer.
    ctx.clock.queueVisualEvent({
      subsystem: cue.subsystem,
      velocity: cue.energy * 0.72,
      pitchRatio: 1,
      decay: 0.8,
      locus,
      audioTime,
      beat: bar * 4 + step64 / 16,
      origin: 'score',
    });
  }

  triggerAnticipation(cue: AnticipationCue, _ctx: WorkRuntimeContext): void {
    this.physics.injectEnergy(cue.intensity * 0.35, 'crank-flywheel');
    this.machine.flashModule('crank-flywheel', cue.intensity * 0.3);
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    if (event.origin === 'physics') return;
    const moduleId = this.moduleForSubsystem(event.subsystem);
    const energy = event.velocity * (event.origin === 'score' ? 0.55 : 0.85);
    this.physics.injectEnergy(energy, moduleId);
    this.machine.flashModule(moduleId, event.velocity * 0.55);
    // Live actuators get a tiny mechanical click for feedback; the song itself
    // remains exclusively physics-generated.
    if (event.origin !== 'score' && event.origin !== 'take' && event.audioTime === 0) {
      ctx.audio.triggerImpulse(
        {
          ...event,
          subsystem: 'piston-snap',
          velocity: Math.min(0.24, event.velocity * 0.16),
          midiNote: undefined,
          chordNotes: undefined,
          durationSec: 0.12,
          decay: 0.55,
        },
        this.synthMacros(ctx),
      );
    }
  }

  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    const section = MODAL_FLOW_SECTIONS[transport.sectionIndex] ?? MODAL_FLOW_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);
    const macros = this.collectMacros(ctx);
    const physicsPatch: Partial<ModalFlowPhysicsParams> = {
      ...macros,
      scoreIntensity: section.intensity,
      sectionIndex: transport.sectionIndex,
    };
    const events = this.physics.step(dt, physicsPatch);
    this.composer.setParams({
      phraseDensity: macros.phraseDensity ?? 0.62,
      registerSpread: macros.registerSpread ?? 1,
      timbreBloom: macros.timbreBloom ?? 0.54,
      scoreIntensity: section.intensity,
      sectionIndex: transport.sectionIndex,
    });

    const synthMacros = this.synthMacros(ctx);
    const audioTime = ctx.audio.getCurrentTime() + 0.014;
    let audioEvents = 0;
    for (const event of events) {
      const impulse = this.composer.map(event, transport.beat, audioTime);
      if (!impulse) continue;
      ctx.audio.triggerImpulse(impulse, synthMacros);
      audioEvents += 1;
      this.machine.flashModule(event.moduleId, event.energy * 0.42);
      this.cameraDirector.addShock(event.energy * 0.32, [
        clamp(event.position.x / 8, -1, 1),
        clamp(event.position.y / 6, -1, 1),
        clamp(event.position.z / 8, -1, 1),
      ]);
    }
    this.lastPhysicsEvents = events.length;
    this.lastAudioEvents = audioEvents;

    this.machine.update({
      dt,
      elapsed,
      transport,
      physics: this.physics,
      macros,
      recentEvents: events.length,
    });

    const droneSpeed = macros.droneSpeed ?? 1;
    this.freeFly?.setDroneTuning(droneSpeed, 3.4);
    if (this.cameraMode === 1 && this.freeFly && !this.directorEnabled) {
      this.freeFly.setFollowTarget(this.getCameraFollowTarget());
      this.freeFly.update(dt);
    } else {
      this.cameraDirector.update(
        ctx.camera,
        dt,
        elapsed,
        transport,
        macros.cameraFollow ?? 0.38,
      );
    }

    const base = this.machine.getPostFxState();
    const optical = macros.opticalStylize ?? 0.46;
    const stutter = ctx.matrix.getSource('punch.stutter');
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const eventFlash = Math.min(0.28, audioEvents * 0.09);
    ctx.setPostFx?.({
      glitch: Math.min(1.2, (base.glitch ?? 0.03) * (0.6 + optical * 1.1) + stutter * 0.5 + eventFlash),
      lensDistort: (base.lensDistort ?? 0.05) + optical * 0.08 + Math.abs(this.gaze.x) * 0.015,
      aberration: (base.aberration ?? 0.14) + optical * 0.2 + eventFlash * 0.3,
      grain: (base.grain ?? 0.09) + optical * 0.14,
      bleachGrade: (base.bleachGrade ?? 0.22) + optical * 0.16,
      starkThreshold: hardLock ? 0.58 : (base.starkThreshold ?? 0),
      bloomStrength: (base.bloomStrength ?? 0.85) + optical * 0.12 + eventFlash * 0.4,
    });

    // Preserve the Section IV anti-mewing fix: strain is only from intentional
    // pointer drag and comb resonance is only from an actively held [F] punch.
    const combScream = ctx.matrix.getSource('punch.comb-scream');
    const continuousStrain = this.pointerStrain > 0.12 ? this.pointerStrain * 0.5 : 0;
    const metallic = clamp(
      (macros.metallicTension ?? 0.48) * 0.65 + this.physics.getGraphState().arousal * 0.35,
      0,
      1,
    );
    ctx.audio.updateContinuous(
      {
        metallicTension: metallic,
        brutalDrive: macros.brutalDrive ?? 0.32,
        decayScale: macros.decayScale ?? 1,
        strain: continuousStrain,
      },
      {
        stutterGate: stutter,
        grainMs: 8 + (1 - (macros.drillDensity ?? 0.56)) * 38,
        combMix: combScream * 0.72,
        combFreq: 174.61 + metallic * 523.25,
        combFeedback: 0.66 + combScream * 0.22,
        crush: (macros.brutalDrive ?? 0.32) * 0.36,
      },
    );

    this.updateHud();
  }

  setCameraMode(mode: number): void {
    const next = clamp(Math.floor(mode), 0, 8);
    this.cameraMode = next;
    if (next === 1 && this.freeFly) {
      this.freeFly.setFromPose(this.captureCameraPose());
      this.freeFly.setMode('DRONE');
    } else {
      this.freeFly?.setMode('TIMELINE');
      this.cameraDirector.setMode(next);
      this.cameraDirector.invalidate();
    }
  }

  getCameraMode(): number {
    return this.cameraMode;
  }

  orbitCamera(dx: number, dy: number): void {
    this.cameraDirector.orbit(dx, dy);
    this.freeFly?.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cameraDirector.zoom(delta);
    this.freeFly?.zoom(delta);
  }

  setPointerStrain(_x: number, _y: number, tension: number, active: boolean): void {
    this.pointerStrain = active ? tension : 0;
  }

  setGazeTarget(x: number, y: number): void {
    this.gaze.x = x;
    this.gaze.y = y;
  }

  setDirectorEnabled(active: boolean): void {
    this.directorEnabled = active;
    if (!this.freeFly) return;
    if (active) this.freeFly.setMode('TIMELINE');
    else if (this.cameraMode === 1) this.freeFly.setMode('DRONE');
  }

  getCameraFollowTarget(): [number, number, number] | null {
    const marble = this.physics.getMostEnergeticMarble();
    return marble ? [marble.position.x, marble.position.y, marble.position.z] : null;
  }

  getArticulationState(): Record<string, number> {
    return this.machine.getArticulationState();
  }

  setArticulationState(state: Record<string, number>): void {
    this.machine.setArticulationState(state);
  }

  getBehaviorId(): string {
    return this.behaviorId;
  }

  setBehaviorId(id: string): void {
    this.behaviorId = id;
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.machine.getJointDescriptors();
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    return this.machine.getJointWorldPosition(id);
  }

  getEcologySnapshot(): Record<string, number> {
    const state = this.composer.getState(this.physics.getTime());
    const graph = this.physics.getGraphState();
    return {
      moduleCount: this.blueprint.moduleCount,
      edgeCount: this.blueprint.conduits.length,
      behaviorMapCount: this.behaviorMaps.length,
      phraseIndex: state.phraseIndex,
      emittedNotes: state.emitted,
      droppedPhysicsEvents: state.dropped,
      arousal: graph.arousal,
      cohesion: graph.cohesion,
      fatigue: graph.fatigue,
      curiosity: graph.curiosity,
    };
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.behaviorMaps = maps.map((map) => ({ ...map }));
  }

  getMachineGraphSnapshot(): MachineGraphSnapshot {
    const graph = this.physics.getGraphState();
    return {
      moduleCount: this.blueprint.moduleCount,
      edgeCount: this.blueprint.conduits.length,
      sourceCount: this.blueprint.sources.length,
      bindingCount: this.bindings.length,
      arousal: graph.arousal,
      cohesion: graph.cohesion,
      fatigue: graph.fatigue,
      curiosity: graph.curiosity,
      activeFocusId: this.activeFocusId,
      activeFocusLabel: this.getActiveFocusLabel(),
      modules: this.blueprint.modules.map((module) => {
        const energy = this.physics.getModuleEnergy(module.id);
        return {
          id: module.id,
          label: module.label,
          archetype: module.kind,
          cluster: module.cluster,
          jointId: `module:${module.id}`,
          scale: module.scale,
          energy,
          activation: clamp(energy * 0.8 + this.physics.getEdgeFlow(module.outputs[0] ?? '') * 0.2, 0, 1),
          fatigue: clamp(1 - energy, 0, 1),
          tags: module.tags,
        };
      }),
      edges: this.blueprint.conduits.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        weight: edge.weight,
        flow: this.physics.getEdgeFlow(edge.id),
        enabled: true,
      })),
      sources: this.blueprint.sources.map((source) => ({
        ...source,
        energy: clamp(this.physics.getModuleEnergy(source.moduleId) + source.energy * 0.2, 0, 1.4),
      })),
      bindings: this.bindings.map((binding) => ({ ...binding })),
      focusTargets: this.blueprint.focusTargets,
      macros: this.getGraphMacros(),
    };
  }

  setGraphMacro(id: string, value: number): void {
    this.setPhysicsMacro(id, value);
  }

  updateGraphBinding(id: string, patch: ScoreBindingPatch): void {
    const binding = this.bindings.find((b) => b.id === id);
    if (!binding) return;
    if (patch.weight !== undefined) binding.weight = clamp(patch.weight, 0, 1.5);
    if (patch.enabled !== undefined) binding.enabled = patch.enabled;
    if (patch.mode !== undefined) binding.mode = patch.mode;
    this.physics.setBindingWeight(id, binding.weight * (binding.enabled ? 1 : 0));
  }

  setFocusTarget(id: string): void {
    this.activeFocusId = id;
    this.cameraDirector.focusOn(id);
  }

  growMachine(count: number): void {
    this.rebuildMachine(this.blueprint.moduleCount + Math.round(count));
  }

  rebuildMachine(moduleCount: number): void {
    const next = clamp(Math.round(moduleCount), 12, MAX_MODAL_FLOW_MODULES);
    if (next === this.blueprint.moduleCount) return;
    const program = this.physics.exportProgram();
    const bindings = this.bindings.map((binding) => ({ ...binding }));
    const ctx = this.ctx;
    this.machine.dispose();
    this.blueprint = createModalFlowBlueprint(next);
    this.physics = new ModalFlowPhysics(this.blueprint);
    this.physics.importProgram(program);
    this.bindings = this.blueprint.bindings.map((binding) => {
      const saved = bindings.find((b) => b.id === binding.id);
      return saved ? { ...binding, ...saved } : { ...binding };
    });
    for (const binding of this.bindings) {
      this.physics.setBindingWeight(binding.id, binding.weight * (binding.enabled ? 1 : 0));
    }
    this.composer.reset();
    this.machine = new ModalFlowMachine(this.blueprint, this.physics);
    if (ctx) this.machine.attach(ctx.scene);
    this.activeFocusId = 'focus-macro';
    this.cameraDirector.invalidate();
    this.cameraDirector.setMode(this.cameraMode === 1 ? 0 : this.cameraMode);
  }

  exportGraphConfig(): string {
    return JSON.stringify({
      version: 8,
      name: 'MODAL FLOW CONFIG',
      moduleCount: this.blueprint.moduleCount,
      focusId: this.activeFocusId,
      program: this.physics.getProgram(),
      bindings: this.bindings,
      macros: this.getGraphMacros(),
    });
  }

  importGraphConfig(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as {
        moduleCount?: number;
        focusId?: string;
        program?: boolean[][];
        bindings?: BindingSpec[];
      };
      if (typeof parsed.moduleCount === 'number') this.rebuildMachine(parsed.moduleCount);
      if (parsed.program) {
        this.physics.importProgram(
          JSON.stringify({ lanes: ROUTING_LANE_COUNT, steps: MODAL_FLOW_PROGRAM_STEPS, program: parsed.program }),
        );
      }
      if (Array.isArray(parsed.bindings)) {
        for (const saved of parsed.bindings) {
          const binding = this.bindings.find((b) => b.id === saved.id);
          if (!binding) continue;
          if (typeof saved.weight === 'number') binding.weight = clamp(saved.weight, 0, 1.5);
          if (typeof saved.enabled === 'boolean') binding.enabled = saved.enabled;
          if (typeof saved.mode === 'string') binding.mode = saved.mode;
          this.physics.setBindingWeight(binding.id, binding.weight * (binding.enabled ? 1 : 0));
        }
      }
      if (typeof parsed.focusId === 'string') this.setFocusTarget(parsed.focusId);
    } catch {
      // Invalid configuration JSON leaves the live machine untouched.
    }
  }

  getPhysicsSnapshot(): PhysicsStudioSnapshot {
    const telemetry = this.physics.getTelemetry();
    const composer = this.composer.getState(this.physics.getTime());
    return {
      name: 'MODAL FLOW // ROUTING WHEEL + PHYSICAL PART REGISTRY',
      version: 8,
      laneCount: ROUTING_LANE_COUNT,
      stepCount: MODAL_FLOW_PROGRAM_STEPS,
      laneLabels: this.blueprint.routingLanes.map((lane) => lane.label),
      instrumentLabels: this.blueprint.modules
        .filter((m) => ['gate', 'tines', 'resonator', 'chime', 'drum', 'satellite'].includes(m.kind))
        .map((m) => m.label),
      pins: this.physics.getProgramPins(),
      macros: this.getPhysicsMacros(),
      parts: [
        ...this.blueprint.modules.map((module) => ({
          id: module.id,
          label: module.label,
          kind: module.kind,
          jointId: `module:${module.id}`,
          parentId: 'root',
          state: this.physics.getModuleEnergy(module.id) > 0.25 ? 'EXCITED' : 'IDLE',
          energy: this.physics.getModuleEnergy(module.id),
          tags: module.tags,
        })),
        {
          id: 'transmission-flywheel',
          label: 'FLYWHEEL TRANSMISSION',
          kind: 'transmission',
          jointId: 'joint:flywheel',
          parentId: 'module:crank-flywheel',
          state: 'ROTATING',
          energy: this.physics.getGovernorEnergy(),
          tags: ['gear', 'crank', 'transmission'],
        },
        {
          id: 'transmission-auger',
          label: 'HELIX AUGER',
          kind: 'transmission',
          jointId: 'joint:liftAuger',
          parentId: 'module:helix-lift',
          state: 'ROTATING',
          energy: telemetry.governorEnergy,
          tags: ['lift', 'gear', 'transmission'],
        },
        {
          id: 'gate-escapement',
          label: '12-LANE ESCAPEMENT',
          kind: 'gate',
          jointId: 'joint:gateEscapement',
          parentId: 'module:gate-bank',
          state: this.physics.getGatePhase() > 0.5 ? 'OPEN' : 'CLOSED',
          energy: this.physics.getModuleEnergy('gate-bank'),
          tags: ['gate', 'escapement', 'legacy'],
        },
      ],
      focusTargets: this.blueprint.focusTargets,
      activeFocusId: this.activeFocusId,
      activeFocusLabel: this.getActiveFocusLabel(),
      telemetry: {
        ...telemetry,
        impactCount: composer.emitted,
        audioEvents: this.lastAudioEvents,
        physicsEvents: this.lastPhysicsEvents,
        phraseIndex: composer.phraseIndex,
        emittedNotes: composer.emitted,
        droppedPhysicsEvents: composer.dropped,
        restRemaining: composer.restRemaining,
        lastMidiNote: composer.lastMidiNote,
      },
    };
  }

  setPhysicsMacro(id: string, value: number): void {
    this.ctx?.matrix.setMacroBase(id, value);
    this.physics.setMacro(id, value);
  }

  toggleProgrammingPin(lane: number, step: number, enabled?: boolean): void {
    this.physics.toggleProgram(lane, step, enabled);
  }

  resetPhysics(): void {
    this.physics.reset();
    this.composer.reset();
  }

  dropMarbles(count: number): void {
    this.physics.dropMarbles(count);
  }

  exportPhysicsProgram(): string {
    return this.physics.exportProgram();
  }

  importPhysicsProgram(raw: string): void {
    this.physics.importProgram(raw);
  }

  getMetrics() {
    const telemetry = this.physics.getTelemetry();
    const composer = this.composer.getState(this.physics.getTime());
    return {
      activeInstances: telemetry.activeMarbles + this.blueprint.moduleCount,
      structuralStress: clamp(telemetry.instrumentEnergy / 36 + composer.emitted * 0.0015, 0, 1),
      kineticEnergy: clamp(telemetry.activeMarbles / Math.max(1, this.physics.marbles.length), 0, 1),
      behavioralState: `PHRASE ${composer.phraseIndex + 1} // ${composer.lastSubsystem.toUpperCase()} // ${composer.emitted} PHYSICS NOTES`,
      activeShotBadge:
        this.cameraMode === 1
          ? `DRONE PILOT // ${this.freeFly?.getDroneState().follow ? 'MARBLE LOCK' : 'FREE FLIGHT'}`
          : this.cameraDirector.getActiveShotBadge(),
    };
  }

  dispose(): void {
    this.machine.dispose();
    this.freeFly?.dispose();
    this.freeFly = null;
    this.hud?.remove();
    this.hud = null;
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
    const definitions =
      this.ctx?.matrix.getMacroDefinitions().filter((definition) => MODAL_FLOW_MACRO_IDS.has(definition.id)) ??
      FLOW_MACROS;
    return definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      min: definition.min,
      max: definition.max,
      value: this.ctx?.matrix.getMacroBase(definition.id) ?? definition.defaultValue,
    }));
  }

  private getGraphMacros(): GraphMacroSnapshot[] {
    return this.getPhysicsMacros();
  }

  private getActiveFocusLabel(): string {
    return (
      this.blueprint.focusTargets.find((focus) => focus.id === this.activeFocusId)?.label ??
      'WHOLE MODAL FLOW'
    );
  }

  private getEdgeEndpoints(edgeId: string): [Vec3Tuple, Vec3Tuple] | null {
    const edge = this.blueprint.conduits.find((candidate) => candidate.id === edgeId);
    if (!edge) return null;
    const from = this.blueprint.modules.find((module) => module.id === edge.from);
    const to = this.blueprint.modules.find((module) => module.id === edge.to);
    if (!from || !to) return null;
    return [tuple(from.position), tuple(to.position)];
  }

  private moduleForSubsystem(subsystem: SubsystemId): string {
    switch (subsystem) {
      case 'sub-rupture':
        return 'helix-lift';
      case 'piston-snap':
        return 'crank-flywheel';
      case 'arc-discharge':
      case 'glitch-chirp':
        return 'tri-diverter';
      case 'modal-clang':
        return 'vibraphone-tines';
      case 'glass-armonica':
        return 'resonator-bowl';
      case 'fin-cascade':
        return 'chime-orchard';
      case 'core-implode':
        return 'drum-ring';
      default:
        return 'source-reservoir';
    }
  }

  private captureCameraPose(): {
    position: Vec3Tuple;
    target: Vec3Tuple;
    fov: number;
    roll: number;
  } {
    const camera = this.ctx?.camera;
    if (!camera) {
      return { position: [0, 4.2, 13.5], target: [0, 0.4, 0], fov: 47, roll: 0 };
    }
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const target = camera.position.clone().addScaledVector(direction, 3.2);
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      fov: camera.fov,
      roll: 0,
    };
  }

  private createHud(): void {
    if (typeof document === 'undefined') return;
    const hud = document.createElement('div');
    hud.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:18px',
      'z-index:80',
      'pointer-events:none',
      'white-space:pre',
      'font:11px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace',
      'color:#cfe9ff',
      'background:rgba(5,12,18,0.78)',
      'border:1px solid rgba(125,210,255,0.28)',
      'border-radius:6px',
      'padding:10px 13px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.45)',
      'text-shadow:0 0 10px rgba(125,210,255,0.4)',
      'display:none',
    ].join(';');
    document.body.appendChild(hud);
    this.hud = hud;
  }

  private updateHud(): void {
    if (!this.hud) return;
    if (this.cameraMode !== 1 || this.directorEnabled) {
      this.hud.style.display = 'none';
      return;
    }
    const drone = this.freeFly?.getDroneState();
    const song = this.composer.getState(this.physics.getTime());
    this.hud.style.display = 'block';
    this.hud.textContent = [
      'MODAL FLOW // DRONE PILOT',
      'WASD fly · E/Q altitude · Z/X roll · drag look · wheel speed/FOV',
      'F marble lock · V cinematic drift · C follow distance · 0 level horizon',
      `SPEED ${(drone?.speed ?? 1).toFixed(2)}  FOV ${(drone?.fov ?? 47).toFixed(0)}  FOLLOW ${drone?.follow ? 'ON' : 'OFF'}  DRIFT ${drone?.cinematic ? 'ON' : 'OFF'}`,
      `PHYSICS EVENTS ${this.lastPhysicsEvents}  AUDIBLE NOTES ${this.lastAudioEvents}  PHRASE ${song.phraseIndex + 1}  REST ${song.restRemaining.toFixed(2)}s`,
      `LAST NOTE ${song.lastMidiNote || '--'} // ${song.lastSubsystem.toUpperCase()}  EMITTED ${song.emitted}  DROPPED ${song.dropped}`,
    ].join('\n');
  }
}

export const ModalFlowWork: WorkDefinition = {
  id: 'modal-flow',
  title: 'MODAL FLOW // PHYSICS SONG',
  subtitle:
    '3D Modular Marble Instrument // D-Lydian Physics-Generated Composition // Drone + Cinematic Camera',
  author: 'SONOBJET ENGINE // V8',
  bpm: MODAL_FLOW_BPM,
  bars: MODAL_FLOW_TOTAL_BARS,
  sections: MODAL_FLOW_SECTIONS,
  macros: ALL_MACROS,
  defaultPatches: ALL_PATCHES,
  cameraModeLabels: CAMERA_LABELS,
  createInstance: () => new ModalFlowSceneInstance(),
};
