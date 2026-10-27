import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type { ImpulseEvent, PunchFxId, SubsystemId } from '../../engine/core/types';

export interface KeyPadBinding {
  key: string;
  label: string;
  subsystem: SubsystemId;
  shortName: string;
}

export interface PunchBinding {
  key: string;
  id: PunchFxId;
  label: string;
}

export const KEY_IMPULSE_PADS: KeyPadBinding[] = [
  { key: 'z', label: 'Z', subsystem: 'sub-rupture', shortName: 'DROP FORGE' },
  { key: 'x', label: 'X', subsystem: 'spine-shear', shortName: 'TRIPLE HAMMER' },
  { key: 'c', label: 'C', subsystem: 'break-shred', shortName: 'JACQUARD BREAK' },
  { key: 'v', label: 'V', subsystem: 'modal-clang', shortName: 'BABBAGE CHIME' },
  { key: 'b', label: 'B', subsystem: 'larynx-lead', shortName: 'CLAVILUX REED' },
  { key: 'n', label: 'N', subsystem: 'bellows-choir', shortName: 'ORGAN PLENUM' },
  { key: 'm', label: 'M', subsystem: 'core-implode', shortName: 'FURNACE BASS' },
  { key: ',', label: ',', subsystem: 'arc-discharge', shortName: 'BRAKE ARC' },
];

export const KEY_PUNCH_FX: PunchBinding[] = [
  { key: 'a', id: 'stutter', label: 'BRAKE STUTTER' },
  { key: 's', id: 'ratchet', label: '64TH DRILL' },
  { key: 'd', id: 'halftime', label: 'HALFTIME' },
  { key: 'f', id: 'comb-scream', label: 'COMB SCREAM' },
  { key: 'g', id: 'reverse-slice', label: 'REV SLICE' },
  { key: 'j', id: 'tectonic-explode', label: 'TOWER SPREAD' },
  { key: 'k', id: 'hard-lock', label: 'BRAKE LOCK' },
];

// F-Phrygian scale notes across 2 octaves so live keyboard/mouse play is always deeply musical!
const F_PHRYGIAN_MELODY = [65, 66, 68, 70, 72, 73, 75, 77, 78, 80];
const F_PHRYGIAN_BASS = [29, 30, 32, 34, 36, 37, 24, 25];
const F_PHRYGIAN_CHORDS: number[][] = [
  [53, 56, 60, 65, 67], // Fm(add9)
  [49, 56, 60, 65, 67], // Dbmaj7#11
  [46, 53, 58, 60, 65], // Bbm9
  [48, 52, 58, 61, 63], // C7b9
];

export interface InputRigCallbacks {
  onPlayToggle(): void;
  onToggleHud(): void;
  onCameraSelect(mode: number): void;
  onSectionJump(sectionIdx: number): void;
  onBpmNudge(delta: number): void;
  onToggleTakeRecord(): void;
  onImpulse(event: ImpulseEvent): void;
  onPunchChange(id: PunchFxId, active: boolean): void;
  onPointerStrain(x: number, y: number, tension: number, active: boolean): void;
  onOrbit(dx: number, dy: number): void;
  onZoom(delta: number): void;
}

/**
 * Tactile Keyboard & Mouse Live Performance Instrument.
 *
 * Maps Mouse X/Y to F-Phrygian scale degree + Larynx Vowel Formant so tapping
 * `V` (Mantis Harp), `B` (Larynx Voice), `N` (Bellows Chord), or `M` (Monolith Bass)
 * lets performers improvise genuinely expressive modal melodies & chords live!
 */
export class KeyboardMouseRig {
  private readonly heldKeys = new Set<string>();
  private readonly activePunches = new Set<PunchFxId>();
  private sliceCounter = 0;
  private chordCursor = 0;
  private motifCursor = 0;

  private isLeftDragging = false;
  private isOrbitDragging = false;
  private dragStart = { x: 0, y: 0 };
  private lastPointer = { x: 0, y: 0 };

