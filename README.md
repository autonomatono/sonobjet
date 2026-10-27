# SONOBJET

**WebGPU + WebAudio Engine & Interactive Director Studio for Articulated Audiovisual Automata**

**Live Deployment (GitHub Pages):** [`https://autonomatono.github.io/sonobjet/`](https://autonomatono.github.io/sonobjet/)

`sonobjet` is a custom game-engine-style audiovisual synthesis, composition, and live performance platform built on **Three.js (`three/webgpu` + TSL Node Shaders)** and a **zero-sample procedural WebAudio + `AudioWorklet` synthesizer**. The V10 flagship is an open-space **retrofuturistic analog computer crossed with an elaborate pinball machine**. Its transparent conduits enter tilted housings from arbitrary 3D directions; ratchets, break solenoids, curved bell rows, sound-active crystal memories, cymbal batteries, pinball flippers and a pinned music-box data loom are all physical instruments. A deterministic 174 BPM breakcore / IDM / drum-and-bass program addresses those organs first, then their physics events become sound. The resulting sound actuates hammers, emissive crystals, score lamps, projected shadows and abundant neon in return. The exact favored checkpoint is preserved by annotated Git tag **`v0.1.3` — `space pinball`**. V11 then learns from it through a legible 3D geometric trance sequencer, an original high-density braindance collider and a serene Antarctic ambient instrument. V9's Cornell relay and every earlier work remain preserved in the selector.

---

## Current Flagship (`01`): `NEON PINBALL // BREAKCORE COMPUTER`

A **physics-addressed 64-bar song** suspended in a genuinely three-dimensional open stage. Twenty fixed analog organs and twelve orbital crystal/neon satellites are connected by more than fifty curved, woven and helical tubes plus seventeen visible mechanical transmissions. There is no close Cornell bounding box: a distant 72-unit floor, four isolated shadow sails and a 960-point charge field leave room for macro zooms, drone flight, particles and VFX.

### V10 Systems

1. **No Ground-Plane Constraint** — module joints carry arbitrary XYZ rest orientations. Spatial conduit mouths are deterministically distributed around those oriented housings, and `arc`, `sag`, `helix` and `weave` paths bend in edge-local 3D frames rather than a global vertical plane.
2. **Pinball Computer Instrument Families** — adds logic ratchets, a break-percussion matrix, vertical pinball bumpers/flippers, curved bell choir, two crystal memory banks, orbital crystal satellites, analog CV panels, a sound-active neon reed array and a rotating pinned music-box data loom.
3. **Expanded Physical Transmission Language** — V9's gears, belts, chains, cams, four-bars and nested rings are joined by visible `ratchet`, `music-box`, `bell-crank` and `solenoid` transmissions. Their phase and energy still come from the deterministic physics solver.
4. **Physics-First Breakcore Song** — the 64th-note score addresses named physical organs. `ModalFlowPhysics` emits the receiving event with slice, reverse, pitch and ratchet metadata; only `NeonPinballComposer` can turn that event into procedural breaks, sub pressure, acid CV, bells or glass harmonics. Free marbles and mechanism teeth contribute fills.
5. **Open Shadow / Neon Stage** — four independent projector lanes, rotating perforated gobos, long neon coordinate rails, a far shadow floor and isolated sails replace enclosing walls. Sound events drive local lights, environmental neon and charge-particle size/opacity.
6. **Usable Direction UI** — **LOOKS / LIGHTS** and **DIRECTOR** now live in the top bar. LOOKS opens the visual lab directly. Left controls, right camera/capture, section timeline, pad deck, Director sidebar and Director timeline can each be minimized independently. The Drone HUD is centered beneath the top timeline instead of colliding with side/bottom overlays.
7. **Adaptive Macro Cinematography** — the graph camera reads each work's envelope radius, framing V10 from roughly 23 units instead of hitting a close room edge. `0` is auto-open orbit, `1` is Drone Pilot and `2–8` inspect the switchyard, ratchet register, percussion matrix, loom, crystal bus, bell choir and neon reeds.
8. **Polychrome Moving Light Volumes** — eight independently colored point/spot movers orbit through the scene. Four additive beam volumes make the spot fields visible; colors crossfade independently instead of tinting the entire installation one hue.
9. **Liquid Tube Signals + Light-Music Objects** — two or three additive neon packets travel along every tube at edge/flow-dependent speeds. Musical fireflies, a responsive constellation network and event-driven Tesla/plasma branches occupy the open background.
10. **Grid-by-Default Physics** — free physics notes wait for the next work-specific 1/16, 1/32 or 1/8 musical unit. Scripted score cues are already on-grid; electric/glitch special effects may bypass it. **`U`** or the top-bar **GRID / FREE** control restores completely free timing.
11. **Zero-Overlay Performance Mode** — **`TAB`** / **PERFORM** removes the top bar, panels, timeline, Director and Drone text while keyboard/mouse, MediaPipe, mic, MIDI/gamepad and the physical instrument continue live.

See [`docs/V10_NEON_PINBALL.md`](docs/V10_NEON_PINBALL.md) for the original machine/song architecture and [`docs/V11_SPATIAL_VARIATIONS.md`](docs/V11_SPATIAL_VARIATIONS.md) for the shared visual/timing upgrades and three variations.

---

## V11 Variation (`02`): `LUMEN GRID // 3D GEOMETRIC SEQUENCER`

Load with `?work=spatial-trance`. This deliberately legible 126 BPM ambient-trance teaching piece turns the system into a three-dimensional geometric sequencer: one large clock source, a visible router, quantized gate, melody edge, harmony processor, light phase and return loop. Eighteen radically different-scale vertices and a restrained score make clock → route → physical note → light consequences easy to follow.

## V11 Variation (`03`): `CHAOS VECTOR // BRAINDANCE COLLIDER`

Load with `?work=braindance-collider`. This is an original 188 BPM algorithmic-jungle / braindance work built from the Space Pinball learnings: 40 transformed modules, 96 balls, extreme scale contrast, recursive 3/5/7 pulse streams, reverse microcuts, crooked acid, four extra cross-transmissions and a high-energy plasma environment. Normal impacts stay on a 1/32 grid while intentional electric exceptions remain free.

## V11 Variation (`04`): `ANTARCTICA // SUBGLACIAL LIGHT`

Load with `?work=antarctica`. This 54 BPM quiet ambient work uses 24 ice, underwater, tide, snow-crystal and aurora organs; only 18 balls; long pentatonic glass/chord decays; slow liquid-cyan tube signals; pastel moving lights; snow/firefly particles; and wide event spacing. It demonstrates the same causal graph without breakcore density.

See [`docs/V11_SPATIAL_VARIATIONS.md`](docs/V11_SPATIAL_VARIATIONS.md) for all three blueprints, scores, timing rules and visual systems.

---

## Preserved V9 Work (`05`): `MODAL FLOW // RESONANT RELAY`

Load with `?work=modal-flow`. V9 remains the 48-bar D-Lydian Cornell-box Rube Goldberg instrument with marbles, gear cascades, belts, exact four-bar strikers, cams, ladder chains, nested resonators, projected shadow play and the full visual lab. See [`docs/V9_RESONANT_RELAY.md`](docs/V9_RESONANT_RELAY.md).

---

## Preserved V7 Work (`06`): `PENDULUM // MARBLE ENGINE`

Load with `?work=marble-pendulum`. V7 is the blank-slate programmable marble instrument: 216 simulated steel marbles, a 12 × 64 pin wheel, gates, vibraphone/percussion impacts, collector and bucket lift under a pendulum governor. See [`docs/V7_MARBLE_PENDULUM.md`](docs/V7_MARBLE_PENDULUM.md).

---

## Graph Reference (`07`): `ASTRARIUM // MODULAR ENGINE`

V6 remains loadable with `?work=astrarium-modular-engine`. It is the **machine-building kit** with 72 addressable modules, 216+ typed conduits, many-to-many score bindings, and multi-scale graph focus. The V5 automaton is nested as its reference core. See [`docs/V6_MACHINE_BUILDING_KIT.md`](docs/V6_MACHINE_BUILDING_KIT.md).

---

## Automaton Reference (`08`): `CHRONO // AUTOMATON`

V5 remains loadable with `?work=chrono-automaton`. It is the **time-traveled self-playing clockwork automaton** with zero unparented parts: pinned programme barrel, meshing escapement gears, balance wheel, Geneva indexer, tuned comb banks, exact four-bar striker linkages, crank-driven bellows, iris resonator pipes, hinged ceramic carapace shells, and magnetic flux rails. Its rig, ecology, articulation lab, and 96-bar Director Studio are documented in [`docs/V5_DIRECTOR_STUDIO.md`](docs/V5_DIRECTOR_STUDIO.md).

---

## Legacy Work (`09`): `HYPER // TECTON`

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

Also includes **`10: PHASE // LATTICE`**, the original simple pendulum/polyrhythmic study that inspired the V7 return to first principles.

---

## Live Performance Controls (Keyboard & Mouse First + Sensors)

| Input | Action |
| :--- | :--- |
| **`SPACE`** | Play / Pause the active physical score (V10 Space Pinball, any V11 variation, V9 relay or legacy work) |
| **`0` / `1`–`8` on V10** | `[0]` Adaptive open-machine orbit, `[1]` Drone Pilot, then Pinball Switchyard, Ratchet Register, Break Percussion, Music-Box Loom, Crystal Bus, Bell Choir and Sound-Active Neon |
| **`0` / `1`–`8` on V11 variations** | Work-specific whole graph / Drone Pilot / router, timing, melody, harmony, light, return and source/collider detail shots |
| **`0` / `1`–`8` on V9** | `[0]` Auto marble-follow, `[1]` Drone Pilot, then Upper Tubework, Gear Cascade, Four-Bar Striker, Nested Resonator, Shadow Chain, Neon Chime Orchard and Return Spiral |
| **`0` / `1`–`8` on V4–V7** | Legacy Morph-Follow Auto-Director or eight named rig perspectives |
| **`Z X C V B N M , . /`** | Live play all 10 pads (`SHOCK ANVIL`, `FAULT SHEAR`, `BREAK CHOP`, `CHIME LATTICE`, `FORMANT REED`, `PLASMA CHOIR`, `MONOLITH SUB`, `ACID SQUELCH`, `GLASS HALO`, `GLITCH CHIRP`) — **Mouse X/Y** controls F-Phrygian pitch & vowel formant |
| **`A S D F G J K`** | Momentary performance bus FX (`GLITCH STUTTER`, `64TH DRILL`, `HALFTIME`, `COMB SCREAM`, `REV SLICE`, `HYPER DILATE`, `SHATTER LOCK`) |
| **`Q W E R T Y`** | Cue Acts I–VI on next bar boundary |
| **Left-Click Drag** | Twist & dilate non-Euclidean geometry + optical glitch; release to slam |
| **Right-Drag / `Shift`+Drag / Wheel** | Manual camera orbit & zoom offset on any rig |
| **`CAM: HAND`** | MediaPipe Vision 2-hand 21-landmark optical tracking (span → dilation, pinches → ratchet/acid Q, wrist velocity → mid-air shear strikes) |
| **`MIC: ENV` / MIDI / Gamepad** | Live audio envelope follower + auto-bound WebMIDI CCs/notes & Gamepad |
| **Top-bar `LOOKS / LIGHTS`** | Open the Director directly on the visual lab; pick render styles, palettes and physical light rigs, then independently bypass glitch/lens/chromatic/grain/bleach/stencil/bloom/linocut/neon |
| **Top-bar `DIRECTOR` / Backquote (`` ` ``)** | Toggle Director Studio (free-flight, keyframes, looks, configurations, maps, physics lab, graph) |
| **Top-bar `GRID [U]` / `FREE [U]`** | Toggle default musical-grid quantization for free physics notes; FREE preserves completely unconstrained event timing |
| **Top-bar `L / R / TIME / PADS`** | Independently show/hide the left controls, right camera/capture sidebar, section timeline and performance deck; Director sidebar/timeline have their own minimize buttons |
| **`W A S D` / `E Q` / `Z X` / `0`** | Director free-flight move / rise-fall / Dutch roll / level horizon |
| **V9/V10 `1` Drone Pilot** | `WASD` fly, `E/Q` altitude, `Z/X` roll, pointer drag look, wheel speed/FOV, `Shift` boost, `Alt` precision, `F` marble lock, `V` cinematic drift, `C` follow distance, `0` level horizon |
| **Director `LOOKS` tab** | Keyframe any visual result after live editing; all effect controls remain explicit and independently bypassable |
| **`K` / `L` / `M`** | In Director Mode: add camera key / look key / machine milestone at playhead |
| **Director `PHYSICS` tab** | Click programming-wheel pins, edit gravity/restitution/friction/gate/lift macros, inspect the part registry, drop/reset marbles, import/export the program |
| **Director `MACHINE` tab** | Edit graph macros and many-to-many bindings; pick macro/cluster/module/port/conduit focus; grow or rebuild the installation; export/import machine graph JSON |
| **`0` / `1`–`8` on V7** | Auto physics-focus camera or lock one of eight focus targets |
| **`TAB` / `PERFORM`** | Zero-overlay live-performance mode: all UI/Director/Drone text disappears while shortcuts, mouse, MediaPipe, mic, MIDI/gamepad and audio remain active |

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

- [`docs/V11_SPATIAL_VARIATIONS.md`](docs/V11_SPATIAL_VARIATIONS.md) — Space Pinball checkpoint/tag, grid/free timing, zero-UI performance, polychrome movers, liquid tube signals, constellations/plasma/fireflies, and the Lumen Grid, Chaos Vector and Antarctica works.
- [`docs/V10_NEON_PINBALL.md`](docs/V10_NEON_PINBALL.md) — V10 spatial blueprint, open environment, pinball/ratchet/bell/crystal/loom instruments, physics-first breakcore score, UI improvements and verification.
- [`docs/V9_RESONANT_RELAY.md`](docs/V9_RESONANT_RELAY.md) — V9 mechanical transmission network, Cornell shadow room, visual-style lab, linocut/neon pipeline and verification.
- [`docs/V8_MODAL_FLOW.md`](docs/V8_MODAL_FLOW.md) — V8 3D modular physics network, D-Lydian event-composer, drone camera, strategic event rationing, graph/physics authoring, and verification.
- [`docs/V7_MARBLE_PENDULUM.md`](docs/V7_MARBLE_PENDULUM.md) — V7 Wintergatan research, custom physics engine, programming wheel, machine anatomy, Physics Lab workflow, and verification.
- [`docs/V6_MACHINE_BUILDING_KIT.md`](docs/V6_MACHINE_BUILDING_KIT.md) — V6 graph schema, module/port/conduit architecture, many-to-many bindings, multi-scale focus, live growth, and Machine tab workflow.
- [`docs/V5_DIRECTOR_STUDIO.md`](docs/V5_DIRECTOR_STUDIO.md) — V5 clockwork automaton, kinematic rig, ecological behavior, 96-bar Director Studio and JSON workflows.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Engine architecture, V4 coupled state machines, V5–V11 module maps, physics-generated composition, open spatial conduits, drone camera, TSL vertex/post-FX shaders, and the preserved scores.
- [`docs/PERFORMANCE_AND_RECORDING.md`](docs/PERFORMANCE_AND_RECORDING.md) — Keyboard/mouse rig, MediaPipe optical tracking, overdub take recorder, and `.webm` master export.
- [`docs/CI_AND_DEPLOYMENT.md`](docs/CI_AND_DEPLOYMENT.md) — Continuous any-branch GitHub Pages CI/CD pipeline.
- [`HANDOFF.md`](HANDOFF.md) — Session state, V4 upgrades, verification status, and next extension vectors.
