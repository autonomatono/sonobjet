# Live Performance, Sensing & Recording Studio

`sonobjet` is playable both as a **self-directing 96-bar audiovisual film** (`SPACE`) and as a **pure live hyper-instrument** (`PURE LIVE INSTRUMENT`).

---

## 1. Keyboard & Mouse Instrument (`KeyboardMouseRig.ts`)

### Transport, Acts & Morph-Follow Camera (`0`, `1`–`8`)
- **`SPACE`** — Start / Pause the 96-bar algorithmic score.
- **`Q W E R T Y`** — Cue Acts I–VI (`Bars 0, 12, 28, 52, 64, 80`) quantized to the next bar downbeat.
- **`0`** — Engage **`MORPH-FOLLOW AUTO-DIRECTOR`** (couples camera flights directly to machine state transformations, combining smooth interior/orbital glides, Hitchcock Vertigo dolly-zoom, and rhythmic cuts).
- **`1`–`8`** — Lock any of the 8 morph-reactive camera rigs (`1` Morph Orbit, `2` Shell Flight, `3` Fault Macro, `4` Non-Euclidean Corkscrew, `5` Cunningham Boom Tracker, `6` Mercury Horizon Dutch, `7` Striker Wrist SnorriCam POV, `8` Polar Mandala Plan).
- **`[` / `]`** — Nudge BPM `-2` / `+2` (re-synthesizes tempo-locked Amen break buffer and retimes the dotted-16th ping-pong delay bus).
- **`TAB`** — Toggle full-bleed Cinema Mode (hides HUD panels).

### 10 Live Synthesis & Morphology Pads (`Z..M , . /`)
Move **Mouse X/Y** across the viewport to control **F-Phrygian pitch height (`Y`)** and **Vowel Formant / Panning (`X`)**:
- **`Z` (`SHOCK ANVIL`)** — Sub-rupture shockwave + radial tectonic plate blast.
- **`X` (`FAULT SHEAR`)** — Metallic fault-shear snare + 180° carapace cluster flip.
- **`C` (`BREAK CHOP`)** — 16-slice Amen/Think breakbeat chopper + IK striker boom lunge.
- **`V` (`CHIME LATTICE`)** — Inharmonic modal chime + ping-pong delay shimmer.
- **`B` (`FORMANT REED`)** — Expressive F-Phrygian formant lead (`A/E/I/O/U` via Mouse X).
- **`N` (`PLASMA CHOIR`)** — Lush 5-voice F-Phrygian polychord swell (`Fm(add9) → Dbmaj7#11 → Bbm9 → C7b9`).
- **`M` (`MONOLITH SUB`)** — West-Coast wavefolded F-Phrygian bass note + core compression.
- **`,` (`ACID SQUELCH`)** — Resonant 303 diode-ladder acid bass note + helical GPU twist impulse.
- **`.` (`GLASS HALO`)** — Shimmering crystalline FM Glass-Armonica tone + photonic capillary bloom.
- **`/` (`GLITCH CHIRP`)** — High-frequency S&H micro-chirp + quantized spatial glitch & scan-band tear.

### Momentary Bus & Optical Fracture FX (`A S D F G J K`)
- **`A` (`GLITCH STUTTER`)** — AudioWorklet sample-repeat freeze + machine kinematic freeze + scan-band glitch tears.
- **`S` (`64TH DRILL`)** — Multiplies score & live triggers into accelerating 64th-note bursts.
- **`D` (`HALFTIME`)** — Drops master clock speed to `0.5x` sludgy industrial halftime.
- **`F` (`COMB SCREAM`)** — Drives tuned Karplus-Strong metallic feedback resonator on the master bus.
- **`G` (`REV SLICE`)** — Reverses breakbeat slices in real time.
- **`J` (`HYPER DILATE`)** — Radially dilates & twists all 4,348 elements outward.
- **`K` (`SHATTER LOCK`)** — Clamps mechanical DOFs + triggers stark graphic stencil contrast (`starkThreshold`).

### Direct Mouse Manipulation
- **Left-Click + Drag** — Directly twists & dilates non-Euclidean geometry while ramping `OPTICAL GLITCH & GRADE` and continuous FM strain; **releasing** after a wide drag triggers a high-velocity slam.
- **Right-Click Drag** (or `Shift` + Drag) & **Scroll Wheel** — Smoothly offsets camera orbit & zoom on any rig (`0` or `1–8`).

---

## 2. Live Optical, Acoustic & Hardware Sensors

- **MediaPipe 2-Hand Optical Tracking (`CAM: HAND`)**: Bundled offline via `vite.config.ts` (`mediapipeWasmPlugin`) — zero external CDN dependency. Maps inter-palm span to `tectonicSpread`, left/right thumb-index pinches to `drillDensity` and `metallicTension` (Acid Q), and fast wrist velocity (`> 2.1`) to mid-air `spine-shear` strikes.
- **Microphone Envelope & Centroid (`MIC: ENV`)**: Maps live room/voice RMS energy to `fractureChaos` and zero-crossing spectral brightness to `mic.centroid`.
- **WebMIDI & Gamepad**: Automatically binds connected MIDI notes (`36–45`), CCs (`1, 2, 74, 71`), and Gamepad sticks/triggers.

---

## 3. Multi-Pass Overdub Recorder & `.WEBM` Master Export

- **Overdub Take Recorder (`R` or `OVERDUB REC`)**: Captures timestamped pad notes, bus FX, macro sweeps, and camera cuts across unlimited layered passes with lossless `.json` export/import.
- **60fps `.WEBM` Master Capture (`CAPTURE .WEBM MUSIC VIDEO`)**: Muxes `canvas.captureStream(60)` (including all TSL post-processing shaders) with the WebAudio master `MediaStreamDestination` into a downloadable `VP9 + Opus` `.webm` music video.
