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
  { key: 'z', label: 'Z', subsystem: 'sub-rupture', shortName: 'SUB RUPTURE' },
  { key: 'x', label: 'X', subsystem: 'spine-shear', shortName: 'SPINE SHEAR' },
  { key: 'c', label: 'C', subsystem: 'break-shred', shortName: 'BREAK SHRED' },
  { key: 'v', label: 'V', subsystem: 'fin-cascade', shortName: 'FIN CASCADE' },
  { key: 'b', label: 'B', subsystem: 'piston-snap', shortName: 'PISTON SNAP' },
  { key: 'n', label: 'N', subsystem: 'modal-clang', shortName: 'MODAL CLANG' },
  { key: 'm', label: 'M', subsystem: 'core-implode', shortName: 'CORE IMPLODE' },
  { key: ',', label: ',', subsystem: 'arc-discharge', shortName: 'ARC SPARK' },
];

export const KEY_PUNCH_FX: PunchBinding[] = [
  { key: 'a', id: 'stutter', label: 'STUTTER' },
  { key: 's', id: 'ratchet', label: '64TH DRILL' },
  { key: 'd', id: 'halftime', label: 'HALFTIME' },
  { key: 'f', id: 'comb-scream', label: 'COMB SCREAM' },
  { key: 'g', id: 'reverse-slice', label: 'REV SLICE' },
  { key: 'j', id: 'tectonic-explode', label: 'CAD EXPLODE' },
  { key: 'k', id: 'hard-lock', label: 'HARD LOCK' },
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
 * - Bottom row (`Z..M ,`) fires physical/acoustic subsystems directly
 * - Home row (`A S D F G J K`) engages momentary breakcore / CAD fracture FX
 * - Left-drag strains & pulls apart the Sonobjet (slamming shut on release!)
 * - Right-drag or Shift/Alt-drag orbits the camera; Scroll zooms
 */
export class KeyboardMouseRig {
  private readonly heldKeys = new Set<string>();
  private readonly activePunches = new Set<PunchFxId>();
  private sliceCounter = 0;

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
    const pitchRatio = Math.pow(2, my * 0.45);
    const slice = this.sliceCounter++ % 16;

    this.cb.onImpulse({
      subsystem,
      velocity,
      pitchRatio,
      decay: 0.95,
      sliceIndex: slice,
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
    if (e.code === 'Tab' || (key === 'h' && !e.shiftKey && !e.metaKey && !e.ctrlKey)) {
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

    // Camera cuts 1..5
    if (['1', '2', '3', '4', '5'].includes(key)) {
      this.cb.onCameraSelect(Number(key));
      return;
    }

    // Section cues Q W E R T
    const secKeys = ['q', 'w', 'e', 'r', 't'];
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
      // Tactile tap impulse at locus
      this.cb.onImpulse({
        subsystem: 'piston-snap',
        velocity: 0.72,
        pitchRatio: 0.9 + (ny + 1) * 0.35,
        decay: 0.7,
        locus: [nx, ny, 0.6],
        audioTime: 0,
        beat: 0,
        origin: 'mouse',
      });
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
        // Pneumatic slam-shut acoustic discharge proportional to how far user stretched the object!
        this.cb.onImpulse({
          subsystem: releaseStrain > 0.8 ? 'sub-rupture' : 'modal-clang',
          velocity: Math.min(1.3, 0.6 + releaseStrain * 0.55),
          pitchRatio: 0.82 + releaseStrain * 0.3,
          decay: 0.9,
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
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
