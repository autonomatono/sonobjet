# Architecture — `sonobjet` Engine, V4–V11 Works

## 1. Design Philosophy: Non-Euclidean Causal Sound-Objects

`sonobjet` treats a scene as a **living, surreal electromechanical performance** rather than an FFT visualizer or a literal simulation of historic hardware:

1. **Coupled Multi-Scale State Machines**: Global Macro-Morphology states reconfigure the entire megastructure across impossible topological geometries while 16 independent Fault-Cluster sub-state machines react locally to individual percussion, harmonic, acid, and glitch impulses.
2. **Non-Euclidean GPU Vertex Deformation**: Laws of rigid-body geometry are intentionally transcended — TSL vertex shaders (`positionNode`) twist, shear, and ripple thousands of instanced ceramic and chrome structures directly on the GPU in tandem with CPU state-machine kinematics.
3. **Through-Composed Hypermetric Musical Form**: Every section completes its full harmonic and melodic cycles (`8`-bar F-Phrygian Polychord & Aria cycles across a `96`-bar 6-Act score) with sculpted bridge handoffs and cadential drum/glitch rolls.
4. **State-Coupled Camera & Stylized Optical Post-Processing**: Camera trajectories continuously follow the machine's live bounding envelope (`envelopeRadius`, `interiorRadius`, `verticalSpan`, `primaryBoomTip`) through TSL lens distortion, scan-band glitch tears, RGB chromatic aberration, and Cunningham bleach-bypass color grading.

---

## 1.8 V11 Additions — Quantized Physics, Live Light & Spatial Variations

V11 preserves the chosen V10 implementation at annotated tag `v0.1.3` (`space pinball`) and extends the shared Modal Flow runtime rather than forking its causal model.

### Timing boundary

`eventQuantize` defaults on. Unscripted physics events calculate their next work-specific transport unit with `quantizePhysicsAudioTime()`, then pass that future WebAudio time into the composer. Physics/rig actuation remains immediate; only the note onset waits. Sequenced events are already aligned, while `glitch-chirp`, `arc-discharge` and held time-fracture effects intentionally bypass the grid. `U` and the top-bar `GRID / FREE` control change the macro at runtime.

```text
free marble/mechanism event at beat b
  ├─ visual physics + rig actuation now
  └─ GRID: ceil(b / grid) × grid → future AudioContext time → composer/audio
     FREE: current AudioContext time + safety offset → composer/audio
```

### Light/atmosphere boundary

`ModalFlowMachine` samples every conduit curve for additive liquid-neon packets. `ModalFlowMechanismLayer` adds eight independent chromatic movers (four point, four spot), visible additive spot volumes, per-vertex charge colors, a responsive constellation, deforming Tesla lines and musical fireflies. All objects remain under the shared `KinematicRig`; event count controls intensity/opacity while each theme retains several simultaneous colors.

### New work variants

```text
src/works/
├── spatial-sequencer/
│   ├── SpatialSequencerBlueprint.ts # shared legible/glacial 18–40 node graph family
│   ├── SpatialTranceScore.ts        # 126 BPM / 48-bar explanatory trance score
│   ├── SpatialTranceWork.ts         # LUMEN GRID variant
│   ├── AntarcticScore.ts            # 54 BPM / 48-bar sparse pentatonic ambient score
│   └── AntarcticWork.ts             # ANTARCTICA variant
└── braindance-collider/
    ├── BraindanceBlueprint.ts       # 40-node nonlinear Space Pinball transform
    ├── BraindanceScore.ts           # 188 BPM / 72-bar co-prime break/acid program
    └── BraindanceWork.ts            # CHAOS VECTOR variant
```

`NeonPinballComposer` now accepts `breakcore`, `trance`, `chaos` and `ambient` composition characters. They alter only physical-event rationing, velocity and decay; all sequenced metadata still crosses `ModalFlowPhysics` first. Physical chord metadata now traverses cue → `ImpulseEvent` → `PhysicalActuation` → `PhysicsSongEvent` so Antarctica's long underwater harmonies retain the same causal route.

