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

### Turn 3 — Non-Anthropomorphic Architectural Overhaul & Spectacular Music-Synced Cinematography (`BABBAGE // CLAVILUX`)
Addressed user direction to eliminate all anthropomorphism (no skull, eyes, jaw, arms, or spine) in favor of a **Moving-Castle / Acoustic Drop-Forge Factory / Babbage Light-Organ**, paired with a **monumental Piranesian cathedral set** and **music-synced multi-perspective montage cinematography**:

1. **Non-Anthropomorphic 6-District Architectural Sound-Machine (`src/works/gantz-tecton/BabbageLightOrgan.ts`, removed `GantzAutomaton.ts`):**
   - **District 1 (Locomotive Undercarriage & 3 Drop-Forge Trip-Hammers):** Asymmetric cast-iron bogie rolling/heaving on 4 flanged chrome rail wheels, rotating brass cam-barrel, and 3 staggered drop-forge trip-hammers that wind up on `AnticipationCue` and slam brass-capped anvils (`sub-rupture`, `spine-shear`), spraying **220 ballistic floor-bouncing sparks**.
   - **District 2 (Twin Babbage Analytical Cipher Towers):** Framing an open `3.2m` central flythrough atrium ("Nave") with 6 chrome shafts, **48 engraved decagonal brass cipher wheels** (`brassInstanced`), and **48 surgical-chrome carry-levers** stepping by exact `36°` decimal increments (`modal-clang`, `fin-cascade`, `piston-snap`).
   - **District 3 (Overhead Jacquard Punched-Card Loom & Shuttle Carriage):** Reciprocating cast-iron/brass carriage (`shuttleCarriage`, doubling as the rigid **SnorriCam POV mount**) sliding across twin chrome rails, flipping a hexagonal ivory card-prism by `60°`, and firing 16 chrome sensing needles on chopped breakbeat slices (`break-shred`).
   - **District 4 (24-Pipe Asymmetric Chromatic Quartz Light-Organ Crown):** Towering left-battlement bass pipes (`y = +6.9m`) and stepped right-terrace reed pipes (`lightOrganPipeInstanced`) igniting with Scriabin pitch-class HDR plasma and opening hinged brass louvers on every `larynx-lead` solo note and `bellows-choir` polychord.
   - **District 5 (Central 3-Ring Counter-Rotating Dichroic Astrolabe & Brake Shoes):** Suspended inside the central atrium; clamped dead still with friction sparks during `stutter` freezes and Act IV dead-stops.
   - **District 6 (Lateral Accordion Bellows Lung-Vats, Boiler Stack & 8 Catenary Gantry Cables):** `510` total instanced dynamic elements.

2. **Monumental Piranesian Industrial Cathedral (`src/kit/environment/PiranesiFoundry.ts`):**
   - `46m x 32m x 56m` containment cathedral (`far = 160m`) with 9 receding concrete/steel portal arches, two-tier mezzanine catwalk galleries (`y = +2.6m`, `+8.4m`), overhead suspension gantry trusses (`y = +9.2m`), steel rail tracks & wet specular floor mirror channel, and **8 articulated chromatic Light-Organ projection cones** sweeping the cathedral vault in sync with chords & melodies.

3. **Music-Synced Multi-Perspective Montage & Camera Rig (`src/kit/camera/CinemaDirector.ts` + `evaluateGantzMontageCut` in `GantzScore.ts`):**
   - **Mode `0` (`EPIC AUTO-EDIT DIRECTOR`, default) + Keys `1–8` Direct Perspectives:**
     1. `CATHEDRAL WIDE [24mm]`, 2. `INTERIOR NAVE FLYTHROUGH [28mm]`, 3. `MACRO: BABBAGE CIPHER WHEELS [85mm Tele]`, 4. `MACRO: JACQUARD PUNCH-LOOM [50mm]`, 5. `LIGHT-ORGAN QUARTZ CROWN [24mm Low]`, 6. `LOW FORGE: DROP-HAMMERS [18mm Dutch]`, 7. `SHUTTLE POV [SNORRICAM]`, 8. `OVERHEAD ASTROLABE PLAN [70mm]`.
   - **80-Bar Editorial Montage Grammar:** Act I `85mm` cipher-wheel macro -> **Bar 6 Hard Smash-Cut** out to `cathedral-wide` on first Drop-Forge slam -> Nave flythrough; Act II Call/Response cross-cutting; Act III Aria sweeps + Bar 44 Nave Levitation + Bars 46–47 quarter-note smash-cuts; Act IV 64th macro jump-cuts + Beat 4 dead-stop wide cuts + **Bars 56–59 4-Bar Hitchcock Vertigo Dolly-Zoom (`dist * tan(fov/2) = 1.85m`)** + Bar 59 pre-drop silence; Act V overdrive montage; Act VI **6-Bar `1.15m -> 22m` Epic Cathedral Pull-Back**.

### Earlier Foundations (Turns 1–2)
- Custom WebAudio + `FractureWorklet` 11-voice procedural synth & 6-Act F-Phrygian composition (`164 BPM`, Seed Motif `C5–Db5–Ab4–G4–F4`, `Fm(add9) -> Dbmaj7#11 -> Bbm9 -> C7b9`).
- `WebGPUStage` with `THREE.PostProcessing` TSL `bloom()` + vignette, MediaPipe 2-Hand 3D vision (self-hosted WASM + optical fallback), Mic Exciter, WebMIDI/Gamepad, `TakeRecorder` JSON overdubbing, and 60fps `.webm` + Opus `VideoExporter`.

---

## 3. Verification Commands

```bash
npm run typecheck   # 0 errors
npm test            # 11/11 Vitest suites passing (Clock, 6-Act Score & Montage, CinemaDirector Vertigo Zolly & SnorriCam, BabbageLightOrgan 510-element lifecycle, LatticeWork, Recorder)
npm run build       # Builds ./dist + ./dist/mediapipe-wasm cleanly
```

---

## 4. Next Milestones / Potential Directions

1. **Interactive Montage & Score Timeline Editor:** Allow users to sequence custom camera-cut tracks (`1–8`, `vertigo`, `whip`, `hard`) and mutate the F-Phrygian Seed Motif / Jacquard punched-card patterns visually in a collapsible timeline drawer.
2. **Ray-Picked District Inspection & Direct Mechanical Crank:** Click directly on any Babbage Cipher Column, Light-Organ Pipe, or Drop-Forge Trip-Hammer in 3D space to solo/audition that mechanism and lock a custom tracking camera onto it.
3. **Second Monumental Architectural Work:** Author a contrasting acoustic architecture (e.g., an underwater glass-and-mercury Fresnel Lighthouse Harmonium or a brutalist hydroelectric turbine carillon).
