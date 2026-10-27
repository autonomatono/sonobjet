# Live Performance, Sensing & Recording Guide

`SONOBJET` functions simultaneously as a **through-composed 6-Act experimental music video** and an **expressive F-Phrygian biomechanical instrument** playable with mouse/keyboard, MediaPipe 2-hand vision, microphone acoustics, MIDI, or gamepads.

---

## 1. Playing the Biomechanical Automaton (Mouse + Keyboard)

### Continuous Cursor Expression (`Mouse X / Y`)
- **Saccadic Gaze Tracking:** Moving your cursor across the viewport attracts the automaton's cyclops optic turret.
- **Tonal & Formant Mapping:**
  - **`Mouse Y` (Vertical):** Selects scale degrees across two octaves of **F Phrygian (`F, Gb, Ab, Bb, C, Db, Eb`)** when triggering tonal organs (`V`, `B`, `M`), or plays the signature 5-note **Seed Motif** (`C5–Db5–Ab4–G4–F4`) when centered.
  - **`Mouse X` (Horizontal):** Morphs the creature's **Vocal Formant Vowel (`AH -> EH -> EE -> OH -> OO`)** and mandible aperture width.
- **Left-Click & Drag (`Coil & Release`):**
  - Clicking the **left half** of the frame plucks a tuned rod on the 16-Rod Harp; clicking the **right half** actuates a hydraulic latch.
  - **Dragging** coils the creature's 14-vertebra spine backward and flares its porcelain ribs while ramping continuous servo tension; **releasing** after a deep pull unleashes a high `C5` Larynx cry or devastating Anvil slam.

### 8 Biomechanical Organ Pads (`Z X C V B N M ,`)
- `Z` — **ANVIL KICK (`sub-rupture`)**: Slams the Right Siege-Hammer onto the Floor Anvil, detonating floor-bouncing sparks
- `X` — **SPINE SNARE (`spine-shear`)**: Forged snare crack + torso/tail counter-torsion
- `C` — **BREAK CHOP (`break-shred`)**: Cycles 16 procedural breakbeat slices + Mantis claw raking
- `V` — **MANTIS HARP (`modal-clang`)**: Plucks F-Phrygian melodic notes on the 16-rod steel harp
- `B` — **LARYNX VOICE (`larynx-lead`)**: Sings F-Phrygian modal phrases through the 5-reed mandible-larynx
- `N` — **BELLOWS CHORD (`bellows-choir`)**: Cycles the 4-chord progression (`Fm(add9) -> Dbmaj7#11 -> Bbm9 -> C7b9`)
- `M` — **MONOLITH BASS (`core-implode`)**: Plays wavefolded F-Phrygian bass notes
- `,` — **TAIL STINGER (`arc-discharge`)**: Whips the 10-segment tail stinger with FM spark bursts

### Momentary Fracture & Mechanical FX (`A S D F G J K`)
- `A` — **BRAKE STUTTER**: Clamps the hydraulic brake caliper onto the brass flywheel (spraying friction sparks) while locking the `AudioWorklet` stutter ring buffer
- `S` — **64TH DRILL**: Fires rapid 64th-note snare/raker bursts
- `D` — **HALFTIME**: Stretches transport clock to `0.5x` half-speed
- `F` — **COMB SCREAM**: Drives F-tuned stereo waveguide comb feedback
- `G` — **REV SLICE**: Reverses breakbeat slices
- `J` — **RIB FLARE**: Opens porcelain rib-cage valves & abducts limbs
- `K` — **HARD LOCK**: Quantizes all joints to rigid CAD detents

### Navigation & Camera Cuts
- **`Q W E R T Y`**: Cue directly to **Acts I–VI** on the 80-bar timeline
- **`1 2 3 4 5`**: Cut cameras (`1` Full Automaton & Anvil, `2` Larynx & Harp Portrait, `3` Low Forge Anvil, `4` Wide Containment Gantry, `5` Autonomous Cinema Director)
- **`Tab` / `H`**: Toggle pure borderless **Cinema Mode**

---

## 2. Live Sensing (`MediaPipe`, `Mic`, `MIDI`, `Gamepad`)
- **MediaPipe 2-Hand 3D Vision (`MEDIAPIPE HANDS`):** Spreading palms flares the porcelain rib-bellows; left/right thumb-index pinches modulate Raker Density & Larynx/Harp Tension, and rapid pinch-snaps strike `SPINE SNARE` / `TAIL STINGER`. Includes a zero-model `48x36` optical motion fallback.
- **Mic Acoustic Exciter (`MIC EXCITER`):** Desk thumps fire `ANVIL KICK`, claps fire `SPINE SNARE`, finger snaps fire `RAKER COMB`.
- **WebMIDI & Gamepad:** Auto-detected for external hardware performance.

---

## 3. Multi-Pass Overdub Composition & `.WEBM` Video Capture
- **`OVERDUB REC` (`Shift + R`):** Layer multiple improvised passes (organ melodies, anvil rhythms, vowel drags, camera cuts) into a deterministic timeline and export/import `.sonobjet-take.json` files.
- **`CAPTURE .WEBM MUSIC VIDEO`:** Records 60fps HDR-bloomed WebGPU video + direct digital Opus audio from the Master WebAudio Bus.