`body.performance-clean` is the all-UI-off state. The Studio HUD, Director and work Drone HUD disappear, while input/sensor polling and the audiovisual runtime continue. Enabling Director exits this state to prevent invisible input capture.

See [`V11_SPATIAL_VARIATIONS.md`](V11_SPATIAL_VARIATIONS.md) for complete work and verification contracts.

---

## 1.7 V10 Additions — Spatial Pinball Computer & Physical Breakcore

The current default, `NEON PINBALL // BREAKCORE COMPUTER`, is a V10 variant of the reusable Modal Flow runtime. It replaces V9's floor-aligned decks and nearby Cornell enclosure with a 32-module open spatial graph: independently rotated organs, deterministic arbitrary-orientation ports, helical/weaving 3D conduits, compact gimbals, a sparse radial chassis, distant shadow sails and a 960-point reactive charge field. V9 remains registered unchanged through the same variant boundary.

```text
src/works/neon-pinball/
├── NeonPinballBlueprint.ts  # 32-module spatial graph, open stage, transmissions, routing and bindings
├── NeonPinballScore.ts      # deterministic 174 BPM / 64-bar physical actuator program
├── NeonPinballComposer.ts   # physics-event → breakcore/IDM/DnB ImpulseEvent mapper
└── NeonPinballWork.ts       # Modal Flow variant, section looks, camera focuses and defaults
```

V10 extends the reusable mechanism renderer with `ratchet`, `music-box`, `bell-crank` and `solenoid` transmissions. Ratchets, curved bell rows, percussion cells, a pinball switchyard, crystal memory, a pinned-cylinder data loom, patch-computer organs and sound-reactive neon all expose named rig joints and are advanced by physical state rather than decorative wall time.

The score is a mechanical addressing program. Each cue names a physical target and optional break-slice, reverse, ratchet and pitch metadata. The work injects that command into `ModalFlowPhysics`; the target emits a sequenced physical event; only `NeonPinballComposer` converts that returned event into sound. Free marble impacts and mechanism crossings produce additional rationed fills. This preserves bidirectional causality:

```text
174 BPM score cue → injectEnergy(target, metadata) → solver/module/transmission event
       → named rig actuation + reactive neon → NeonPinballComposer → physics-origin audio
       → analyser/event energy → local lights + particle field + camera response
```

`MachineCameraSource.getCameraEnvelopeRadius()` generalizes whole-machine framing for installations larger than the original graph. V10 reports `14.5`; the shared camera scales macro orbits accordingly while retaining focus shots and the work-owned inertial Drone Pilot. The top bar now exposes `LOOKS / LIGHTS` and `DIRECTOR`, while shell panels and both Director regions have independent visibility controls.

See [`V10_NEON_PINBALL.md`](V10_NEON_PINBALL.md) for the complete spatial, musical, environmental, UI and verification contracts.

---

## 1.6 V9 Additions — Resonant Relay, Cornell Room & Visual Lab

The preserved V9 work, `MODAL FLOW // RESONANT RELAY`, preserves V8's marble solver and adds a parallel mechanical transmission graph. Ten `TransmissionSpec` links (`gear-train`, `belt`, `four-bar`, `camshaft`, `chain`, `nested-ring`) propagate module energy, advance deterministic phase, emit physical `mechanism` events at tooth/lug/lobe/cycle crossings, and animate from that same state. `ModalFlowComposer` rations these events with marble impacts, so mechanisms are instruments rather than decorative visualizers.

`ModalFlowMechanismLayer.ts` adds a shared-rig multi-deck chassis, an open-front Cornell room, receiving scrims, rotating gobos, shadow-casting spot projectors, practical fixtures and local energy lights. `PostFxState` and `WebGPUStage` add linocut, neon edge/GI, five palettes, four physical light rigs, exposure, light energy and shadow depth. Director `LOOKS` exposes authored style presets and true independent effect bypass controls. See `docs/V9_RESONANT_RELAY.md` for the full system.

