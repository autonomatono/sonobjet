# Architecture — `sonobjet` Engine, V4 Legacy, V5 Automaton & V6 Machine Kit

## 1. Design Philosophy: Non-Euclidean Causal Sound-Objects

`sonobjet` treats a scene as a **living, surreal electromechanical performance** rather than an FFT visualizer or a literal simulation of historic hardware:

1. **Coupled Multi-Scale State Machines**: Global Macro-Morphology states reconfigure the entire megastructure across impossible topological geometries while 16 independent Fault-Cluster sub-state machines react locally to individual percussion, harmonic, acid, and glitch impulses.
2. **Non-Euclidean GPU Vertex Deformation**: Laws of rigid-body geometry are intentionally transcended — TSL vertex shaders (`positionNode`) twist, shear, and ripple thousands of instanced ceramic and chrome structures directly on the GPU in tandem with CPU state-machine kinematics.
3. **Through-Composed Hypermetric Musical Form**: Every section completes its full harmonic and melodic cycles (`8`-bar F-Phrygian Polychord & Aria cycles across a `96`-bar 6-Act score) with sculpted bridge handoffs and cadential drum/glitch rolls.
4. **State-Coupled Camera & Stylized Optical Post-Processing**: Camera trajectories continuously follow the machine's live bounding envelope (`envelopeRadius`, `interiorRadius`, `verticalSpan`, `primaryBoomTip`) through TSL lens distortion, scan-band glitch tears, RGB chromatic aberration, and Cunningham bleach-bypass color grading.

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
    ├── gantz-tecton/           # 01: HYPER // TECTON (4,348-element flagship megastructure + 96-bar score)
    │   ├── HyperTectonMachine.ts
    │   ├── GantzScore.ts
    │   └── GantzWork.ts
    └── lattice-pendulum/       # 02: PHASE // LATTICE (secondary polyrhythmic tensegrity work)
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

The current default work is `ASTRARIUM // MODULAR ENGINE`. It extends the V5 kinematic and director vocabulary into a scalable installation whose modules, ports, conduits, sources, bindings and focus targets are data-driven.

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
