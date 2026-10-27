import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import { SonobjetCore } from '../src/engine/core/Sonobjet';
import type { PostFxState, SubsystemId } from '../src/engine/core/types';
import { WorkRegistry } from '../src/engine/core/WorkRegistry';
import { createSonobjetMaterials } from '../src/engine/render/TSLMaterials';
import { CinemaDirector } from '../src/kit/camera/CinemaDirector';
import {
  computeRatchetBurstOffsets,
  euclideanPattern,
  evaluateBreakChop,
} from '../src/kit/sequencer/IDMSequencer';
import { TakeRecorder } from '../src/studio/recorder/TakeRecorder';
import {
  evaluateGantzMontageCut,
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
  GANTZ_TOTAL_BARS,
} from '../src/works/gantz-tecton/GantzScore';
import { GantzWork } from '../src/works/gantz-tecton/GantzWork';
import { LatticeWork } from '../src/works/lattice-pendulum/LatticeWork';

describe('Clock dual-domain lookahead & mechanical anticipation scheduler', () => {
  it('schedules 1/64th steps, anticipation pre-cues, and releases visual events at DAC time', () => {
    const clock = new Clock();
    clock.configure(164, GANTZ_TOTAL_BARS, GANTZ_SECTIONS);
    clock.play(10.0);

    const scheduled: Array<{ step64: number; bar: number; audioTime: number }> = [];
    const tick1 = clock.tick(10.01, 0.016, 1.0, (step64, bar, audioTime) => {
      scheduled.push({ step64, bar, audioTime });
      if (step64 === 0) {
        clock.queueAnticipationCue({
          targetSubsystem: 'sub-rupture',
          intensity: 1.0,
          leadTimeSec: 0.3,
          audioTime,
        });
        clock.queueVisualEvent({
          subsystem: 'sub-rupture',
          velocity: 1,
          pitchRatio: 1,
          decay: 1,
          locus: [0, 0, 0],
          audioTime,
          beat: 0,
          origin: 'score',
        });
      }
    });

    expect(scheduled.length).toBeGreaterThan(0);
    const firstAudioTime = scheduled[0].audioTime;
    const tick2 = clock.tick(firstAudioTime + 0.01, 0.016, 1.0);
    expect(tick1.dueEvents.length + tick2.dueEvents.length).toBe(1);
    expect(tick1.dueAnticipations.length + tick2.dueAnticipations.length).toBe(1);
  });

  it('tracks all 6 compositional Acts across the 96-bar hypermeter', () => {
    const clock = new Clock();
    clock.configure(164, GANTZ_TOTAL_BARS, GANTZ_SECTIONS);
    clock.seekBar(30, 0);
    expect(clock.getState().sectionName).toContain('III. INVERTED CATHEDRAL ARIA');
    clock.seekBar(74, 0);
    expect(clock.getState().sectionName).toContain('V. SINGULARITY CROWN CONVERGENCE');
    clock.seekBar(82, 0);
    expect(clock.getState().sectionName).toContain('VI. ENTROPIC DISSOLVE');
  });
});

describe('SonobjetCore causal physics & viscoelastic rupture', () => {
  it('integrates spring-damper DOFs and emits spontaneous rupture impulse under extreme strain', () => {
    const obj = new SonobjetCore('test-construct', [
      { id: 'shear', initial: 0, min: -2, max: 2, stiffness: 280, damping: 18 },
    ]);

    obj.kickDOF('shear', 12.0);
    expect(obj.stepPhysics(0.016)).toBeNull();
    expect(Math.abs(obj.getDOF('shear'))).toBeGreaterThan(0);

    obj.setExternalStrain(1.1);
    const rupture = obj.stepPhysics(0.016);
    expect(rupture).not.toBeNull();
    expect(rupture?.subsystem).toBe('spine-shear');
  });
});

describe('ModulationMatrix patchbay & chaotic modulators', () => {
  it('combines base macro value with slewed sensor patch routes clamped to range', () => {
    const matrix = new ModulationMatrix();
    matrix.registerMacros([
      {
        id: 'tectonicSpread',
        label: 'SPREAD',
        min: 0,
        max: 1.2,
        defaultValue: 0.1,
        description: 'Spread',
      },
    ]);
    matrix.setRoutes([
      {
        id: 'r1',
        source: 'mediapipe.handSpan',
        target: 'tectonicSpread',
        amount: 0.8,
        slew: 0,
        enabled: true,
      },
    ]);

    matrix.setSource('mediapipe.handSpan', 0.5);
    matrix.step(0.016);
    expect(matrix.getTarget('tectonicSpread')).toBeCloseTo(0.58, 2);
  });
});

