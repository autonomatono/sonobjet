# SONOBJET

**Living Biomechanical Audiovisual Objects, Custom WebGPU + WebAudio Synth/Composition Engine, and Live Performance Studio**

- **Live Deployment (GitHub Pages):** [https://autonomatono.github.io/sonobjet/](https://autonomatono.github.io/sonobjet/)
- **Direct Scene Deep-Links:**
  - Proof-of-Concept 01 (`GANTZ // AUTOMATON`): [`?work=gantz-tecton`](https://autonomatono.github.io/sonobjet/?work=gantz-tecton)
  - Etude 02 (`PHASE // LATTICE`): [`?work=phase-lattice`](https://autonomatono.github.io/sonobjet/?work=phase-lattice)

---

## Vision: Living Sound-Machines & True Musical Composition

Rather than modulating uniform symmetric geometry with an FFT analyzer, **SONOBJET** constructs **asymmetric, hierarchical biomechanical sound-creatures and automatons** whose specialized organs *are* their instruments—paired with **through-composed experimental scores** featuring recurring motifs, modal harmony, call-and-response, anticipation wind-ups, stark silences, and climaxes.

1. **Biomechanical Anatomy & Anticipation (`Clock` + `GantzAutomaton`):** Heavy limbs do not teleport on a transient—`Clock.ts` dispatches pre-strike `AnticipationCue`s (`250–450 ms` ahead of downbeats) alongside audible pneumatic inhales so the creature physically **coils its S-curve spine, glances down at its anvil, and cocks its Siege-Hammer overhead** *before* slamming down in a spray of floor-bouncing sparks.
2. **Emergent Autonomous Life:** Even at rest or in `PURE LIVE` mode, the automaton breathes with exertion-coupled respiration, executes curious saccadic head/eye darts toward its own limbs or the user's cursor/hands, conserves Newtonian angular momentum with its 10-segment counter-tail, and vents heat through porcelain ribs when fatigued.
3. **5-Material Chiaroscuro & WebGPU HDR Bloom (`TSLMaterials` + `WebGPUStage`):** Contrasts weathered **Bone-Porcelain Carapace**, oiled **Forged Cast-Iron**, mirror **Surgical Chrome**, oxidized **Aged Brass**, and HDR-blooming **Tungsten Visceral Filaments** inside volumetric overhead gantry light shafts.

---

## Proof of Concept 01: `GANTZ // AUTOMATON`

### 7 Specialized Biomechanical Organs
1. **14-Vertebra S-Curve Spine & 8-Pair Porcelain Rib Bellows:** Peristaltic coiling, metabolic breathing, and harmonic polychord expansion (`bellows-choir`).
2. **Asymmetric Cranial Sensorium, Saccadic Iris & 5-Reed Vocal Mandibles:** Tracks cursor/hands, glances at active limbs, and articulates vowel shapes (`AH/EH/EE/OH/OO`) as its glottal formant synth (`larynx-lead`) sings.
3. **Heavy Right 3-DOF Siege-Hammer & Spring-Mounted Floor Anvil:** Winds up ahead of downbeats and slams onto the brass-inlaid cast-iron anvil (`sub-rupture`, `spine-shear`), spraying 160 ballistic sparks that bounce off the wet slate plinth.
4. **Dual Left 3-Jointed Mantis Raker Limbs & 16-Rod Harp-Comb:** Darts across 16 graduated tensioned steel rods to pluck melodic **Seed Motifs** (`modal-clang`) and 16-slice breakcore chops (`break-shred`).
5. **Ventral Eccentric Brass Flywheel Governor & Brake Caliper:** Spins with musical momentum; mechanically clamps shut with friction sparks on `stutter` freezes and dead-stops.
6. **10-Segment Whipping Counter-Tail & Arc Stinger:** Balances Siege-Hammer torque and fires `arc-discharge` bursts.
7. **6 Catenary Steel Suspension Tendons:** Anchor the creature to overhead gantry I-beams and floor tensioners, vibrating with transverse waves under load.

### Through-Composed 6-Act Score (80 Bars, 164 BPM, F Phrygian)
Built around the recurring 5-note **Seed Motif (`C5 – Db5 – Ab4 – G4 – F4`)**, an asymmetric `3+3+4+3+3` rhythmic spine, and an 8-bar modal progression (`Fm(add9) -> Db Lydian #11 -> Bbm9 -> C7b9`):
- **Act I (`Bars 1–12`) — `LATENT BREATH & SEED MOTIF`:** Chamber silence, subterranean breath, naked plucked harp Seed Motif, pneumatic wind-up into a single devastating Anvil Slam + decelerating steel pawl, and quiet Larynx awakening.
- **Act II (`Bars 13–28`) — `ASYMMETRIC LOOM (CALL / RESPONSE)`:** Strict 2-bar dialogue between Right Siege-Hammer Calls and Left Mantis-Harp/Break Responses; folded F-Phrygian bassline enters at Bar 21.
- **Act III (`Bars 29–48`) — `LARYNX ARIA OVER BREAKCORE`:** Soaring vocal-formant melody & bellows polychords over structured breakcore, featuring a 2-bar drumless vocal suspension at Bars 45–46.
- **Act IV (`Bars 49–60`) — `FLYWHEEL CADENZA & RISER`:** Stop-start Autechre *Gantz Graf* mechanical cadenza (3 beats hyper-ratchet vs 1 beat dead-locked silence), 4-bar 2-octave pitch/density riser, and **2 full beats of breathless silence** before the drop.
- **Act V (`Bars 61–72`) — `APEX CONVERGENCE`:** Full climax uniting octave-doubled Seed Motif, polychords, monolith bass, and relentless breakcore/anvil fury.
- **Act VI (`Bars 73–80`) — `EXHAUSTION & STILLNESS`:** Coasting flywheel, panting rib-vents, and a solitary farewell Seed Motif fading into a final latch click.

---

## Live Performance Controls

| Input | Action |
| :--- | :--- |
| **`Space`** | Play / Pause 6-Act Composition |
| **`Tab` / `H`** | Toggle borderless **Cinema Mode** vs **Performance Studio HUD** |
| **Mouse Hover (`X / Y`)** | Guides creature's **Saccadic Gaze**; sets **Vowel Formant (`X`)** & **F-Phrygian Pitch (`Y`)** for live pads |
| **Mouse Left-Click / Drag** | Left half plucks tuned Harp rod; Drag coils spine & flares ribs; **Release fires C5 Larynx cry / Anvil slam** |
| **Mouse Right-Drag / `Shift`+Drag** | Orbit camera (`Wheel` zooms) |
| **`Z X C V B N M ,`** | Play Biomechanical Organs live (`ANVIL KICK`, `SPINE SNARE`, `BREAK CHOP`, `MANTIS HARP`, `LARYNX VOICE`, `BELLOWS CHORD`, `MONOLITH BASS`, `TAIL STINGER`) |
| **`A S D F G J K`** | Momentary FX (`BRAKE STUTTER`, `64TH DRILL`, `HALFTIME`, `COMB SCREAM`, `REV SLICE`, `RIB FLARE`, `HARD LOCK`) |
| **`1 2 3 4 5`** | Camera Cuts (`1` 3/4 Anvil, `2` Larynx/Harp Portrait, `3` Low Forge, `4` Wide Gantry, `5` Auto Cinema Director) |
| **`Q W E R T Y`** | Cue / jump directly to **Acts I–VI** |
| **`Shift + R`** | Toggle Multi-Pass Overdub Gesture Recording |
| **MediaPipe Hands / Mic** | 2-Hand span flares ribs; pinches control Raker Density & Larynx Tension + snap strikes; Mic claps excite organs |

---

## Quickstart

```bash
npm install
npm run dev        # Launch live studio on http://0.0.0.0:5173
npm run typecheck  # Strict TypeScript check
npm test           # Run Vitest suite (Clock, Anticipation, 6-Act Score, 7-Organ Automaton, Recorder)
npm run build      # Production build into ./dist (with self-hosted MediaPipe WASM)
```

## Documentation & Continuity

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Biomechanical ontology, Anticipation Queue, Formant/Polychord DSP, TSL materials & HDR Bloom.
- [`docs/PERFORMANCE_AND_RECORDING.md`](docs/PERFORMANCE_AND_RECORDING.md) — Playing the Automaton live, F-Phrygian modal keyboard/mouse mapping, sensors & recording.
- [`docs/CI_AND_DEPLOYMENT.md`](docs/CI_AND_DEPLOYMENT.md) — Continuous any-branch GitHub Pages CI pipeline & turn-end workflow.
- [`HANDOFF.md`](HANDOFF.md) — Session state, commit history, architectural log, and next milestones.