  private readonly canvas: HTMLElement;
  private readonly matrix: ModulationMatrix;
  private readonly cb: InputRigCallbacks;

  constructor(
    canvas: HTMLElement,
    matrix: ModulationMatrix,
    callbacks: InputRigCallbacks,
  ) {
    this.canvas = canvas;
    this.matrix = matrix;
    this.cb = callbacks;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  triggerPad(subsystem: SubsystemId, velocity = 1.0): void {
    const mx = this.matrix.getSource('mouse.x');
    const my = this.matrix.getSource('mouse.y');
    const normY = Math.max(0, Math.min(0.999, (my + 1) * 0.5));
    const normX = Math.max(0, Math.min(1, (mx + 1) * 0.5));
    const pitchRatio = Math.pow(2, my * 0.35);
    const slice = this.sliceCounter++ % 16;

    // Choose musical F-Phrygian pitches for tonal organs!
    let midiNote: number | undefined;
    let chordNotes: number[] | undefined;
    let durationSec: number | undefined;

    if (subsystem === 'modal-clang' || subsystem === 'larynx-lead') {
      // Blend user vertical cursor position with Seed Motif intervals
      const scaleIdx =
        Math.abs(my) > 0.08
          ? Math.floor(normY * F_PHRYGIAN_MELODY.length)
          : [4, 5, 2, 1, 0][this.motifCursor++ % 5]; // Seed Motif C5-Db5-Ab4-G4-F4 when centered!
      midiNote = F_PHRYGIAN_MELODY[scaleIdx];
      durationSec = subsystem === 'larynx-lead' ? 0.62 : 0.9;
    } else if (subsystem === 'core-implode') {
      midiNote =
        F_PHRYGIAN_BASS[Math.floor(normY * F_PHRYGIAN_BASS.length)];
      durationSec = 0.45;
    } else if (subsystem === 'bellows-choir') {
      chordNotes =
        F_PHRYGIAN_CHORDS[this.chordCursor++ % F_PHRYGIAN_CHORDS.length];
      durationSec = 2.6;
    }

    this.cb.onImpulse({
      subsystem,
      velocity,
      pitchRatio,
      midiNote,
      chordNotes,
      vowel: normX,
      durationSec,
      decay: 0.95,
      sliceIndex: midiNote ? midiNote - 60 : slice,
      reverse: this.activePunches.has('reverse-slice'),
      locus: [mx, my, 0.35],
      audioTime: 0,
      beat: 0,
      origin: 'keyboard',
    });
  }

  setPunch(id: PunchFxId, active: boolean): void {
    if (active) this.activePunches.add(id);
    else this.activePunches.delete(id);
    this.matrix.setSource(`punch.${id}`, active ? 1 : 0);
    this.cb.onPunchChange(id, active);
  }

  isPunchActive(id: PunchFxId): boolean {
    return this.activePunches.has(id);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA')
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      this.cb.onPlayToggle();
      return;
    }
    if (
      e.code === 'Tab' ||
      (key === 'h' && !e.shiftKey && !e.metaKey && !e.ctrlKey)
    ) {
      e.preventDefault();
      this.cb.onToggleHud();
      return;
    }
    if (key === 'r' && e.shiftKey) {
      e.preventDefault();
      this.cb.onToggleTakeRecord();
      return;
    }

    if (this.heldKeys.has(key)) return;
    this.heldKeys.add(key);

    if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
      this.cb.onCameraSelect(Number(key));
      return;
    }

    // 6 Act Cues: Q W E R T Y
    const secKeys = ['q', 'w', 'e', 'r', 't', 'y'];
    const secIdx = secKeys.indexOf(key);
    if (secIdx >= 0 && !e.metaKey && !e.ctrlKey) {
      this.cb.onSectionJump(secIdx);
      return;
    }

    if (key === '[') {
      this.cb.onBpmNudge(-4);
      return;
    }
    if (key === ']') {
      this.cb.onBpmNudge(4);
      return;
    }