describe('96-Bar F-Phrygian Score: Complete 8-Bar Phrases, Sculpted Bridges & 14 Voices', () => {
  const defaultParams = {
    chaos: 0.4,
    drillDensity: 0.56,
    forceRatchet: false,
    forceReverse: false,
    step64DurSec: 60 / 164 / 16,
  };

  it('weaves Glass-Armonica, Acid-Squelch, and Glitch-Chirp voices across the score', () => {
    const glassAct1 = evaluateGantzStepBundle(0, 1, 1.0, defaultParams);
    expect(glassAct1.events.some((e) => e.subsystem === 'glass-armonica')).toBe(true);

    const acidAct2 = evaluateGantzStepBundle(36, 20, 5.0, defaultParams); // step16 = 9
    expect(acidAct2.events.some((e) => e.subsystem === 'acid-squelch')).toBe(true);

    const glitchCadenza = evaluateGantzStepBundle(8, 52, 12.0, defaultParams); // step16 = 2
    expect(glitchCadenza.events.some((e) => e.subsystem === 'glitch-chirp')).toBe(true);
  });

  it('completes the full 3rd 8-bar Aria phrase + C7b9 leading-tone bridge (Bars 48-51) into Act IV (Bar 52)', () => {
    // Bar 44: Beatless suspension
    const breakdown = evaluateGantzStepBundle(0, 44, 10.0, defaultParams);
    expect(breakdown.events.some((e) => e.subsystem === 'bellows-choir')).toBe(true);
    expect(breakdown.events.some((e) => e.subsystem === 'break-shred')).toBe(false);

    // Bar 51 step16=2 (step64=8): Completes E4 leading-tone cadence (midi 64) before Bar 52!
    const leadingTone = evaluateGantzStepBundle(8, 51, 14.0, defaultParams);
    expect(
      leadingTone.events.some(
        (e) => e.subsystem === 'larynx-lead' && e.midiNote === 64,
      ),
    ).toBe(true);

    // Bar 51 step16=12 (step64=48): Sculpted mechanical handoff ratchet + wind-up into Act IV!
    const bridgeHandoff = evaluateGantzStepBundle(48, 51, 14.5, defaultParams);
    expect(bridgeHandoff.anticipations.length).toBeGreaterThan(0);
    expect(bridgeHandoff.events.length).toBeGreaterThan(3);
  });

  it('completes the full 16-bar (2x8) Act V climax through Bar 79 before resolving to Fm9 at Bar 80', () => {
    // Bar 63 step16=12 (step64=48): Breathless 2-beat pre-climax silence
    const preClimaxSilence = evaluateGantzStepBundle(48, 63, 20.0, defaultParams);
    expect(preClimaxSilence.events).toHaveLength(0);

    // Bar 72 step 0: Starts Pass 2 of Act V (NOT cut early into exhaustion!)
    const pass2Start = evaluateGantzStepBundle(0, 72, 24.0, defaultParams);
    expect(pass2Start.events.some((e) => e.subsystem === 'larynx-lead' && e.midiNote === 72)).toBe(true);
    expect(pass2Start.events.some((e) => e.subsystem === 'glass-armonica')).toBe(true);

    // Bar 79 step16=2 (step64=8): Finishes Pass 2 E4 leading-tone cadence!
    const pass2Cadence = evaluateGantzStepBundle(8, 79, 28.0, defaultParams);
    expect(
      pass2Cadence.events.some(
        (e) => e.subsystem === 'larynx-lead' && e.midiNote === 64,
      ),
    ).toBe(true);

    // Bar 80 step 0: Cathartic Fm9 tonic resolution in Act VI!
    const act6Resolve = evaluateGantzStepBundle(0, 80, 29.0, defaultParams);
    expect(act6Resolve.events.some((e) => e.subsystem === 'bellows-choir')).toBe(true);
    expect(act6Resolve.events.some((e) => e.subsystem === 'glass-armonica')).toBe(true);
  });

  it('coordinates morph-following camera flights, Vertigo Zolly (60-63), and Singularity Pullback (88-95)', () => {
    expect(evaluateGantzMontageCut(28, 0, 0)).toEqual({
      shot: 'interior-dive',
      transition: 'morph-follow',
    });

    const zolly = evaluateGantzMontageCut(61, 0, 0.5);
    expect(zolly?.transition).toBe('vertigo');
    expect(zolly?.rampProgress).toBeGreaterThan(0.3);

    const pullback = evaluateGantzMontageCut(92, 0, 0.5);
    expect(pullback?.transition).toBe('epic-pullback');
    expect(pullback?.rampProgress).toBeGreaterThan(0.5);
  });

  it('computes Euclidean patterns and exponential/decelerating ratchet bursts', () => {
    expect(euclideanPattern(5, 16, 0).filter(Boolean)).toHaveLength(5);
    const accel = computeRatchetBurstOffsets(6, 0.25, 0.72);
    expect(accel[5] - accel[4]).toBeLessThan(accel[1] - accel[0]);
    const decel = computeRatchetBurstOffsets(6, 0.25, 1.25);
    expect(decel[5] - decel[4]).toBeGreaterThan(decel[1] - decel[0]);
    expect(evaluateBreakChop(12, 14, 0.8).sliceIndex).toBeLessThan(16);
  });
});

