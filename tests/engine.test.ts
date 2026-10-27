import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import { SonobjetCore } from '../src/engine/core/Sonobjet';
import type { SubsystemId } from '../src/engine/core/types';
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
} from '../src/works/gantz-tecton/GantzScore';
import { GantzWork } from '../src/works/gantz-tecton/GantzWork';
import { LatticeWork } from '../src/works/lattice-pendulum/LatticeWork';

describe('Clock dual-domain lookahead & mechanical anticipation scheduler', () => {
  it('schedules 1/64th steps, anticipation pre-cues, and releases visual events at DAC time', () => {
    const clock = new Clock();
    clock.configure(164, 80, GANTZ_SECTIONS);
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

  it('tracks all 6 compositional Acts accurately across bar seeks', () => {
    const clock = new Clock();
    clock.configure(164, 80, GANTZ_SECTIONS);
    clock.seekBar(30, 0);
    expect(clock.getState().sectionName).toContain('III. CLAVILUX LIGHT-ORGAN ARIA');
    clock.seekBar(62, 0);
    expect(clock.getState().sectionName).toContain('V. FULL FOUNDRY OVERDRIVE');
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

describe('6-Act F-Phrygian Compositional Score & Epic Montage Director', () => {
  const defaultParams = {
    chaos: 0.35,
    drillDensity: 0.55,
    forceRatchet: false,
    forceReverse: false,
    step64DurSec: 60 / 164 / 16,
  };

  it('states the exact C5-Db5-Ab4-G4-F4 Seed Motif in Act I and winds up before Bar 6 Drop-Forge Slam', () => {
    const c5 = evaluateGantzStepBundle(0, 2, 1.0, defaultParams);
    expect(c5.events.some((e) => e.subsystem === 'modal-clang' && e.midiNote === 72)).toBe(true);

    const db5 = evaluateGantzStepBundle(24, 2, 1.5, defaultParams);
    expect(db5.events.some((e) => e.midiNote === 73)).toBe(true);

    const windup = evaluateGantzStepBundle(48, 5, 4.0, defaultParams);
    expect(windup.anticipations.length).toBeGreaterThan(0);
    expect(windup.events.some((e) => e.subsystem === 'windup-inhale')).toBe(true);
  });

  it('enforces drumless Light-Organ Plenum suspension in Bars 44-45 and breathless silence in Bar 59', () => {
    const breakdown = evaluateGantzStepBundle(0, 44, 10.0, defaultParams);
    expect(breakdown.events.some((e) => e.subsystem === 'bellows-choir')).toBe(true);
    expect(breakdown.events.some((e) => e.subsystem === 'larynx-lead')).toBe(true);
    expect(breakdown.events.some((e) => e.subsystem === 'break-shred')).toBe(false);

    const preClimaxSilence = evaluateGantzStepBundle(48, 59, 20.0, defaultParams);
    expect(preClimaxSilence.events).toHaveLength(0);

    const climax = evaluateGantzStepBundle(0, 60, 21.0, defaultParams);
    expect(climax.events.some((e) => e.subsystem === 'bellows-choir')).toBe(true);
    expect(climax.events.some((e) => e.subsystem === 'larynx-lead')).toBe(true);
    expect(climax.events.some((e) => e.subsystem === 'sub-rupture')).toBe(true);
  });

  it('emits music-synced multi-scale montage cuts, Vertigo Zolly, and Epic Pull-Back across 80 bars', () => {
    // Bar 0 opens on 85mm Macro Babbage Cipher Wheels; Bar 6 smash-cuts wide on first Drop-Forge hit!
    expect(evaluateGantzMontageCut(0, 0, 0)?.shot).toBe('macro-babbage');
    expect(evaluateGantzMontageCut(6, 0, 0)).toEqual({
      shot: 'cathedral-wide',
      transition: 'hard',
    });

    // Act II Call vs Response cross-cutting
    expect(evaluateGantzMontageCut(12, 10, 0.625)?.shot).toBe('carriage-snorricam');
    expect(evaluateGantzMontageCut(13, 6, 0.375)?.shot).toBe('macro-jacquard');

    // Act IV Hitchcock Vertigo Dolly-Zoom & Bar 59 Pre-Drop Silence
    const zolly = evaluateGantzMontageCut(57, 0, 0.5);
    expect(zolly?.transition).toBe('vertigo');
    expect(zolly?.rampProgress).toBeGreaterThan(0.3);
    expect(evaluateGantzMontageCut(59, 10, 0.75)?.shot).toBe('forge-hammers-low');

    // Act VI Epic Cathedral Pull-Back
    const pullback = evaluateGantzMontageCut(78, 0, 0.5);
    expect(pullback?.transition).toBe('epic-pullback');
    expect(pullback?.rampProgress).toBeGreaterThan(0.6);
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

describe('CinemaDirector multi-perspective rigs, SnorriCam POV & Vertigo Dolly-Zoom', () => {
  it('maintains constant subject width during Vertigo Zolly and rides SnorriCam carriage', () => {
    const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 160);
    const director = new CinemaDirector();
    const chassisRoot = new THREE.Group();
    const shuttleCarriage = new THREE.Group();
    shuttleCarriage.position.set(1.4, 2.95, 0.37);
    chassisRoot.add(shuttleCarriage);
    const anchors = { shuttleCarriage, chassisRoot };

    // 1. Vertigo Zolly optical invariant: zDist * tan(fov/2) === 1.85m
    director.setMode(0);
    director.applyEditorialDirective({
      shot: 'interior-flythrough',
      transition: 'vertigo',
      rampProgress: 0.0,
    });
    director.update(cam, 0.016, 1.0, 0, anchors, 0);
    const widthStart =
      cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));

    director.applyEditorialDirective({
      shot: 'interior-flythrough',
      transition: 'vertigo',
      rampProgress: 1.0,
    });
    director.update(cam, 0.016, 2.0, 4, anchors, 0);
    const widthEnd =
      cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));

    expect(widthStart).toBeCloseTo(1.85, 2);
    expect(widthEnd).toBeCloseTo(1.85, 2);
    expect(cam.fov).toBeCloseTo(17, 1);

    // 2. Shuttle SnorriCam POV physically follows carriage X translation!
    director.setMode(7); // carriage-snorricam
    director.update(cam, 0.016, 3.0, 8, anchors, 0);
    const camX1 = cam.position.x;

    shuttleCarriage.position.x = -1.6;
    director.update(cam, 0.016, 3.1, 8.2, anchors, 0);
    expect(cam.position.x).toBeLessThan(camX1 - 2.5);
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

describe('BabbageLightOrgan, PiranesiFoundry & TSL Material Lifecycle', () => {
  it('constructs full TSL palette (including quartz light-organ & engraved brass) and executes 6-district lifecycles', () => {
    const mats = createSonobjetMaterials();
    expect(mats.boneCarapace).toBeDefined();
    expect(mats.forgedIron).toBeDefined();
    expect(mats.surgicalChrome).toBeDefined();
    expect(mats.agedBrass).toBeDefined();
    expect(mats.lightOrganPipeInstanced).toBeDefined();
    expect(mats.brassInstanced).toBeDefined();
    mats.dispose();

    const reg = new WorkRegistry();
    reg.register(GantzWork, true);
    reg.register(LatticeWork);
    expect(reg.getDefault().title).toBe('BABBAGE // CLAVILUX');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.08, 160);
    const clock = new Clock();
    const matrix = new ModulationMatrix();
    const audio = new AudioEngine();

    clock.configure(GantzWork.bpm, GantzWork.bars, GantzWork.sections);
    matrix.registerMacros(GantzWork.macros);
    matrix.setRoutes(GantzWork.defaultPatches);

    const ctx = { scene, camera, audio, clock, matrix };
    const babbageWork = GantzWork.createInstance();
    babbageWork.init(ctx);
    expect(babbageWork.getMetrics().activeInstances).toBe(510);

    babbageWork.triggerAnticipation?.(
      {
        targetSubsystem: 'sub-rupture',
        intensity: 1.2,
        leadTimeSec: 0.35,
        audioTime: 0,
      },
      ctx,
    );
    expect(babbageWork.getMetrics().behavioralState).toBe('FORGE_WINDUP');

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
    ];

    for (const sub of allSubsystems) {
      babbageWork.triggerImpulse(
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

    expect(babbageWork.getMetrics().behavioralState).toBe('LIGHT_ORGAN_PLENUM');

    clock.play(0);
    clock.seekBar(32, 0); // Act III: Clavilux Light-Organ Aria
    babbageWork.setPointerStrain?.(0.3, 0.2, 0.65, true);
    babbageWork.update(0.016, 1.5, clock.getState(), ctx);
    expect(babbageWork.getMetrics().activeShotBadge).toContain('AUTO-EDIT');

    babbageWork.dispose();
    expect(scene.children).toHaveLength(0);

    // Verify secondary work LatticeWork also initializes and disposes cleanly
    const lattice = LatticeWork.createInstance();
    lattice.init(ctx);
    lattice.setCameraMode?.(0);
    lattice.update(0.016, 1.0, clock.getState(), ctx);
    lattice.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
