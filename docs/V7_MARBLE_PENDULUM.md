# V7 — `PENDULUM // MARBLE ENGINE`

**A blank-slate gravity instrument with a custom steel-marble physics engine.**

V7 is a deliberate reset. The V6 graph framework remains valuable as a record of machine relationships, but the new default work starts from an empty scene and rebuilds the spirit of the first pendulum demo: a simple visible cause, a simple visible effect, and a mechanism you can follow with your eyes. Wintergatan's marble machines are the primary external reference — not as a replica, but as proof that literal falling marbles, gates, funnels and lifts can be more compelling than an abstract network of modules.

---

## 1. Wintergatan research → V7 design decisions

The original Wintergatan machine is a hand-cranked music box that raises steel marbles into feeder tubes, releases them from programmable gates, drops them onto instruments such as vibraphone, bass, cymbal and contact-mic percussion, then gathers them in funnels and returns them to the top [Wikipedia](https://en.wikipedia.org/wiki/Wintergatan). Molin described the programming wheel as the key innovation: each nail/pin releases one marble at an exact time and position [NPR](https://www.npr.org/sections/allsongs/2016/03/03/469027281/be-amazed-by-this-marvelous-music-machine-powered-by-2000-marbles). Wired documents the 22-track wheel as an analog MIDI grid and notes that the marble gates — releasing one ball at a time — were the hardest mechanism [Wired](https://www.wired.com/2016/03/insanely-complex-machine-makes-music-2000-marbles/); It's Nice That quotes Molin on the 64:1 gear ratio and months spent iterating the gates [It's Nice That](https://www.itsnicethat.com/articles/wintergatan-marble-machine-270416). Dezeen covers the overall circulation: marbles queue in tubes, pegs on the wheel flick gates, spent marbles collect in funnels and return through wire tracks [Dezeen](https://www.dezeen.com/2016/03/10/marble-music-machine-wintergatan-martin-molin/).

Later generations doubled down on reliability. Hackaday reports that the third machine returned to first principles and found that removing guiding surfaces below the gate let gravity do the timing work, with an escapement arm as the final drop gate [Hackaday](https://hackaday.com/2022/10/31/dropping-marbles-with-millisecond-accuracy/). New Atlas describes MM3's single programming wheel, single collector, ring lift, governor, and foot-powered flywheel [New Atlas](https://newatlas.com/music/marble-machine-3-project-overview/). Open Culture's MMX conveyor notes describe ratchets, pistons, a fish stair and eight marbles lifted per crank turn [Open Culture](https://www.openculture.com/2019/05/behold-the-ingenious-musical-marble-machine.html). The MMX community parts list catalogs the crankshaft, flywheel, compound shaft, programming wheel, marble divider, divide-by-four transport, fish stair and conveyor belt [Wintergatan Community Wiki](https://wiki.wintergatan.community/marble_machines/mmx-s).

V7 translates those lessons into a real-time WebGPU work:

| Wintergatan lesson | V7 implementation |
| :--- | :--- |
| One pin = one timed marble | 12-lane × 64-step pinned wheel sampled from wheel angle |
| Gates are the hard part | Twelve prismatic gate joints with collision segments and lever telemetry |
| Gravity should own the drop | No guide rails between gate and instrument; free-fall is simulated |
| Marbles must recirculate | Collector trough, drain acceleration, bucket lift, top distributor, twelve queues |
| A flywheel stabilizes tempo | Beat-driven flywheel with 1:32 gear reduction and a physical pendulum governor |
| Complexity caused jams | Deterministic custom solver, queue constraints, stuck-ball recovery, jam telemetry |
| Mechanical sounds are musical | Every physical instrument collision triggers a procedural synth impulse |

---

## 2. Blank machine, kept studio

V7 does **not** instantiate the V6 graph installation. It registers a new default work while keeping all previous works selectable:

1. `PENDULUM // MARBLE ENGINE` — V7 default.
2. `ASTRARIUM // MODULAR ENGINE` — V6 graph kit.
3. `CHRONO // AUTOMATON` — V5 reference.
4. `HYPER // TECTON` — V4 legacy.
5. `PHASE // LATTICE` — original pendulum study.

The HUD, `AudioEngine`, `Clock`, `ModulationMatrix`, `WorkRegistry`, `WebGPUStage`, sensors, recorder, exporter, DirectorSystem, keyframe timeline, free-fly camera, behavior presets and patchbay all remain intact. A new `PHYSICS` tab joins the existing Director tabs.

---

## 3. Custom physics engine

`src/kit/physics/MarblePhysics.ts` is a deterministic fixed-step 2.5D solver written for this work.

### 3.1 State

- 216 steel marbles by default, each with `{ x, y, vx, vy, radius, state, spin, impactEnergy }`.
- Three states: `queued`, `free`, `lifting`.
- Twelve vertical queues with kinematic slot constraints so the machine can run continuously.
- Twelve gate obstacles, each with open/closed state, lever value, release count and jam count.
- A pendulum governor governed by a damped nonlinear ODE.

### 3.2 Integration and contacts

- Fixed substep: `1/120 s`, max 8 substeps per frame.
- Semi-implicit Euler with gravity, air damping and collector-trough drain force.
- Capsule/line-segment contacts for tube walls, gates, instrument bars, funnel floor, ramps and rails.
- Position correction, normal restitution, tangential friction and spin transfer.
- Sphere-sphere collision resolution for free marbles in the same lane.
- Instrument collisions emit `PhysicsImpactEvent` records with subsystem, pitch ratio, velocity and energy.
- Stuck marbles are recycled after a timeout; jams and lost marbles are counted, not hidden.

### 3.3 Recycling loop

```text
queue → gate release → free fall → instrument impact → funnel → bucket lift → queue
```

The lift is a kinematic conveyor along a five-point polyline. Marbles follow the same path as animated buckets, then enter the shortest available queue. This keeps the installation visually physical while staying robust enough for a live browser.

### 3.4 Macros

Ten solver macros are exposed to the modulation matrix and Physics Lab:

`gravityScale`, `marbleBounce`, `trackFriction`, `gateDuration`, `timeScale`, `releaseVelocity`, `liftSpeed`, `pendulumDrive`, `scoreBlend`, `marbleBlend`.

Sensor patches can modulate gate timing, bounce, release velocity, friction, pendulum drive and lift speed in real time.

---

## 4. Pinned programming wheel

`src/kit/physics/ProgrammingWheel.ts` stores an editable 12 × 64 F-Phrygian pattern: eight vibraphone lanes plus kick, snare, hi-hat and sizzle/cymbal lanes. One wheel revolution spans eight bars at two steps per beat.

- Pins are sampled from normalized wheel angle, not from a frame counter.
- Step crossings are detected with wrap-around handling; at most eight late steps are released after a scrub.
- `togglePin`, `exportJSON`, `importJSON`, `resetSampling` and `getPinsForStep` support live authoring.
- Pin velocity is scaled by score-section density, so Acts I–VI of the 96-bar score alter how forcefully the machine plays.

The wheel's physical gear train is a `GearRatioDriver` from the V5/V6 `KinematicRig`: one flywheel revolution per beat, 1:32 reduction to the programming wheel.

---

## 5. 3D anatomy

```text
rig:frame                         plywood A-frame, plinth, backdrop, crossbeams
├── rig:flywheel                  dark spoked flywheel + crank pin
├── rig:programWheel              64-step pinned drum, 12 track rings, instanced pins
├── rig:pendulum                  damped governor rod + brass bob
├── rig:gateBank                  12 prismatic gate levers and paddles
├── rig:instrumentBank            12 articulated bars / pads / cymbals
├── rig:trackFrame                transparent feeder tubes, rails, collector trough
├── rig:liftChain                 return path + 28 animated buckets
├── rig:marbleField               216 instanced steel marbles
└── flywheel → pendulum pitman    dynamically stretched connecting rod
```

All visible meshes have a `RigJoint` ancestor. The V7 test suite enforces zero unparented meshes before and after physics resets, marble-count changes, program imports and work disposal.

Materials deliberately return to Wintergatan's readable palette: birch plywood, dark backdrop, steel marbles, brass pins, pale drum pads and transparent feeder tubes instead of V6's dense chrome/orrery palette.

---

## 6. Causal audio

The preserved 96-bar score still runs through `evaluateGantzStepBundle`, but V7 makes the **physical collision** the primary musical event:

- Marble/instrument impacts call `AudioEngine.triggerImpulse` with velocity, pitch ratio, decay and spatial locus derived from the collision.
- Each impact also queues a sensor-origin visual event so the HUD impulse pad flashes and the governor receives a small kick.
- `SCORE ENGINE BLEND` keeps the original composition audible underneath.
- `MARBLE IMPACT BLEND` controls how hard physical impacts drive the synth.
- Live keyboard/mouse impulses release extra marbles from mapped lanes.
- The Section IV anti-mewing/humming fix is preserved exactly: strain only from intentional pointer drag; comb resonance only from held `[F]`.

---

## 7. Director Studio — `PHYSICS` tab

The Physics tab is a lab for the new machine:

- **Clickable pin grid**: 12 lanes × 64 steps; left click toggles, right click clears. The playhead follows `programStep`.
- **Solver macros**: live sliders for gravity, restitution, friction, gate duration, time scale, release velocity, lift speed, pendulum drive and audio blends.
- **Actions**: reset solver, drop 8/16/32 marbles, export/import programming-wheel JSON.
- **Part registry**: 47 physical parts with live states such as `OPEN`, `RESONATING`, `RECYCLING`, `GOVERNING`.
- **Telemetry**: free/queued/lifting marbles, active gates, impacts, releases, recycles, jams, lost balls, release jitter, governor energy and instrument energy.
- **Focus**: all five focus scales remain available through the generic camera director.

The existing `MACHINE` tab also works on V7: it shows a graph projection of the physical part registry, pin→gate relations, gate→instrument drops, recycle path and gravity/crank/governor energy sources.

---

## 8. Verification

`tests/v7.test.ts` verifies:

- Blueprint has 12 gates, 12 instruments, 12 queues, 47+ parts, 50+ segments and all five focus scales.
- Physics engine produces 100+ releases, 200+ impacts and 50+ recycles over 15 deterministic seconds with zero jams, zero lost marbles and near-zero release jitter.
- Governor energy increases after an impulse; macros clamp correctly.
- Programming wheel samples step crossings, edits pins and round-trips JSON.
- Work boots with one scene root and zero unparented meshes.
- Physics/graph snapshots expose parts, pins, macros, focus targets and telemetry.
- Live pin edits, focus changes, behavior changes, articulation edits, program import/export, solver reset, marble drops, growth and rebuild all work.
- Post-FX, ecology telemetry and metrics update after simulation.
- Disposal removes the scene root cleanly.

Full suite: `npm run typecheck && npm test && npm run build`.

---

## 9. Extension vectors

- Replace the kinematic bucket lift with fully simulated carrier constraints.
- Add raycast picking to click a 3D pin, gate, tube or instrument in the scene.
- Add user-defined instrument curves and multi-segment chutes.
- Add a timeline lane that rewrites programming-wheel pins per Act.
- Add magnetic transport and demagnetization as in MMX.
- Add mechanical failure modes: worn gates, skewed trough, off-balance flywheel.
- Export the entire physics blueprint (tracks, gates, instruments, program) as a portable machine file.