describe('CinemaDirector morph-following envelope tracking, Wrist SnorriCam & Vertigo Zolly', () => {
  it('scales orbital distance with machine envelopeRadius, maintains Zolly width, and rides Wrist POV', () => {
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.06, 220);
    const director = new CinemaDirector();
    const coreRoot = new THREE.Group();
    const primaryBoomTip = new THREE.Group();
    primaryBoomTip.position.set(2.4, 0.8, 1.2);
    coreRoot.add(primaryBoomTip);

    // 1. Morph-tracking orbit expands smoothly as machine unfolds from 2.8m -> 11.8m!
    director.setMode(1); // morph-orbit
    for (let i = 0; i < 40; i++) {
      director.update(
        cam,
        0.03,
        0,
        0,
        {
          coreRoot,
          primaryBoomTip,
          morphState: 'FOLDED_MONOLITH',
          envelopeRadius: 2.8,
          interiorRadius: 0.8,
          verticalSpan: 3.6,
        },
        0,
      );
    }
    const compactDist = cam.position.length();

    for (let i = 0; i < 40; i++) {
      director.update(
        cam,
        0.03,
        0,
        0,
        {
          coreRoot,
          primaryBoomTip,
          morphState: 'SINGULARITY_CROWN',
          envelopeRadius: 11.8,
          interiorRadius: 6.8,
          verticalSpan: 12.5,
        },
        0,
      );
    }
    const expandedDist = cam.position.length();
    expect(expandedDist).toBeGreaterThan(compactDist + 6.0);

    // 2. Vertigo Zolly optical invariant: zDist * tan(fov/2) === 1.85m
    director.setMode(0);
    director.applyEditorialDirective({
      shot: 'interior-dive',
      transition: 'vertigo',
      rampProgress: 0.0,
    });
    director.update(cam, 0.016, 1.0, 0, null, 0);
    const widthStart =
      cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));

    director.applyEditorialDirective({
      shot: 'interior-dive',
      transition: 'vertigo',
      rampProgress: 1.0,
    });
    director.update(cam, 0.016, 2.0, 4, null, 0);
    const widthEnd =
      cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));

    expect(widthStart).toBeCloseTo(1.85, 2);
    expect(widthEnd).toBeCloseTo(1.85, 2);
    expect(cam.fov).toBeCloseTo(17, 1);

    // 3. Striker Wrist SnorriCam POV tracks robotic wrist translation!
    director.setMode(7);
    director.update(
      cam,
      0.016,
      3.0,
      8,
      {
        coreRoot,
        primaryBoomTip,
        morphState: 'CANTILEVER_STRIKER',
        envelopeRadius: 6.8,
        interiorRadius: 2.2,
        verticalSpan: 5.2,
      },
      0,
    );
    const xBefore = cam.position.x;
    primaryBoomTip.position.x = -2.6;
    director.update(
      cam,
      0.016,
      3.1,
      8.2,
      {
        coreRoot,
        primaryBoomTip,
        morphState: 'CANTILEVER_STRIKER',
        envelopeRadius: 6.8,
        interiorRadius: 2.2,
        verticalSpan: 5.2,
      },
      0,
    );
    expect(cam.position.x).toBeLessThan(xBefore - 3.5);
  });
});

