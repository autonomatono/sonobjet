# Architecture — `sonobjet` Engine & `HYPER // TECTON`

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