---

## 1.5 V8 Foundation — Physics-Generated Song & Drone Camera

The preserved V8 work, `MODAL FLOW // PHYSICS SONG`, adds a second composition paradigm to the engine. V4–V7 schedule score events and let mechanisms respond; V8 schedules only sparse **physical energy cues**. A deterministic 3D marble solver emits releases, lifts, flow, diverter, gate, strike, collision, return and recycle events. `ModalFlowComposer` rations those events through phrase rests, a global event budget and per-module cooldowns, then maps allowed impacts into a new D-Lydian melody. Elevation chooses register, energy chooses velocity/decay, module identity chooses timbre, and a 6-phrase theme advances one step per audible impact.

```text
src/works/modal-flow/
├── ModalFlowScore.ts       # 48-bar D-Lydian sections, sparse governor energy cues, scale helpers
├── ModalFlowBlueprint.ts   # 12–96 3D modules, curved conduits, energy sources, bindings, focus targets
├── ModalFlowPhysics.ts     # fixed-step 3D gravity/lift/collision/queue/routing solver
├── ModalFlowComposer.ts    # physical event → rationed melodic ImpulseEvent
├── ModalFlowMachine.ts     # parented KinematicRig installation + instanced marbles/tubes
└── ModalFlowWork.ts        # audio/camera/Director integration, graph + physics snapshots, growth
```

Key runtime additions:

- `WorkRuntimeContext.canvas` lets a work install its own `FreeFlyController` for camera mode `1`.
- `ImpulseEvent.origin` includes `'physics'` so events generated by the solver are distinct from score/live impulses.
- `DirectorWorkHooks.getCameraFollowTarget()` feeds the lead marble to Director Studio's new `DRONE PILOT` mode.
- `WorkSceneInstance.setDirectorEnabled()` suspends a work-owned drone controller while the Director drawer owns the viewport.
- `WorkDefinition.cameraModeLabels` lets each work rename the nine HUD camera buttons; V8 labels mode `1` as `DRONE PILOT`.
- `KeyboardMouseRig.setDroneMode()` suspends live pad/punch keys during drone flight so `WASD`, `E/Q`, `Z/X`, `F`, `V` and `C` never double-trigger synth voices.
- `FreeFlyController` gains `DRONE`: inertial velocity, banked turns, cinematic drift, spring-damped marble lock, follow-distance cycling and wheel speed/FOV tuning.

The V8 machine uses one `KinematicRig` root (`rig:root`) with chassis, conduit and marble frames, one joint per module, one port joint per module, moving flywheel/auger/diverter/escapement joints, and instrument hammer joints. Every visible mesh has a `rig:` ancestor. The `MACHINE` tab sees modules, typed conduits, eight energy sources, sixteen many-to-many bindings and all five focus scales; the `PHYSICS` tab sees the 8×32 routing wheel, ten solver/composition macros, the physical part registry and live telemetry.

---

## 2. Layered Directory Architecture

