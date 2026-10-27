# V6 — `ASTRARIUM // MODULAR ENGINE`

**Machine-building kit, many-to-many score ecology, and multi-scale director focus.**

V6 keeps `CHRONO // AUTOMATON` as a load-bearing reference assembly and grows it into a modular installation: 72 addressable modules by default, 216+ typed conduits, 12 independent energy sources, 20 score bindings, and focus targets at **macro / cluster / module / port / conduit** scale. The same deterministic generator can rebuild the installation at 12–256 modules without touching the preserved 96-bar score or the procedural audio engine.

Creative references: Wintergatan marble machines, Animusic self-playing instruments, Merlin/antique automata, Central European clockwork organs, and celestial orreries.

---

## 1. Why this is not a particle system

Every visible part is attached to a named `RigJoint` in a load-bearing tree:

```text
rig:root
└── rig:macroFrame                 load-bearing outer orrery frame + plinth
    ├── rig:cluster:*               ten counter-rotating cluster rings
    │   └── rig:module:*            addressable module chassis
    │       ├── rig:module:*:train  gear-ratio-coupled transmission
    │       │   └── rig:module:*:rotor  archetype organ / moving mechanism
    │       └── rig:module:*:port:* typed input, output, vent and data ports
    └── v5 reference automaton      preserved CHRONO // AUTOMATON rig
└── rig:conduitFrame               instanced ducts + flow beads
```

The V6 test suite enforces the same golden rule as V5: **zero meshes without a `RigJoint` ancestor**. Conduits are not floating lines; they are instanced cylindrical duct segments and flow beads under `rig:conduitFrame`, with endpoints sampled from moving module and port joints each frame.

---

## 2. Generic machine graph

`src/kit/machine/MachineGraph.ts` is a directed, weighted, typed graph:

- **Modules** have an archetype, cluster, scale, tags, capacity, threshold, base frequency, and four typed ports.
- **Ports** are `mechanical | pneumatic | optical | magnetic | marble | audio | data`, with direction and local position.
- **Edges / conduits** are `MECHANICAL | PNEUMATIC | OPTICAL | MAGNETIC | MARBLE | AUDIO | DATA`, each with a nonlinear transfer mode: `LINEAR | GATE | RESONANT | TURBULENT | RATCHET`.
- **Energy sources** use `CONTINUOUS | PULSE | BAR | BEAT | CHAOTIC` waveforms and feed one or more cluster entry points.
- **Score bindings** are selectors, not indices. A binding can target tags, clusters, archetypes, explicit ids, scale ranges, and a limit. A single score aspect can excite dozens of modules; a single module can receive many independent aspects.
- **Focus descriptors** describe camera/narrative targets at `MACRO`, `CLUSTER`, `MODULE`, `PORT`, or `CONDUIT` scale. Conduit focus uses an edge id and follows its moving endpoints.

The graph owns simulation state: energy, activation, fatigue, phase, flow, arousal, cohesion, curiosity, and pending score events. It supports live binding edits, whole-config replacement, JSON export/import, and selector cardinality queries for tests and telemetry.

### No 1-to-1 score mapping

A fixed instrument map would be `subsystem → part`. V6 instead uses:

```text
score aspect / origin / velocity threshold
        ↓  weighted selector binding
many modules (tags ∩ clusters ∩ archetypes ∩ scale)
        ↓  typed conduits with nonlinear transfer
many downstream modules and energy states
        ↓  graph phase / fatigue / flow
rig joints, organ rotors, port collars, conduit flow, camera focus
```

Examples in the default configuration:

- `score.intensity` excites every energy-tagged module.
- `beat` excites percussive modules across several clusters.
- `bar` phase-shifts the optical orrery and magnetic flux duct clusters.
- `sub-rupture` fans out to marble, pneumatic and gear-tag modules.
- `origin:keyboard` shifts focus toward live marble and comb modules.
- `any` adds a low-weight focus bias to every resonant part.

The result is a many-to-many relation network, not a drum machine with one mesh per note.

---

## 3. Deterministic installation generator

`src/kit/machine/OrreryFactoryConfig.ts` builds the default installation.

- **Default:** 72 modules, 216 conduits, 12 sources, 20 bindings, 10 focus targets.
- **Maximum:** 256 modules, 768 conduits; the Director UI can rebuild at 48 / 96 / 144 / 192 / 256.
- **Ten clusters:** V5 reference, mainspring gallery, escapement lawn, marbleworks ring, pneumatic ducts, Central European organ, tuned comb choir, celestial orrery, magnetic flux ducts, peripheral data mill.
- **Nine generated archetypes + two V5 reference cores:** gear trees, escapements, marble gates, bellows, pipe organs, tuned combs, iris valves, flux coils, orrery arms, plus two `CHRONO_CORE` reference modules.
- **Energy sources:** V5 barrel, dual mainsprings, escapement, marble lift, wind reservoir, organ wind, comb resonance, photonic arc, flux inductor, data lattice, gravity well.
- **Conduits:** each module has three outgoing relations (local neighbor, mid-ring jump, cross-cluster return), producing a dense but deterministic small-world network.

`MachineGraph.parseConfig()` normalizes imported JSON, filters edges whose endpoints are missing, preserves focus descriptors, and can be used by other works.

---

## 4. 3D assembly

`src/works/astrarium-modular-engine/ModularMachine.ts` owns the visual installation.

