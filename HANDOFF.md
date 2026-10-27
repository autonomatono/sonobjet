# SONOBJET — Session Handoff & Continuity State

> **Purpose:** This file is updated at the end of **every turn** so that if a session is interrupted or handed off, the next turn or collaborator can resume immediately with full architectural and operational context.

---

## 1. Current Deployment & Git State

- **Active Working Branch:** `arena/86769aaf-sonobjet` (branched from `main` @ `b2ed81c2308b7484bb41aba89d0b519598f1a8d6`)
- **Live GitHub Pages URL:** `https://autonomatono.github.io/sonobjet/`
- **CI Workflow:** `.github/workflows/deploy.yml` (`CI & Deploy GitHub Pages` — triggers on `push` to `**` and `workflow_dispatch`, deploys `./dist` to `github-pages` environment)
- **Local Dev Server:** `npm run dev` (`0.0.0.0:5173`, `allowedHosts: true` for Arena live preview)

---

## 2. Completed Subsystems (Turn 1 Foundation + POC 01)

### Core Engine (`src/engine/`)
- **`core/Clock.ts`**: Sample-accurate WebAudio lookahead scheduler (`85 ms` window, `1/64`-note resolution) paired with a DAC-locked visual presentation queue so hyper-fast breakcore ratchets have zero rhythmic jitter and exact visual synchresis.
- **`core/Sonobjet.ts`**: `SonobjetCore` physics & causal state spine with configurable Degrees of Freedom (`DOFConfig`), spring-damper integration, hard mechanical end-stop restitution, CAD detent quantization, tensile `structuralStress` tracking, and **spontaneous viscoelastic rupture emission** when external strain exceeds `0.86`.
- **`core/ModulationMatrix.ts`**: Composable signal patchbay with built-in chaotic Lorenz attractor (`chaos.x`, `chaos.y`), exponential slew smoothing, and live toggles.
- **`core/WorkRegistry.ts`**: Game-engine-style multi-work registry with URL query deep-linking (`?work=gantz-tecton`, `?work=phase-lattice`).
- **`audio/FractureWorklet.ts`**: Inline `AudioWorkletProcessor` implementing stereo circular-buffer stutter/freeze (`1.8 ms..120 ms`), tuned waveguide comb resonator with internal `tanh` limiting, sample-rate decimation, and West-Coast sine wavefolding.
- **`audio/BreakBufferLab.ts` & `audio/SynthRack.ts` & `audio/AudioEngine.ts`**: 100% procedural 16-slice vintage breakbeat synthesizer + 8 spatialized physical/IDM voices (`sub-rupture`, `spine-shear`, `break-shred`, `fin-cascade`, `piston-snap`, `modal-clang`, `core-implode`, `arc-discharge`) + continuous FM servo strain voice + brutalist concrete chamber IR convolver + compressor + recording `MediaStreamAudioDestinationNode`.
- **`render/WebGPUStage.ts` & `render/TSLMaterials.ts`**: Three.js `0.186.1` `WebGPURenderer` (native WebGPU with automatic WebGL2 fallback) + custom **TSL (`three/tsl`)** node materials (`gunmetalInstanced`, `titaniumFinInstanced`, `coreReactor`, `chamberConcrete`) featuring procedural CNC micro-striations and stress-coupled molten core emission.

### Construction Kit (`src/kit/`)
- **`sequencer/IDMSequencer.ts`**: Bjorklund Euclidean rhythm generator, Autechre-style exponential bouncing-ball `computeRatchetBurstOffsets`, and deterministic-yet-mutatable `evaluateBreakChop`.
- **`camera/KineticCameraRig.ts`**: 5 *Gantz Graf*-inspired camera presets (including `5: AUTONOMOUS CUT DIRECTOR`), mouse orbit/zoom, and anisotropic sub-seismic camera trauma.
- **`environment/BrutalistChamber.ts`**: Ribbed concrete containment cell with xenon light slits reactive to construct arc-flashes.

### Live Performance, Sensing & Recording Studio (`src/studio/`)
- **`input/KeyboardMouseRig.ts`**: Tactile bottom-row impulse pads (`Z..M ,`), home-row momentary fracture FX (`A S D F G J K`), camera cuts (`1..5`), section cues (`Q W E R T`), and left-drag physical strain/slam.
- **`sensors/MediaPipeSensor.ts`**: `@mediapipe/tasks-vision` 2-hand 3D landmark tracker (palm span -> CAD spread, thumb-index pinches -> drill/alloy modulation + snap-strike impulses) with live PIP skeleton overlay, self-hosted WASM via `mediapipeWasmPlugin()` in `vite.config.ts`, plus zero-latency `48x36` optical motion fallback.
- **`sensors/MicSensor.ts` & `sensors/MidiGamepadSensor.ts`**: Live microphone acoustic transient/centroid exciter + automatic WebMIDI & Gamepad bridge.
- **`recorder/TakeRecorder.ts` & `recorder/VideoExporter.ts`**: Multi-pass Overdub gesture/event recorder (`.sonobjet-take.json` import/export) + synchronized 60fps Canvas + Opus WebAudio `.webm` music video capture.

### Works (`src/works/`)
1. **`gantz-tecton` (`GANTZ // TECTON` — Default Proof of Concept)**: 717-body articulated machined metal agglomerate + 5-movement, 64-bar (172 BPM) IDM/breakcore score (`I. PNEUMATIC IGNITION` -> `V. TERMINAL TECTONIC LOCK`).
2. **`phase-lattice` (`PHASE // LATTICE` — Contrasting Etude)**: 48-pendulum coprime polyrhythmic modal steel array proving multi-work versatility.

---

## 3. Verification Commands

```bash
npm run typecheck   # Passes with 0 errors
npm test            # Passes 9/9 Vitest suites (Clock, SonobjetCore, Matrix, Sequencer, Score, TakeRecorder, 3D WebGPU/TSL lifecycle)
npm run build       # Produces ./dist + ./dist/mediapipe-wasm cleanly
```

---

## 4. Next Milestones / Expansion Ideas

1. **WebGPU Compute Particle / Micro-Debris Shader (`compute()`):** Add GPU-accelerated spark/shrapnel trajectories emitted from high-stress fracture seams using Three.js WebGPU `instancedArray` + TSL compute shaders.
2. **Timeline Score Editor / Tracker View:** Add an optional collapsible tracker/piano-roll view in Studio so users can visually edit composed `GantzScore` patterns or convert recorded `PerformanceTake` overdubs into quantized score patterns.
3. **Expanded MediaPipe Pose & Face Landmarks:** Add optional upper-body pose & head-roll coupling alongside 2-hand tracking (e.g., head tilt -> camera Dutch roll & binaural pan; mouth openness -> formant filter vowel morph).
4. **Additional Diverse Works:** Author contrasting organic/biomechanical or architectural works using soft-body/tentacular TSL vertex deformation and granular vocal/formant synthesis.
