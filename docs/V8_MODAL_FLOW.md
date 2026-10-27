# V8 — `MODAL FLOW // PHYSICS SONG`

**Status:** implemented and verified on `arena/23eed999-sonobjet`.  
**Default work:** `MODAL FLOW // PHYSICS SONG` (`?work=modal-flow`).  
**Preserved references:** V7 `PENDULUM // MARBLE ENGINE`, V6 `ASTRARIUM // MODULAR ENGINE`, V5 `CHRONO // AUTOMATON`, V4 `HYPER // TECTON`, and `PHASE // LATTICE`.

---

## 1. Why V8 exists

V7 proved that a custom marble solver could produce visible cause and effect, but it remained a mostly 2.5D twelve-lane gate sheet and generated too many overlapping events. V8 answers the user's redesign brief directly:

- **Depth over lanes.** The old gate bank is now one 3D module among twenty spatially arranged units at multiple elevations, with transparent curved conduits, tubes, lifts, funnels, bowls, chimes, drums and satellite resonators.
- **Physics as composer.** The 96-bar F-Phrygian score is no longer the main event source. A new 48-bar D-Lydian composition is assembled from real solver events: releases, lift impulses, flow, diverter decisions, gate openings, instrument strikes, marble collisions, returns and recycles.
- **Rationing over overwhelm.** An 8×32 routing wheel controls **flow**, not a dense note grid. A phrase gate limits audible events to roughly 2 notes/second, enforces rests after every phrase, applies per-module cooldowns and spreads notes across registers and timbres.
- **Camera freedom.** A new drone mode adds inertial, banked, marble-following flight to both the main HUD and Director Studio, while preserving all existing multi-scale cinematic focus shots.
- **Growth.** The installation is generated from a modular blueprint that scales from 12 to 96 units. The `MACHINE` tab can grow or rebuild it live.

The design keeps the spirit of the first simple pendulum demo: one visible cause, one visible effect, repeated until it becomes music.

---

## 2. New composition

`ModalFlowScore.ts` defines a **48-bar, 132 BPM, six-section D-Lydian film**:

| Section | Bars | Intensity | Physical narrative |
| :--- | :--- | :--- | :--- |
| I. WIND THROUGH EMPTY PIPES | 0–8 | 0.22 | crank, governor and a few low marbles wake the room |
| II. THE FIRST MARBLE | 8–16 | 0.44 | helix lift catches; first sparse phrase appears |
| III. AQUEDUCT CANON | 16–24 | 0.66 | diverter, chime and resonator modules answer each other |
| IV. GATE BANK MINUET | 24–32 | 0.80 | the legacy twelve-lane gate bank becomes one 3D module |
| V. RESONATOR CHORUS | 32–40 | 1.00 | satellite resonators join; brightest register, still rationed |
| VI. RETURN TO THE SOURCE | 40–48 | 0.34 | collector and return spiral dominate; theme dissolves |

The scale is **D Lydian** (`D E F♯ G♯ A B C♯`, root MIDI `50`). Six eight-step theme phrases are stored as scale-degree contours, not scheduled notes. `evaluateModalFlowEnergyCue()` emits only two sparse governor energy cues per bar. Those cues are queued as visual events with `origin: 'score'`; `triggerImpulse()` interprets them as **actuator energy**, not sound. No score event directly plays a melody voice.

### Causal audio chain

```text
transport section → sparse energy cue → physics.injectEnergy()
                                      ↓
                          deterministic 3D marble solver
                                      ↓
      release / lift / flow / divert / gate / strike / collision / return
                                      ↓
                          ModalFlowComposer phrase gate
                                      ↓
              allowed event → pitched ImpulseEvent('physics')
                                      ↓
                    AudioEngine.triggerImpulse(14-voice synth)
```

Live keyboard/mouse/sensor pads also inject energy into named modules. They receive a tiny `piston-snap` actuator click for feedback, but the song remains solver-generated. `larynx-lead` and `bellows-choir` are deliberately excluded to preserve the Section IV anti-mewing/humming fix.

---

## 3. Physics-generated composition: `ModalFlowComposer.ts`

The composer is the strategic instrument designer. It receives every `PhysicsSongEvent` and decides whether it becomes sound:

- **Event weight:** strikes and gates are preferred; flow/return/recycle events are mostly dropped.
- **Energy threshold:** weak mechanical chatter below `0.1–0.26` expression is silent.
- **Global budget:** `0.85 + 1.9 × phraseDensity` notes/second maximum; default is about `2.03/s`.
- **Module cooldown:** `0.26 + (1 − density) × 0.48` seconds per module.
- **Phrase rests:** after `5–9` notes, a `0.95–2.2s` pause and the next theme phrase begins.
- **Pitch:** theme degree + physical jitter + collision/lift/section displacement, quantized through `modalFlowDegreeToMidi()`.
- **Register:** elevation maps to octave shift `−1…+2`, scaled by `registerSpread`.
- **Velocity / decay / duration:** impact energy, score intensity and `timbreBloom`.
- **Timbre:** module identity and event kind choose among `modal-clang`, `glass-armonica`, `fin-cascade`, `core-implode`, `arc-discharge`, `piston-snap`, `sub-rupture` and `glitch-chirp`.
- **Spatial locus:** real 3D event position normalized to `[-1, 1]`.

