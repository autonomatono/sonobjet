import type { ImpulseEvent, SubsystemId } from '../../engine/core/types';
import type {
  ModalFlowComposerParams,
  ModalFlowComposerState,
} from '../modal-flow/ModalFlowComposer';
import type { PhysicsSongEvent } from '../modal-flow/ModalFlowPhysics';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const hash = (value: string): number => {
  let result = 0;
  for (let i = 0; i < value.length; i++) result = (result * 33 + value.charCodeAt(i)) >>> 0;
  return result;
};

/**
 * Dense physics-to-audio mapper for the open pinball computer. Sequenced events
 * are not MIDI notes sent around the machine: they are metadata attached to an
 * energy injection, and this class only sees them after ModalFlowPhysics emits
 * the receiving organ's physical event. Free-running marbles and transmissions
 * supply fills, ghost notes and harmonic variation around that mechanical grid.
 */
export class NeonPinballComposer {
  private readonly params: ModalFlowComposerParams = {
    phraseDensity: 0.92,
    registerSpread: 1.15,
    timbreBloom: 0.72,
    scoreIntensity: 0.4,
    sectionIndex: 0,
  };
  private readonly lastModuleTime = new Map<string, number>();
  private lastFreeEventTime = -Infinity;
  private emitted = 0;
  private dropped = 0;
  private phraseNotes = 0;
  private phraseIndex = 0;
  private lastMidiNote = 0;
  private lastSubsystem: SubsystemId = 'break-shred';

  setParams(patch: Partial<ModalFlowComposerParams>): void {
    Object.assign(this.params, patch);
    this.phraseIndex = Math.max(0, Math.floor(this.params.sectionIndex));
  }

  reset(): void {
    this.lastModuleTime.clear();
    this.lastFreeEventTime = -Infinity;
    this.emitted = 0;
    this.dropped = 0;
    this.phraseNotes = 0;
    this.phraseIndex = 0;
    this.lastMidiNote = 0;
    this.lastSubsystem = 'break-shred';
  }

  getState(_now = 0): ModalFlowComposerState {
    return {
      phraseIndex: this.phraseIndex,
      phraseNotes: this.phraseNotes,
      emitted: this.emitted,
      dropped: this.dropped,
      lastMidiNote: this.lastMidiNote,
      lastSubsystem: this.lastSubsystem,
      restRemaining: 0,
      density: this.params.phraseDensity,
    };
  }

  map(event: PhysicsSongEvent, beat: number, audioTime: number): ImpulseEvent | null {
    if (event.sequenced && event.kind === 'energy') {
      return this.mapSequenced(event, beat, audioTime);
    }

    // Free physics provides fills rather than an uncontrolled wall of notes.
    const density = clamp(this.params.phraseDensity, 0.18, 1.35);
    const sectionEnergy = clamp(this.params.scoreIntensity, 0, 1.2);
    const minInterval = 0.14 - Math.min(1, density) * 0.075;
    const moduleCooldown = 0.22 - Math.min(1, density) * 0.1;
    const previous = this.lastModuleTime.get(event.moduleId) ?? -Infinity;
    const important = event.kind === 'strike' || event.kind === 'mechanism' || event.kind === 'collision';
    const expression = event.energy * (important ? 1 : 0.55) + event.velocity * 0.18;
    const deterministicGate = ((event.id * 17 + hash(event.moduleId)) % 100) / 100;
    const probability = clamp(0.18 + density * 0.24 + sectionEnergy * 0.16, 0.2, 0.72);
    if (
      !important ||
      expression < 0.24 ||
      event.time - this.lastFreeEventTime < minInterval ||
      event.time - previous < moduleCooldown ||
      deterministicGate > probability
    ) {
      this.dropped += 1;
      return null;
    }

    this.lastFreeEventTime = event.time;
    this.lastModuleTime.set(event.moduleId, event.time);
    let subsystem = this.voiceFor(event);
    // Keep free-running breaks as light ghost slices; the programmed solenoids
    // own the main backbeat and low end.
    if (subsystem === 'sub-rupture' && event.kind !== 'strike') subsystem = 'piston-snap';
    const midiNote = this.noteFor(event, subsystem);
    const impulse: ImpulseEvent = {
      subsystem,
      velocity: clamp(0.16 + expression * 0.48, 0.16, 0.78),
      pitchRatio: subsystem === 'break-shred' ? 0.9 + (event.noteIndex % 5) * 0.07 : 1,
      midiNote,
      durationSec: subsystem === 'glass-armonica' || subsystem === 'modal-clang'
        ? 0.38 + this.params.timbreBloom * 0.7
        : 0.16,
      decay: clamp(0.46 + event.energy * 0.5 + this.params.timbreBloom * 0.3, 0.4, 1.35),
      sliceIndex: event.sliceIndex ?? ((event.id + event.noteIndex * 3) % 16 + 16) % 16,
      reverse: event.reverse ?? (event.kind === 'collision' && event.id % 7 === 0),
      locus: this.locus(event),
      audioTime,
      beat,
      origin: 'physics',
    };
    this.register(impulse);
    return impulse;
  }

