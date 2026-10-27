# SONOBJET Engine Architecture

## 1. System Overview

`sonobjet` is structured like a modular audiovisual game engine where each **Work** (`WorkDefinition`) is a self-contained performance scene composed from four decoupled layers:

```text
src/
├── engine/
│   ├── core/        # Clock, SonobjetCore, ModulationMatrix, SeededRandom, WorkRegistry
│   ├── audio/       # AudioEngine, SynthRack, BreakBufferLab, FractureWorklet (AudioWorklet)
│   └── render/      # WebGPUStage (Three.js r186 WebGPU + WebGL2 fallback), TSLMaterials
├── kit/
│   ├── kinematics/  # ScalarSpring, CAD detent quantization
│   ├── sequencer/   # Bjorklund Euclidean generator, exponential ratchet bursts, break chopper
│   ├── camera/      # KineticCameraRig (5 Gantz-style camera presets + seismic recoil trauma)
│   └── environment/ # BrutalistChamber (architectural concrete cell + xenon slit lighting)
├── studio/
│   ├── input/       # KeyboardMouseRig (8 pads, 7 punch FX, raycasted strain/slam)
│   ├── sensors/     # MediaPipeSensor (2-hand 3D + optical fallback), MicSensor, MidiGamepadSensor
│   ├── recorder/    # TakeRecorder (multi-pass JSON overdub), VideoExporter (60fps WebM + Opus)
│   └── ui/          # StudioShell + industrial telemetry HUD
└── works/
    ├── gantz-tecton/      # POC 01: 717-body hyper-articulated IDM/breakcore construct
    └── lattice-pendulum/  # Etude 02: 48-pendulum coprime polyrhythmic modal steel array
```

---

## 2. Dual-Domain Sample-Accurate Synchronization (`Clock.ts`)

At 172 BPM, a 1/64th-note breakcore micro-step is ~21.8 ms—meaning naive `requestAnimationFrame` (~16.6 ms) audio triggering produces audible rhythmic jitter.

`Clock.ts` solves this with a **Dual-Domain Lookahead Architecture**:
1. **Audio Lookahead Window (`85 ms`):** On each tick, upcoming 1/64th-note steps within `audioContext.currentTime + 0.085` are evaluated ahead of time and scheduled with sample-accurate timestamps (`osc.start(t)`, `gain.exponentialRampToValueAtTime(..., t)`).
2. **Visual Presentation Queue:** Scheduled `ImpulseEvent`s are simultaneously pushed into a timestamped visual queue and drained on the exact animation frame when `ev.audioTime <= audioNow + 0.004`, locking photon emission to acoustic transient arrival.
3. **Zero-Latency Live Bypass:** Live impulses (`audioTime === 0`) from keyboard, mouse, MediaPipe pinch-snaps, or microphone transients bypass lookahead and actuate both domains immediately.

---

## 3. Custom WebAudio + AudioWorklet Synthesis (`src/engine/audio/`)

Zero external audio samples are required. All sound is generated in real time:
- **`BreakBufferLab.ts`:** Synthesizes a 2-channel, 16-slice vintage breakbeat buffer (saturated kick, dual-mode snare + wire rattle, ghost notes, metallic ride shimmer, 12-bit crunch) plus a slice-accurate reversed twin buffer at startup.
- **`SynthRack.ts`:** Provides 8 physical/IDM synthesis voices (`sub-rupture`, `spine-shear`, `break-shred`, `fin-cascade`, `piston-snap`, `modal-clang`, `core-implode`, `arc-discharge`) plus a continuous FM/bandpass **Strain Servo Voice** driven by physical construct tension. Each impulse is panned in stereo according to its 3D `locus[0]`.
- **`FractureWorklet.ts`:** Inline `AudioWorkletProcessor` running on the audio rendering thread providing:
  - Lockable stereo circular-buffer micro-stutter (`1.8 ms` audio-rate buzz up to `120 ms` break repeats) with de-clicked grain edges,
  - Tuned stereo waveguide comb resonator with internal `tanh` saturation,
  - Sample-hold decimation + West-Coast sine wavefolding + DC blocking.

---

## 4. Three.js WebGPU & TSL Pipeline (`src/engine/render/`)

- **`WebGPUStage.ts`:** Initializes `THREE.WebGPURenderer` (`three/webgpu`), using native **WebGPU** when supported by the browser/GPU and seamlessly falling back to Three's **WebGL 2** node backend otherwise. Reports active backend (`WebGPU` / `WebGL2` / `Headless`) in live telemetry.
- **`TSLMaterials.ts`:** Uses **Three Shading Language (`three/tsl`)** to author GPU-compiled procedural CNC micro-striations, edge-bevel sheen, per-instance xenon impact flashes (`instanceColor`), and stress-coupled molten core seams (`uniform`s `stress`, `arcFlash`, `time`).

---

## 5. Authoring a New Work

To add a new music video or live performance instrument:
1. Create `src/works/<your-work>/YourWork.ts` implementing `WorkDefinition` and `WorkSceneInstance`.
2. Define its `bpm`, `bars`, `sections`, expressive `macros`, and `defaultPatches` (connecting `mediapipe.*`, `mouse.*`, `mic.*`, or `chaos.*` to your macros).
3. Implement `init(ctx)`, `scheduleStep(step64, bar, audioTime, ctx)`, `triggerImpulse(event, ctx)`, `update(dt, elapsed, transport, ctx)`, and `dispose()`.
4. Register it in `src/main.ts` via `registry.register(YourWork)`—it immediately gains full Studio HUD controls, MediaPipe/Mic/MIDI sensing, Overdub Take recording, `.webm` video export, and `?work=<id>` URL routing.
