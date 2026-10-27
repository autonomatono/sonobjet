# V11 — Spatial Sequencer Variations & Live-Light Upgrade

**Favored checkpoint:** annotated Git tag `v0.1.3` — `space pinball`

**Default work remains:** `?work=neon-pinball`

V11 keeps the exact V10 Space Pinball result as a named checkpoint, applies shared timing/light/performance improvements to the causal runtime, and adds three contrasting works. The variations are not disconnected visual presets: each has its own blueprint, physical addressing score, composition character, camera map, environment theme and macro defaults.

## 1. Space Pinball checkpoint

Commit `ad2b9a94d3f1502364a10662521fab03cdecc428` is the implementation selected as the first strong Space Pinball version. The annotated repository tag is:

```text
v0.1.3 — space pinball
```

Everything below is learned forward from that point. `NEON PINBALL // BREAKCORE COMPUTER` remains the default work and its original V10 document remains in [`V10_NEON_PINBALL.md`](V10_NEON_PINBALL.md).

## 2. Shared live-performance changes

### 2.1 Grid-by-default physics notes

The shared Modal Flow runtime now exposes the `eventQuantize` macro and a top-bar **GRID [U] / FREE [U]** switch.

- `GRID` is the default for every V8–V11 Modal Flow variant.
- Scripted physical score events already occur on transport boundaries and are not moved again.
- Unscripted marble, collision and mechanism notes are scheduled onto the next work-specific grid line.
- Space Pinball and Lumen Grid use 1/16-note units (`4` transport steps of 1/64).
- Chaos Vector uses 1/32-note units (`2` steps).
- Antarctica uses 1/8-note units (`8` steps).
- Electric arcs and glitch chirps are intentional free-time effects and bypass the grid.
- Held stutter/ratchet performance effects also bypass normal quantization.
- `FREE` restores the previous completely unconstrained timing for every physical event.

The physics happens immediately and visibly; only the resulting musical note waits for its grid point. This preserves cause-and-effect while avoiding accidental flam/smear in dense passages.

The pure function `quantizePhysicsAudioTime()` documents and tests the conversion from physical event beat to future WebAudio time.

### 2.2 Zero-overlay performance mode

**TAB** or the top-bar **PERFORM** button toggles `body.performance-clean`.

While active:

- the full Studio HUD, including the top bar, disappears;
- the Director root disappears;
- work-owned Drone telemetry disappears;
- keyboard/mouse performance remains active;
- MediaPipe, mic, MIDI and gamepad polling continue;
- score transport and procedural cameras continue;
- `SPACE`, `U`, live pads, punch FX and all other shortcuts continue working.

Opening Director with backquote deliberately exits clean performance mode so an invisible Director can never capture the input rig.

## 3. Shared visual-light vocabulary

### 3.1 Scale hierarchy

Space Pinball and every new variation now use a strong size hierarchy rather than uniformly sized organs.

- Space Pinball's fixed organs use a deterministic scale profile from compact relay counters to a dominant central analog computer and percussion/pinball fields.
- Orbital crystal scales span approximately `0.38` to `1.33` before work-specific transforms.
- Lumen Grid ranges from small note vertices to a clock/source and harmony processor more than five times larger.
- Chaos Vector compounds the profile through a clamped nonlinear transform, producing more than a ten-to-one scale range.
- Antarctica contrasts broad ice/pressure organs with small snow-crystal satellites.

Scale remains causal: larger housings change visible collars, local lights, instrument parts and spatial conduit mouth offsets.

### 3.2 Liquid neon in every open tube

`ModalFlowMachine` adds two or three additive light packets to every open-stage conduit.

- Resonant and pneumatic paths carry three packets; other paths carry two.
- Packet position is sampled from the exact same `ConduitSampler` curve used by marbles, tube meshes and camera endpoints.
- Edge speed and live `ModalFlowPhysics.getEdgeFlow()` control travel rate and packet length.
- Six colors distinguish low, harmonic, control and return lanes.
- The packet is oriented to the local curve tangent and stretches like liquid light instead of reading as another steel ball.

These signals make bass, synth, harmonic-memory and control paths readable even when a physical ball is elsewhere in the graph.

### 3.3 Polychrome moving light volumes

Every open environment now contains eight independent chromatic movers:

- four actual moving point lights;
- four moving spot lights with independently moving targets;
- four transparent additive cone volumes that make the spot fields visible;
- six-color theme palettes with continuous per-light crossfades; and
- event-reactive intensity without forcing one global scene tint.

The four shadow projectors remain separate and continue casting physical shadows onto distant sails/floor.

### 3.4 Constellations, Tesla plasma and fireflies

The background is now a musical field rather than static decoration.

- A 54-node line constellation rotates slowly and changes opacity with audible event density.
- A deterministic 56-segment Tesla network deforms faster and brighter during events.
- A 120-point musical firefly field drifts independently in arcade/constellation/plasma themes.
- The glacial theme uses 180 slower snow/firefly points.
- The existing 960-point charge field now has per-vertex six-color data instead of a single cyan tint.
- Existing remote rails, particles, shadow sails and gobos remain.

## 4. Variation 01 — LUMEN GRID // 3D GEOMETRIC SEQUENCER

**URL:** `?work=spatial-trance`