    const pad = KEY_IMPULSE_PADS.find((p) => p.key === key);
    if (pad) {
      this.triggerPad(pad.subsystem, e.shiftKey ? 1.25 : 0.96);
      return;
    }

    const punch = KEY_PUNCH_FX.find((p) => p.key === key);
    if (punch) {
      this.setPunch(punch.id, true);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.heldKeys.delete(key);
    const punch = KEY_PUNCH_FX.find((p) => p.key === key);
    if (punch) {
      this.setPunch(punch.id, false);
    }
  };

  private onBlur = (): void => {
    this.heldKeys.clear();
    for (const p of Array.from(this.activePunches)) {
      this.setPunch(p, false);
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);

    this.lastPointer = { x: nx, y: ny };
    this.dragStart = { x: nx, y: ny };

    if (e.button === 2 || e.altKey || e.shiftKey) {
      this.isOrbitDragging = true;
    } else if (e.button === 0) {
      this.isLeftDragging = true;
      this.matrix.setSource('mouse.strain', 0.15);
      this.cb.onPointerStrain(nx, ny, 0.15, true);

      // Left-side click plucks a tuned F-Phrygian Harp rod; Right-side cocks/taps hydraulic piston!
      const normY = Math.max(0, Math.min(0.999, (ny + 1) * 0.5));
      if (nx < 0) {
        const midi =
          F_PHRYGIAN_MELODY[Math.floor(normY * F_PHRYGIAN_MELODY.length)];
        this.cb.onImpulse({
          subsystem: 'modal-clang',
          velocity: 0.82,
          pitchRatio: 1,
          midiNote: midi,
          durationSec: 0.9,
          decay: 1.0,
          sliceIndex: midi - 60,
          locus: [nx, ny, 0.4],
          audioTime: 0,
          beat: 0,
          origin: 'mouse',
        });
      } else {
        this.cb.onImpulse({
          subsystem: 'piston-snap',
          velocity: 0.76,
          pitchRatio: 0.85 + normY * 0.5,
          decay: 0.75,
          locus: [nx, ny, 0.5],
          audioTime: 0,
          beat: 0,
          origin: 'mouse',
        });
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);

    const dx = nx - this.lastPointer.x;
    const dy = ny - this.lastPointer.y;
    const vel = Math.min(1.5, Math.hypot(dx, dy) * 14);
    this.lastPointer = { x: nx, y: ny };

    this.matrix.setSource('mouse.x', Math.max(-1, Math.min(1, nx)));
    this.matrix.setSource('mouse.y', Math.max(-1, Math.min(1, ny)));
    this.matrix.setSource('mouse.velocity', vel);

    if (this.isOrbitDragging) {
      this.cb.onOrbit(-dx, dy);
    } else if (this.isLeftDragging) {
      const dist = Math.hypot(nx - this.dragStart.x, ny - this.dragStart.y);
      const tension = Math.min(1.35, 0.18 + dist * 1.15);
      this.matrix.setSource('mouse.strain', tension);
      this.cb.onPointerStrain(nx, ny, tension, true);
    }
  };

  private onPointerUp = (): void => {
    if (this.isLeftDragging) {
      const releaseStrain = this.matrix.getSource('mouse.strain');
      this.isLeftDragging = false;
      this.matrix.setSource('mouse.strain', 0);
      this.cb.onPointerStrain(0, 0, 0, false);

      if (releaseStrain > 0.35) {
        this.cb.onImpulse({
          subsystem: releaseStrain > 0.72 ? 'sub-rupture' : 'larynx-lead',
          velocity: Math.min(1.3, 0.65 + releaseStrain * 0.5),
          pitchRatio: 1.0,
          midiNote: 72, // C5 Seed Motif root cry on release!
          vowel: 0.15,
          durationSec: 0.7,
          decay: 1.0,
          locus: [this.lastPointer.x, this.lastPointer.y, 0.5],
          audioTime: 0,
          beat: 0,
          origin: 'mouse',
        });
      }
    }
    this.isOrbitDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.cb.onZoom(e.deltaY);
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
