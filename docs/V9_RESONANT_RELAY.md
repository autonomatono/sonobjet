# V9 — `MODAL FLOW // RESONANT RELAY`

**Status:** implemented, verified and deployed from `arena/ebe788b1-sonobjet`.

**Implementation commit:** `aaba52e`; **green Pages CI run:** `40579026761`; **live URL:** `https://autonomatono.github.io/sonobjet/`.

**Default work:** `?work=modal-flow`

V9 keeps the V8 deterministic marble engine, D-Lydian event composer, routing wheel, module growth and drone camera. It adds a second physical signal network and a new visual-direction layer: tubes now coexist with gears, belts, four-bar linkages, camshafts, chains and nested rings inside an open-front Cornell-box machine room.

---

## 1. Creative rule

> An animated object can generate music, and a musical event must remain visible in the object that produced it.

The installation therefore has two coupled causal loops:

```text
sparse score energy → module energy → marble motion → physical impact
                                     ↘ transmission motion → tooth/lug/cam pulse
impact or pulse → ModalFlowComposer phrase gate → WebAudio note
              ↘ module flash / hammer / practical light / camera shock
```

The transmission system is not decorative rotation. Each link:

1. reads upstream module energy;
2. advances a deterministic physical phase;
3. transfers a lossy amount of energy downstream;
4. emits an event when a tooth, lug, cam lobe or linkage cycle crosses a boundary;
5. animates from that exact phase; and
6. becomes inspectable in both Machine Graph and Physics Registry.

Marbles remain essential, but they are no longer the only form of visible musical causality.

---

## 2. Mechanical transmission blueprint

`ModalFlowBlueprint.ts` adds `TransmissionSpec`:

```ts
interface TransmissionSpec {
  id: string;
  label: string;
  from: string;
  to: string;
  kind: 'gear-train' | 'belt' | 'four-bar' | 'camshaft' | 'chain' | 'nested-ring';
  ratio: number;
  pulses: number;
  efficiency: number;
  scale: number;
  section: number;
  color: number;
}
```

The default machine has ten non-marble paths:

| Path | Type | Foreground section | Physical/musical action |
| :--- | :--- | :--- | :--- |
| Crank → lift | Gear cascade | II | three intermeshing reductions generate tooth pulses |
| Lift → aqueduct | Crossed belt | II | animated belt lugs carry lift energy upward |
| Aqueduct → diverter | Gear train | III | compact bevel-like relay drives routing |
| Diverter → gate | Camshaft | IV | five offset lobes articulate gate followers |
| Gate → tines | Exact four-bar | IV | crank, coupler and rocker transmit strike timing |
| Tines → bowl | Nested rings | V | three non-coplanar rings relay resonant energy |
| Diverter → chimes | Belt | III | pitch-belt lugs feed the chime orchard |
| Diverter → drums | Four-bar | V | slower rocker linkage generates low pulses |
| Collector → return | Ladder chain | VI | visible chain links carry return energy |
| Return → crank | Gear regenerator | I | closes the mechanical energy loop |

Three new focus targets frame the gear cascade, four-bar striker and shadow chain. The main camera modes `2–8` now prioritize the upper tubework, gear cascade, four-bar striker, nested resonator, shadow chain, neon chimes and return spiral.

---

## 3. Deterministic mechanism physics

`ModalFlowPhysics.ts` stores an unwrapped turn value and decaying energy value for every transmission.

At each fixed `1/90s` solver step:

- speed derives from flow rate, governor energy, upstream module energy, signed ratio magnitude and current section focus;
- upstream energy is multiplied by each link's efficiency and delivered to its target module;
- `floor(turns × pulses)` detects exact mechanical crossings without frame-rate dependence;
- a crossing emits `PhysicsSongEvent.kind = 'mechanism'` with its real midpoint, speed, energy, source identity and note-role index;
- telemetry publishes `mechanismPulseCount` and `transmissionCount`;
- `getTransmissionPhase()` and `getTransmissionEnergy()` expose the same state to rendering and authoring.

`ModalFlowComposer` gives mechanism events a moderate event weight (`0.74`), so they compete with marble strikes rather than flooding the score. Timbre follows mechanism identity:

- gears → `modal-clang`;
- belts/chains → `fin-cascade`;
- cams → `arc-discharge`;
- four-bars → `piston-snap`;
- nested rings → `glass-armonica`.

All existing global event budgets, module cooldowns and phrase rests remain active. The no-mewing rule remains preserved: `larynx-lead` and `bellows-choir` are still excluded.

---

## 4. Parented mechanism layer

`ModalFlowMechanismLayer.ts` builds the new installation under one `mechanismFrame` joint in the existing `KinematicRig`.

### Visible mechanisms