- **Macro frame:** giant orrery rings, radial beams, vertical columns, central torque axle, sun gear, plinth.
- **Cluster rings:** each cluster is a `revolute` joint with two physical rings and radial spokes. Cluster rotation is driven by global graph phase.
- **Modules:** each module is a `root` joint with a bridge chassis, bearing axle, gear-train joint, organ rotor, and typed port collars.
- **Transmission:** `GearRatioDriver` couples each module's gear train to its parent cluster ring. Graph energy and phase drive the organ rotor.
- **Organs:** archetype-specific geometry — gears, pallet forks, marble tracks, bellows, organ pipes, comb tines, iris blades, flux coils, orrery arms, V5 reference towers.
- **Conduits:** two bent cylinder segments per edge, colored by edge kind, plus two additive flow beads per edge that travel at `flowRate` and brighten with live edge flow.
- **V5 reference:** a scaled `ChronoAutomaton` instance is parented to the macro frame. It still receives score impulses, anticipations, articulation state and behavior maps.
- **Ecology:** `MechanismEcology` remains coupled to the eight organ agents; graph arousal/cohesion/fatigue/curiosity are exposed alongside it.

### Live rebuild

`growMachine(count)` and `rebuildMachine(moduleCount)` regenerate modules, ports, gear trains, conduits, sources, bindings and focus descriptors from the deterministic generator. The V5 reference automaton is retained and re-parented to the new macro frame. `importGraphConfig(raw)` rebuilds from an arbitrary normalized graph JSON.

---

## 5. Multi-scale camera director

`src/works/astrarium-modular-engine/MachineCameraDirector.ts` replaces fixed shot targets with focus descriptors.

| Scale | Camera behavior |
| :--- | :--- |
| `MACRO` | Wide orbit around the whole orrery, FOV opens with graph arousal. |
| `CLUSTER` | Tracks a named cluster joint and orbits its ring. |
| `MODULE` | Close orbit around one addressable module joint. |
| `PORT` | Extreme macro on a typed port joint with low roll drift. |
| `CONDUIT` | Frames the live midpoint and tangent of one edge, following both moving endpoints. |

Mode `0` auto-cycles focus targets every six bars. Modes `1–8` lock the first eight focus targets. Selecting a focus target in the Director UI calls `setFocusTarget()` and holds that target until the camera mode changes.

---

## 6. Director Studio — `MACHINE` tab

The Director Studio gains a sixth tab. It is available through the backquote `` ` `` toggle.

### Live graph map

A canvas mini-map draws modules as deterministic nodes, conduits as flow-weighted lines, and highlights the active focus module. It updates from the live `MachineGraphSnapshot`.

### Authoring controls

- **Focus target select** grouped by scale, plus one-click scale buttons.
- **Graph macros:** network coupling, flow rate, source turbulence, narrative scale, module density/load, focus drift.
- **Many-to-many bindings:** change mode, weight, and enabled state for all 20 bindings.
- **Live growth:** `+8`, `+16`, `+32`, double installation, and full rebuilds at 48 / 96 / 144 / 192 / 256 modules.
- **Machine graph I/O:** export or import the entire installation JSON.
- **Telemetry:** top modules by energy, active conduits by flow, prime movers by output.

The original `SHOTS`, `LOOKS`, `CONFIG`, `MAPS`, and `PROJECT` tabs remain intact. The `MACHINE` tab works through generic `DirectorWorkHooks`; legacy works without a graph receive a clear message.

---

## 7. Work registration and preserved constraints

`src/main.ts` registers, in order:

1. `ASTRARIUM // MODULAR ENGINE` — default.
2. `CHRONO // AUTOMATON` — V5 reference work.
3. `HYPER // TECTON` — V4 legacy.
4. `PHASE // LATTICE` — legacy.

Use `?work=chrono-automaton`, `?work=hyper-tecton`, or `?work=lattice-pendulum` to load earlier works directly.

Preserved:

- 96-bar F-Phrygian score and 14-voice procedural synth.
- Section IV anti-mewing/humming fix: strain only from intentional pointer drag, comb resonance only from actively held `[F]`.
- V5 kinematic rig, behavior ecology, articulation DOFs, preset bank, keyframe timeline, free-fly camera, post-FX pipeline.
- V4 works remain selectable.

---

## 8. Verification

`tests/v6.test.ts` verifies:

- 72-module default blueprint with 216+ conduits, 12 sources, 20 bindings, 10 focus targets.
- All five focus scales and all five transfer/binding/energy waveform families.
- Many-to-many fan-out and fan-in cardinality; no fixed 1-to-1 score-to-part mapping.
- Energy propagation, binding edits, config JSON round-trip, live `replaceConfig`.
- Scaling from 12 to 256 modules.
- Zero unparented visible meshes in the assembled work.
- Graph macro/binding/focus authoring, live growth, rebuild, import, disposal.
- V5 and engine suites remain green.

Run:

```bash
npm run typecheck
npm test
npm run build
```

---

## 9. Extension vectors

- Add user-authored module templates and a visual node editor for selectors.
- Persist graph configs in the Director project JSON alongside shots and presets.
- Add raycast picking for ports/conduits in the 3D view.
- Add audio-domain ports that modulate actual synth buses from graph flow.
- Add kinematic marble physics along conduit curves.
- Add cluster-level behavior presets that rewire edge transfer modes over the 96-bar timeline.
