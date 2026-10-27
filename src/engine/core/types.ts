import type * as THREE from 'three/webgpu';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Clock } from './Clock';
import type { ModulationMatrix } from './ModulationMatrix';

export type SubsystemId =
  | 'sub-rupture'
  | 'spine-shear'
  | 'fin-cascade'
  | 'piston-snap'
  | 'break-shred'
  | 'modal-clang'
  | 'core-implode'
  | 'arc-discharge'
  | 'larynx-lead'
  | 'bellows-choir'
  | 'windup-inhale';

export type PunchFxId =
  | 'stutter'
  | 'ratchet'
  | 'halftime'
  | 'comb-scream'
  | 'reverse-slice'
  | 'tectonic-explode'
  | 'hard-lock';

/**
 * Biomechanical Anticipation Pre-Cue:
 * Released ahead of heavy strikes so the automaton physically coils its spine,
 * cocks its siege-hammer, or inhales its bellows BEFORE the acoustic impact!
 */
export interface AnticipationCue {
  targetSubsystem: SubsystemId;
  intensity: number;
  leadTimeSec: number;
  audioTime: number;
}

/**
 * Unified causal event: a single ImpulseEvent simultaneously actuates
 * a Sonobjet's biomechanical organs AND its custom synthesis voice.
 */
export interface ImpulseEvent {
  /** Subsystem / biomechanical organ actuated */
  subsystem: SubsystemId;
  /** Normalized kinetic energy [0..1.5] */
  velocity: number;
  /** Pitch ratio (for percussive/sliced voices) */
  pitchRatio: number;
  /** Exact MIDI note number when playing melodic/harmonic material (e.g. 60 = C4) */
  midiNote?: number;
  /** Polychord MIDI notes when playing bellows-choir harmonies */
  chordNotes?: number[];
  /** Formant vowel morph [0 = 'AH', 0.25 = 'EH', 0.5 = 'EE', 0.75 = 'OH', 1.0 = 'OO'] */
  vowel?: number;
  /** Explicit musical gate/sustain duration in seconds */
  durationSec?: number;
  /** Micro-decay / damping factor [0.05..2.5] */
  decay: number;
  /** Harp string / break slice index [0..15] */
  sliceIndex?: number;
  /** Reverse playback flag */
  reverse?: boolean;
  /** 3D spatial locus in object-local coordinates [-1..1]^3 */
  locus: [number, number, number];
  /** Ratchet index within a burst (0 = primary strike, >0 = sub-ratchet) */
  ratchetStep?: number;
  /** Total steps in current ratchet burst */
  ratchetTotal?: number;
  /** Exact WebAudio context time when scheduled ahead, or 0 for immediate live input */
  audioTime: number;
  /** Transport beat position at emission */
  beat: number;
  /** Origin of impulse for telemetry & recording */
  origin: 'score' | 'keyboard' | 'mouse' | 'sensor' | 'take';
}

export interface TransportState {
  playing: boolean;
  mode: 'hybrid' | 'live-only';
  bpm: number;
  currentTime: number;
  duration: number;
  loop: boolean;
  beat: number;
  bar: number;
  step16: number;
  step64: number;
  sectionIndex: number;
  sectionName: string;
  sectionProgress: number;
}

export interface SectionDefinition {
  id: string;
  name: string;
  startBar: number;
  endBar: number;
  intensity: number;
  description: string;
}

export interface MacroDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  description: string;
}

export interface PatchRoute {
  id: string;
  source: string;
  target: string;
  amount: number;
  slew?: number;
  enabled: boolean;
}

export interface WorkRuntimeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  audio: AudioEngine;
  clock: Clock;
  matrix: ModulationMatrix;
}

export interface TelemetrySnapshot {
  gpuBackend: 'WebGPU' | 'WebGL2' | 'Headless';
  fps: number;
  activeInstances: number;
  structuralStress: number;
  kineticEnergy: number;
  behavioralState?: string;
  lastImpulse: ImpulseEvent | null;
  impulseCount: number;
}

export interface WorkSceneInstance {
  init(ctx: WorkRuntimeContext): void;
  /** Invoked at sample-accurate lookahead window to schedule score events */
  scheduleStep?(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void;
  /** Optional biomechanical wind-up pre-cue invoked ahead of heavy impacts */
  triggerAnticipation?(cue: AnticipationCue, ctx: WorkRuntimeContext): void;
  /** Invoked when a live or scheduled ImpulseEvent reaches visual presentation or immediate trigger */
  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void;
  /** Invoked every animation frame */
  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void;
  /** Optional camera cut request (1..5) */
  setCameraMode?(mode: number): void;
  getCameraMode?(): number;
  orbitCamera?(dx: number, dy: number): void;
  zoomCamera?(delta: number): void;
  /** Apply continuous interactive pointer focus & strain (world/screen normalized) */
  setPointerStrain?(x: number, y: number, tension: number, active: boolean): void;
  /** Update continuous gaze target from mouse hover or MediaPipe hand position */
  setGazeTarget?(x: number, y: number): void;
  /** Snapshot physical state metrics for Studio HUD */
  getMetrics(): {
    activeInstances: number;
    structuralStress: number;
    kineticEnergy: number;
    behavioralState?: string;
  };
  dispose(): void;
}

export interface WorkDefinition {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  bpm: number;
  bars: number;
  sections: SectionDefinition[];
  macros: MacroDefinition[];
  defaultPatches: PatchRoute[];
  createInstance(): WorkSceneInstance;
}
