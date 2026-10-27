# Session Handoff & Architectural Blueprint — `sonobjet`

> **Purpose:** Detailed end-of-session handoff so the next session can pick up immediately with full technical context, the preserved Section IV "mewing/humming" audio fix, the V5/V6/V7 reference works, and the current V8 3D modular physics-generated composition.

---

## 0. Latest Update — V8 MODAL FLOW // PHYSICS SONG Implemented & Deployed (2026-10-27)

**Current default flagship:** `MODAL FLOW // PHYSICS SONG` (`src/works/modal-flow/`). V7 `PENDULUM // MARBLE ENGINE`, V6 `ASTRARIUM // MODULAR ENGINE`, V5 `CHRONO // AUTOMATON`, V4 `HYPER // TECTON`, and `PHASE // LATTICE` remain registered and selectable.

### Why this turn changed direction

The user found V7 underwhelming: too 2D, too many events, and essentially a twelve-lane gate sheet. They asked for free drone/cinematic camera flight, a new melody, realistic physical events that actually generate the song, strategic event rationing, and a network of richer modular 3D machines connected by marbles as energy/sound flow. V8 is a new default work rather than an incremental expansion of the V7 lane bank.

### What changed

- Added `src/works/modal-flow/ModalFlowScore.ts`: a new **48-bar, 132 BPM, six-section D-Lydian composition**. The transport supplies section shape and only two sparse governor energy cues per bar; it no longer schedules melody notes.
- Added `src/works/modal-flow/ModalFlowBlueprint.ts`: a depth-layered **12–96 module** blueprint with 12 fixed core units, repeatable satellite resonators, curved 3D conduits, eight energy sources, sixteen many-to-many bindings, an 8×32 routing wheel and focus targets at all five scales. The V7 twelve-lane gate bank is now one module.
- Added `src/works/modal-flow/ModalFlowPhysics.ts`: deterministic fixed-step 3D solver with gravitational potential conservation, motorized helix lifts, same-path marble collisions, escapement queueing, program-controlled diverter routing, module energy, edge flow, recycling and telemetry.
- Added `src/works/modal-flow/ModalFlowComposer.ts`: turns real solver events into a rationed D-Lydian melody using phrase rests, global event budgets, module cooldowns, elevation-based registers, impact-based velocity/decay and module-based timbres. No humming/mewing voices are used.
- Added `src/works/modal-flow/ModalFlowMachine.ts`: one parented `KinematicRig` installation with chassis/conduit/marble frames, module and port joints, flywheel/auger/diverter/escapement transmission, instrument hammers, transparent curved tubes and instanced marbles. Every visible mesh has a `rig:` ancestor.
- Added `src/works/modal-flow/ModalFlowWork.ts`: audio/camera/Director integration, graph and physics snapshots, program/config JSON I/O, live growth/rebuild, drone mode HUD and all generic director hooks.
- Extended `FreeFlyController` with a `DRONE` mode: inertial velocity, banked turns, cinematic drift, marble lock, follow distance, wheel speed/FOV and pointer look. Director Studio gains a fourth camera mode button, `DRONE PILOT`.
- Added generic engine hooks: `WorkRuntimeContext.canvas`, `ImpulseEvent.origin: 'physics'`, `DirectorWorkHooks.getCameraFollowTarget()`, `WorkSceneInstance.setDirectorEnabled()`, and `WorkDefinition.cameraModeLabels`.
- Added `KeyboardMouseRig.setDroneMode()` to suspend live pads/punches while drone flight owns the keyboard. `main.ts` registers V8 as default, passes the stage canvas into the work runtime, and coordinates drone/director input modes.
- Updated `StudioShell` ignition copy and per-work camera labels, `index.html` metadata, README, `docs/ARCHITECTURE.md`, V5/V6/V7 reference notes, and added `docs/V8_MODAL_FLOW.md`.

### Verification

- `npm run typecheck`: **0 errors**
- `npm test`: **35 / 35 passing** (12 engine + 10 V5 + 3 V6 + 4 V7 + 6 V8)
- `npm run build`: **clean production bundle**
- `git diff --check`: **clean**
- V8 tests enforce: new 48-bar D-Lydian composition, 32-module blueprint, all five focus scales, deterministic 15-second 3D physics, zero lost marbles, strike/gate/lift/collision/recycle events, sparse audible phrase rationing, D-Lydian scale membership, no humming voices, zero unparented meshes before/after live growth, graph/physics snapshots, routing/program/config round-trips, drone mode toggles and clean disposal.
- Local Vite preview restarted/verified on `0.0.0.0:5173`.

### Deployment

- **Branch:** `arena/23eed999-sonobjet`
- **Live URL:** `https://autonomatono.github.io/sonobjet/`
- **Implementation commit:** `31e2cef feat(v8): physics-generated modular marble song with drone camera`
- **GitHub Pages CI run:** `40570090738` — completed **success** (`gh run watch 40570090738 --exit-status`)
- Live page verified to serve the V8 title, `MODAL FLOW // PHYSICS SONG`, default `?work=modal-flow`, 48-bar section labels, the ten V8 macros, per-work camera labels including `1 // DRONE PILOT`, the Director Studio `DRONE PILOT` button, all eight Director tabs, build SHA `31e2cef`, and branch `arena/23eed999-sonobjet`.
- This `HANDOFF.md` deployment note is a docs-only follow-up commit on the same branch; Pages rebuilds it through the same workflow.

