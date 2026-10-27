# SONOBJET

**WebGPU + WebAudio Engine & Live Performance Studio for Non-Euclidean Audiovisual Megastructures**

**Live Deployment (GitHub Pages):** [`https://autonomatono.github.io/sonobjet/`](https://autonomatono.github.io/sonobjet/)

`sonobjet` is a custom game-engine-style audiovisual synthesis, composition, and live performance platform built on **Three.js (`three/webgpu` + TSL Node Shaders)** and a **zero-sample procedural WebAudio + `AudioWorklet` synthesizer**. Rather than rendering uniform audio-reactive visualizers or literal simulations of historic machines, `sonobjet` constructs **surreal, futuristic, metamorphic sound-objects** inspired by *Gantz Graf* and Chris Cunningham — governed by coupled morphology state machines, non-Euclidean GPU vertex deformation, morph-following camera choreography, and stylized optical post-processing.

---

## Flagship Work (`01`): `HYPER // TECTON`

A surreal **4,348-element** (`4,092` machine elements + `256` vault monoliths) metamorphic sound megastructure suspended inside a reflective obsidian-mercury cyber-vault:

### 1. Coupled Morphology State Machines & Non-Euclidean GPU Deformation
- **4,348 Dynamic Elements Across 8 Structural Layers**:
  - **`1,536` Fractured Tectonic Carapace Lamellae** (`tectonicPlateInstanced` — glossy Cunningham bone-white ceramic vs obsidian shear plates that split, flip 180°, stretch, and extrude per cluster)
  - **`1,024` Telescoping Micro-Actuator Needles** (`surgicalChrome` high-velocity radial/helical spine arrays)
  - **`768` Photonic Capillary Filaments** (`lightOrganPipeInstanced` HDR spectral light fibers)
  - **`512` Nested Non-Coplanar Gyroscopic Shear Blades** (8 counter-precessing orbital shells)
  - **`192` Orbiting Quantized Singularity Shards**
  - **Hyper-Dense Singularity Core** (`3` nested counter-precessing geodesic cages + `1` pulsing plasma-glass nucleus)
  - **`6` Cunningham 2-Link Inverse-Kinematics Robotic Striker Booms** (`54` articulated shoulder/humerus/elbow/forearm/wrist/laser-lance components with analytical 2-bone IK + wrist-mounted SnorriCam anchor)
  - **`256` Metamorphic Vault Monolith Blades + `12` Volumetric Laser Curtains** (`SurrealCyberVault`)
- **Two-Tier Coupled State Machine**:
  - **Global Macro-Morphology State Machine (6 Configurations)**: `FOLDED_MONOLITH` → `CANTILEVER_STRIKER` → `INVERTED_CATHEDRAL` → `NON_EUCLIDEAN_HELIX` → `QUANTIZED_SHATTER` → `SINGULARITY_CROWN`, smoothly blending full 3D topological targets while publishing real-time spatial bounds (`envelopeRadius`, `interiorRadius`, `verticalSpan`).
  - **16 Fault-Cluster Sub-State Machines**: Independent per-sector sub-states (`DORMANT`, `WINDUP`, `EXTRUDE`, `INVERT_FLIP`, `SHATTER_JITTER`, `HARMONIC_BLOOM`) driven by causal score/live impulses.
- **TSL Non-Euclidean Vertex Shader (`TSLMaterials.ts`)**: Real-time GPU `positionNode` spatial torsion twisting geometry around helical axes (`nonEuclideanTwist`), quantized 3D spatial block-shearing (`spatialGlitch`), and radial acoustic shockwaves (`acousticRipple`).

### 2. 96-Bar 6-Act F-Phrygian Score & 14-Voice Procedural Synth (`164 BPM`)
- **Complete Hypermetric Phrase Architecture (`96 Bars`)**:
  - **Act I (`Bars 0–11`) — `STASIS SEED // FOLDED MONOLITH`**: Sparse Crystalline Glass-Armonica & Modal Chime statements of the `C5–Db5–Ab4–G4–F4` Seed Motif over `Fm(add9)`.
  - **Act II (`Bars 12–27`, `16 Bars = 2 × 8`) — `CANTILEVER LOOM // ACID & BREAKS`**: Syncopated 2-step & Amen breakbeat engine joined by resonant **303 Acid Squelch** basslines and **Glitch-Chirp** micro-bursts.
  - **Act III (`Bars 28–51`, `24 Bars = 3 × 8`) — `INVERTED CATHEDRAL ARIA`**: Complete 3-pass 8-bar `Fm(add9) → Dbmaj7#11 → Bbm9 → C7b9` Polychord & Formant-Aria progression (`Bars 28–43`), beatless celestial suspension (`Bars 44–47`), and a sculpted **4-bar Glitch-Deconstruction & Mechanical Handoff Bridge (`Bars 48–51`)** finishing the full `C7b9` (`E4`) cadence before accelerating into Act IV.
  - **Act IV (`Bars 52–63`, `12 Bars`) — `QUANTIZED SHATTER CADENZA`**: Violent *Gantz Graf* 64th-note stop-start drill cadenza with Beat-4 dead-stop vacuum gates (`Bars 52–59`) and a 4-bar accelerating snare/acid/inhale riser (`Bars 60–63`) culminating in a 2-beat breathless silence lock.
  - **Act V (`Bars 64–79`, `16 Bars = 2 × 8`) — `SINGULARITY CROWN CONVERGENCE`**: Complete 2-pass thematic & polyrhythmic climax combining Polychord Choir, Octave Aria Lead, Glass-Armonica counter-melody, 303 Acid Ostinato, and Breakcore drums, finishing its full second 8-bar `C7b9` cycle and **Bar 79 grand cadential fill** into Act VI.
  - **Act VI (`Bars 80–95`, `16 Bars = 2 × 8`) — `ENTROPIC DISSOLVE`**: Cathartic `Fm9` tonic release, Glass-Armonica & Chime recall of the opening Seed Motif, and final mechanical lock.
- **14 Procedural Voices + Stereo Ping-Pong Delay + `FractureWorklet`**: Adds **303 Acid Squelch** (`playAcidSquelch`), **Crystalline Glass Armonica** (`playGlassArmonica`), **S&H Glitch Chirp** (`playGlitchChirp`), and a **Tempo-Synced Dotted-16th Stereo Ping-Pong Delay Bus** alongside the 11 core percussion, formant, polychord, modal, and wavefolder voices.

### 3. Morph-Following Camera Director & Stylized TSL Post-Processing
- **Morph-Following Camera Choreography (`CinemaDirector.ts`)**: Couples camera trajectories directly to `HyperTectonMachine.getCameraAnchors()` (`envelopeRadius`, `interiorRadius`, `verticalSpan`, `primaryBoomTip`), combining continuous **`morph-follow`**, **`vertigo` (dolly-zoom)**, and **`epic-pullback`** flights with selective rhythmic **`hard`** and **`whip`** cuts across 8 perspectives (`[0]` Auto-Director, `[1–8]` manual rigs including `SHELL FLIGHT`, `CORKSCREW`, `BOOM TRACK`, and `WRIST POV`).
- **Stylized Optical & Glitch Post-Processing (`WebGPUStage.ts`)**: Custom `THREE.PostProcessing` TSL shader pipeline featuring **Anamorphic Barrel Lens Distortion**, **Quantized Scan-Band & Block Glitch Tears**, **Radial RGB Chromatic Dispersion**, **HDR Bloom**, **Cunningham Silver-Halide Bleach-Bypass Color Grading**, **Stark Graphic Stencil Thresholding**, and **35mm Film Grain**.

Also includes **`02: PHASE // LATTICE`**, a minimal polyrhythmic tensegrity work demonstrating multi-scene modularity via `WorkRegistry`.

---

## Live Performance Controls (Keyboard & Mouse First + Sensors)

| Input | Action |
| :--- | :--- |
| **`SPACE`** | Play / Pause 96-bar algorithmic score |
| **`0` / `1`–`8`** | `[0]` Morph-Follow Auto-Director, or lock `[1]` Morph Orbit, `[2]` Shell Flight, `[3]` Fault Macro, `[4]` Corkscrew, `[5]` Boom Track, `[6]` Mercury Low, `[7]` Striker Wrist SnorriCam, `[8]` Polar Mandala |
| **`Z X C V B N M , . /`** | Live play all 10 pads (`SHOCK ANVIL`, `FAULT SHEAR`, `BREAK CHOP`, `CHIME LATTICE`, `FORMANT REED`, `PLASMA CHOIR`, `MONOLITH SUB`, `ACID SQUELCH`, `GLASS HALO`, `GLITCH CHIRP`) — **Mouse X/Y** controls F-Phrygian pitch & vowel formant |
| **`A S D F G J K`** | Momentary performance bus FX (`GLITCH STUTTER`, `64TH DRILL`, `HALFTIME`, `COMB SCREAM`, `REV SLICE`, `HYPER DILATE`, `SHATTER LOCK`) |
| **`Q W E R T Y`** | Cue Acts I–VI on next bar boundary |
| **Left-Click Drag** | Twist & dilate non-Euclidean geometry + optical glitch; release to slam |
| **Right-Drag / `Shift`+Drag / Wheel** | Manual camera orbit & zoom offset on any rig |
| **`CAM: HAND`** | MediaPipe Vision 2-hand 21-landmark optical tracking (span → dilation, pinches → ratchet/acid Q, wrist velocity → mid-air shear strikes) |
| **`MIC: ENV` / MIDI / Gamepad** | Live audio envelope follower + auto-bound WebMIDI CCs/notes & Gamepad |
| **`TAB`** | Cinema HUD toggle (pure full-bleed 60fps view) |

---

## Quick Start

```bash
npm install
npm run dev        # Start local Vite studio on 0.0.0.0:5173
npm run typecheck  # Strict TypeScript verification
npm test           # Run Vitest unit & architectural test suite
npm run build      # Production bundle into dist/ (with offline MediaPipe WASM)
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Engine architecture, coupled state machines, TSL vertex/post-FX shaders, 96-bar score, and morph-following camera director.
- [`docs/PERFORMANCE_AND_RECORDING.md`](docs/PERFORMANCE_AND_RECORDING.md) — Keyboard/mouse rig, MediaPipe optical tracking, overdub take recorder, and `.webm` master export.
- [`docs/CI_AND_DEPLOYMENT.md`](docs/CI_AND_DEPLOYMENT.md) — Continuous any-branch GitHub Pages CI/CD pipeline.
- [`HANDOFF.md`](HANDOFF.md) — Session state, V4 upgrades, verification status, and next extension vectors.
