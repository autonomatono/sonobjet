import type { ImpulseEvent, SubsystemId } from '../../engine/core/types';
import type { PhysicsSongEvent } from './ModalFlowPhysics';
import { modalFlowDegreeToMidi, MODAL_FLOW_THEME_PHRASES } from './ModalFlowScore';

export interface ModalFlowComposerParams {
  phraseDensity: number;
  registerSpread: number;
  timbreBloom: number;
  scoreIntensity: number;
  sectionIndex: number;
}

export interface ModalFlowComposerState {
  phraseIndex: number;
  phraseNotes: number;
  emitted: number;
  dropped: number;
  lastMidiNote: number;
  lastSubsystem: SubsystemId;
  restRemaining: number;
  density: number;
}

const STRIKE_VOICES: SubsystemId[] = [
  'modal-clang',
  'glass-armonica',
  'fin-cascade',
  'core-implode',
  'modal-clang',
  'arc-discharge',
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const EVENT_WEIGHT: Record<PhysicsSongEvent['kind'], number> = {
  strike: 1,
  gate: 0.92,
  collision: 0.78,
  divert: 0.66,
  lift: 0.58,
  energy: 0.82,
  flow: 0.38,
  release: 0.32,
  return: 0.22,
  recycle: 0.18,
  jam: 0.12,
};

/**
 * Turns real solver events into a rationed D-Lydian composition. This is the
 * opposite of a score playing along with a machine: phrase rests, module
 * cooldowns and a global event budget decide which physical impacts are allowed
 * to become notes. Elevation chooses register; module identity chooses timbre;
 * impact energy chooses velocity and decay.
 */
export class ModalFlowComposer {
  private readonly params: ModalFlowComposerParams = {
    phraseDensity: 0.62,
    registerSpread: 1,
    timbreBloom: 0.54,
    scoreIntensity: 0.4,
    sectionIndex: 0,
  };

  private readonly lastModuleTime = new Map<string, number>();
  private lastNoteTime = -Infinity;
  private phrasePauseUntil = -Infinity;
  private phraseIndex = 0;
  private themeCursor = 0;
  private phraseNotes = 0;
  private emitted = 0;
  private dropped = 0;
  private lastMidiNote = 0;
  private lastSubsystem: SubsystemId = 'modal-clang';

  setParams(patch: Partial<ModalFlowComposerParams>): void {
    Object.assign(this.params, patch);
  }

  reset(): void {
    this.lastModuleTime.clear();
    this.lastNoteTime = -Infinity;
    this.phrasePauseUntil = -Infinity;
    this.phraseIndex = 0;
    this.themeCursor = 0;
    this.phraseNotes = 0;
    this.emitted = 0;
    this.dropped = 0;
    this.lastMidiNote = 0;
    this.lastSubsystem = 'modal-clang';
  }

  getState(now = 0): ModalFlowComposerState {
    return {
      phraseIndex: this.phraseIndex,
      phraseNotes: this.phraseNotes,
      emitted: this.emitted,
      dropped: this.dropped,
      lastMidiNote: this.lastMidiNote,
      lastSubsystem: this.lastSubsystem,
      restRemaining: Math.max(0, this.phrasePauseUntil - now),
      density: this.params.phraseDensity,
    };
  }

  /** Returns a playable impulse only when the physical phrase gate opens. */
  map(event: PhysicsSongEvent, beat: number, audioTime: number): ImpulseEvent | null {
    const density = clamp(this.params.phraseDensity, 0.18, 1.35);
    const weight = EVENT_WEIGHT[event.kind] ?? 0.4;
    const threshold = 0.1 + (1 - Math.min(1, density)) * 0.16;
    const expression = event.energy * weight + event.velocity * 0.12;
    const maxPerSecond = 0.85 + density * 1.9;
    const minInterval = 1 / maxPerSecond;
    const moduleCooldown = 0.26 + (1 - Math.min(1, density)) * 0.48;
    const phraseLength = 5 + Math.floor(Math.min(1, density) * 4);
    const restDuration = 0.95 + (1 - Math.min(1, density)) * 1.25;

    if (event.time < this.phrasePauseUntil) {
      this.dropped += 1;
      return null;
    }
    if (expression < threshold) {
      this.dropped += 1;
      return null;
    }
    if (event.time - this.lastNoteTime < minInterval) {
      this.dropped += 1;
      return null;
    }
    const lastModule = this.lastModuleTime.get(event.moduleId) ?? -Infinity;
    if (event.time - lastModule < moduleCooldown) {
      this.dropped += 1;
      return null;
    }

    const phrase =
      MODAL_FLOW_THEME_PHRASES[this.phraseIndex % MODAL_FLOW_THEME_PHRASES.length] ??
      MODAL_FLOW_THEME_PHRASES[0];
    const baseDegree = phrase[this.themeCursor % phrase.length];
    const physicalJitter = (event.noteIndex % 3) - 1;
    const collisionLift = event.kind === 'collision' ? 1 : event.kind === 'lift' ? -1 : 0;
    const sectionLift = this.params.sectionIndex >= 4 ? 1 : 0;
    const degree = baseDegree + physicalJitter + collisionLift + sectionLift;
    const elevation = clamp(event.position.y, -3, 6);
    const octaveShift = clamp(
      Math.floor(((elevation + 2.6) / 2.5) * this.params.registerSpread),
      -1,
      2,
    );
    const midiNote = clamp(modalFlowDegreeToMidi(degree, octaveShift), 38, 88);
    const subsystem = this.subsystemFor(event);
    const velocity = clamp(
      (0.2 + event.energy * 0.62 + event.velocity * 0.22) * (0.82 + this.params.scoreIntensity * 0.28),
      0.12,
      1.18,
    );
    const durationSec = clamp(
      0.34 + this.params.timbreBloom * 0.95 + (subsystem === 'glass-armonica' ? 0.55 : 0) + event.energy * 0.26,
      0.28,
      2.2,
    );

    this.lastNoteTime = event.time;
    this.lastModuleTime.set(event.moduleId, event.time);
    this.phraseNotes += 1;
    this.themeCursor += 1;
    this.emitted += 1;
    this.lastMidiNote = midiNote;
    this.lastSubsystem = subsystem;
    if (this.phraseNotes >= phraseLength) {
      this.phrasePauseUntil = event.time + restDuration;
      this.phraseNotes = 0;
      this.phraseIndex = (this.phraseIndex + 1) % MODAL_FLOW_THEME_PHRASES.length;
      this.themeCursor = 0;
    }

    return {
      subsystem,
      velocity,
      pitchRatio: 1,
      midiNote,
      durationSec,
      decay: clamp(0.62 + this.params.timbreBloom * 0.48 + event.energy * 0.16, 0.5, 1.6),
      sliceIndex: ((Math.round(midiNote) % 16) + 16) % 16,
      locus: [
        clamp(event.position.x / 8, -1, 1),
        clamp(event.position.y / 6, -1, 1),
        clamp(event.position.z / 8, -1, 1),
      ],
      audioTime,
      beat,
      origin: 'physics',
    };
  }

  private subsystemFor(event: PhysicsSongEvent): SubsystemId {
    switch (event.kind) {
      case 'lift':
      case 'energy':
      case 'recycle':
        return event.energy > 0.45 ? 'sub-rupture' : 'piston-snap';
      case 'gate':
        return 'arc-discharge';
      case 'divert':
        return 'glitch-chirp';
      case 'collision':
        return 'piston-snap';
      case 'flow':
      case 'return':
        return event.energy > 0.5 ? 'fin-cascade' : 'core-implode';
      case 'strike':
      case 'release':
      case 'jam':
      default: {
        const hash = hashString(event.moduleId);
        return STRIKE_VOICES[hash % STRIKE_VOICES.length];
      }
    }
  }
}
