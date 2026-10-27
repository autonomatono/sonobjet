# SONOBJET

**WebGPU + WebAudio Engine & Interactive Director Studio for Articulated Audiovisual Automata**

**Live Deployment (GitHub Pages):** [`https://autonomatono.github.io/sonobjet/`](https://autonomatono.github.io/sonobjet/)

`sonobjet` is a custom game-engine-style audiovisual synthesis, composition, and live performance platform built on **Three.js (`three/webgpu` + TSL Node Shaders)** and a **zero-sample procedural WebAudio + `AudioWorklet` synthesizer**. The current V7 flagship starts from a blank slate: a hand-cranked **marble music machine** with its own deterministic steel-marble physics engine, pinned programming wheel, twelve gates, physical instrument impacts, and a bucket-lift recycling loop. The V6 graph kit, V5 automaton, V4 work, and the original pendulum study all remain selectable references. Inspirations include *Gantz Graf*, Chris Cunningham, 18th-century horological automata, Wintergatan, Animusic, Central European clockwork organs, celestial orreries, and the human–robotic ballet of *Sans Objet*.

---

## Current Flagship (`01`): `PENDULUM // MARBLE ENGINE`

A **blank-slate gravity instrument** inspired by the mechanism that made the first simple pendulum demo compelling: one visible cause, one visible effect, repeated until it becomes music. A flywheel turns a pinned programming wheel; pins trip twelve gates; steel marbles free-fall under custom physics onto vibraphone bars and percussion; a collector funnel and bucket lift return them to the top.

### V7 Systems

1. **Custom Fixed-Step Physics** — deterministic semi-implicit sphere integration, capsule-segment contacts, sphere-sphere collisions, restitution, tangential friction, gate obstacles, stuck-marble recovery, and impact telemetry.
2. **Pinned Programming Wheel** — 12 lanes × 64 eighth-note steps with an editable F-Phrygian pattern. Gate cues are sampled from actual wheel angle, not a beat-to-mesh mapping.
3. **Physical Machine** — plywood A-frame, hand-crank flywheel, 1:32 gear reduction, pendulum governor with a real ODE, transparent feeder tubes, twelve gate levers, vibraphone/percussion bank, collector trough, and animated bucket lift.
4. **Causal Audio** — physical marble/instrument collisions trigger the 14-voice procedural synth; the preserved 96-bar score remains available underneath via `SCORE ENGINE BLEND`.
5. **Physics Lab Tab** — clickable pin grid, ten solver macros, live part registry, focus selector, marble drop/reset controls, program JSON I/O, and free/queued/lifting/impact/jam telemetry.
6. **Preserved Studio Tools** — Director Studio, free-fly/joint-lock camera, 96-bar keyframe timeline, looks/effects, configs/presets, behavior maps, patchbay, articulation DOFs, recording and video export.

See [`docs/V7_MARBLE_PENDULUM.md`](docs/V7_MARBLE_PENDULUM.md) for the Wintergatan research, physics architecture, and authoring workflow.

---

## Graph Reference (`02`): `ASTRARIUM // MODULAR ENGINE`

V6 remains loadable with `?work=astrarium-modular-engine`. It is the **machine-building kit** with 72 addressable modules, 216+ typed conduits, many-to-many score bindings, and multi-scale graph focus. The V5 automaton is nested as its reference core. See [`docs/V6_MACHINE_BUILDING_KIT.md`](docs/V6_MACHINE_BUILDING_KIT.md).

---

## Automaton Reference (`03`): `CHRONO // AUTOMATON`

V5 remains loadable with `?work=chrono-automaton`. It is the **time-traveled self-playing clockwork automaton** with zero unparented parts: pinned programme barrel, meshing escapement gears, balance wheel, Geneva indexer, tuned comb banks, exact four-bar striker linkages, crank-driven bellows, iris resonator pipes, hinged ceramic carapace shells, and magnetic flux rails. Its rig, ecology, articulation lab, and 96-bar Director Studio are documented in [`docs/V5_DIRECTOR_STUDIO.md`](docs/V5_DIRECTOR_STUDIO.md).

---

## Legacy Work (`04`): `HYPER // TECTON`

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

Also includes **`05: PHASE // LATTICE`**, the original simple pendulum/polyrhythmic study that inspired the V7 return to first principles.

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
| **Backquote (`` ` ``)** | Toggle **Director Studio** (free-flight, keyframes, looks, configurations, maps, physics lab, graph) |
| **`W A S D` / `E Q` / `Z X` / `0`** | Director free-flight move / rise-fall / Dutch roll / level horizon |
| **`K` / `L` / `M`** | In Director Mode: add camera key / look key / machine milestone at playhead |
| **Director `PHYSICS` tab** | Click programming-wheel pins, edit gravity/restitution/friction/gate/lift macros, inspect the part registry, drop/reset marbles, import/export the program |
| **Director `MACHINE` tab** | Edit graph macros and many-to-many bindings; pick macro/cluster/module/port/conduit focus; grow or rebuild the installation; export/import machine graph JSON |
| **`0` / `1`–`8` on V7** | Auto physics-focus camera or lock one of eight focus targets |
| **`TAB`** | Cinema HUD toggle (pure full-bleed 60fps view) |

While Director Studio is open, live performance pad keys are suspended so free-flight keys never trigger synth voices. `SPACE` and `TAB` remain available.

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

- [`docs/V7_MARBLE_PENDULUM.md`](docs/V7_MARBLE_PENDULUM.md) — V7 Wintergatan research, custom physics engine, programming wheel, machine anatomy, Physics Lab workflow, and verification.
- [`docs/V6_MACHINE_BUILDING_KIT.md`](docs/V6_MACHINE_BUILDING_KIT.md) — V6 graph schema, module/port/conduit architecture, many-to-many bindings, multi-scale focus, live growth, and Machine tab workflow.
- [`docs/V5_DIRECTOR_STUDIO.md`](docs/V5_DIRECTOR_STUDIO.md) — V5 clockwork automaton, kinematic rig, ecological behavior, 96-bar Director Studio and JSON workflows.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Engine architecture, V4 coupled state machines, V5/V6/V7 module maps, TSL vertex/post-FX shaders, and the 96-bar score.
- [`docs/PERFORMANCE_AND_RECORDING.md`](docs/PERFORMANCE_AND_RECORDING.md) — Keyboard/mouse rig, MediaPipe optical tracking, overdub take recorder, and `.webm` master export.
- [`docs/CI_AND_DEPLOYMENT.md`](docs/CI_AND_DEPLOYMENT.md) — Continuous any-branch GitHub Pages CI/CD pipeline.
- [`HANDOFF.md`](HANDOFF.md) — Session state, V4 upgrades, verification status, and next extension vectors.
