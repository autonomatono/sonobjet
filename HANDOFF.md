# Session Handoff & Architectural Blueprint — `sonobjet`

> **Purpose:** Detailed end-of-session handoff so the next session can pick up immediately with full technical context, the preserved Section IV "mewing/humming" audio fix, the V5 articulated automaton reference, and the current V6 machine-building kit.

---

## 0. Latest Update — V6 Machine-Building Kit Implemented & Deployed (2026-10-27)

**Current default flagship:** `ASTRARIUM // MODULAR ENGINE` (`src/works/astrarium-modular-engine/`). V5 `CHRONO // AUTOMATON` remains registered and is nested as the load-bearing reference core. V4 `HYPER // TECTON` and `PHASE // LATTICE` remain selectable.

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

## 0.1 Prior Update — V5 Blueprint Implemented (2026-10-27)

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
- **Current Verification Status (V6):**
  - `npm run typecheck` (`tsc --noEmit`): **0 errors**
  - `npm test` (`vitest run`): **25 / 25 passing** (12 engine + 10 V5 + 3 V6)
  - `npm run build` (`vite build`): **Clean production bundle** (offline MediaPipe WASM included)
  - `git diff --check`: **clean**
  - Last implementation commit: `847e572`; last green Pages run: `40534323841` (`https://autonomatono.github.io/sonobjet/`)

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