  private mapSequenced(
    event: PhysicsSongEvent,
    beat: number,
    audioTime: number,
  ): ImpulseEvent {
    const subsystem = event.voice ?? this.voiceFor(event);
    const ratchetProgress = event.ratchetTotal
      ? (event.ratchetStep ?? 0) / Math.max(1, event.ratchetTotal - 1)
      : 0;
    const melodic =
      subsystem === 'acid-squelch' ||
      subsystem === 'glass-armonica' ||
      subsystem === 'modal-clang' ||
      subsystem === 'bellows-choir';
    const impulse: ImpulseEvent = {
      subsystem,
      velocity: clamp(event.velocity * 0.64 + event.energy * 0.72, 0.14, 1.18),
      pitchRatio:
        subsystem === 'break-shred'
          ? clamp(0.84 + ratchetProgress * 0.58 + (event.noteIndex % 3) * 0.04, 0.72, 1.55)
          : 1,
      midiNote: melodic ? event.midiNote ?? this.noteFor(event, subsystem) : event.midiNote,
      durationSec:
        subsystem === 'glass-armonica'
          ? 0.54 + this.params.timbreBloom * 0.82
          : subsystem === 'modal-clang'
            ? 0.42 + this.params.timbreBloom * 0.45
            : subsystem === 'acid-squelch'
              ? 0.13 + (event.noteIndex % 4) * 0.045
              : 0.1 + (1 - ratchetProgress) * 0.12,
      decay:
        subsystem === 'glass-armonica' || subsystem === 'modal-clang'
          ? 0.82 + this.params.timbreBloom * 0.65
          : clamp(0.42 + event.energy * 0.42, 0.38, 0.96),
      sliceIndex: event.sliceIndex ?? ((event.noteIndex * 5 + event.id) % 16 + 16) % 16,
      reverse: event.reverse,
      ratchetStep: event.ratchetStep,
      ratchetTotal: event.ratchetTotal,
      locus: this.locus(event),
      audioTime,
      beat: event.sourceBeat ?? beat,
      origin: 'physics',
    };
    this.lastModuleTime.set(event.moduleId, event.time);
    this.register(impulse);
    return impulse;
  }

  private register(impulse: ImpulseEvent): void {
    this.emitted += 1;
    this.phraseNotes = (this.phraseNotes + 1) % 32;
    this.lastMidiNote = impulse.midiNote ?? this.lastMidiNote;
    this.lastSubsystem = impulse.subsystem;
  }

  private voiceFor(event: PhysicsSongEvent): SubsystemId {
    if (event.voice) return event.voice;
    const id = `${event.moduleId}:${event.edgeId ?? ''}`;
    if (id.includes('crystal')) return 'glass-armonica';
    if (id.includes('bell') || id.includes('chime')) return 'modal-clang';
    if (id.includes('acid') || id.includes('computer')) return 'acid-squelch';
    if (id.includes('neon')) return 'arc-discharge';
    if (id.includes('resonator-bowl')) return 'sub-rupture';
    if (
      id.includes('ratchet') ||
      id.includes('percussion') ||
      id.includes('loom') ||
      id.includes('vibraphone')
    ) return 'break-shred';
    if (id.includes('drum') || id.includes('chain')) return 'fin-cascade';
    if (event.kind === 'collision' || event.kind === 'gate') return 'piston-snap';
    return 'glitch-chirp';
  }

  private noteFor(event: PhysicsSongEvent, subsystem: SubsystemId): number | undefined {
    if (
      subsystem !== 'acid-squelch' &&
      subsystem !== 'glass-armonica' &&
      subsystem !== 'modal-clang'
    ) return undefined;
    const scale = [0, 2, 3, 5, 7, 9, 10];
    const degree = event.noteIndex;
    const wrapped = ((degree % scale.length) + scale.length) % scale.length;
    const octave = Math.floor(degree / scale.length);
    const register = subsystem === 'glass-armonica' ? 2 : subsystem === 'modal-clang' ? 2 : 0;
    return clamp(38 + scale[wrapped] + (octave + register) * 12, 34, 94);
  }

  private locus(event: PhysicsSongEvent): [number, number, number] {
    return [
      clamp(event.position.x / 14, -1, 1),
      clamp(event.position.y / 11, -1, 1),
      clamp(event.position.z / 14, -1, 1),
    ];
  }
}
