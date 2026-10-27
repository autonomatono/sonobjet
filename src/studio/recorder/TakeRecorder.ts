import type { ImpulseEvent, PunchFxId } from '../../engine/core/types';

export type RecordedGestureEvent =
  | {
      timeSec: number;
      kind: 'impulse';
      impulse: ImpulseEvent;
    }
  | {
      timeSec: number;
      kind: 'punch';
      punchId: PunchFxId;
      active: boolean;
    }
  | {
      timeSec: number;
      kind: 'macro';
      macroId: string;
      value: number;
    }
  | {
      timeSec: number;
      kind: 'strain';
      x: number;
      y: number;
      tension: number;
      active: boolean;
    }
  | {
      timeSec: number;
      kind: 'camera';
      mode: number;
    };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type GestureEventPayload = DistributiveOmit<
  RecordedGestureEvent,
  'timeSec'
>;
export interface PerformanceTake {
  version: 1;
  workId: string;
  bpm: number;
  recordedAt: string;
  durationSec: number;
  events: RecordedGestureEvent[];
}

/**
 * Multi-Pass Overdub Performance & Composition Recorder.
 *
 * Captures every live keyboard impulse, breakcore punch-in FX, mouse/MediaPipe
 * strain trajectory, macro automation, and camera cut with exact timestamps.
 * Supports Overdub layering (composing iteratively by improvising pass after pass!)
 * and portable `.sonobjet-take.json` export/import.
 */
export class TakeRecorder {
  private recording = false;
  private replaying = false;
  private startPerfSec = 0;
  private replayPerfSec = 0;
  private replayCursor = 0;

  private events: RecordedGestureEvent[] = [];
  private activeWorkId = 'gantz-tecton';
  private activeBpm = 172;
  private durationSec = 0;

  isRecording(): boolean {
    return this.recording;
  }

  isReplaying(): boolean {
    return this.replaying;
  }

  getEventCount(): number {
    return this.events.length;
  }

  startRecording(workId: string, bpm: number, nowSec: number, overdub = true): void {
    this.activeWorkId = workId;
    this.activeBpm = bpm;
    if (!overdub) {
      this.events = [];
      this.durationSec = 0;
    }
    this.recording = true;
    this.startPerfSec = nowSec;
    if (overdub && this.events.length > 0) {
      // Replay existing passes simultaneously while recording the new overdub pass!
      this.replaying = true;
      this.replayPerfSec = nowSec;
      this.replayCursor = 0;
    }
  }

  stopRecording(nowSec: number): void {
    if (!this.recording) return;
    this.recording = false;
    const passDuration = Math.max(0.1, nowSec - this.startPerfSec);
    this.durationSec = Math.max(this.durationSec, passDuration);
    this.events.sort((a, b) => a.timeSec - b.timeSec);
  }

  startReplay(nowSec: number): void {
    if (this.events.length === 0) return;
    this.events.sort((a, b) => a.timeSec - b.timeSec);
    this.replaying = true;
    this.replayPerfSec = nowSec;
    this.replayCursor = 0;
  }

  stopReplay(): void {
    this.replaying = false;
    this.replayCursor = 0;
  }

  clear(): void {
    this.recording = false;
    this.replaying = false;
    this.events = [];
    this.durationSec = 0;
    this.replayCursor = 0;
  }

  record(nowSec: number, event: GestureEventPayload): void {
    if (!this.recording) return;
    const timeSec = Math.max(0, nowSec - this.startPerfSec);
    this.events.push({ ...event, timeSec } as RecordedGestureEvent);
  }

  /**
   * Emits all recorded events due up to `nowSec` during Replay or Overdub.
   */
  pollReplay(nowSec: number, loop = true): RecordedGestureEvent[] {
    if (!this.replaying || this.events.length === 0) return [];
    const elapsed = nowSec - this.replayPerfSec;
    const due: RecordedGestureEvent[] = [];

    while (
      this.replayCursor < this.events.length &&
      this.events[this.replayCursor].timeSec <= elapsed
    ) {
      due.push(this.events[this.replayCursor]);
      this.replayCursor++;
    }

    const totalDur = Math.max(
      this.durationSec,
      this.events[this.events.length - 1]?.timeSec ?? 0,
    );
    if (elapsed > totalDur + 0.05 && this.replayCursor >= this.events.length) {
      if (loop && !this.recording) {
        this.replayPerfSec = nowSec;
        this.replayCursor = 0;
      } else if (!this.recording) {
        this.replaying = false;
      }
    }

    return due;
  }

  exportJSON(): string {
    const take: PerformanceTake = {
      version: 1,
      workId: this.activeWorkId,
      bpm: this.activeBpm,
      recordedAt: new Date().toISOString(),
      durationSec: this.durationSec,
      events: this.events,
    };
    return JSON.stringify(take, null, 2);
  }

  importJSON(raw: string): PerformanceTake {
    const parsed = JSON.parse(raw) as PerformanceTake;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) {
      throw new Error('Invalid .sonobjet-take.json format');
    }
    this.activeWorkId = parsed.workId || 'gantz-tecton';
    this.activeBpm = parsed.bpm || 172;
    this.durationSec = parsed.durationSec || 0;
    this.events = parsed.events.slice().sort((a, b) => a.timeSec - b.timeSec);
    this.recording = false;
    this.replaying = false;
    this.replayCursor = 0;
    return parsed;
  }
}
