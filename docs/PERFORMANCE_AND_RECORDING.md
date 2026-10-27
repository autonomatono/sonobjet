# Live Performance, Sensing & Recording Guide

`SONOBJET` is designed to be played immediately as an expressive instrument with **only a mouse and keyboard**, and expanded seamlessly with **camera vision (MediaPipe), microphone acoustics, MIDI controllers, or gamepads**.

---

## 1. Mouse & Keyboard Performance Rig

### Direct Visceral Object Manipulation (Mouse / Trackpad)
- **Left-Click + Drag (`Strain & Slam`):** Grabs the Sonobjet and pulls its machined plates apart along your drag vector while ramping continuous servo/waveguide tension. **Releasing** after a deep pull slams all 717 components back into lock and fires an acoustic shockwave proportional to accumulated tensile strain. Pushing strain past `0.86` triggers spontaneous viscoelastic ruptures.
- **Right-Click + Drag (or `Shift`/`Alt` + Drag):** Smoothly orbits the active camera preset around the construct.
- **Scroll Wheel:** Zooms focal distance in/out (`0.45x` macro inspection to `2.1x` wide architectural view).

### Subsystem Impulse Pads (`Z X C V B N M ,`)
Playable at any time—either **layered over the running score** (`SCORE + LIVE` mode) or **from stark silence** (`PURE LIVE` mode):
- `Z` — **SUB RUPTURE**: Seismic sub-kick + equatorial armor shockwave
- `X` — **SPINE SHEAR**: Hyper-compressed snare + opposing upper/lower CAD torsion
- `C` — **BREAK SHRED**: Cycles & fires chopped 16-slice breakbeats + sector ejection
- `V` — **FIN CASCADE**: Micro-percussive titanium cooling-fin ripple
- `B` — **PISTON SNAP**: Cardinal hydraulic cylinder slam & pneumatic valve hiss
- `N` — **MODAL CLANG**: 5-partial inharmonic steel plate strike + gimbal whip
- `M` — **CORE IMPLODE**: West-Coast wavefolded FM bass + inward gravitational crush
- `,` — **ARC SPARK**: High-voltage irrational-ratio FM zap + caliper shard probes

*(Hold `Shift` while striking a pad for accented `1.25x` velocity.)*

### Momentary Breakcore & CAD Fracture FX (`A S D F G J K`)
Hold down any combination during playback or live performance:
- `A` — **STUTTER**: Locks the `AudioWorklet` circular ring buffer into a tight grain repeat
- `S` — **64TH DRILL**: Injects furious 64th-note alternating shear/fin bursts
- `D` — **HALFTIME**: Stretches transport clock to `0.5x` brutal half-speed
- `F` — **COMB SCREAM**: Drives stereo waveguide comb feedback (`0.91`) tuned by Alloy Tension
- `G` — **REV SLICE**: Flips breakbeat slices backward & rotates ejected plates `180°`
- `J` — **CAD EXPLODE**: Suspends the construct in an open exploded-CAD configuration
- `K` — **HARD LOCK**: Quantizes all physical DOFs and rotations to rigid industrial CAD detents

---

## 2. Live Sensing Suite

### MediaPipe 2-Hand 3D Vision (`MEDIAPIPE HANDS` button)
Uses `@mediapipe/tasks-vision` (`HandLandmarker`) with WASM self-hosted directly under `./mediapipe-wasm/`:
- **Two-Hand Span (`mediapipe.handSpan`):** Distance between your palms physically pulls apart and compresses the construct (`tectonicSpread`) while driving servo resonance.
- **Left Pinch (`mediapipe.leftPinch`):** Continuous thumb-to-index proximity increases `drillDensity`; snapping a tight pinch fires a spatialized **SPINE SHEAR** impulse.
- **Right Pinch (`mediapipe.rightPinch`):** Modulates `metallicTension`; snapping a tight pinch fires an **ARC DISCHARGE** at your hand's 3D coordinates.
- **Zero-Model Optical Fallback:** Even before the landmark model finishes downloading (or if offline), a built-in `48x36` luminance frame-differencing sensor immediately maps body/hand motion energy (`webcam.motion`) into the Modulation Matrix.

### Microphone Acoustic Exciter (`MIC EXCITER` button)
- Computes real-time RMS energy (`mic.energy`) and spectral centroid (`mic.centroid`).
- Low-frequency thumps (desk taps) trigger **SUB RUPTURE**, mid claps trigger **SPINE SHEAR**, and crisp finger snaps/hi-hats trigger **FIN CASCADE**.

### WebMIDI & Gamepad
- Automatically listens to connected USB/Bluetooth MIDI controllers (Notes -> 8 Subsystems, CCs -> `midi.cc*` sources) and Gamepads (Left Stick + Right Trigger + Face Buttons).

---

## 3. Composing via Multi-Pass Recording & Video Export

### Multi-Pass Overdub Take Recorder (`TakeRecorder.ts`)
1. Click **`OVERDUB REC`** (or press `Shift + R`) and improvise with keyboard pads, punch FX, mouse drags, macro sliders, or MediaPipe gestures.
2. Click **`STOP OVERDUB`**, then click **`OVERDUB REC`** again: your previous pass replays automatically while your new gestures merge into the timeline—letting you build intricate compositions layer by layer.
3. Click **`EXPORT .JSON`** to save a portable `.sonobjet-take.json` composition file, or **`IMPORT .JSON`** to load and replay a saved performance take.

### Master `.WEBM` Music Video Capture (`VideoExporter.ts`)
- Click **`CAPTURE .WEBM MUSIC VIDEO`** to mux a 60fps `canvas.captureStream(60)` video feed with a direct digital `MediaStreamAudioDestinationNode` tap from the Master WebAudio Bus (`12 Mbps` VP9/VP8 + `256 kbps` Opus) and download the finished music video on stop.