```text
src/
├── engine/                     # Core audiovisual runtime
│   ├── core/
│   │   ├── types.ts            # Contracts: WorkDefinition, ImpulseEvent, PostFxState, SubsystemId (14 voices)
│   │   ├── Clock.ts            # Dual-domain 1/64th lookahead + AnticipationQueue + DAC VisualQueue
│   │   ├── Sonobjet.ts         # Causal physics base class (spring-damper DOFs + spontaneous rupture)
│   │   ├── ModulationMatrix.ts # Patchbay + Lorenz Chaos + S&H + slewed macro targets
│   │   └── WorkRegistry.ts     # Scene/work registry for multi-work extensibility
│   ├── audio/
│   │   ├── AudioEngine.ts      # Master WebAudio graph, chamber IR, compressor, MediaStream tap
│   │   ├── SynthRack.ts        # 14-voice procedural synth + dotted-16th stereo ping-pong delay bus
│   │   ├── BreakBufferLab.ts   # Procedural 16-slice 2-bar Amen/Think breakbeat synthesizer
│   │   └── FractureWorklet.ts  # Custom AudioWorklet DSP: stutter gate, Karplus comb, West-Coast wavefolder
│   └── render/
│       ├── WebGPUStage.ts      # WebGPU/WebGL2 renderer + Stylized TSL Post-Processing pipeline
│       └── TSLMaterials.ts     # Cunningham ceramic/chrome/plasma PBR + GPU non-Euclidean positionNode shaders
├── kit/                        # Composable construction kit for building works
│   ├── camera/
│   │   ├── CinemaDirector.ts   # Morph-following 8-rig camera director + Vertigo Zolly + Wrist SnorriCam
│   │   └── KineticCameraRig.ts # Lightweight inertia rig (used by secondary works)
│   ├── environment/
│   │   ├── SurrealCyberVault.ts# 256 morphing monolith blades + 12 laser curtains + mercury mirror floor
│   │   └── BrutalistChamber.ts # Compact brutalist chamber (used by PHASE // LATTICE)
│   └── sequencer/
│       └── IDMSequencer.ts     # Bjorklund Euclidean generator, exponential ratchet curves, break chopper
├── studio/                     # Live performance, sensing & recording studio
│   ├── input/
│   │   └── KeyboardMouseRig.ts # F-Phrygian pitch/vowel cursor + 10 synth pads + 7 bus FX + strain drag
│   ├── sensors/
│   │   ├── MediaPipeTracker.ts # Offline-bundled WASM 2-hand 21-landmark optical tracker
│   │   ├── MicAnalyzer.ts      # Live audio RMS + ZCR spectral centroid follower
│   │   └── MidiGamepadInput.ts # WebMIDI + Gamepad API auto-mapper
│   ├── recorder/
│   │   ├── TakeRecorder.ts     # Multi-pass overdub gesture recorder (.json import/export)
│   │   └── VideoExporter.ts    # 60fps Canvas + WebAudio master .webm recorder
│   └── ui/
│       ├── StudioShell.ts      # Collapsible HUD, act launcher, camera rig selector, oscilloscope, patchbay
│       └── styles.css          # Stark architectural studio styling
└── works/                      # Self-contained audiovisual works
    ├── neon-pinball/           # V10 default: open spatial pinball computer + physical breakcore score
    │   ├── NeonPinballBlueprint.ts
    │   ├── NeonPinballScore.ts
    │   ├── NeonPinballComposer.ts
    │   └── NeonPinballWork.ts
    ├── spatial-sequencer/      # V11 legible trance graph + serene Antarctic graph family
    │   ├── SpatialSequencerBlueprint.ts
    │   ├── SpatialTranceScore.ts
    │   ├── SpatialTranceWork.ts
    │   ├── AntarcticScore.ts
    │   └── AntarcticWork.ts
    ├── braindance-collider/    # V11 nonlinear high-density Space Pinball variation
    │   ├── BraindanceBlueprint.ts
    │   ├── BraindanceScore.ts
    │   └── BraindanceWork.ts
    ├── modal-flow/             # Shared V8–V11 runtime + preserved V9 Resonant Relay work
    │   ├── ModalFlowScore.ts
    │   ├── ModalFlowBlueprint.ts
    │   ├── ModalFlowPhysics.ts
    │   ├── ModalFlowComposer.ts
    │   ├── ModalFlowMachine.ts
    │   ├── ModalFlowMechanismLayer.ts
    │   └── ModalFlowWork.ts
    ├── marble-pendulum/        # V7: PENDULUM // MARBLE ENGINE (preserved 2.5D gate-bank reference)
    ├── astrarium-modular-engine/ # V6: machine-building graph kit reference
    ├── chrono-automaton/       # V5: articulated automaton reference
    ├── gantz-tecton/           # V4: HYPER // TECTON (4,348-element megastructure + 96-bar score)
    │   ├── HyperTectonMachine.ts
    │   ├── GantzScore.ts
    │   └── GantzWork.ts
    └── lattice-pendulum/       # PHASE // LATTICE (secondary polyrhythmic tensegrity work)
```

