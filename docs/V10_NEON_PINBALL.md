# V10 — NEON PINBALL // BREAKCORE COMPUTER

**Status:** implemented on `arena/ebe788b1-sonobjet`.

**Default work:** `?work=neon-pinball`

**Chosen checkpoint:** annotated tag `v0.1.3` — `space pinball`. Shared timing, lighting, liquid-tube and performance-mode upgrades added after that checkpoint are documented in [`V11_SPATIAL_VARIATIONS.md`](V11_SPATIAL_VARIATIONS.md).

V10 is a new work built on the deterministic marble/transmission foundation introduced by Modal Flow V8/V9. It is not a reskin of the Cornell relay. The new installation is an open-space retrofuturistic analog computer crossed with an elaborate pinball machine, with a new 64-bar physics-first breakcore / IDM / drum-and-bass composition at 174 BPM.

## 1. Spatial machine language

V9 intentionally organized mechanisms onto decks inside a Cornell room. V10 removes both constraints.

- The twenty fixed organ specifications carry independent XYZ Euler rest orientations.
- Twelve default satellites occupy a deep golden-angle / Lissajous crystal orbit.
- Module elevation spans more than fourteen world units, with comparable width and depth.
- The old horizontal plinth is replaced by mutually tilted torque buses, gimbals and a sparse radial truss.
- Every freeform organ is held by a compact three-axis gimbal rather than a floor pedestal.
- The default blueprint contains 32 addressable modules and can grow to 72.

### Arbitrary conduit mouths

`ModalFlowBlueprint.spatialPorts` activates the V10 conduit sampler.

For each edge, the sampler:

1. hashes the edge and input/output role;
2. chooses a deterministic point around the destination housing;
3. rotates that point by the module's XYZ rest orientation;
4. constructs an edge-local orthonormal frame from the source-to-destination direction; and
5. bends `arc`, `sag`, `helix` or `weave` paths in that local frame.

No global up axis is privileged. Tube openings therefore do not share a plane, and tubes can enter any face of a tilted mechanism. Visible collars are generated from each curve's endpoint tangent.

V9 sets `spatialPorts: false`, preserving its original conduit geometry and tests.

## 2. Instrument organs

The fixed V10 machine combines the preserved marble cycle with these new physical families:

- **RATCHET LOGIC REGISTER** — eighteen-tooth local ratchet plus a 24-pulse transmission ratchet and pawl.
- **BREAK PERCUSSION MATRIX** — kick/snare shells, cymbal bodies, a shared striker and seven-coil break solenoid transmission.
- **VERTICAL PINBALL FIELD** — inclined playfield, seven bumpers, two animated flippers and a camshaft drive.
- **CURVED BELL CHOIR** — ten differently scaled open bells and clappers on a curved support rail.
- **BELL RATCHET RELAY** — a second logic counter feeding the choir.
- **CRYSTAL MEMORY A/B** — sound-reactive octahedral crystal clusters inside counter-oriented gimbals.
- **ORBITAL CRYSTALS** — twelve default remote crystal/neon satellites connected by woven resonant tubes.
- **MUSIC-BOX DATA LOOM** — a rotating pinned cylinder with forty-two pins and a fourteen-tine comb.
- **ANALOG PATCH COMPUTER** — six animated CV dials, vacuum-tube lamps and physical patch-bus connections.
- **ACID CV DIAL BANK** — the low-register analog sequencer voice.
- **SOUND-ACTIVE NEON REEDS** — twelve emissive reeds and two tilted photon halos.
- **ORBITAL CYMBAL BATTERY** and **SUB BASS RESONATOR** — physical percussion and low-frequency anchors.

All visible parts remain beneath named `KinematicRig` joints. Sound-producing score events call `flashModule`, so audible activity moves hammers/rotors and energizes local light materials in return.

## 3. Expanded transmission language

The V10 blueprint declares seventeen non-marble transmissions. It retains:

- `gear-train`
- `belt`
- `chain`
- `camshaft`
- `four-bar`
- `nested-ring`

and adds:

- `ratchet` — spoked ratchet, directional teeth and physical pawl;
- `music-box` — rotating pin barrel against a comb;
- `bell-crank` — crank wheel, rocking arm and five-bell bank; and
- `solenoid` — sequencer shaft, seven coils and striker row.

`ModalFlowPhysics` advances every transmission from upstream module energy, ratio, efficiency and section focus. Tooth/pin/coil crossings remain deterministic physical `mechanism` events.

## 4. Physics-first 174 BPM song

`NeonPinballScore.ts` contains a deterministic 64th-note **mechanical addressing program**, not an audio backing track.

At each relevant transport step it queues an actuator command containing:

- the named physical target;
- energy;
- optional break-slice index;
- optional reverse flag;
- optional ratchet position/length; and
- optional pitch metadata.

The command reaches `ModalFlowSceneInstance.triggerImpulse`, which injects energy into the named module. `ModalFlowPhysics` emits a new `energy` event from that receiving organ and carries the metadata forward. Only then may `NeonPinballComposer` produce a WebAudio impulse. Every programmed kick, amen slice, acid note, bell and crystal note therefore has a machine-space cause.

