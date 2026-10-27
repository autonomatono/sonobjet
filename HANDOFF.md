# SONOBJET — Session Handoff & Continuity State

> **Purpose:** Updated at the end of **every turn** so that if a session is interrupted or handed off, work can resume immediately with complete architectural, musical, and operational context.

---

## 1. Current Deployment & Git State

- **Active Working Branch:** `arena/86769aaf-sonobjet`
- **Live GitHub Pages URL:** `https://autonomatono.github.io/sonobjet/`
- **CI Workflow:** `.github/workflows/deploy.yml` (`CI & Deploy GitHub Pages` — triggers on `push` to `**`, runs typecheck + Vitest + Vite production build + MediaPipe WASM copy, deploys `./dist` to `github-pages`)
- **Local Dev Server:** `npm run dev` (`0.0.0.0:5173`, `allowedHosts: true` for Arena live preview)

---

## 2. Evolution Log

### Turn 2 — Major Biomechanical, Compositional & Aesthetic Overhaul (`GANTZ // AUTOMATON`)
Addressed critique that V1's spherical geometry, hash-driven percussion, and monochrome grey palette were too uniform:

1. **Replaced Uniform Sphere with 7-Organ Biomechanical Creature (`src/works/gantz-tecton/GantzAutomaton.ts`):**
   - **Organ 1 (Spine & Bellows):** 14-vertebra hunched S-curve spine + 8 asymmetric porcelain/iron rib-valve pairs + glowing metabolic bellows-lung with exertion-linked breathing/panting (`fatigue`).
   - **Organ 2 (Cranial Sensorium & Vocal Mandible-Larynx):** Asymmetric porcelain skull + brass rangefinder + 6-blade iris optic aperture with **emergent saccadic gaze** (tracks cursor/hands, glances down at cocked hammer before impact, locks eye-contact during vocal aria) + split mandibles & 5 vibrating tungsten throat-reeds articulating vowels.
   - **Organ 3 (Heavy Right Siege-Hammer & Floor Anvil):** 3-DOF hydraulic pile-driver arm that **winds up ahead of downbeats** (`AnticipationCue`) and slams onto a spring-mounted cast-iron/brass anvil, kicking torso/tail in Newtonian counter-torque and spraying **160 ballistic floor-bouncing sparks**.
   - **Organ 4 (Dual Left Mantis Rakers & 16-Rod Harp-Comb):** Two 3-jointed arachnid arms darting across 16 graduated tensioned chrome rods to pluck melodic motifs & break slices.
   - **Organ 5 (Ventral Brass Flywheel & Brake Caliper):** Spins with rhythmic energy; clamps shut with friction sparks on `stutter` freezes and dead-stops.
   - **Organ 6 (10-Segment Whipping Counter-Tail & Arc Stinger):** Travelling wave + counter-torque balance.
   - **Organ 7 (6 Catenary Suspension Tendons):** 96 instanced cable links connecting shoulders/spine/pelvis to overhead gantry I-beams & floor plinth with transverse wave vibration.
   - **Behavioral State Machine:** `DORMANT_BREATH`, `COILING_ANTICIPATION`, `ASYMMETRIC_LOOM`, `VOCALIZING_ARIA`, `FRACTURE_OVERDRIVE`, `PANTING_EXHAUSTION` surfaced live in Studio HUD.

2. **Through-Composed 80-Bar, 6-Act F-Phrygian Score & Expanded Synth (`GantzScore.ts`, `SynthRack.ts`, `Clock.ts`):**
   - Added `AnticipationCue` queue in `Clock.ts` + `windup-inhale`, `larynx-lead` (3-formant `AH/EH/EE/OH/OO` glottal lead synth), `bellows-choir` (detuned modal polychordal organ/pad), and exact MIDI pitch tuning on `modal-clang` & `core-implode`.
   - Composed a structured 6-Act work (`164 BPM`, F Phrygian) unified by the 5-note **Seed Motif (`C5–Db5–Ab4–G4–F4`)**, `3+3+4+3+3` rhythmic cell, and 8-bar progression (`Fm(add9) -> Dbmaj7#11 -> Bbm9 -> C7b9`):
     - Act I: *Latent Breath & Seed Motif* (Bars 0–11)
     - Act II: *Asymmetric Loom — Strict Call & Response + Bass Entry* (Bars 12–27)
     - Act III: *Larynx Aria Over Breakcore + Bar 44–45 Drumless Choir Suspension* (Bars 28–47)
     - Act IV: *Flywheel Stop-Start Cadenza, 4-Bar 2-Octave Riser & 2-Beat Pre-Climax Silence* (Bars 48–59)
     - Act V: *Apex Convergence* (Bars 60–71)
     - Act VI: *Metabolic Exhaustion & Farewell Seed Motif* (Bars 72–79)
   - Mapped live Keyboard/Mouse pads (`V` Mantis Harp, `B` Larynx Voice, `N` Bellows Chord, `M` Monolith Bass) to F-Phrygian pitches + Mouse-X vowel formants.

3. **5-Material Chiaroscuro Palette & WebGPU HDR Bloom (`TSLMaterials.ts`, `WebGPUStage.ts`, `BrutalistChamber.ts`):**
   - Built 5 distinct TSL materials (`boneCarapace`, `forgedIron`, `surgicalChrome`, `agedBrass`, `visceralFilament` + `sparkEmissive`).
   - Added `THREE.PostProcessing` with TSL `bloom()` + cinema vignette in `WebGPUStage.ts`.
   - Upgraded `BrutalistChamber.ts` with overhead steel gantry beams, 3 diagonal volumetric xenon light cones, wet specular slate plinth, cyan silhouette rim, and warm forge bounce light.

---

## 3. Verification Commands

```bash
npm run typecheck   # 0 errors
npm test            # 9/9 Vitest suites passing (Anticipation, 6-Act Score structure, 7-Organ Automaton lifecycle, Recorder)
npm run build       # Builds ./dist + ./dist/mediapipe-wasm cleanly
```

---

## 4. Next Milestones / Potential Directions

1. **Interactive Score / Motif Composer Deck:** Allow performers to edit/mutate the Seed Motif notes, chord voicings, and Call/Response Euclidean weights visually in a collapsible composition drawer.
2. **Inverse Kinematics (FABRIK / 2-Bone Analytical IK) Direct Limb Grabbing:** Let mouse raycasting or left/right MediaPipe hands grab individual limbs (e.g., manually lifting & dropping the Right Siege-Hammer onto the Anvil, or strumming across the 16 Harp rods by sweeping a hand through the left air-zone!).
3. **Additional Biomechanical / Sound-Machine Works:** Author a contrasting second flagship creature (e.g., an aquatic/pneumatic glass-and-mercury hydrophone organism or a polyrhythmic industrial loom quartet).
