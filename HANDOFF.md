# Session Handoff — `sonobjet`

> **Continuity Protocol:** Updated at the conclusion of every turn so work can resume seamlessly if interrupted.

## 1. Current Repository & Deployment Status
- **Repository:** `autonomatono/sonobjet` (`/home/user/sonobjet`)
- **Active Working Branch:** `arena/86769aaf-sonobjet` (fixed session branch — never switch or rename)
- **Live GitHub Pages URL:** `https://autonomatono.github.io/sonobjet/`
- **Local Dev Preview Server:** Running via `start_process` (`Website` / `sonobjet-studio-e141a86a`, `npm run dev` bound to `0.0.0.0:5173`)

## 2. Completed Architecture & V4 Overhaul (`HYPER // TECTON`)

### A. Complete 96-Bar Hypermetric Phrase Resolutions & Expanded 14-Voice Synth
- **Fixed Both Premature Section Transitions (`src/works/gantz-tecton/GantzScore.ts`, `GANTZ_TOTAL_BARS = 96`)**:
  - **Act III → Act IV (`Bars 28–51` → `Bar 52`)**: Expanded Act III to `24` bars (`3 × 8` complete cycles of `CHORD_CYCLE_8BAR` & `ARIA_MELODY_8BAR`). `Bars 44–47` suspend the drums in celestial harmonic bloom, while `Bars 48–51` finish the second half of the 3rd 8-bar cycle (`Bbm9 → C7b9`, hitting the `E4` leading tone in `Bar 51`) with gated glitch-stutter polychords, rising 303 acid, and a `Bar 51` mechanical wind-up/ratchet handoff into Act IV.
  - **Act V → Act VI (`Bars 64–79` → `Bar 80`)**: Expanded Act V (`64–79`) and Act VI (`80–95`) to `16` bars (`2 × 8`) each so Act V's second thematic pass (`Bars 72–79`) plays out its entire 8-bar progression and `Bar 79` grand cadential drum/glitch roll before resolving cathartically onto tonic `Fm9` at `Bar 80`.
- **3 New Voices + Stereo Ping-Pong Delay (`src/engine/audio/SynthRack.ts`)**:
  - **`acid-squelch` (`playAcidSquelch`)**: Resonant dual-cascaded 303 diode-ladder bass/arp synth with fast accent filter sweep and wavefolded bite.
  - **`glass-armonica` (`playGlassArmonica`)**: High-register inharmonic FM (`1 : 2.998`) crystalline halo voice routed into dotted-16th ping-pong delay and chamber reverb.
  - **`glitch-chirp` (`playGlitchChirp`)**: Quantized sample-and-hold stepped FM micro-chirp & digital click bursts scattered across transitions and off-beats.
  - **`initPingPongDelay(bpm)`**: Tempo-synced stereo ping-pong delay (`3 × step16` left, `2 × step16` right, bandpass-filtered feedback loop).

### B. Orders-of-Magnitude Visual Complexity, Non-Euclidean Shaders & Coupled State Machines
- **`HyperTectonMachine.ts` (`4,092` Dynamic Parts) + `SurrealCyberVault.ts` (`256` Morphing Monoliths + `12` Laser Curtains) = `4,348` Elements**:
  - Non-anthropomorphic, non-historic futuristic sound megastructure inspired by *Gantz Graf* and Chris Cunningham (`1,536` glossy ceramic/obsidian tectonic carapace lamellae, `1,024` surgical-chrome micro-needles, `768` photonic capillary filaments, `512` nested gyro-blades, `192` orbiting shards, geodesic singularity core, and `6` 2-link analytical-IK Cunningham robotic striker booms).
  - **Two-Tier State Machines**: 6-state Macro-Morphology machine (`FOLDED_MONOLITH`, `CANTILEVER_STRIKER`, `INVERTED_CATHEDRAL`, `NON_EUCLIDEAN_HELIX`, `QUANTIZED_SHATTER`, `SINGULARITY_CROWN`) coupled with 16 independent Fault-Cluster sub-state machines (`DORMANT`, `WINDUP`, `EXTRUDE`, `INVERT_FLIP`, `SHATTER_JITTER`, `HARMONIC_BLOOM`).
  - **GPU TSL Non-Euclidean Vertex Shaders (`src/engine/render/TSLMaterials.ts`)**: Real-time `positionNode` spatial helix torsion (`nonEuclideanTwist`), quantized 3D block shear (`spatialGlitch`), and radial shockwaves (`acousticRipple`).

### C. State-Tracking Camera Choreography & Stylized TSL Post-Processing
- **Morph-Following Camera Director (`src/kit/camera/CinemaDirector.ts`)**: Reads live `HyperTectonAnchors` (`envelopeRadius`, `interiorRadius`, `verticalSpan`, `primaryBoomTip`) every frame so orbital, interior-flight, boom-tracking, and Wrist-SnorriCam rigs physically glide alongside the machine as it changes topology (`morph-follow`, `vertigo`, `epic-pullback`, `whip`, `hard`).
- **Stylized TSL Post-Processing (`src/engine/render/WebGPUStage.ts`)**: `convertToTexture` + `Fn` shader pass implementing barrel lens distortion, quantized scan-band glitch displacement, radial RGB chromatic aberration, HDR bloom, silver-halide bleach-bypass grading, stark stencil thresholding, and 35mm film grain — controllable live via the `OPTICAL GLITCH & GRADE` macro and audio/score events.

## 3. Verification Status
- `npm run typecheck` (`tsc --noEmit`): **0 errors**.
- `npm test` (`vitest run`): **12 / 12 tests passing** (covering 96-bar Act III & Act V phrase completions, 3 new voices, 4,348-part morphology state transitions, envelope-tracking camera + Vertigo Zolly + Wrist SnorriCam, and PostFX uniforms).
- `npm run build` (`vite build`): Clean production bundle in `dist/` with offline MediaPipe WASM assets.

## 4. Next Potential Directions
1. **Per-Section Custom TSL Color Palettes & Negative-Inversion Flash Frames**: Add sub-frame negative-inversion flashes on major structural state flips and optional user-selectable grading presets (e.g., *Cunningham Silver*, *Cobalt Xerox*, *Stark Stencil*).
2. **Visual Timeline Scrubbing & Loop-Region Bracket**: Click-to-scrub and loop-region selection directly on the 96-bar Act transport strip for rapid composition iteration.
3. **Third Experimental Work (`03`)**: Add a fluid-ferrofluid / cybernetic string-quartet chamber work utilizing the shared `MorphState` + `TSLMaterials` vertex-torsion toolkit.
