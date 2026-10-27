# SONOBJET Engine Architecture

## 1. System Overview

`sonobjet` is structured as a modular audiovisual game engine where each **Work** (`WorkDefinition`) is a self-contained performance scene composed from four decoupled layers:

```text
src/
├── engine/
│   ├── core/        # Clock (with AnticipationQueue), SonobjetCore, ModulationMatrix, WorkRegistry
│   ├── audio/       # AudioEngine, SynthRack (11 biomechanical/tonal/percussive voices), FractureWorklet
│   └── render/      # WebGPUStage (WebGPURenderer + TSL HDR Bloom & Vignette), TSLMaterials (5-material palette)
├── kit/
│   ├── kinematics/  # ScalarSpring, CAD detent quantization
│   ├── sequencer/   # Bjorklund Euclidean generator, exponential/decelerating ratchet bursts, break chopper
│   ├── camera/      # KineticCameraRig (5 cinema presets + seismic anvil recoil trauma)
│   └── environment/ # BrutalistChamber (gantry crane, volumetric light cones, wet slate plinth, forge bounce)
├── studio/
│   ├── input/       # KeyboardMouseRig (F-Phrygian modal performance pads, vowel/pitch X/Y, strain/slam)
│   ├── sensors/     # MediaPipeSensor (2-hand 3D + optical fallback), MicSensor, MidiGamepadSensor
│   ├── recorder/    # TakeRecorder (multi-pass JSON overdub), VideoExporter (60fps WebM + Opus)
│   └── ui/          # StudioShell + Behavioral State & Signal Telemetry HUD
└── works/
    ├── gantz-tecton/      # POC 01: GANTZ // AUTOMATON (7-organ creature + 80-bar 6-Act F-Phrygian score)
    └── lattice-pendulum/  # Etude 02: PHASE // LATTICE (48-pendulum coprime polyrhythmic modal steel array)
```

---

## 2. Dual-Domain Clock & Biomechanical Anticipation (`Clock.ts`)

Real machines and living creatures never teleport instantaneously on an acoustic transient—they **inhale, coil, and cock a limb before striking**.

`Clock.ts` coordinates three synchronized timelines:
1. **WebAudio Lookahead (`95 ms` window, `1/64`-note resolution):** Schedules sample-accurate synthesis events ahead on `AudioContext` so rapid breakcore ratchets never jitter.
2. **Pre-Strike `AnticipationCue` Queue:** Score steps emit `AnticipationCue`s (`leadTimeSec = 0.25..0.55 s` ahead of major impacts) paired optionally with reverse-envelope `windup-inhale` audio events, allowing `GantzAutomaton` to arch its 14-vertebra spine, glance at its anvil, and raise its Siege-Hammer overhead before `t = 0`.
3. **DAC-Locked Visual Presentation Queue:** Releases impact `ImpulseEvent`s on the exact animation frame when `ev.audioTime <= audioNow + 0.004`.

---

## 3. Tonal, Vocal-Formant & Mechanical Synthesis (`SynthRack.ts`)

All 11 synthesis subsystems are 100% procedural (zero external audio files):
- **`larynx-lead` (Glottal Formant Synth):** Sawtooth + sub-octave glottal source with delayed vibrato routed through 3 parallel resonant formant bandpass filters (`F1, F2, F3`) morphing continuously across `/AH/ – /EH/ – /EE/ – /OH/ – /OO/`.
- **`bellows-choir` (Modal Polychordal Organ/Pad):** Voices 4-to-6-note detuned modal voicings (`Fm(add9)`, `Dbmaj7#11`, `Bbm9`, `C7b9`) through swept lowpass + brutalist chamber convolution.
- **`modal-clang` (Tuned 16-Rod Steel Harp):** Exact MIDI-tuned fundamental + harmonic/steel partials (`[1, 2, 3+s, 4.02+s, 5.41+s]`) for crystalline melodic motifs.
- **`core-implode` (Wavefolded Monolith Bass):** Sub-octave sine + 2-op FM West-Coast wavefolder for pitched basslines.
- **`windup-inhale`:** Reverse-envelope bandpass pneumatic intake & rising servo whine.
- **Percussive & Sliced Organs:** `sub-rupture` (F1 Siege-Anvil kick), `spine-shear` (F3 dual-mode snare), `break-shred` (16-slice forward/reverse procedural breakbeat chopper), `fin-cascade` (raker comb micro-tick), `piston-snap`, and `arc-discharge`—all routed through **`FractureWorklet.ts`** (sample-level buffer freeze, F-tuned stereo waveguide comb, wavefold decimation).

---

## 4. 5-Material TSL Shader Palette & WebGPU Post-Processing (`src/engine/render/`)

- **`TSLMaterials.ts`:** Compiles 5 contrasting tactile materials natively to WGSL (WebGPU) / GLSL (WebGL2):
  1. `boneCarapace` — Warm weathered porcelain-ivory (`0xd6cfc0`) with dark crevice shading & subsurface glow bleed,
  2. `forgedIron` — Oiled charcoal cast-iron (`0x1b1e23`) with hammered grain & hot anvil ember emission,
  3. `surgicalChrome` — Mirror-bright lathe-turned chrome (`roughness: 0.09, metalness: 0.98`),
  4. `agedBrass` — Oxidized industrial bronze/brass (`0xc28a3a`),
  5. `visceralFilament` — HDR-blooming crimson-to-tungsten filament (`> 2.5` linear luminance).
- **`WebGPUStage.ts`:** Runs `THREE.PostProcessing` combining `pass(scene, camera)` + TSL `bloom()` + radial chiaroscuro vignette.