describe('TakeRecorder multi-pass overdub & JSON serialization', () => {
  it('records two overdub passes, sorts timestamps, and round-trips JSON', () => {
    const rec = new TakeRecorder();
    rec.startRecording('gantz-tecton', 164, 100.0, false);
    rec.record(100.5, { kind: 'camera', mode: 2 });
    rec.stopRecording(101.0);

    rec.startRecording('gantz-tecton', 164, 200.0, true);
    rec.record(200.2, { kind: 'punch', punchId: 'ratchet', active: true });
    rec.stopRecording(201.0);

    expect(rec.getEventCount()).toBe(2);
    const rec2 = new TakeRecorder();
    rec2.importJSON(rec.exportJSON());
    rec2.startReplay(300.0);
    expect(rec2.pollReplay(300.3, false)[0].kind).toBe('punch');
  });
});

describe('HyperTectonMachine (4,348 Elements), Coupled State Machines & Stylized PostFX Lifecycle', () => {
  it('drives all 6 Morphology States, 14 Synth Subsystems, GPU Vertex Shaders, and PostFX uniforms', () => {
    const mats = createSonobjetMaterials();
    expect(mats.tectonicPlateInstanced).toBeDefined();
    expect(mats.uniforms.nonEuclideanTwist).toBeDefined();
    expect(mats.uniforms.spatialGlitch).toBeDefined();
    mats.dispose();

    const reg = new WorkRegistry();
    reg.register(GantzWork, true);
    reg.register(LatticeWork);
    expect(reg.getDefault().title).toBe('HYPER // TECTON');
    expect(reg.getDefault().bars).toBe(96);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.06, 220);
    const clock = new Clock();
    const matrix = new ModulationMatrix();
    const audio = new AudioEngine();
    let capturedPostFx: Partial<PostFxState> = {};

    clock.configure(GantzWork.bpm, GantzWork.bars, GantzWork.sections);
    matrix.registerMacros(GantzWork.macros);
    matrix.setRoutes(GantzWork.defaultPatches);

    const ctx = {
      scene,
      camera,
      audio,
      clock,
      matrix,
      setPostFx: (fx: Partial<PostFxState>) => {
        capturedPostFx = { ...capturedPostFx, ...fx };
      },
    };

    const hyperWork = GantzWork.createInstance();
    hyperWork.init(ctx);
    expect(hyperWork.getMetrics().activeInstances).toBe(4348);

    hyperWork.triggerAnticipation?.(
      {
        targetSubsystem: 'sub-rupture',
        intensity: 1.2,
        leadTimeSec: 0.35,
        audioTime: 0,
      },
      ctx,
    );

    const allSubsystems: SubsystemId[] = [
      'windup-inhale',
      'sub-rupture',
      'spine-shear',
      'break-shred',
      'fin-cascade',
      'piston-snap',
      'modal-clang',
      'core-implode',
      'arc-discharge',
      'larynx-lead',
      'bellows-choir',
      'acid-squelch',
      'glass-armonica',
      'glitch-chirp',
    ];

    for (const sub of allSubsystems) {
      hyperWork.triggerImpulse(
        {
          subsystem: sub,
          velocity: 1.0,
          pitchRatio: 1.0,
          midiNote: 72,
          chordNotes: [53, 56, 60, 65],
          vowel: 0.25,
          durationSec: 0.5,
          decay: 0.9,
          sliceIndex: 4,
          reverse: false,
          locus: [0.3, -0.2, 0.5],
          audioTime: 0,
          beat: 0,
          origin: 'keyboard',
        },
        ctx,
      );
    }

    clock.play(0);
    // Test State Machine transitions across sections!
    clock.seekBar(32, 0); // Act III -> INVERTED_CATHEDRAL
    hyperWork.update(0.016, 1.5, clock.getState(), ctx);
    expect(hyperWork.getMetrics().behavioralState).toBe('INVERTED_CATHEDRAL');

    clock.seekBar(54, 0); // Act IV -> QUANTIZED_SHATTER
    hyperWork.update(0.016, 2.0, clock.getState(), ctx);
    expect(hyperWork.getMetrics().behavioralState).toBe('QUANTIZED_SHATTER');

    clock.seekBar(66, 0); // Act V -> SINGULARITY_CROWN
    hyperWork.update(0.016, 3.0, clock.getState(), ctx);
    expect(hyperWork.getMetrics().behavioralState).toBe('SINGULARITY_CROWN');
    expect(capturedPostFx.bleachGrade).toBeGreaterThan(0.2);
    expect(capturedPostFx.lensDistort).toBeGreaterThan(0.05);

    hyperWork.dispose();
    expect(scene.children).toHaveLength(0);

    const lattice = LatticeWork.createInstance();
    lattice.init(ctx);
    lattice.update(0.016, 1.0, clock.getState(), ctx);
    lattice.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