The result is a **new melody** that cannot exist without the marble physics: changing gravity, gate duty, lift torque, routing pins or module count changes the song.

---

## 4. Deterministic 3D solver: `ModalFlowPhysics.ts`

The solver is pure TypeScript and DOM-free, so it is unit-testable in Node. It uses a fixed `1/90s` substep with an accumulator and a deterministic Mulberry32 hash for routing.

### Conduit integration

`createConduitSampler()` builds shared 3D curves for the solver, tube meshes and camera endpoints. Curves can be `straight`, `arc`, `sag` or `helix`. For each marble on a conduit:

- Descending edges conserve gravitational potential: `v = √(v₀² + 2gΔy)` with small friction and a minimum speed.
- `lift` edges are motorized: `v = 0.95 × liftTorque × edge.speed`.
- Progress advances by `v · dt / curveLength`.
- Marble energy is derived from speed and potential drop.
- Edge flow is accumulated for graph telemetry and camera focus.

### Physical events

| Event | Cause | Musical role |
| :--- | :--- | :--- |
| `release` | source reservoir releases a marble | low-weight phrase pickup |
| `lift` | flywheel / helix arrival | low-register pulse |
| `flow` | aqueduct arrival | mostly silent motion |
| `divert` | three-way diverter arrival | glitch/chirp color |
| `gate` | pinned escapement opens | mid-register articulation |
| `strike` | tine / bowl / chime / drum / satellite impact | primary melodic note |
| `collision` | same-conduit marbles enforce minimum gap | metallic grace note |
| `return` / `recycle` | collector / return spiral | low-weight cadence |
| `energy` | live pad or scheduled governor cue | actuator accent |
| `jam` | closed escapement queue | reserved for failure modes |

Marbles queue at a closed gate and retry after a short deterministic wait. The gate opens only when the routing wheel pin is active and the rotating escapement window is within `gateDuty`. Same-edge collisions enforce a minimum gap and transfer average speed with restitution. A damped pendulum governor ODE modulates drive and telemetry.

### Guarantees from tests

- Deterministic event sequence for identical seed and step schedule.
- Zero lost marbles over a 15-second simulated run.
- Active flowing marbles, gate events, lift events, strike events, collision events and recycles all occur.
- A lead marble is always available for camera follow.
- Program JSON round-trips and macro/binding edits are live.

---

## 5. Modular 3D blueprint: `ModalFlowBlueprint.ts`

The first twelve modules are fixed:

| # | Module | Role |
| :--- | :--- | :--- |
| 1 | `source-reservoir` | queued marble source and final return |
| 2 | `crank-flywheel` | human/flywheel prime mover |
| 3 | `helix-lift` | motorized vertical ascent |
| 4 | `upper-aqueduct` | high gravitational head |
| 5 | `tri-diverter` | many-to-many routing hub |
| 6 | `gate-bank` | the preserved V7 twelve-lane gate bank as one module |
| 7 | `vibraphone-tines` | primary pitched strike bank |
| 8 | `resonator-bowl` | sustained bright bowl |
| 9 | `chime-orchard` | high register tubes |
| 10 | `drum-ring` | low percussion |
| 11 | `collector-funnel` | recycle basin |
| 12 | `return-conduit` | spiral return to source |

Additional units are generated as **satellite resonators** on a golden-angle spiral. Each has an input conduit from the diverter, an output to the collector, and a resonant link to the next satellite. The blueprint scales to `96` modules.

Energy sources and score bindings are many-to-many: crank torque, gravity head, flywheel inertia, governor time, marble flow, bowl resonance, chime feedback and return pressure bind to modules, phrase density, register spread, timbre bloom and camera follow. Focus targets cover `MACRO`, `CLUSTER`, `MODULE`, `PORT`, and `CONDUIT`.

The routing wheel is `8 lanes × 32 steps`:

| Lane | Label | Destination |
| :--- | :--- | :--- |
| 0 | LIFT / GOVERNOR | gate path |
| 1 | AQUEDUCT | gate path |
| 2 | GATE BANK A | gate path |
| 3 | GATE BANK B | chime path |
| 4 | CHIME ORCHARD | chime path |
| 5 | DRUM RING | drum path |
| 6 | RESONATOR FIELD | satellite path |
| 7 | SILENT BYPASS | collector path |

Pins control **where marbles go**, not which note plays. This is the main anti-overwhelm mechanism.

---

## 6. Parented machine: `ModalFlowMachine.ts`

All geometry is built from `KinematicRig` joints. The root is explicitly named `rig:root` so every mesh can be proven parented.

Joint families:

- `chassisFrame`, `conduitFrame`, `marbleFrame`
- `module:<id>` for each 3D unit
- `port:<id>` for each module port
- `joint:flywheel`, `joint:liftAuger`, `joint:diverterRotor`, `joint:gateEscapement`
- `joint:hammer:<id>` for instrument modules