---

## 3. Coupled State Machines & Non-Euclidean Shader Pipeline

### 3.1 `HyperTectonMachine` (`4,092` Parts) + `SurrealCyberVault` (`256` Monoliths)
- **Macro-Morphology State Machine (`MorphStateId`)**:
  1. `FOLDED_MONOLITH`: Interlocked hyper-cubic carapace (`envelopeRadius = 2.8m`).
  2. `CANTILEVER_STRIKER`: Horizontal shear split + 6 IK Cunningham striker booms lunging across fault seams (`envelopeRadius = 6.8m`).
  3. `INVERTED_CATHEDRAL`: Carapace inverts inside-out (`interiorRadius = 5.4m`), exposing `768` glowing photonic capillaries for interior camera flight.
  4. `NON_EUCLIDEAN_HELIX`: Vertical DNA/Möbius torsion spire (`verticalSpan = 14.5m`) with strong GPU `nonEuclideanTwist`.
  5. `QUANTIZED_SHATTER`: Discontinuous *Gantz Graf* spatial voxelization (`spatialGlitch` + quantized steps).
  6. `SINGULARITY_CROWN`: Maximum radial dilation (`envelopeRadius = 11.8m`) with all 8 layers precessing around the blazing core.
- **16 Fault-Cluster Sub-State Machines**: Track per-cluster `extrude`, `flipCurrent` (`0 ↔ π`), `stretchX`, `shatterJitter`, and `glow`.

### 3.2 TSL Non-Euclidean Vertex & Optical Post-FX Shaders
- **`TSLMaterials.ts`**: Attaches a shared GPU `positionNode` deformation graph to instanced tectonic plates, surgical chrome needles, brass gyro-blades, and photonic filaments (`nonEuclideanTwist`, `spatialGlitch`, `acousticRipple`).
- **`WebGPUStage.ts`**: Wraps `scenePass + bloomPass` via `convertToTexture(...)` (preserving identical UV orientation across WebGPU and WebGL2) and applies barrel lens distortion (`uLensDistort`), quantized scan-band glitch tears (`uGlitch`), radial RGB chromatic dispersion (`uAberration`), silver-halide bleach-bypass (`uBleachGrade`), stark stencil thresholding (`uStarkThreshold`), and 35mm grain (`uGrain`).

---

## 4. 96-Bar 6-Act Score & 14-Voice Procedural Synth

| Act | Bars | Morphology State | Musical Role & Transition Architecture |
| :--- | :--- | :--- | :--- |
| **I. STASIS SEED** | `0–11` (`12`) | `FOLDED_MONOLITH` | Sparse Glass-Armonica & Modal Chime statements of `C5–Db5–Ab4–G4–F4` over `Fm(add9)`. |
| **II. CANTILEVER LOOM** | `12–27` (`16 = 2×8`) | `CANTILEVER_STRIKER` | Syncopated 2-step & Amen breaks + resonant 303 Acid Squelch bassline + Glitch-Chirps. |
| **III. INVERTED CATHEDRAL** | `28–51` (`24 = 3×8`) | `INVERTED_CATHEDRAL` → `HELIX` | 2 full 8-bar Aria & Polychord cycles (`28–43`), beatless suspension (`44–47`), and 4-bar Glitch-Deconstruction Bridge (`48–51`) completing the `E4` (`C7b9`) cadence into Act IV. |
| **IV. SHATTER CADENZA** | `52–63` (`12`) | `QUANTIZED_SHATTER` | Stop-start 64th drill cadenza with Beat-4 dead-stops (`52–59`) + 4-bar snare/acid riser & 2-beat silence lock (`60–63`). |
| **V. SINGULARITY CROWN** | `64–79` (`16 = 2×8`) | `SINGULARITY_CROWN` | Full 2-pass polyrhythmic & harmonic convergence through `Bar 79` + grand cadential roll into Act VI. |
| **VI. ENTROPIC DISSOLVE** | `80–95` (`16 = 2×8`) | `INVERTED` → `FOLDED` | Cathartic `Fm9` resolution at `Bar 80`, Glass-Armonica & Chime recall of Seed Motif, final lock at `Bar 95`. |

