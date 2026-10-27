# SONOBJET Engine Architecture

## 1. System Overview

`sonobjet` is structured as a modular audiovisual game engine where each **Work** (`WorkDefinition`) is a self-contained performance scene and interactive music video composed from four decoupled layers:

```text
src/
├── engine/
│   ├── core/        # Clock (with AnticipationQueue), SonobjetCore, ModulationMatrix, WorkRegistry
│   ├── audio/       # AudioEngine, SynthRack (11 architectural/tonal/percussive voices), FractureWorklet
│   └── render/      # WebGPUStage (WebGPURenderer + TSL HDR Bloom & Vignette), TSLMaterials (8-shader palette)
├── kit/
│   ├── kinematics/  # ScalarSpring, CAD detent quantization
│   ├── sequencer/   # Bjorklund Euclidean generator, exponential/decelerating ratchet bursts, break chopper
│   ├── camera/      # CinemaDirector (8 multi-scale rigs + Auto-Edit Montage + SnorriCam + Vertigo Zolly)
│   │                # & KineticCameraRig (orbital rig for Etude 02)
│   └── environment/ # PiranesiFoundry (46x32x56m cathedral, 9 portal arches, catwalks, 8 chromatic beams)
│                    # & BrutalistChamber (compact gantry chamber for Etude 02)
├── studio/
│   ├── input/       # KeyboardMouseRig (F-Phrygian modal performance pads, 0..8 camera cuts, strain/slam)
│   ├── sensors/     # MediaPipeSensor (2-hand 3D + optical fallback), MicSensor, MidiGamepadSensor
│   ├── recorder/    # TakeRecorder (multi-pass JSON overdub), VideoExporter (60fps WebM + Opus)
│   └── ui/          # StudioShell + Live Camera Lens/Shot Telemetry & Signal HUD
└── works/
    ├── gantz-tecton/      # POC 01: BABBAGE // CLAVILUX (6-district factory/light-organ + 80-bar 6-Act score)
    └── lattice-pendulum/  # Etude 02: PHASE // LATTICE (48-pendulum coprime polyrhythmic modal steel array)
```

---

## 2. Dual-Domain Clock & Mechanical Anticipation (`Clock.ts`)

Real drop-forges, cam-barrels, and pneumatic bellows never teleport instantaneously on an acoustic transient—they **crank upward and inflate before striking**.

`Clock.ts` coordinates three synchronized timelines:
1. **WebAudio Lookahead (`95 ms` window, `1/64`-note resolution):** Schedules sample-accurate synthesis events ahead on `AudioContext` so rapid breakcore ratchets never jitter.
2. **Pre-Strike `AnticipationCue` Queue:** Score steps emit `AnticipationCue`s (`leadTimeSec = 0.25..0.55 s` ahead of major impacts) paired with reverse-envelope `windup-inhale` audio events, allowing `BabbageLightOrgan` to physically crank its Drop-Forge Trip-Hammers upward and expand its lateral bellows before `t = 0`.
3. **DAC-Locked Visual Presentation Queue:** Releases impact `ImpulseEvent`s on the exact animation frame when `ev.audioTime <= audioNow + 0.004`.

---

## 3. Music-Synced Multi-Perspective Cinematography (`CinemaDirector.ts`)

`CinemaDirector.ts` decouples editorial montage grammar from physical machine animation:
- **8 Specialized Camera Rigs (`1–8`):** Ranges across two orders of spatial scale—from **`1.55m` / `85mm` Telephoto Macros** on clicking Babbage decimal wheels (`macro-babbage`) and **`50mm` Jacquard Loom** close-ups (`macro-jacquard`), to **`28mm` Interior Nave Flythroughs** threading straight through the `3.2m` central canyon (`Z = +5.4m -> -5.2m`), **Rigid SnorriCam POV** (`carriage-snorricam`) transforming local camera coordinates via `shuttleCarriage.localToWorld()`, and **`24mm` Monumental Cathedral Wide** crane sweeps (`16.8m..22m`).
- **Editorial Transitions (`hard`, `whip`, `glide`, `vertigo`, `epic-pullback`):**
  - **Hard Smash-Cuts (`hard`):** Instant zero-latency frame cuts on downbeats, snares, and Act IV dead-stops.
  - **Hitchcock Vertigo Dolly-Zoom (`vertigo`):** Enforces the optical invariant $d(t) \cdot \tan(\theta_{\text{fov}}(t)/2) = 1.85\text{ m}$ as $\theta_{\text{fov}}$ narrows from $72^\circ \to 17^\circ$, keeping the central Dichroic Astrolabe constant in frame while the 9 receding Piranesian portal arches warp dramatically inward during Bars 56–59.

---

## 4. Non-Anthropomorphic Architectural Synthesis (`BabbageLightOrgan.ts` + `SynthRack.ts`)

Every procedural WebAudio voice actuates a dedicated mechanical/optical district (`510` instanced elements, zero external samples):
- **`larynx-lead` & `bellows-choir` -> 24-Pipe Chromatic Quartz Light-Organ Crown:** Formant-filtered reed/pipe leads and 5-voice modal polychords (`Fm(add9)`, `Dbmaj7#11`, `Bbm9`, `C7b9`) ignite matching smoked-quartz pipes with Scriabin pitch-class HDR plasma (`instanceColor` in `lightOrganPipeInstanced`) and flip open hinged brass louvers while tinting the 8 cathedral projection beams in `PiranesiFoundry`.
- **`modal-clang`, `fin-cascade`, `piston-snap` -> Twin Babbage Analytical Cipher Towers:** Steps 48 engraved decagonal brass wheels by exact `36°` (`2π/10`) decimal increments and kicks surgical-chrome carry-levers inward.
- **`break-shred` -> Overhead Jacquard Punched-Card Loom & Shuttle Carriage:** Advances the hexagonal ivory card-prism by `60°`, slams the shuttle carriage across twin chrome rails, and plunges 16 chrome sensing needles.
- **`sub-rupture` & `spine-shear` -> 3 Cam-Driven Drop-Forge Trip-Hammers & Locomotive Bogie:** Drops staggered cast-iron hammers onto brass-capped anvils, spraying 220 floor-bouncing sparks and driving spring-damped heave into the flanged rail wheels.
- **`arc-discharge` & `core-implode` -> Central 3-Ring Counter-Rotating Dichroic Astrolabe & Hydraulic Brake Shoes.**

---

## 5. Custom TSL Shader Rig & WebGPU HDR Bloom (`TSLMaterials.ts` + `WebGPUStage.ts`)

- **`TSLMaterials.ts`:** Compiles tactile node materials natively to WGSL (WebGPU) and GLSL (WebGL2 fallback), including `lightOrganPipeInstanced` (fresnel smoked quartz + per-instance animated plasma wave emission), `brassInstanced` (radial gear-tooth graduations + aged patina), `boneCarapace` (punched Jacquard ivory), `forgedIron` (anvil-heat ember glow), `surgicalChrome`, and `visceralFilament`.
- **`WebGPUStage.ts`:** Runs `THREE.PostProcessing` combining `pass(scene, camera)` + TSL `bloom()` + chiaroscuro vignette inside an extended `160m` far-plane Piranesian fog envelope.
