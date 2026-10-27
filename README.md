# SONOBJET

**Living Audiovisual Objects, Custom WebGPU + WebAudio Synth/Composition Engine, and Live Performance Studio**

- **Live Deployment (GitHub Pages):** [https://autonomatono.github.io/sonobjet/](https://autonomatono.github.io/sonobjet/)
- **Direct Scene Deep-Links:**
  - Proof-of-Concept 01 (`GANTZ // TECTON`): [`?work=gantz-tecton`](https://autonomatono.github.io/sonobjet/?work=gantz-tecton)
  - Etude 02 (`PHASE // LATTICE`): [`?work=phase-lattice`](https://autonomatono.github.io/sonobjet/?work=phase-lattice)

---

## Vision: Beyond "Visualization" — The Living *Sonobjet*

Traditional music visualizers treat visuals as a passive, frame-delayed ornament derived from FFT frequency bins of a pre-rendered audio stream. **SONOBJET** inverts that paradigm:

1. **Unified Causal Spine:** Every entity (`SonobjetCore`) possesses physical Degrees of Freedom (DOFs), spring-damper inertia, machined CAD mechanical detents, tensile stress, and viscoelastic fracture thresholds. A single `ImpulseEvent` simultaneously actuates a subsystem's 3D mechanical anatomy **and** its spatialized synthesis voice.
2. **Bidirectional Physical Coupling:** Pulling a construct apart (via Mouse Drag or **MediaPipe Two-Hand 3D Vision**) accumulates structural stress that continuously drives FM/waveguide servo tension and molten TSL shader seams; exceeding critical yield spontaneously discharges physical/acoustic ruptures, and releasing slams all machined components back into lock.
3. **Game-Engine Scene Architecture:** Works are self-contained, hot-swappable `WorkDefinition` scenes built from reusable kit primitives (`src/kit/`), custom synthesis voices (`src/engine/audio/`), TSL WebGPU materials (`src/engine/render/`), and composable signal routes (`ModulationMatrix`).

---

## Proof of Concept 01: `GANTZ // TECTON`

Inspired by **Autechre** and **Alex Rutterford's *Gantz Graf* (2002)**, `GANTZ // TECTON` suspends a **717-body CNC-machined mechanical agglomerate** (180 armor tectonic plates, 240 helical titanium cooling fins, 260 splinter caliper shards, 36 cardinal hydraulic rams, and an incandescent inner reactor spine) inside a stark brutalist concrete containment chamber.

Its 64-bar (172 BPM) composed IDM/breakcore score unfolds across five movements:
1. **`I. PNEUMATIC IGNITION` (Bars 1–8):** Isolated hydraulic snaps, cold chamber silence, and accelerating bouncing-ball steel pawls.
2. **`II. FRACTURE BREAK` (Bars 9–24):** Chopped 16-slice procedural breakbeats interlocked with tectonic spine shears (each break slice maps 1:1 to a physical angular sector of the construct).
3. **`III. HYPER-DRILL AGGLOMERATE` (Bars 25–40):** Exponential 12x micro-ratchet drills, West-Coast wavefolded monolith bass, and high-voltage arc discharges.
4. **`IV. SUSPENDED DISASSEMBLY` (Bars 41–52):** Exploded-CAD levitation, reversed break ghosts, and Euclidean modal steel partials.
5. **`V. TERMINAL TECTONIC LOCK` (Bars 53–64):** Polyrhythmic overload converging on bar 64's razor-sharp mechanical dead-stop lock.

---

## Live Performance Controls

| Input | Action |
| :--- | :--- |
| **`Space`** | Play / Pause sample-accurate score transport |
| **`Tab` / `H`** | Toggle pure borderless **Cinema Mode** vs **Performance Studio HUD** |
| **Mouse Left-Drag** | Physically pull & strain tectonic plates apart; **release slams construct shut** |
| **Mouse Right-Drag / `Shift`+Drag** | Orbit camera around construct (`Wheel` zooms) |
| **`Z X C V B N M ,`** | Fire the 8 physical/acoustic subsystems live (`SUB RUPTURE`, `SPINE SHEAR`, `BREAK SHRED`, `FIN CASCADE`, `PISTON SNAP`, `MODAL CLANG`, `CORE IMPLODE`, `ARC SPARK`) |
| **`A S D F G J K`** | Momentary breakcore & CAD fracture FX (`STUTTER`, `64TH DRILL`, `HALFTIME`, `COMB SCREAM`, `REV SLICE`, `CAD EXPLODE`, `HARD LOCK`) |
| **`1 2 3 4 5`** | Instant camera cuts (`5` = Autonomous Cut Director) |
| **`Q W E R T`** | Cue / jump directly to Movements I–V |
| **`[` / `]`** | Nudge tempo `-4` / `+4` BPM |
| **`Shift + R`** | Toggle Multi-Pass Overdub Gesture Recording |
| **MediaPipe Hands** | Two-hand span controls CAD spread; left/right thumb-index pinches modulate drill/alloy & snap-strike subsystems |
| **Mic Exciter** | Claps, snaps, or beatboxing inject live physical impulses |

---

## Quickstart

```bash
npm install
npm run dev        # Launch live studio on http://0.0.0.0:5173
npm run typecheck  # Strict TypeScript check
npm test           # Run Vitest engine, sequencer, recorder & WebGPU scene tests
npm run build      # Production build into ./dist (with self-hosted MediaPipe WASM)
```

## Documentation & Continuity

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Engine ontology, WebGPU/TSL pipeline, WebAudio + AudioWorklet DSP, and authoring new Works.
- [`docs/PERFORMANCE_AND_RECORDING.md`](docs/PERFORMANCE_AND_RECORDING.md) — Live improvisation, MediaPipe/Mic/MIDI sensing, Overdub Take composition, and `.webm` video export.
- [`docs/CI_AND_DEPLOYMENT.md`](docs/CI_AND_DEPLOYMENT.md) — Continuous any-branch GitHub Pages CI pipeline & turn-end workflow.
- [`HANDOFF.md`](HANDOFF.md) — Up-to-date session state, commit log, file map, and roadmap for seamless session recovery.