---

## 5. V5 Additions — Articulated Automaton & Director Studio

The legacy V4 sections above remain valid for the registered `HYPER // TECTON` work. `CHRONO // AUTOMATON` remains a registered reference work and the mechanical core reused by V6; it uses the same 96-bar score and audio engine but replaces particle-cloud morphology with a mechanical hierarchy.

```text
src/
├── kit/mechanism/
│   ├── KinematicRig.ts          # Named revolute/prismatic joints + analytical drivers
│   └── HorologicalMeshKit.ts    # Cached CAD-like gears, bridges, combs, bellows, irises
├── studio/articulation/
│   ├── ArticulationRig.ts       # 12 mechanical DOFs + 6 behavior profiles
│   ├── MechanismEcology.ts      # Coupled organ agents, fatigue, arousal, cohesion
│   └── BehaviorPresetBank.ts    # 8 milestone presets + A/B blend + JSON bank
├── studio/director/
│   ├── KeyframeTimeline.ts      # Camera/look/milestone project & interpolation
│   ├── FreeFlyController.ts     # 6-DOF / joint-lock camera input
│   ├── DirectorStudioUI.ts      # Shots, looks, config, maps, project tabs
│   ├── DirectorSystem.ts        # Runtime coordinator and work-hook adapter
│   └── director.css             # Dockable director cockpit styling
└── works/chrono-automaton/
    ├── ChronoAutomaton.ts       # Fully parented machine construction & simulation
    ├── ClockworkCameraDirector.ts
    └── ChronoAutomatonWork.ts   # WorkDefinition + score/audio/director integration
```

### 5.1 Kinematic invariants

- Every visible mesh has a `RigJoint` ancestor; this is enforced by `tests/v5.test.ts`.
- Gear teeth are connected by `GearRatioDriver`; cam followers lift before strikes via `CamFollowerDriver`.
- Four-bar striker rods close exactly because `solveFourBar` uses circle intersection; coupler and rocker pin distances are unit-tested.
- `GenevaIndexerDriver` locks 16th-note indexing to transport beats.
- `MagneticSlipRail` keeps a visible plasma axle stretched between fixed and moving bearings.

### 5.2 Behavioral ecology

`MechanismEcology` is not a bank of independent LFOs. It is a coupled system of eight organ agents with phase coherence, neighbor coupling, arousal, fatigue, curiosity, cohesion and editable `BehaviorMapEntry` routes from score subsystems to mechanical organs. Behavior presets bias precision, coupling, noise, fatigue and recovery rather than hard-coding one monolithic animation curve.

### 5.3 Director data flow

```text
Clock/Transport → DirectorSystem.update()
  ├─ KeyframeTimeline.evaluateCamera() → camera pose / free-fly seed
  ├─ KeyframeTimeline.evaluateLook()  → WebGPUStage.setPostFx()
  ├─ KeyframeTimeline.evaluateMilestone() → Work.setArticulationState() + setBehaviorId()
  ├─ Behavior maps / patchbay        → MechanismEcology + ModulationMatrix
  └─ DirectorStudioUI                → playhead, editors, telemetry, JSON I/O
```