### Next extension vectors

- Add true sphere-vs-tube contacts and multi-marble jams inside lifts.
- Add raycast picking for 3D modules, ports and conduits.
- Add user-defined module templates, inter-module resonant coupling and failure modes.
- Add timeline lanes that rewrite routing-wheel pins per section.
- Add audio-domain ports that modulate live synth buses from graph energy.
- Add multi-drone camera choreography and keyframes that interpolate drone state.
- Export the full 3D blueprint as a portable machine file.

---

## 0.1 Prior Update — V7 Blank-Slate Marble Engine Implemented & Deployed (2026-10-27)

**Then-current default flagship (now a preserved reference):** `PENDULUM // MARBLE ENGINE` (`src/works/marble-pendulum/`). V6 `ASTRARIUM // MODULAR ENGINE`, V5 `CHRONO // AUTOMATON`, V4 `HYPER // TECTON`, and the original `PHASE // LATTICE` pendulum study remain registered and selectable.

### Why this turn changed direction

The V6 graph framework is a good record of machine relationships, but the visual result felt abstract. The user felt the original simple pendulum demo was closer to the desired spirit. V7 therefore starts from an empty machine and returns to first principles: visible cause → visible effect → repeated physical consequence. Wintergatan's marble machines were researched as the external reference.

Research findings that shaped V7:

- The original machine is hand-cranked, raises steel marbles into feeder tubes, releases them via programmable gates, drops them onto vibraphone/bass/cymbal/contact-mic percussion, then collects and returns them through funnels and lifts ([Wikipedia](https://en.wikipedia.org/wiki/Wintergatan)).
- The programming wheel is the central innovation: one pin releases one marble at an exact time and position ([NPR](https://www.npr.org/sections/allsongs/2016/03/03/469027281/be-amazed-by-this-marvelous-music-machine-powered-by-2000-marbles)).
- The 22-track wheel behaves like an analog MIDI grid, and the one-marble-at-a-time gates were the hardest part ([Wired](https://www.wired.com/2016/03/insanely-complex-machine-makes-music-2000-marbles/), [It's Nice That](https://www.itsnicethat.com/articles/wintergatan-marble-machine-270416)).
- Later designs simplified for reliability: remove guide surfaces below the gate and let gravity do the timing ([Hackaday](https://hackaday.com/2022/10/31/dropping-marbles-with-millisecond-accuracy/)); MM3 uses a single programming wheel, single collector, ring lift and governor ([New Atlas](https://newatlas.com/music/marble-machine-3-project-overview/)).

### What changed

- Added `src/kit/physics/MarblePhysics.ts`: a deterministic fixed-step custom physics engine for 216 steel marbles with sphere integration, capsule-segment contacts, sphere-sphere collisions, restitution, tangential friction, gate obstacles, impact telemetry, stuck-ball recovery and a damped pendulum governor ODE.
- Added `src/kit/physics/MarbleBlueprint.ts`: 12 gates, 12 instruments, 12 queues, 50+ track/instrument/funnel segments, a five-point bucket-lift path, 47 physical parts, and focus targets at all five scales.
- Added `src/kit/physics/ProgrammingWheel.ts`: editable 12-lane × 64-step pinned score memory sampled from wheel angle, with JSON import/export and wrap-around step-crossing detection.
- Added `src/works/marble-pendulum/MarblePendulumMachine.ts`: plywood A-frame, hand-crank flywheel, 1:32 gear reduction, pinned programming wheel, pendulum governor with stretched pitman rod, feeder tubes, gate levers, vibraphone/percussion bank, collector trough, animated bucket lift, and instanced steel marbles/pins.
- Added `src/works/marble-pendulum/MarblePendulumWork.ts`: score/audio/director integration. Physical marble impacts trigger procedural synth voices; the preserved 96-bar score remains blended underneath.
- Added a generic `PHYSICS` tab to Director Studio: clickable pin grid, ten solver macros, live part registry, focus selector, marble drop/reset controls, program JSON I/O, and free/queued/lifting/impact/jam telemetry.
- Kept every previous studio tool and work. The `MACHINE` tab also works on V7 as a graph projection of physical parts and causal relations.
- Updated ignition copy, page metadata, README, architecture docs, V5/V6 notes, and added `docs/V7_MARBLE_PENDULUM.md`.

### Verification

- `npm run typecheck`: **0 errors**
- `npm test`: **29 / 29 passing** (12 engine + 10 V5 + 3 V6 + 4 V7)
- `npm run build`: **clean production bundle**
- `git diff --check`: **clean**
- V7 tests enforce zero unparented meshes, 100+ releases, 200+ impacts, 50+ recycles, zero jams/lost marbles, near-zero release jitter, programming-wheel JSON round-trip, live macro/pin/focus edits, reset/grow/rebuild, physics telemetry, and clean disposal.
- Local dev preview verified on `0.0.0.0:5173`; `/`, `/src/main.ts`, V7 work/physics modules and director CSS all return `200`.

### Deployment

- **Implementation commit:** `090cbf2 feat(v7): blank-slate marble engine with custom physics and programming wheel`
- **Branch:** `arena/23eed999-sonobjet`
- **GitHub Pages CI run:** `40555766238` — completed **success**
- **Live URL:** `https://autonomatono.github.io/sonobjet/`
- Live page verified to serve the V7 title, `PENDULUM // MARBLE ENGINE`, the seven-tab Director Studio with `PHYSICS`, all ten physics macros, live marble-state telemetry, build SHA `090cbf2`, and branch `arena/23eed999-sonobjet`.
- This `HANDOFF.md` update is a docs-only follow-up commit on the same branch; Pages rebuilds it through the same workflow.

### Next extension vectors

- Replace the kinematic bucket lift with fully simulated carrier constraints.
- Add raycast picking for 3D pins, gates, tubes and instruments.
- Add user-defined chutes and instrument curves.
- Add a timeline lane that rewrites programming-wheel pins per Act.
- Add mechanical failure modes: worn gates, skewed trough, off-balance flywheel.
- Export the full physics blueprint as a portable machine file.

---

## 0.2 Prior Update — V6 Machine-Building Kit Implemented & Deployed (2026-10-27)

**V6 reference work:** `ASTRARIUM // MODULAR ENGINE` (`src/works/astrarium-modular-engine/`). V5 `CHRONO // AUTOMATON` remains registered and is nested as the load-bearing reference core. V4 `HYPER // TECTON` and `PHASE // LATTICE` remain selectable.

### What changed

- Added a generic `MachineGraph` with addressable modules, typed ports/clusters/edges, nonlinear transfer modes, energy sources, selector-based score bindings, focus descriptors, simulation state, snapshots, live growth, binding edits and JSON config I/O.
- Added a deterministic installation generator: **72 modules, 216+ conduits, 12 prime movers, 20 many-to-many bindings, 10 focus targets**, scalable from **12 to 256 modules**.
- Built a fully parented 3D installation: macro orrery frame → ten cluster rings → module chassis → gear-train joints → organ rotors → typed ports. A `conduitFrame` joint owns instanced bent ducts and flow beads whose endpoints follow moving joints.
- Preserved V5 as a scaled reference automaton inside the macro frame; it still receives impulses, anticipations, articulation and behavior maps.
- Added a multi-scale camera director with `MACRO / CLUSTER / MODULE / PORT / CONDUIT` focus. Conduit shots follow live edge endpoints; auto mode cycles focus targets every six bars.
- Added a sixth **MACHINE** tab to Director Studio: live graph canvas, macro sliders, focus selector, binding editor, growth/rebuild controls, graph JSON import/export, and energy/flow telemetry.
- Registered V6 as default in `src/main.ts`; updated ignition copy, page metadata, README, `docs/ARCHITECTURE.md`, `docs/V5_DIRECTOR_STUDIO.md`, and added `docs/V6_MACHINE_BUILDING_KIT.md`.
- Preserved the 96-bar F-Phrygian score, 14-voice synth, Director keyframe studio, and the Section IV anti-mewing/humming fix.

### Verification

- `npm run typecheck`: **0 errors**
- `npm test`: **25 / 25 passing** (12 engine + 10 V5 + 3 V6)
- `npm run build`: **clean production bundle**
- `git diff --check`: **clean**
- V6 tests assert many-to-many fan-in/fan-out, all five focus scales, all transfer/binding/energy waveform families, graph JSON round-trip, live growth/rebuild/import, and **zero unparented visible meshes** before and after rebuild.
- Local dev preview verified on `0.0.0.0:5173`; `/`, `/src/main.ts`, the V6 work module and director CSS all return `200`.

### Deployment

- **Implementation commit:** `847e572 feat(v6): machine-building kit, many-to-many graph ecology, and multi-scale director`
- **Branch:** `arena/23eed999-sonobjet`
- **GitHub Pages CI run:** `40534323841` — completed **success** (`gh run watch 40534323841 --exit-status`)
- **Live URL:** `https://autonomatono.github.io/sonobjet/`
- Live page verified to serve the V6 title, `ASTRARIUM // MODULAR ENGINE`, the six-tab Director Studio with `MACHINE GRAPH`, 72 modules, the new graph macros and patch routes, build SHA `847e572`, and branch `arena/23eed999-sonobjet`.
- This final `HANDOFF.md` update is a docs-only follow-up commit on the same branch; Pages rebuilds it through the same workflow.

### Next extension vectors

- Visual node editor for selector bindings and custom module templates.
- Raycast picking of ports and conduits in the 3D view.
- Persist machine graph configs inside the Director project JSON.
- Audio-domain ports that modulate live synth buses from graph flow.
- Cluster-level presets that rewire transfer modes across the 96-bar timeline.

---

## 0.3 Prior Update — V5 Blueprint Implemented (2026-10-27)

The V5 systems described below are now implemented on the active session branch `arena/23eed999-sonobjet`. The earlier implementation from `arena/86769aaf-sonobjet` (commit `8090f12`) was merged forward because this session initially started from the empty `main`.

**New current flagship:** `CHRONO // AUTOMATON` (`src/works/chrono-automaton/`). V4 `HYPER // TECTON` and `PHASE // LATTICE` remain registered in the work selector.

Implemented:

- `src/kit/mechanism/KinematicRig.ts` + `HorologicalMeshKit.ts` — named joints, gear ratios, cam followers, exact four-bar/crank-slider solvers, Geneva indexer, magnetic slip rails with plasma axles, toothed gears, bridges, combs, bellows, irises and ceramic shells.
- `src/studio/articulation/` — 12 articulation DOFs, six behaviors, eight milestone presets, A/B crossfade, JSON preset bank, and a coupled eight-organ ecological simulation with arousal/cohesion/fatigue/curiosity.
- `src/studio/director/` — 6-DOF free-flight/joint-lock camera, 96-bar camera/look/milestone keyframe timeline with four interpolation modes, live look and articulation editors, behavior maps, patchbay, project import/export, and a dockable Director Studio UI.
- `src/main.ts` — V5 default work registration, global Director System integration and keyboard-mode isolation.
- `docs/V5_DIRECTOR_STUDIO.md` — full V5 architecture and operating guide.

**Verification at the time:** `npm run typecheck`, `npm test` (22 passing), and `npm run build` were clean. The V5 tests enforce the golden rule that every visible mesh has a `RigJoint` ancestor; V6 adds the same invariant for graph-built installations.

---

## 1. Repository, Branch & Deployment Status

- **Repository:** `autonomatono/sonobjet` (`/home/user/sonobjet`)
- **Historical Session Branch:** `arena/86769aaf-sonobjet` *(original V4 handoff; its history has been merged into the active `arena/23eed999-sonobjet` branch)*
- **Live GitHub Pages URL:** `https://autonomatono.github.io/sonobjet/`
- **CI Workflow:** `.github/workflows/deploy.yml` (runs `typecheck` → `vitest` → `vite build` → deploys GitHub Pages from any pushed branch)
- **Current Verification Status (V8):**
  - `npm run typecheck` (`tsc --noEmit`): **0 errors**
  - `npm test` (`vitest run`): **35 / 35 passing** (12 engine + 10 V5 + 3 V6 + 4 V7 + 6 V8)
  - `npm run build` (`vite build`): **Clean production bundle** (offline MediaPipe WASM included)
  - `git diff --check`: **clean**
  - V8 implementation commit: `31e2cef`; V8 green Pages run: `40570090738`. V7 reference commit: `090cbf2`; V7 green Pages run: `40555766238`.

---

## 2. Audio Fix Completed Before Handoff (Eliminated the "Mewing / Humming" Sound)

The user noted: *"music mostly ok, but there is an unpleasant mewing humming sound (most prominent in section iv) that needs to go."*

We diagnosed and **fixed all four root causes** in `src/works/gantz-tecton/GantzWork.ts` and `src/engine/audio/SynthRack.ts`:

1. **Continuous FM Strain Drone (`GantzWork.ts` + `SynthRack.updateContinuousStrain`) — Primary Culprit:**
   - Previously, `GantzWork.update()` passed `strain: Math.max(0, stress - 0.16)` every frame into `SynthRack.updateContinuousStrain()`, which ran a continuous sawtooth FM oscillator (`baseFreq = 87.31 + s * 260` → gliding `120 Hz ↔ 350 Hz` through a resonant bandpass filter). In Section IV (`Bars 52–63`), rapid drum bursts spiked `stress` and then decayed during the Beat-4 dead-stop silences, producing an exposed, sliding cat-like *"mreeow-hmmm"* drone.
   - **Fix:** `strain` is now driven **exclusively** by intentional manual mouse-drag (`pointerStrain > 0.12`), and its frequency is locked to a low `43.65 Hz` (`F1`) motor rumble with **zero pitch-gliding**.
2. **Automatic Master Comb-Filter Hum (`GantzWork.ts`):**
   - Previously, `combMix` had `+ stress * 0.2`, feeding 20% of Section IV's drums into `FractureWorklet`'s `~425 Hz` (`combFeedback = 0.68`) Karplus-Strong delay line even when `[F] COMB SCREAM` was not pressed.
   - **Fix:** Changed to `combMix: combScream * 0.75` (`0` unless the performer actively holds `[F]`).
3. **Pitched Sine Glissando in `playWindupInhale` (`SynthRack.ts`):**
   - Previously included a `servo` sine oscillator sweeping `110 Hz → 420 Hz` through a `Q = 3.8` bandpass filter during `Bar 51` and `Bar 63` (Section IV's 2-beat silence).
   - **Fix:** Removed the `servo` sine oscillator completely and lowered `Q` to `1.15` for a clean, dry pneumatic air-valve rush.
4. **Cascaded dB Resonance Peak in `playAcidSquelch` (`SynthRack.ts`):**
   - In WebAudio, `BiquadFilterNode` `lowpass` `Q` is specified in **dB**. Two cascaded filters at `Q = 12` and `Q = 8` summed to `+20 dB` of narrowband whistling.
   - **Fix:** Tamed to `Q = 4.2..7.7` and `Q = 1.8..3.4` so the 303 acid voice stays punchy without vocal whistling.

**Takeaway for Next Session:** The 96-bar F-Phrygian score (`GantzScore.ts`), the 6-act phrase transitions (including the fixed `Bars 48–51` Act III bridge and full 16-bar `Bars 64–79` Act V climax), the drum/breakbeat engine, and the 14-voice `SynthRack` are in good shape — **preserve the musical score & audio engine** and focus 90% of V5 engineering on the **Mechanical Structure, Articulation/Preset Lab, and Director Free-Flight + Keyframe Sequencer**.

---

## 3. Honest Diagnosis: Why V4 Visuals & Choreography Stalled

1. **"No structure or mechanism — just a pile of particle layers":**
   - `HyperTectonMachine.ts` (`4,092` instances) and `SurrealCyberVault.ts` (`256` monoliths) place thousands of disconnected boxes/cylinders onto concentric spherical/polar math formulas (`theta, phi`).
   - There is **no load-bearing frame/chassis**, **no parent-child mechanical hierarchy**, **no visible torque/motion transmission** (shafts, cams, levers, escapements, racks, linkages, cables), and **no physical attachment** between layers. When parts move, they float like 5 nested particle clouds rather than a physical mechanism doing work.
2. **No Director Agency (Locked into Hardcoded Camera Math):**
   - `CinemaDirector.ts` computes procedural orbital/dolly math from hardcoded formulas. The user/director **cannot grab the camera, fly freely (`WASD` + mouse look) around or inside the object, frame a compelling detail, and keyframe shots along the 96-bar timeline**.
3. **No Articulation Rig or Behavior Preset System:**
   - Machine states (`FOLDED_MONOLITH`, etc.) are monolithic hardcoded math blends inside a 900-line `update()` method. There is no way to **articulate individual mechanisms via sliders/gizmos**, **design & test distinct mechanical behaviors**, **save/load named Machine Presets**, or **sequence those Presets as structural milestones** across the piece.

---

## 4. V5 Creative North Star (Historical Blueprint, Implemented & Preserved): The Time-Traveled Clockwork Automaton

> *"If this was an antique self-playing clockwork automaton that time-traveled into the future and came back to the present, what would it be?"*

Think **1770s Jaquet-Droz / Vaucanson Horological Musical Automaton** (skeletonized brass movement bridges, pinned programme cylinder, cam-follower stacks, fusee chain, escapement balance wheel, tuned steel music-box combs, pleated leather/metal organ bellows, articulated mechanical striker linkages) that **fell through a wormhole to the year 3200, was repaired and augmented by a post-human civilization, and returned to the present**:

### Concrete Structural Anatomy (Every Part Physically Attached & Load-Bearing!)

1. **The Skeletonized Movement Chassis (`ChassisAssembly` — Root of the Hierarchy):**
   - Heavy cut-out **horological bridge plates, turned pillars, jewel-bearing collars, and a central main-arbor spine** in aged gunmetal, brushed horological brass, and darkened blued steel — **grafted with split white synthetic-ceramic metamaterial armor shells** (Cunningham / *All Is Full of Love* precision) mounted on real hinged pantograph brackets!
2. **The Temporal Programme Cylinder (`ChronoBarrelAssembly` — Visible Score Memory!):**
   - At the heart of every antique self-playing automaton is its **rotating pinned brass cylinder & cam-stack** that physically encodes the score.
   - Here, half the heavy brass cylinder still carries **physical raised brass pins & stepped cams** lifting **spring-loaded steel follower levers** in real time (`Clock` anticipation cues literally lift the cam-followers 150–350ms before impact!).
   - Where the future civilization upgraded it, the cylinder fractures into **counter-rotating superconducting magnetic memory rings & hard-light optical laser read-heads** scanning the 96-bar score!
3. **The Escapement, Fusee & Differential Gear-Train (`EscapementTrainAssembly`):**
   - Intermeshing **toothed escapement wheels, an oscillating balance wheel + hairspring, a Geneva intermittent-motion indexer** (snapping on 16th/bar boundaries!), and **bevel-gear differentials** mounted on real axles between the chassis bridges — driving the mechanical clock at `164 BPM`.
4. **Physical Acoustic Sound-Producing Organs (Driven by Linkages from the Cam-Followers!):**
   - **Tuned Comb & Hammer Bank (`ModalCombAssembly` → `modal-clang` & `glass-armonica`)**: A curved fan of graduated blued-steel / crystalline-quartz tines physically plucked by star-wheels and struck by articulated micro-hammers.
   - **Articulated Four-Bar Striker Arms & Drop-Hammers (`StrikerLinkageAssembly` → `sub-rupture`, `spine-shear`, `break-shred`)**: Real **4-bar linkages, crank-rockers, push-rods, and clevis joints** (NOT disembodied floating sticks!) connecting the central cam-stack to heavy radial anvil-hammers and multi-jointed percussion arms.
   - **Pleated Harmonic Bellows & Formant Resonator Pipes (`BellowsPipeAssembly` → `bellows-choir`, `larynx-lead`, `acid-squelch`)**: Accordion-hinged mechanical bellows driven by eccentric cranks, pumping glowing plasma-reed resonator tubes whose mechanical iris-valves open and close to shape vowel formants (`A/E/I/O/U`) and 303 filter cutoff!
5. **The Future-Tech Anomaly Mechanism (`TemporalFluxAssembly` — Controlled Rule-Breaking!):**
   - Because the machine returned from the future, its chassis joints contain **electromagnetic containment clutches**.
   - In "Present / Horological" presets (`magneticUnpin = 0`), **100% of parts are strictly mechanically pinned** — gears mesh, rods stay in bearings, hinges pivot around physical pins.
   - As `magneticUnpin` (`0 → 1`) increases in later presets/milestones, **specific sub-assemblies unlatch along telescoping guide-rails or levitate across controlled magnetic air-gaps**, connected by visible **taut plasma-axles / phase-tethers** that still transmit rotation and hammer strikes across empty space! Even when separated, the **kinematic parent-child hierarchy remains legible** (you see *which* shaft split apart along *which* axis, rather than random cloud dispersion).

> **Strict Golden Rule for V5 Geometry:**
> **ZERO unparented particle clouds.** Every mesh and every `InstancedMesh` instance (gear teeth, cylinder pins, comb tines, bellows pleats, pantograph ribs) MUST compute its transform from a **parent `JointNode` / rigid link** in the machine's kinematic tree!

---

## 5. V5 Engineering Architecture (3 Major Systems to Build Next Session)

### System 1: Hierarchical Kinematic Rig & Mechanism Kit (`src/kit/mechanism/`)

Create a clean, reusable mechanical rigging layer so building articulated machines is declarative and inspectable:

- **`KinematicRig.ts`**:
  - Scene-graph skeleton of named `RigJoint` nodes (`id`, `label`, `group: THREE.Group`, `restPos`, `restRot`, `axis`, `min`, `max`, `value`, `springStiffness`, `damping`).
  - Supports **kinematic constraints / drivers**:
    - `GearRatioDriver` (`childAngle = parentAngle * (-teethParent / teethChild) + phase`)
    - `CamFollowerDriver` (lifts follower angle/offset from a cam profile table + anticipation cue)
    - `FourBarLinkageSolver` / `CrankSliderSolver` / `TwoBoneIKSolver` (exact analytical trigonometry so rods, clevises, and pistons NEVER separate at their pin joints!)
    - `GenevaIndexerDriver` (discrete stepped rotation locked to musical `step16` / `bar`!)
    - `MagneticSlipRail` (slides a child sub-assembly outward along its local axle vector when `futureUnpin > 0`, automatically stretching a visible laser/plasma axle-beam between the separated bearing collars!).
- **`HorologicalMeshKit.ts`**:
  - Procedural CAD-grade mechanical geometry builders (cached & shared):
    - `createSpokedGearGeometry(teeth, innerR, outerR, thickness, spokes)` (true involute-style toothed wheels with lightening cutouts, NOT plain cylinders!)
    - `createSkeletonBridgeGeometry(...)` (chamfered clockmaker bridge plates with bearing bosses)
    - `createClevisRodGeometry(length, radius)` (connecting rods with twin eyelet knuckles & pivot pins at `z = 0` and `z = length`)
    - `createCamLobeGeometry(...)`, `createTunedCombGeometry(...)`, `createPleatedBellowsGeometry(...)`.

### System 2: Machine Articulation & Behavior Preset Lab (`src/studio/articulation/`)

Give the user/director hands-on control to pose, articulate, and choreograph the machine:

- **Named Articulation Parameters (`ArticulationState`)** (~12–16 high-level mechanical DOFs driving the rig):
  - `chassisUnfold` (`0..1`: sealed reliquary case ↔ wide-open skeletonized movement)
  - `armorSplit` (`0..1`: white Cunningham ceramic carapace closed ↔ hinged open on pantograph arms)
  - `barrelEngage` (`0..1`: programme cylinder recessed ↔ raised & spinning)
  - `combFan` (`0..1`: music-box tine banks folded ↔ fanned out radially)
  - `strikerReach` (`0..1`: percussion 4-bar arms tucked ↔ extended into strike posture)
  - `bellowsBreathing` (`0..1`: pneumatic bellows stroke depth)
  - `irisAperture` (`0..1`: formant resonator iris opening)
  - `magneticUnpin` (`0..1`: **Future Anomaly** — unlatches sub-assemblies along magnetic flux-rails with plasma-axles)
  - `chronoShear` (`0..1`: **Future Anomaly** — non-Euclidean TSL torsion & differential time-rate split between inner/outer gear trains)
  - `overclockSpeed` (`0..2`: gear-train & escapement kinetic multiplier)
- **Composable Behavior Modules (`BehaviorId`)**:
  - `'PRECISION_ESCAPEMENT'` (crisp quantized 16th-note horological ticking)
  - `'BARREL_AUTOMATON_PLAY'` (cam-followers & striker linkages actively reading score impulses)
  - `'PENDULUM_BREATH'` (slow counter-balanced harmonic swaying for Aria / Suspension sections)
  - `'ZERO_G_DISASSEMBLY'` (sub-assemblies unpin along magnetic axes and precess while tethered)
  - `'OVERCLOCK_CADENZA'` (violent high-speed stop-start Geneva ratcheting + Beat-4 dead-locks)
  - `'BROKEN_MAINSPRING'` (entropic winding-down, ratcheting slips, and settling back into the reliquary)
- **`BehaviorPresetBank.ts` (`MachinePreset`)**:
  - Bundles `{ id, name, articulation: ArticulationState, behavior: BehaviorId, transitionSec, postFx?: Partial<PostFxState> }`.
  - Ships with **8 curated Built-In Milestone Presets** (`M1: Sealed Reliquary`, `M2: Clockwork Awakening`, `M3: Programme Barrel Loom`, `M4: Open Resonator Aria`, `M5: Magnetic Levitation`, `M6: Overclocked Cadenza`, `M7: Temporal Paradox Crown`, `M8: Wound-Down Reliquary`), PLUS full **Create / Update / Duplicate / Delete / JSON Export-Import** and a live **Preset Crossfader** in the UI!

### System 3: Director Free-Flight Camera & Keyframe Milestone Timeline (`src/studio/director/`)

Turn `sonobjet` into a true **Interactive Music-Video Director's Tool**:

- **Free-Flight 6-DOF Camera Mode (`FreeFlyController.ts`)**:
  - Toggle anytime via **`F`** (or `[DIRECTOR FLY]` button in HUD; remaps `[F]` punch FX when Fly Mode is active, or uses `Tab` / dedicated Director Mode toggle so performance keys & fly keys never collide!).
  - **Controls in Director Mode**:
    - **`W A S D`**: Fly forward / strafe left / back / strafe right (along camera orientation)
    - **`E` / `Q`** (or `Space` / `C`): Ascend / Descend vertically
    - **Left-Mouse Drag on Canvas**: Smooth damped Yaw & Pitch look
    - **`Z` / `X`**: Dutch-angle roll (`±45°`, double-click `0` to level horizon)
    - **Scroll Wheel**: Smooth focal-length / FOV zoom (`15mm` ultra-wide interior macro ↔ `120mm` telephoto compression)
    - **`Shift` / `Alt`**: `3×` fast crane speed / `0.2×` micro-macro precision speed
    - ** Joint-Lock / Target-Orbit Picker**: Dropdown (or click-joint raycast!) to **attach/orbit around any named `RigJoint`** (e.g., `chronoBarrel`, `balanceWheel`, `strikerArm[0].hammer`, `combBank`) while still framing freely!
- **Unified 96-Bar Milestone & Camera Keyframe Timeline (`KeyframeTimeline.ts` + Bottom Scrubber UI)**:
  - Interactive **96-Bar Horizontal Timeline Bar** along the bottom of the Director drawer:
    - Click anywhere on the timeline to **scrub / seek to exact `bar.beat`** (works both playing & paused!).
    - **Track 1 — Camera Keyframes (`CameraKeyframe`)**: `{ id, beatTotal, position, targetOrQuat, fov, roll, parentJointId?, interpolation: 'CUT' | 'SMOOTH_SPLINE' | 'ORBIT_ARC' | 'VERTIGO' }`. Press **`[K] ADD CAM KEY`** while flying to drop a keyframe right at the playhead! Click any keyframe diamond to jump to it, update it (`UPDATE`), toggle `CUT` vs `SMOOTH`, or delete it.
    - **Track 2 — Machine Preset Milestones (`MachineMilestone`)**: `{ id, beatTotal, presetId, blendBeats, ease }`. Drop any `MachinePreset` onto any bar/beat to choreograph how the automaton transforms across the 96-bar score!
    - **Default Shipped Choreography**: Pre-populated with ~24 authored Camera Keyframes + ~10 Machine Milestones across the 96 bars so hitting **`SPACE`** out-of-the-box plays a jaw-dropping, coherent film — AND the user can immediately pause, take over in Free-Flight, tweak any shot or machine milestone, and export/save their cut!

---

## 6. Historical V5 Execution Order (Completed)

> These steps were completed in V5 and retained as reference. For current work, use the V6 extension vectors in section 0 and `docs/V6_MACHINE_BUILDING_KIT.md`.

1. **Step 1 — Build `src/kit/mechanism/KinematicRig.ts` & `HorologicalMeshKit.ts`**:
   - Implement `RigJoint`, gear ratios, 4-bar linkage solver, cam-follower driver, Geneva indexer, magnetic slip-rail + plasma-axle connector, and toothed-gear / skeleton-bridge / clevis-rod geometry builders. Write unit tests verifying joint parenting and linkage pin-coincidence.
2. **Step 2 — Build `ChronoAutomaton.ts` (Replacing Particle-Layer `HyperTectonMachine.ts`)**:
   - Construct the **Time-Traveled Self-Playing Clockwork Automaton** on top of `KinematicRig`:
     - Skeletonized brass/gunmetal movement chassis + hinged Cunningham white-ceramic metamaterial carapace shells
     - Central rotating pinned `ChronoBarrel` + spring-loaded cam-followers + holographic laser read-ring
     - Meshing `EscapementTrain` (toothed gears, oscillating balance wheel + hairspring, 16th-note Geneva wheel)
     - 4-bar articulated `StrikerLinkage` hammers, `ModalComb` tine fan + star-wheel pluckers, and crank-driven `PleatedBellows` + iris-valve resonator pipes
     - Controlled `magneticUnpin` flux-rail separation with visible plasma torque-axles.
3. **Step 3 — Build `ArticulationRig`, `BehaviorPresetBank` & 8 Built-In Milestones**:
   - Expose all 10–12 named mechanical DOFs + 6 Behavior Generators + Preset Crossfader UI so the user can articulate every mechanism live even with transport paused.
4. **Step 4 — Build `FreeFlyController` + 96-Bar `KeyframeTimeline` UI**:
   - Add `DIRECTOR MODE` (`WASD` + Mouse Look + FOV + Joint-Attach + Timeline Scrubber + `[+ CAM KEY]` / `[+ PRESET MILESTONE]` authoring + JSON save/load) and ship a rich default 96-bar keyframe & milestone sheet synced to `GantzScore.ts`.
5. **Step 5 — Visual Inspection, Test Suite, Docs & GitHub Pages Deploy**:
   - Run `npm run typecheck && npm test && npm run build`, verify in live preview (`0.0.0.0:5173`), update docs, push, and verify green GitHub Pages CI deployment.

---

## 7. Key Files Reference (Current State)

| File | Current Status & Role for V5 |
| :--- | :--- |
| `src/engine/audio/SynthRack.ts` | **KEEP** — 14 procedural voices + stereo ping-pong delay; Section IV mewing/whistling bugs fixed. |
| `src/works/gantz-tecton/GantzScore.ts` | **KEEP** — 96-bar 6-Act F-Phrygian score with complete 8-bar phrasing & smooth Act III/IV and Act V/VI bridges. |
| `src/engine/render/WebGPUStage.ts` | **KEEP** — WebGPU/WebGL2 stage + TSL Post-Processing (`lensDistort`, `glitch`, `aberration`, `bloom`, `bleachGrade`, `starkThreshold`, `grain`). |
| `src/engine/render/TSLMaterials.ts` | **KEEP & EXTEND** — PBR materials (aged horological brass, blued steel/iron, surgical chrome, glossy Cunningham ceramic, plasma filaments). Tone down global vertex twist unless `chronoShear > 0` so rigid clockwork reads crisply! |
| `src/works/gantz-tecton/HyperTectonMachine.ts` | **REPLACE IN V5** with hierarchical `ChronoAutomaton.ts` built on `KinematicRig` + `HorologicalMeshKit` (zero disembodied particle layers). |
| `src/kit/environment/SurrealCyberVault.ts` | **REFINE IN V5** — Ground the automaton with a physical horological mounting plinth / gimbal cradle / optical observatory stage instead of floating peripheral shards. |
| `src/kit/camera/CinemaDirector.ts` | **UPGRADE IN V5** into `DirectorSystem` combining `FreeFlyController` + `KeyframeTimeline` spline/cut evaluator + joint-attached cameras. |
| `src/studio/ui/StudioShell.ts` | **EXTEND IN V5** with **Director Mode Toggle**, **96-Bar Scrubber + Keyframe/Milestone Track**, and **Mechanism Articulation & Preset Drawer**. |

### V8 current files

| File | Role |
| :--- | :--- |
| `src/works/modal-flow/ModalFlowScore.ts` | 48-bar D-Lydian sections, sparse physical energy cues and scale helpers. |
| `src/works/modal-flow/ModalFlowBlueprint.ts` | 12–96 3D modules, conduits, energy sources, bindings, focus targets and routing wheel. |
| `src/works/modal-flow/ModalFlowPhysics.ts` | deterministic 3D gravity/lift/collision/queue/routing solver. |
| `src/works/modal-flow/ModalFlowComposer.ts` | physical event → rationed melodic `ImpulseEvent('physics')`. |
| `src/works/modal-flow/ModalFlowMachine.ts` | parented `KinematicRig` installation, tubes and instanced marbles. |
| `src/works/modal-flow/ModalFlowWork.ts` | audio/camera/Director integration, snapshots, growth and drone HUD. |
| `src/studio/director/FreeFlyController.ts` | `TIMELINE / FREE / DRONE / JOINT` camera with marble-following drone mode. |
| `src/studio/input/KeyboardMouseRig.ts` | live pads/punches plus `setDroneMode()` input isolation. |
| `src/main.ts` | registers V8 default, passes canvas, coordinates drone/director input. |
| `tests/v8.test.ts` | six V8 architecture, physics, composition, camera and integration tests. |
| `docs/V8_MODAL_FLOW.md` | full V8 design and authoring guide. |