- cloned CAD-style spoked/toothed gear geometry;
- paired pulleys, continuous belt rails and phase-animated lugs;
- ladder-chain links following a closed path;
- exact four-bar solutions using `solveFourBar()` with dynamically fitted crank, coupler and rocker meshes;
- camshafts with alternating two/three-lobe profiles and physical followers;
- three nested, non-coplanar resonator rings;
- rigid torque rails and bearing collars between every source/destination pair.

The layer takes phase only from `ModalFlowPhysics`; it does not run a second visual-only clock. Every mesh casts and receives shadows and has a named `rig:` ancestor.

### Multi-section chassis

Four staggered decks, clockmaker pillars and brass rails give the installation readable lower-drive, middle-routing, upper-ballistic and resonator sections. Tubes and marbles remain on their original `conduitFrame` and `marbleFrame`; all networks share the same machine root.

---

## 5. Cornell box and shadow play

The installation now occupies an open-front Cornell room:

- neutral floor, rear wall and ceiling;
- warm left wall and cool right wall;
- three pale rear projection scrims;
- three perforated rotating gobo wheels in a real projection lane;
- three shadow-casting spot projectors with tuned bias and soft maps;
- wall-mounted emissive practical tubes;
- one energy-reactive point light at every module and transmission.

Four physical light rigs are available:

| Rig | Behavior |
| :--- | :--- |
| Gallery Sculpture | balanced fill, readable metal, moderate practicals |
| Shadow Theatre | low ambient, hard projector emphasis, deep scrim shadows |
| Neon GI Installation | projector reduction, strong colored local practicals and bloom |
| Clockmaker Inspection | bright neutral fill for mechanism study |

Song sections foreground the matching transmission lights. Director-authored looks override the automatic section look after the work update, so live choices remain authoritative.

---

## 6. Render-style and palette lab

`PostFxState` now also carries:

- `linocut`
- `neonGlow`
- `palette`
- `exposure`
- `lightRig`
- `lightIntensity`
- `shadowStrength`

These values are timeline-keyframeable and included in project JSON parsing/interpolation.

### Five palettes

1. Steel + Xenon
2. Cornell Red + Cyan
3. Ultraviolet + Acid
4. Lino Ink + Stock
5. Sodium + Ice

Palette selection changes the post-process grade, scene background/fog, module emissive colors, mechanism surfaces and practical-light colors.

### Six authored render styles

- Raw / Clean
- Mechanical Film
- Lino Press
- Neon Cornell
- Shadow Play
- Ultraviolet Relay

### Independent bypass controls

Director `LOOKS` now presents a true checkbox and continuous slider for each treatment:

- scan glitch;
- lens warp;
- chromatic dispersion;
- film grain;
- bleach grade;
- stark stencil;
- HDR bloom;
- lino relief;
- neon edge/GI.

Exposure, light energy and shadow depth remain continuously variable. Setting a treatment to zero is a real shader bypass. Default and authored looks reduce the previous constant glitch language: the largest shipped timeline glitch value is `0.11`, reserved for one short cadenza accent.

---

## 7. Linocut and neon implementation

`WebGPUStage.ts` adds a shared finite-difference edge field sampled from the composited scene.

### Linocut

- luma posterization into dense ink and warm paper stock;
- edge subtraction for carved relief boundaries;
- two directional screen-space hatch frequencies gated to midtones;
- independent mix control, compatible with every palette.

### Neon light installation

- edge-fed cyan/magenta or acid/violet emission;
- hot-highlight extraction;
- dark retained geometry rather than a full-screen color wash;
- physical local lights and practicals in the machine;
- independently controlled HDR bloom for a faux-GI installation response.

The renderer also exposes live ACES exposure. WebGPU remains preferred, with the same TSL graph available through the WebGL2 backend.

---

## 8. Graph and Physics Studio

The generic tabs now include both energy networks.

### Machine Graph

- edge count includes conduits plus transmissions;
- transmission edges retain their specific kind;
- flow meters use transmission energy;
- mechanism focus targets resolve real source/destination endpoints.

### Physics Registry

- version advances to `9`;
- every transmission appears as a named physical part;
- states switch between `TRANSMITTING` and `GENERATING`;
- tags identify kind and foreground section;
- mechanism pulse telemetry sits beside marble strike/collision/recycle telemetry.

Machine graph exports advance to version `9` while retaining the `MODAL FLOW CONFIG` identifier for compatibility.

---

## 9. Verification

V9 adds `tests/v9.test.ts` and preserves every prior test.

Assertions cover:

- all six transmission families across ten links;
- deterministic mechanism event sequences;
- active pulse generation from more than five unique paths;
- mechanism events becoming valid D-Lydian notes;
- nonzero downstream transmission energy;
- Cornell room, mechanism frame and three shadow-gobo joints;
- ten inspectable transmission root joints;
- graph edges and Physics Registry entries;
- zero unparented visible meshes;
- visual-style application and clean disposal;
- shipped linocut/neon looks, four-plus palettes and low default glitch.

Verification commands:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Current result: **39/39 tests pass**, strict TypeScript is clean, and the Vite production build succeeds.