`DirectorSystem` runs after `activeInstance.update()` in `main.ts`, so an enabled director always has final authority over camera, looks and machine pose. Disabling Director Mode immediately returns camera and post-FX control to the work's procedural director.

For controls and authoring details, see [`V5_DIRECTOR_STUDIO.md`](V5_DIRECTOR_STUDIO.md).

---

## 6. V6 Additions — Machine-Building Kit & Graph Director

The preserved V6 work is `ASTRARIUM // MODULAR ENGINE`. It extends the V5 kinematic and director vocabulary into a scalable installation whose modules, ports, conduits, sources, bindings and focus targets are data-driven.

```text
src/
├── engine/core/types.ts                 # Generic graph snapshots + DirectorWorkHooks
├── kit/machine/
│   ├── MachineGraph.ts                 # Weighted typed graph, simulation, selectors, JSON I/O
│   └── OrreryFactoryConfig.ts          # Deterministic 12–256 module installation generator
├── studio/director/
│   ├── DirectorStudioUI.ts             # Adds MACHINE tab: map, macros, bindings, focus, growth
│   └── DirectorSystem.ts               # Generic graph/focus/growth/config callbacks
└── works/astrarium-modular-engine/
    ├── ModularMachine.ts               # Joint-parented assembly, organs, ports, conduits, flow
    ├── MachineCameraDirector.ts        # Multi-scale focus camera
    └── OrreryCommonsWork.ts            # WorkDefinition, score/audio/director integration
```

### 6.1 Graph invariants

- `MachineGraph` is a directed weighted network, not a list of score-to-part pairs.
- A `ScoreBindingSpec` selects modules by tags, clusters, archetypes, ids or scale; tests assert fan-out and fan-in cardinality greater than one.
- Every edge has a typed `EdgeKind` and one of five nonlinear `TransferMode`s; every source has one of five energy waveforms.
- Modules own typed ports, threshold/capacity/base frequency, phase, energy, activation and fatigue.
- `FocusDescriptor` covers `MACRO | CLUSTER | MODULE | PORT | CONDUIT`; conduit focus resolves moving edge endpoints.
- `MachineGraphSnapshot` exposes live modules, conduits, sources, bindings, focus targets and macros to the generic Director UI.

### 6.2 Rig invariants

- `ModularMachine` keeps the V5 zero-unparented-mesh rule; `tests/v6.test.ts` enforces it after initial build, growth, rebuild and JSON import.
- The outer frame, cluster rings, module chassis, gear trains, organ rotors, ports, V5 reference machine and conduit frame are all represented in the same `KinematicRig` tree.
- `GearRatioDriver` couples cluster rotation to module gear trains; graph state drives the child organ rotors and port collars.
- Conduit instanced meshes are children of `rig:conduitFrame`; their transforms are recomputed from joint/port world positions every frame.

### 6.3 V6 runtime data flow

```text
96-bar Clock / live impulses
  ├─ AudioEngine + preserved SynthRack
  └─ WorkSceneInstance.triggerImpulse
       ├─ MachineGraph.emitScore()       → selector bindings → many module energy states
       ├─ MechanismEcology.stimulate()  → eight coupled organ agents
       └─ V5 reference automaton impulse

Work.update()
  ├─ ModulationMatrix targets          → GraphStepContext macros
  ├─ MachineGraph.step()               → energy propagation, flow, fatigue, phase
  ├─ ModularMachine.applyGraphToRig()  → joint targets for clusters, rotors, ports
  ├─ KinematicRig.update()             → gear drivers + spring-damped joints
  ├─ updateConduits()                  → bent ducts and flow beads follow joint world positions
  ├─ MachineCameraDirector.update()    → selected focus scale
  └─ WebGPUStage.setPostFx()           → graph-state-derived optics

Director Studio
  ├─ MACHINE tab → setGraphMacro / updateGraphBinding / setFocusTarget / grow / rebuild / I/O
  └─ SHOTS, LOOKS, CONFIG, MAPS, PROJECT tabs remain unchanged
```

