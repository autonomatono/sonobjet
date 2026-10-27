import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type { ImpulseEvent, SubsystemId } from '../../engine/core/types';

const MIDI_SUBSYSTEMS: SubsystemId[] = [
  'sub-rupture',
  'spine-shear',
  'break-shred',
  'fin-cascade',
  'piston-snap',
  'modal-clang',
  'core-implode',
  'arc-discharge',
];

/**
 * Automatic WebMIDI + Gamepad Hardware Bridge for Live Performance.
 */
export class MidiGamepadSensor {
  private midiConnected = false;
  private prevButtonPressed = new Set<number>();

  async initMidi(
    matrix: ModulationMatrix,
    onImpulse: (ev: ImpulseEvent) => void,
  ): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      const access = await navigator.requestMIDIAccess();
      const bindInputs = () => {
        this.midiConnected = access.inputs.size > 0;
        for (const input of access.inputs.values()) {
          input.onmidimessage = (msg) => {
            const data = msg.data;
            if (!data || data.length < 2) return;
            const status = data[0] & 0xf0;
            const d1 = data[1];
            const d2 = data[2] ?? 0;

            if (status === 0x90 && d2 > 0) {
              const sub = MIDI_SUBSYSTEMS[d1 % MIDI_SUBSYSTEMS.length];
              onImpulse({
                subsystem: sub,
                velocity: (d2 / 127) * 1.15,
                pitchRatio: Math.pow(2, (d1 - 60) / 24),
                decay: 0.9,
                sliceIndex: d1 % 16,
                locus: [((d1 % 12) / 6 - 1) * 0.8, 0, 0.4],
                audioTime: 0,
                beat: 0,
                origin: 'sensor',
              });
            } else if (status === 0xb0) {
              // Control Change
              matrix.setSource(`midi.cc${d1}`, d2 / 127);
            }
          };
        }
      };
      bindInputs();
      access.onstatechange = bindInputs;
      return this.midiConnected;
    } catch {
      return false;
    }
  }

  pollGamepad(
    matrix: ModulationMatrix,
    onImpulse: (ev: ImpulseEvent) => void,
  ): boolean {
    if (!navigator.getGamepads) return false;
    const pads = navigator.getGamepads();
    const gp = pads.find((p) => p && p.connected);
    if (!gp) return false;

    const lx = Math.abs(gp.axes[0] ?? 0) > 0.08 ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1] ?? 0) > 0.08 ? -gp.axes[1] : 0;
    const rTrigger = gp.buttons[7]?.value ?? 0;

    matrix.setSource('gamepad.lx', lx);
    matrix.setSource('gamepad.ly', ly);
    matrix.setSource('gamepad.trigger', rTrigger);

    gp.buttons.forEach((btn, idx) => {
      if (btn.pressed && !this.prevButtonPressed.has(idx) && idx < 8) {
        this.prevButtonPressed.add(idx);
        onImpulse({
          subsystem: MIDI_SUBSYSTEMS[idx % MIDI_SUBSYSTEMS.length],
          velocity: 0.95,
          pitchRatio: 1.0,
          decay: 0.9,
          sliceIndex: idx,
          locus: [lx, ly, 0.4],
          audioTime: 0,
          beat: 0,
          origin: 'sensor',
        });
      } else if (!btn.pressed) {
        this.prevButtonPressed.delete(idx);
      }
    });

    return true;
  }
}