**Tempo/form:** 126 BPM, 48 bars, six eight-bar sections

**Intent:** a simple, readable demonstration inspired by the general geometric-sequencer idea associated with tools such as Midinous, expanded into physical 3D space.

### Blueprint

- 18 default modules; scalable to 40.
- 28 balls rather than Space Pinball's 72.
- 24 core conduits with mostly direct/arc paths and limited helix/weave emphasis.
- Eight transmissions.
- Strongly separated clock, router, gate, pulse, bass, chord, melody A/B, harmony, light, loom, bell, sink and return roles.
- `constellation` environment theme.
- 14.2-unit camera envelope.

### Six explanatory sections

1. **CLOCK POINT** — one large source establishes the pulse.
2. **ROUTE TRIANGLE** — router, gate and offbeat pulse become audible/visible.
3. **MELODY TETRAHEDRON** — two crystal vertices exchange a short C-minor contour.
4. **HARMONY CUBE** — one chord per bar joins the readable bass/melody loop.
5. **LIGHT PHASE** — liquid signals and constellation/light response become foreground.
6. **LOOP RESOLUTION** — the graph closes through collector and return.

The score is intentionally restrained (more than 500 but fewer than 1,800 physical cues) so one can watch a route and predict what it will sound like.

## 5. Variation 02 — CHAOS VECTOR // BRAINDANCE COLLIDER

**URL:** `?work=braindance-collider`

**Tempo/form:** 188 BPM, 72 bars, six twelve-bar sections

This is an original high-density algorithmic jungle/braindance composition. It uses broad traits—co-prime rhythm streams, chopped breaks, crooked acid, asymmetrical microtiming and recursive physical routing—rather than copying any specific recording.

### Blueprint

- 40 default modules and 96 balls.
- Nonlinear XYZ twist applied to the learned Space Pinball topology.
- More than ten-to-one visual scale contrast.
- Eight extra cross-conduits.
- Four extra ratchet/solenoid/music-box/bell-crank transmissions (21 total).
- `plasma` environment theme and 18.5-unit camera envelope.

### Composition

- More than 6,000 physical cues.
- A learned Space Pinball spine is recomposed across new 12-bar forms.
- Co-prime 3-, 5- and 7-step lanes create continuously changing composite rhythm.
- Deterministic reverse slices and dense ratchets remain causally addressed.
- Normal physical events use a 1/32 grid.
- Explicit `arc-discharge` and `glitch-chirp` lanes are free-time exceptions.
- Final 32-step garbage-collection cascade drains through four physical organs.

## 6. Variation 03 — ANTARCTICA // SUBGLACIAL LIGHT

**URL:** `?work=antarctica`

**Tempo/form:** 54 BPM, 48 bars, six eight-bar sections

### Blueprint

- 24 default modules including six snow/ice satellites.
- 18 balls.
- Slow conduit speeds and restrained transmission energy.
- `glacial` environment theme.
- 15.8-unit camera envelope.
- Ice, tide, brine, underwater computer, aurora and deep-return naming/roles.

### Composition

- Open-D pentatonic material.
- Sparse sub-pressure events.
- Long glass-armonica notes and physical four-note bellows chords.
- Distant bells at four-bar boundaries.
- Slow aurora events and occasional tide-code ticks.
- No programmed `break-shred` voice.
- Fewer than 260 score cues across the complete 48 bars.
- Ambient composer character reduces free-event probability/velocity and lengthens tonal decay.
- 1/8-note physical grid by default, with `U` still available for free drift.

### Sections

1. **WHITE HORIZON**
2. **UNDER THE SHELF**
3. **BRINE CHANNELS**
4. **AURORA WITHOUT WIND**
5. **BLUE PRESSURE**
6. **RETURN TO STILLNESS**

## 7. Implementation files

### Shared runtime

- `src/works/modal-flow/ModalFlowBlueprint.ts`
- `src/works/modal-flow/ModalFlowPhysics.ts`
- `src/works/modal-flow/ModalFlowMachine.ts`
- `src/works/modal-flow/ModalFlowMechanismLayer.ts`
- `src/works/modal-flow/ModalFlowWork.ts`
- `src/works/neon-pinball/NeonPinballComposer.ts`
- `src/studio/input/KeyboardMouseRig.ts`
- `src/studio/ui/StudioShell.ts`
- `src/studio/ui/styles.css`
- `src/main.ts`

### Lumen Grid / Antarctica

- `src/works/spatial-sequencer/SpatialSequencerBlueprint.ts`
- `src/works/spatial-sequencer/SpatialTranceScore.ts`
- `src/works/spatial-sequencer/SpatialTranceWork.ts`
- `src/works/spatial-sequencer/AntarcticScore.ts`
- `src/works/spatial-sequencer/AntarcticWork.ts`

### Chaos Vector

- `src/works/braindance-collider/BraindanceBlueprint.ts`
- `src/works/braindance-collider/BraindanceScore.ts`
- `src/works/braindance-collider/BraindanceWork.ts`

### Verification

- `tests/v11.test.ts`

The V11 tests cover scale hierarchy, liquid-light packet count, atmospheric object registration, rig parenting, pure grid-time conversion, all three blueprint themes/populations, score density/sparsity, free-electric exception lanes, physical chord metadata, composer character and clean scene disposal.