`DirectorSystem` discovers graph capabilities through optional `DirectorWorkHooks`, so legacy works remain compatible. For the full graph schema, installation layout and authoring workflow, see [`V6_MACHINE_BUILDING_KIT.md`](V6_MACHINE_BUILDING_KIT.md).

---

## 7. V7 Additions — Custom Physics & Blank-Slate Marble Machine

The preserved V7 work is `PENDULUM // MARBLE ENGINE`. It does not instantiate the V6 graph installation; it starts from an empty scene and uses a purpose-built deterministic physics engine. V4–V6 remain registered as reference works.

```text
src/
├── engine/core/types.ts                 # PhysicsStudioSnapshot + generic physics hooks
├── kit/physics/
│   ├── MarbleBlueprint.ts              # Tracks, gates, instruments, lift path, parts, focus
│   ├── MarblePhysics.ts                # Fixed-step sphere/capsule solver + governor + telemetry
│   └── ProgrammingWheel.ts             # 12×64 editable pinned score memory
├── studio/director/
│   ├── DirectorStudioUI.ts             # Adds PHYSICS tab: pin grid, macros, parts, telemetry
│   └── DirectorSystem.ts               # Generic physics/program/focus callbacks
└── works/marble-pendulum/
    ├── MarblePendulumMachine.ts        # Kinematic rig, instanced marbles/pins/buckets, visuals
    └── MarblePendulumWork.ts           # Score, audio, Director, post-FX and physics integration
```

### 7.1 Physical causality

```text
Clock / 96-bar transport → flywheel angle (1 rev / beat)
  └─ GearRatioDriver 1:32 → programming wheel angle
       └─ pin step crossing → gate release
            └─ MarblePhysics free body → instrument collision
                 ├─ AudioEngine.triggerImpulse (physical sound)
                 ├─ instrument joint pulse + HUD pad flash
                 └─ collector trough → bucket lift → queue
```

The score engine still supplies section intensity, anticipation cues and an optional blended under-score. The primary audiovisual events are physical impacts from simulated marbles, not direct beat-to-mesh mappings.

### 7.2 Solver invariants

- Fixed `1/120 s` substeps with a deterministic seeded RNG.
- Free marbles collide with capsule segments and with each other in the same lane.
- Gate segments are skipped while their lever is open; queue slots are kinematic constraints.
- Instrument segments emit velocity/pitch/energy events that drive the procedural synth.
- Stuck marbles, jams and lost marbles are observed in telemetry rather than silently deleted.
- The pendulum governor is integrated as a damped nonlinear pendulum driven by crank phase.

### 7.3 Rig invariants

- Every visible mesh has a `RigJoint` ancestor; `tests/v7.test.ts` enforces zero unparented meshes.
- Flywheel, programming wheel, pendulum, gate levers, instrument bars and conveyor buckets are named joints in `KinematicRig`.
- Marbles, pins and buckets are instanced meshes parented to `rig:marbleField`, `rig:programWheel`, and `rig:liftChain`.
- The flywheel–pendulum pitman is a rod mesh dynamically stretched between two joint world positions.

### 7.4 Studio data flow

```text
Work.getPhysicsSnapshot() → DirectorStudioUI.PHYSICS tab
  ├─ pin grid clicks → toggleProgrammingPin()
  ├─ macro sliders   → setPhysicsMacro() → ModulationMatrix + MarblePhysics
  ├─ focus select    → setFocusTarget() → MachineCameraDirector
  ├─ reset/drop      → resetPhysics() / dropMarbles()
  └─ program I/O     → export/import ProgrammingWheel JSON

Work.getMachineGraphSnapshot() → MACHINE tab
  └─ graph projection of physical parts, pin→gate, gate→instrument, recycle path
```

For research context, the full physics design, verification and extension vectors, see [`V7_MARBLE_PENDULUM.md`](V7_MARBLE_PENDULUM.md).
