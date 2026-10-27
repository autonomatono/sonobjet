import type {
  AnticipationCue,
  ImpulseEvent,
  SectionDefinition,
  TransportState,
} from './types';

export type StepScheduleCallback = (
  step64: number,
  bar: number,
  audioTime: number,
) => void;

/**
 * Dual-Domain Sample-Accurate Audiovisual Transport & Scheduler
 * with Biomechanical Anticipation Queue.
 *
 * Schedules audio events in a 95ms WebAudio lookahead window while releasing
 * both pre-strike AnticipationCues and DAC-locked ImpulseEvents to the 3D organs.
 */
export class Clock {
  private bpm = 164;
  private totalBars = 80;
  private sections: SectionDefinition[] = [];
  private playing = false;
  private mode: 'hybrid' | 'live-only' = 'hybrid';
  private loop = true;

  private transportSec = 0;
  private lastAudioNow = 0;
  private nextStep64 = 0;
  private nextStepAudioTime = 0;

  private readonly lookaheadSec = 0.095;
  private visualQueue: ImpulseEvent[] = [];
  private anticipationQueue: AnticipationCue[] = [];

  configure(bpm: number, bars: number, sections: SectionDefinition[]): void {
    this.bpm = Math.max(40, Math.min(300, bpm));
    this.totalBars = Math.max(1, bars);
    this.sections = sections;
    this.seekBar(0);
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(300, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  setMode(mode: 'hybrid' | 'live-only'): void {
    this.mode = mode;
  }

  getMode(): 'hybrid' | 'live-only' {
    return this.mode;
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getStep64DurationSec(timeStretch = 1): number {
    const effectiveBpm = Math.max(25, this.bpm * timeStretch);
    return 60 / effectiveBpm / 16;
  }

  getDurationSec(): number {
    return (this.totalBars * 4 * 60) / this.bpm;
  }

  play(audioNow: number): void {
    if (this.playing) return;
    this.playing = true;
    this.lastAudioNow = audioNow;
    const totalStep64Float = this.secondsToStep64(this.transportSec);
    this.nextStep64 = Math.ceil(totalStep64Float);
    const deltaSteps = Math.max(0, this.nextStep64 - totalStep64Float);
    this.nextStepAudioTime =
      audioNow + deltaSteps * this.getStep64DurationSec() + 0.015;
  }

  pause(): void {
    this.playing = false;
    this.visualQueue = [];
    this.anticipationQueue = [];
  }

  toggle(audioNow: number): boolean {
    if (this.playing) {
      this.pause();
    } else {
      this.play(audioNow);
    }
    return this.playing;
  }

  seekSeconds(seconds: number, audioNow = 0): void {
    const duration = this.getDurationSec();
    this.transportSec = Math.max(0, Math.min(duration, seconds));
    this.visualQueue = [];
    this.anticipationQueue = [];
    const stepFloat = this.secondsToStep64(this.transportSec);
    this.nextStep64 = Math.floor(stepFloat);
    this.lastAudioNow = audioNow;
    this.nextStepAudioTime = audioNow + 0.02;
  }

  seekBar(bar: number, audioNow = 0): void {
    const clampedBar = Math.max(0, Math.min(this.totalBars - 0.001, bar));
    const sec = (clampedBar * 4 * 60) / this.bpm;
    this.seekSeconds(sec, audioNow);
  }

  queueVisualEvent(event: ImpulseEvent): void {
    this.visualQueue.push(event);
  }

  queueAnticipationCue(cue: AnticipationCue): void {
    this.anticipationQueue.push(cue);
  }

  tick(
    audioNow: number,
    fallbackDt: number,
    timeStretch: number,
    onScheduleStep?: StepScheduleCallback,
  ): {
    state: TransportState;
    dueEvents: ImpulseEvent[];
    dueAnticipations: AnticipationCue[];
  } {
    const maxStep64 = this.totalBars * 64;

    if (this.playing) {
      const rawDelta =
        this.lastAudioNow > 0
          ? Math.max(0, Math.min(0.15, audioNow - this.lastAudioNow))
          : fallbackDt;
      this.lastAudioNow = audioNow;
      this.transportSec += rawDelta * timeStretch;

      const duration = this.getDurationSec();
      if (this.transportSec >= duration) {
        if (this.loop) {
          this.transportSec = this.transportSec % duration;
          this.nextStep64 = Math.floor(this.secondsToStep64(this.transportSec));
          this.nextStepAudioTime = audioNow + 0.01;
        } else {
          this.transportSec = duration;
          this.playing = false;
        }
      }

      if (this.playing && this.mode === 'hybrid' && onScheduleStep) {
        const stepDur = this.getStep64DurationSec(timeStretch);
        let guard = 0;
        while (
          this.nextStepAudioTime < audioNow + this.lookaheadSec &&
          guard < 32
        ) {
          const wrappedStep =
            ((this.nextStep64 % maxStep64) + maxStep64) % maxStep64;
          const bar = Math.floor(wrappedStep / 64);
          const stepInBar = wrappedStep % 64;
          onScheduleStep(stepInBar, bar, this.nextStepAudioTime);
          this.nextStep64 += 1;
          this.nextStepAudioTime += stepDur;
          guard += 1;
        }
      }
    } else {
      this.lastAudioNow = audioNow;
    }

    const dueEvents: ImpulseEvent[] = [];
    if (this.visualQueue.length > 0) {
      const remaining: ImpulseEvent[] = [];
      for (const ev of this.visualQueue) {
        if (ev.audioTime <= audioNow + 0.004) {
          dueEvents.push(ev);
        } else {
          remaining.push(ev);
        }
      }
      this.visualQueue = remaining;
    }

    const dueAnticipations: AnticipationCue[] = [];
    if (this.anticipationQueue.length > 0) {
      const remCues: AnticipationCue[] = [];
      for (const cue of this.anticipationQueue) {
        if (cue.audioTime <= audioNow + 0.004) {
          dueAnticipations.push(cue);
        } else {
          remCues.push(cue);
        }
      }
      this.anticipationQueue = remCues;
    }

    return {
      state: this.getState(),
      dueEvents,
      dueAnticipations,
    };
  }

  getState(): TransportState {
    const duration = this.getDurationSec();
    const totalStep64 = this.secondsToStep64(this.transportSec);
    const beat = totalStep64 / 16;
    const bar = Math.floor(beat / 4);
    const step64 = Math.floor(totalStep64) % 64;
    const step16 = Math.floor(step64 / 4);

    let sectionIndex = 0;
    let sectionName = 'LIVE';
    let sectionProgress = 0;
    for (let i = 0; i < this.sections.length; i++) {
      const s = this.sections[i];
      if (bar >= s.startBar && bar < s.endBar) {
        sectionIndex = i;
        sectionName = s.name;
        const barFloat = beat / 4;
        sectionProgress = Math.max(
          0,
          Math.min(
            1,
            (barFloat - s.startBar) / Math.max(1, s.endBar - s.startBar),
          ),
        );
        break;
      }
    }

    return {
      playing: this.playing,
      mode: this.mode,
      bpm: this.bpm,
      currentTime: this.transportSec,
      duration,
      loop: this.loop,
      beat,
      bar,
      step16,
      step64,
      sectionIndex,
      sectionName,
      sectionProgress,
    };
  }

  private secondsToStep64(sec: number): number {
    return (sec * this.bpm * 16) / 60;
  }
}