Free-running marbles, collisions and transmission crossings are separately rationed into fills and ghost notes around the programmed spine.

### Six sections

| Bars | Section | Musical / physical function |
| ---: | --- | --- |
| 0–7 | **COLD BOOT / ATTRACT MODE** | Sparse magnetic kicks, relay checks, bell code and crystal boot tones |
| 8–19 | **PINBALL BREAK-IN** | Two-step DnB spine, pinball switching and first chopped break slices |
| 20–31 | **CRYSTAL MEMORY BUS** | Glass arpeggios, acid CV and pinned-cylinder data readout |
| 32–43 | **RATCHET BUFFER OVERFLOW** | Deterministic 32nd/64th ratchets, reverse slices and logic overrun |
| 44–55 | **NEON HIGH-SCORE CASCADE** | Full break, sub, acid, bells, crystals and sound-reactive neon convergence |
| 56–63 | **TILT / MAGNETIC POWER-DOWN** | Cross-organ TILT fill, ball drain and crystal/neon decay |

The procedural break kit, sub rupture, piston snap, modal bell, acid squelch, glass armonica and arc-discharge voices are reused from the zero-sample `SynthRack`.

## 5. Open environment and macro camera

The close Cornell shell is not used by this work.

The V10 environment contains:

- one distant 72 × 72 floor at `y = -16` for long shadows;
- four isolated 12 × 9 projection sails at different positions and orientations;
- four independent long-range shadow-casting projector lanes;
- four rotating perforated shadow wheels;
- six remote neon coordinate rails;
- a deterministic 960-point additive charge/dust field; and
- open space in every direction between those sparse receivers.

The charge field reacts to audible-event count: sound changes point size and opacity, while environmental neon materials change emissive energy.

`MachineCameraSource.getCameraEnvelopeRadius()` lets the shared graph camera frame larger works. V10 publishes a 14.5-unit envelope, giving macro shots roughly a 23-unit orbit rather than the old fixed 12.8-unit orbit. The camera far plane remains 220 units.

### Camera modes

- `0` — adaptive whole-machine orbit
- `1` — inertial Drone Pilot
- `2` — pinball switchyard
- `3` — ratchet register
- `4` — break percussion matrix
- `5` — music-box data loom
- `6` — crystal memory bus
- `7` — curved bell choir
- `8` — sound-active neon reeds

The Drone overlay now occupies the top-center safe area beneath the section timeline. It no longer covers the left sidebar or bottom performance deck.

## 6. Director and HUD usability

The main top bar now includes two explicit entry points:

- **LOOKS / LIGHTS** — enables Director Studio and opens `LOOKS` immediately;
- **DIRECTOR [`]** — toggles the complete Director Studio.

The former floating Director button is hidden to avoid duplicate placement.

The following UI regions can be shown/hidden independently:

- `L` — left telemetry/macros/sensors/patches;
- `R` — right cameras/recording/export;
- `TIME` — score timeline;
- `PADS` — performance pad/punch deck;
- Director sidebar — header `−/+` button;
- Director timeline — `−/+ TIMELINE` button.

The Director sidebar also has an explicit close button. `LOOKS` continues to expose render presets, palette, physical light rig, exposure, light energy, shadow depth and independent effect toggles.

## 7. Main implementation files

- `src/works/neon-pinball/NeonPinballBlueprint.ts`
- `src/works/neon-pinball/NeonPinballScore.ts`
- `src/works/neon-pinball/NeonPinballComposer.ts`
- `src/works/neon-pinball/NeonPinballWork.ts`
- `src/works/modal-flow/ModalFlowBlueprint.ts`
- `src/works/modal-flow/ModalFlowPhysics.ts`
- `src/works/modal-flow/ModalFlowMachine.ts`
- `src/works/modal-flow/ModalFlowMechanismLayer.ts`
- `src/works/modal-flow/ModalFlowWork.ts`
- `src/works/astrarium-modular-engine/MachineCameraDirector.ts`
- `src/studio/ui/StudioShell.ts`
- `src/studio/ui/styles.css`
- `src/studio/director/DirectorStudioUI.ts`
- `src/studio/director/DirectorSystem.ts`
- `src/studio/director/director.css`
- `tests/v10.test.ts`

## 8. Verification contract

`tests/v10.test.ts` verifies:

1. open-stage metadata, non-coplanar module orientations and spatial conduit mouths;
2. all requested ratchet/bell/crystal/percussion/loom/pinball/computer/neon families;
3. all four new transmission kinds;
4. the 64-bar, 174 BPM deterministic cue program and dense breakcore population;
5. score metadata crossing the physics boundary before synthesis;
6. physical-origin break, crystal and neon impulses;
7. four shadow sails, four gobos and one charge-particle field;
8. named/parented mechanism joints; and
9. V10 graph/physics registry integration and clean disposal.

The complete suite remains backward-compatible with V5–V9.