`GearRatioDriver` links flywheel rotation to the helix auger and gate escapement. Conduits are transparent `TubeGeometry` shells with glowing inner filaments, all parented to `conduitFrame`. Marbles are one `InstancedMesh` parented to `marbleFrame`, updated from solver positions every frame. Module rings glow with live module energy; hammers are prismatic joints that lift on impact.

Module kinds have distinct geometry: funnels, flywheel with spokes, helix auger beads, aqueduct trough, three-arm diverter, twelve-rod gate bank, tine bars, resonator bowls, chime tubes, drum ring, return spiral and satellite pods.

---

## 7. Camera: drone + cinematic freedom

### Main HUD camera modes

`WorkDefinition.cameraModeLabels` gives V8 its own labels:

- `0` — Auto multi-scale marble-follow (`MachineCameraDirector`)
- `1` — **DRONE PILOT** (work-owned `FreeFlyController`)
- `2` — Upper cluster
- `3` — Gate bank
- `4` — Resonator field
- `5` — Helix lift
- `6` — Chime orchard
- `7` — Conduit track
- `8` — Return spiral

### Drone controls

| Input | Action |
| :--- | :--- |
| `W A S D` | inertial forward / strafe |
| `E Q` | rise / fall |
| `Z X` | Dutch roll |
| Pointer drag | look |
| Wheel | speed and FOV / follow distance |
| `Shift` / `Alt` | boost / precision |
| `F` | marble lock on/off |
| `V` | cinematic drift on/off |
| `C` | cycle follow distance |
| `0` | level horizon and clear follow offset |
| Double-click | level horizon |

`FreeFlyController` DRONE mode adds spring-damped velocity, banked turns, small cinematic drift, follow-offset steering and a target lock to the most energetic marble. `KeyboardMouseRig.setDroneMode()` suspends live pads/punches in this mode. `WorkSceneInstance.setDirectorEnabled()` suspends the work drone while Director Studio is open. Director Studio itself has a fourth camera mode button, `DRONE PILOT`, which uses the same controller and receives `getCameraFollowTarget()` from the active work.

---

## 8. Director Studio authoring

V8 implements the generic graph and physics hooks, so both existing tabs remain useful without V8-specific UI code:

- **MACHINE tab:** live graph canvas, 20+ modules, 18+ typed conduits, eight energy sources, sixteen bindings, ten macros, five focus scales, binding weight edits, focus selection, growth/rebuild and graph JSON I/O.
- **PHYSICS tab:** 8×32 routing-wheel pin grid, ten solver/composition macros, physical part registry including transmission joints, focus selector, marble drop/reset, program JSON I/O, and live telemetry.
- **Director tabs:** free fly, drone pilot, joint lock, camera/look/milestone keyframes, looks/effects, configurations/presets, behavior maps, patchbay and project I/O all remain available.

`growMachine(count)` and `rebuildMachine(moduleCount)` recreate the blueprint, solver, composer and machine while preserving the routing program and binding edits. Tests assert zero unparented visible meshes before and after rebuild.

---

## 9. Engine contract changes

Small generic additions keep V8 isolated from the rest of the engine:

- `ImpulseEvent.origin` adds `'physics'`.
- `WorkRuntimeContext.canvas` is optional and is passed from `WebGPUStage` in `main.ts`.
- `DirectorWorkHooks.getCameraFollowTarget()` feeds Director drone mode.
- `WorkSceneInstance.setDirectorEnabled()` suspends work-owned camera controllers.
- `WorkDefinition.cameraModeLabels` customizes HUD camera buttons.
- `KeyboardMouseRig.setDroneMode()` suspends performance pads during drone flight.
- `FreeFlyController` gains `DRONE`, `setFollowTarget`, `setDroneTuning`, `getDroneState`, `orbit`, and `zoom`.
- `DirectorStudioUI` gains a `DRONE PILOT` mode button and updated help text.

No prior work was removed. V4's Section IV anti-mewing/humming fix remains intact; V8 additionally avoids the humming voices entirely.

---

## 10. Verification

- `npm run typecheck` — 0 errors.
- `npm test` — 35/35 passing: 12 engine + 10 V5 + 3 V6 + 4 V7 + 6 V8.
- `npm run build` — clean production bundle.
- `git diff --check` — clean.
- V8 tests cover: new 48-bar D-Lydian composition, 32-module blueprint, all five focus scales, deterministic 15-second physics, zero lost marbles, strike/gate/lift/collision/recycle events, sparse phrase rationing, scale membership, no humming voices, parented meshes, graph/physics snapshots, routing/program/config round-trips, live growth, drone mode toggles and clean disposal.
- Local Vite preview verified on `0.0.0.0:5173`.

---

## 11. Extension vectors

- Add true sphere-vs-tube contact instead of progress-based conduit following.
- Add mechanical failure modes: worn gates, skewed troughs, off-balance flywheel.
- Add raycast picking for modules, ports and conduits.
- Add user-defined module templates and inter-module resonant coupling.
- Add timeline lanes that rewrite routing pins per section.
- Add audio-domain ports that modulate synth buses from live graph energy.
- Add multi-drone camera choreography and camera keyframes that interpolate drone state.
- Export the full 3D blueprint as a portable machine file.
