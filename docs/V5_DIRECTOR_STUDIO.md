# V5 — Chrono Automaton & Director Studio

> **Reference work:** `CHRONO // AUTOMATON` (`chrono-automaton`) — the mechanical core preserved inside V6 `ASTRARIUM // MODULAR ENGINE`.
>
> A time-traveled, self-playing 18th-century clockwork automaton retrofitted by a 32nd-century civilization, driven by the existing 96-bar F-Phrygian score and 14-voice procedural synth. The creative reference is a *nuevo-cirque / Sans Objet* human–robotic ballet: not a particle visualizer, but an articulated body with organs, load paths, anticipation, fatigue and social coupling between mechanisms.
>
> V6 keeps this document's rig, ecology, articulation and keyframe architecture intact, and adds a generic machine graph plus a sixth `MACHINE` Director tab. See [`V6_MACHINE_BUILDING_KIT.md`](V6_MACHINE_BUILDING_KIT.md).

---

## 1. What changed from V4

V4 (`HYPER // TECTON`) placed thousands of instances on spherical formulas. It was visually dense but kinematically weightless. V5 replaces that with:

1. **A named parent-child kinematic tree.** Every visible mesh is attached to a `RigJoint`. There are no free-floating particle clouds.
2. **Analytical mechanisms.** Gears mesh by tooth ratio, cam-followers lift from physical profiles, four-bar striker rods close exactly at their pins, Geneva wheels index on the 16th-note grid, and magnetic slip-rails stretch visible plasma torque-axles.
3. **An ecological behavior layer.** Eight organ agents are coupled phase oscillators with arousal, cohesion, fatigue, curiosity, neighbor coupling and editable score→organ maps.
4. **A real director studio.** Free-flight camera, joint-attached shots, 96-bar camera/look/milestone tracks, preset A/B crossfading, live post-FX editing, behavior maps, patchbay editing and JSON project I/O.

The score, `AudioEngine`, `SynthRack`, `FractureWorklet`, and the Section IV anti-mewing fixes are preserved. V4 remains registered in the work selector for comparison.

---

## 2. Machine anatomy

| Assembly | Joint examples | What it does |
| :--- | :--- | :--- |
| **Horological plinth** | `stage` | Physical floor, bearing inlay, eight pillars, key/rim lighting. |
| **Skeletonized chassis** | `chassis`, `armorLeft`, `armorRight`, `armorPantograph*` | Cut-out bridge plates, turned pillars, jewel bearings, hinged white ceramic carapace shells on pantograph rods. |
| **Programme barrel** | `barrelCarriage`, `chronoBarrel`, `opticalReadRing`, `camFollower0..5` | Pinned brass score cylinder, cam lobes, spring-loaded followers and counter-rotating optical read-rings. |
| **Escapement train** | `mainArbor`, `innerGear`, `outerGear`, `transferGear`, `escapementWheel`, `balanceWheel`, `genevaWheel`, `chronoCage` | Rigid gear ratios, oscillating balance/hairspring, 16th-note Geneva indexer and temporal differential cage. |
| **Tuned comb banks** | `combBank0..3`, `starWheel0..3` | Fanned steel/quartz tines plucked by parented star-wheels. |
| **Striker linkages** | `strikerMount0..5`, `strikerCrank0..5`, `strikerCoupler0..5`, `strikerRocker0..5`, `hammerHead0..5` | Six exact four-bar crank-rockers with clevis rods and anvil hammers. |
| **Pneumatic organs** | `bellowsCrank0..1`, `bellowsSlider0..1`, `resonatorPipe0..1`, `irisValve0..1` | Pleated bellows, crank-slider drives, glass resonator pipes and mechanical formant irises. |
| **Future anomaly** | `fluxRail0..3` | Bearings unpin along Z rails while plasma torque-axles remain taut between fixed and moving collars. |

### Golden rule

Every mesh — including `InstancedMesh` pin arrays and plasma beams — must have a `RigJoint` ancestor. `tests/v5.test.ts` enforces this by walking the full scene graph.

---

## 3. Kinematic rig

`src/kit/mechanism/KinematicRig.ts` provides:

- `RigJoint` — revolute/prismatic/root joint with rest transform, axis, limits, optional spring-damper.
- `KinematicRig` — named joint registry, descriptors, world-position queries and composable drivers.
- `GearRatioDriver` — `childAngle = parentAngle × ratio + phase`.
- `CamFollowerDriver` — samples a cam profile against transport beats and accepts anticipation cues.
- `FourBarLinkageDriver` + `solveFourBar` — exact circle-intersection solver; crank/coupler/rocker pins coincide analytically.
- `solveCrankSlider` — exact bellows piston travel.
- `GenevaIndexerDriver` — dwell + fast indexed advance locked to the 16th grid.
- `MagneticSlipRail` — prismatic unlatching plus a unit-height cylinder beam stretched between bearing collars.

`src/kit/mechanism/HorologicalMeshKit.ts` supplies cached CAD-like geometry: toothed spoked gears with bores/lightening holes, chamfered bridge plates, cam lobes, clevis rods, tuned combs, pleated bellows, iris valves, ceramic shells and plasma axle beams.

---

## 4. Articulation & behavior ecology

`src/studio/articulation/ArticulationRig.ts` defines 12 scrubbable DOFs:

`chassisUnfold`, `armorSplit`, `barrelEngage`, `combFan`, `strikerReach`, `bellowsBreathing`, `irisAperture`, `magneticUnpin`, `chronoShear`, `overclockSpeed`, `camAnticipation`, `tetherTension`.

Six behavior generators shape the coupled ecology:

`PRECISION_ESCAPEMENT`, `BARREL_AUTOMATON_PLAY`, `PENDULUM_BREATH`, `ZERO_G_DISASSEMBLY`, `OVERCLOCK_CADENZA`, `BROKEN_MAINSPRING`.

`MechanismEcology.ts` models eight organ agents (`escapement`, `barrel`, `strikers`, `combs`, `bellows`, `iris`, `armor`, `flux`) as coupled oscillators. Score/live `ImpulseEvent`s enter via editable behavior maps, excite local organs, raise global arousal, accumulate fatigue and alter cohesion. This is what makes the machine feel less like a set of independent LFOs and more like a body with a nervous system.

`BehaviorPresetBank.ts` ships eight authored milestones (`M1` sealed reliquary → `M8` wound-down reliquary) and supports duplicate, merge-import, export and A/B crossfading.

---

## 5. Director Studio

Open with the **Backquote** key (`` ` ``) or the `DIRECTOR [`]` button.

### Camera modes

| Mode | Controls |
| :--- | :--- |
| **TIMELINE** | Authored camera keyframes drive the shot. |
| **FREE FLY** | `W/A/S/D` move, `E/Q` rise/fall, `Z/X` roll, `0` or double-click levels horizon, mouse-drag looks, wheel adjusts FOV. `Shift` = 3× speed, `Alt` = 0.2× precision. |
| **JOINT LOCK** | Orbit any named rig bearing from the `ATTACH TO JOINT` selector; wheel changes both FOV and orbit radius. |

Performance pad keys are suspended while Director Studio is open, but `SPACE` still toggles transport and `TAB` still hides the performance HUD.

### Tabs

- **SHOTS** — list/select 24 default camera keys; edit beat, label, world/local position, target, FOV, roll, interpolation (`CUT`, `SMOOTH_SPLINE`, `ORBIT_ARC`, `VERTIGO`) and optional joint attachment.
- **LOOKS** — live sliders for all seven `PostFxState` fields; add/update/delete look keyframes or release back to the authored look track.
- **CONFIG** — 12 articulation DOFs, behavior generator selector, live preset A/B crossfader, and a machine milestone editor.
- **MAPS** — editable score→organ behavior maps plus the live `ModulationMatrix` patchbay.
- **PROJECT** — import/export the whole director project or just the preset bank, and restore the default film.

### Timeline dock

Three clickable tracks span 96 bars:

- `CAM` diamonds = camera keyframes.
- `LOOK` diamonds = post-FX keyframes.
- `MCH` diamonds = machine preset milestones.

Click empty track to scrub; click a diamond to jump to and select it. `+ CAM KEY [K]`, `+ LOOK KEY [L]`, and `+ MILESTONE [M]` drop edits at the playhead. `DELETE SELECTED` removes the current selection.

### Default film

The shipped project contains:

- **24 camera keyframes** with cuts, Catmull-Rom splines, orbit arcs, Vertigo zollys and joint-attached macro shots.
- **8 look keyframes** from cold reliquary to cadenza tear and final lock.
- **10 machine milestones** blending the eight presets across Acts I–VI.
- **14 behavior-map rows** covering all synthesis subsystems.

Everything is editable and exportable as one JSON director project.

---

## 6. Integration points

- `src/main.ts` registers `ChronoAutomatonWork` as default, retains `GantzWork` and `LatticeWork`, creates the global `DirectorSystem`, and calls `director.update()` after `activeInstance.update()` so the director can override camera/post-FX last.
- `src/engine/core/types.ts` adds optional `DirectorWorkHooks` to `WorkSceneInstance`, allowing any future work to expose articulation, joints, behavior and ecology without coupling the engine to a specific work class.
- `src/studio/director/KeyframeTimeline.ts` is UI-independent and unit-tested.
- `src/studio/director/FreeFlyController.ts` owns 6-DOF input only when the director is enabled.
- `src/studio/director/DirectorSystem.ts` is the only place that coordinates timeline, presets, UI, camera, post-FX, work hooks and transport scrubbing.

---

## 7. JSON workflows

Export from **PROJECT**:

- `sonobjet-director-project.json` — camera keys, look keys, milestones, behavior maps, bars and BPM.
- `sonobjet-machine-presets.json` — full preset bank, including user duplicates.

Imports are validated and normalized. Missing tracks fall back to defaults; a zero-beat key is inserted if the first imported key starts later. Preset imports merge by default so existing milestone IDs remain valid.

---

## 8. Verification

```bash
npm run typecheck
npm test           # 22 passing: 12 legacy + 10 V5
npm run build
npm run dev        # 0.0.0.0:5173
```

The V5 tests verify linkage pin coincidence, gear ratios, cam anticipation, Geneva indexing, plasma axle length, geometry construction, ecological excitation/fatigue, preset blending, timeline interpolation, JSON round-trip, work lifecycle, director hooks and the zero-unparented-parts invariant.
