import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import { SonobjetCore } from '../src/engine/core/Sonobjet';
import type { SubsystemId } from '../src/engine/core/types';
import { WorkRegistry } from '../src/engine/core/WorkRegistry';
import { createSonobjetMaterials } from '../src/engine/render/TSLMaterials';
import {
  computeRatchetBurstOffsets,
  euclideanPattern,
  evaluateBreakChop,
} from '../src/kit/sequencer/IDMSequencer';
import { TakeRecorder } from '../src/studio/recorder/TakeRecorder';
import { evaluateGantzStep, GANTZ_SECTIONS } from '../src/works/gantz-tecton/GantzScore';
import { GantzWork } from '../src/works/gantz-tecton/GantzWork';
import { LatticeWork } from '../src/works/lattice-pendulum/LatticeWork';

describe('Clock dual-domain lookahead scheduler', () => {
  it('schedules 1/64th steps in lookahead window and releases visual events at DAC time', () => {
    const clock = new Clock();
    clock.configure(160, 64, GANTZ_SECTIONS);
    clock.play(10.0);

    const scheduled: Array<{ step64: number; bar: number; audioTime: number }> = [];
    const tick1 = clock.tick(10.01, 0.016, 1.0, (step64, bar, audioTime) => {
      scheduled.push({ step64, bar, audioTime });
      if (step64 === 0) {
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
    // Event scheduled slightly ahead should release once audioNow reaches its timestamp
    const firstAudioTime = scheduled[0].audioTime;
    const tick2 = clock.tick(firstAudioTime + 0.01, 0.016, 1.0);
    expect(tick1.dueEvents.length + tick2.dueEvents.length).toBe(1);
    expect(tick2.state.playing).toBe(true);
  });

  it('tracks movement sections accurately across bar seeks', () => {
    const clock = new Clock();
    clock.configure(172, 64, GANTZ_SECTIONS);
    clock.seekBar(26, 0);
    const state = clock.getState();
    expect(state.bar).toBe(26);
    expect(state.sectionName).toContain('III. HYPER-DRILL');
  });
});

describe('SonobjetCore causal physics & viscoelastic rupture', () => {
  it('integrates spring-damper DOFs and emits spontaneous rupture impulse under extreme strain', () => {
    const obj = new SonobjetCore('test-construct', [
      { id: 'shear', initial: 0, min: -2, max: 2, stiffness: 280, damping: 18 },
    ]);

    obj.kickDOF('shear', 12.0);
    const r0 = obj.stepPhysics(0.016);
    expect(r0).toBeNull();
    expect(Math.abs(obj.getDOF('shear'))).toBeGreaterThan(0);
    expect(obj.getKineticEnergy()).toBeGreaterThan(0);

    // Apply extreme external strain (e.g. two-hand MediaPipe pull) -> triggers autonomous rupture!
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
    // 0.1 + (0.5 * 0.8) * 1.2 = 0.58
    expect(matrix.getTarget('tectonicSpread')).toBeCloseTo(0.58, 2);
  });
});

describe('IDMSequencer & GantzScore composition algebra', () => {
  it('computes Euclidean patterns and exponential bouncing-ball ratchet bursts', () => {
    const euclid = euclideanPattern(5, 16, 0);
    expect(euclid).toHaveLength(16);
    expect(euclid.filter(Boolean)).toHaveLength(5);

    const offsets = computeRatchetBurstOffsets(6, 0.25, 0.72);
    expect(offsets).toHaveLength(6);
    expect(offsets[0]).toBe(0);
    // Accelerating curve (< 1) means consecutive intervals shrink!
    const firstGap = offsets[1] - offsets[0];
    const lastGap = offsets[5] - offsets[4];
    expect(lastGap).toBeLessThan(firstGap);

    const chop = evaluateBreakChop(12, 14, 0.8);
    expect(chop.sliceIndex).toBeGreaterThanOrEqual(0);
    expect(chop.sliceIndex).toBeLessThan(16);
  });

  it('produces movement-specific events and honors bar-63 dead-stop lock', () => {
    const hyperEvents = evaluateGantzStep(0, 28, 1.0, {
      chaos: 0.6,
      drillDensity: 0.8,
      forceRatchet: false,
      forceReverse: false,
      step64DurSec: 0.021,
    });
    expect(hyperEvents.length).toBeGreaterThan(0);

    // Bar 63 step 56 should be silent (post-lock silence)
    const deadStopEvents = evaluateGantzStep(56, 63, 5.0, {
      chaos: 0.8,
      drillDensity: 0.9,
      forceRatchet: true,
      forceReverse: false,
      step64DurSec: 0.021,
    });
    expect(deadStopEvents).toHaveLength(0);
  });
});

describe('TakeRecorder multi-pass overdub & JSON serialization', () => {
  it('records two overdub passes, sorts timestamps, and round-trips JSON', () => {
    const rec = new TakeRecorder();
    rec.startRecording('gantz-tecton', 172, 100.0, false);
    rec.record(100.5, { kind: 'camera', mode: 2 });
    rec.stopRecording(101.0);

    // Overdub second pass with an earlier relative event (0.2s)
    rec.startRecording('gantz-tecton', 172, 200.0, true);
    rec.record(200.2, { kind: 'punch', punchId: 'ratchet', active: true });
    rec.stopRecording(201.0);

    expect(rec.getEventCount()).toBe(2);

    const json = rec.exportJSON();
    const rec2 = new TakeRecorder();
    const parsed = rec2.importJSON(json);
    expect(parsed.workId).toBe('gantz-tecton');
    expect(rec2.getEventCount()).toBe(2);

    rec2.startReplay(300.0);
    const dueEarly = rec2.pollReplay(300.3, false);
    expect(dueEarly).toHaveLength(1);
    expect(dueEarly[0].kind).toBe('punch');
  });
});

describe('WorkRegistry multi-scene registration & 3D scene lifecycle', () => {
  it('registers GantzWork as default alongside LatticeWork', () => {
    const reg = new WorkRegistry();
    reg.register(GantzWork, true);
    reg.register(LatticeWork);
    expect(reg.getDefault().id).toBe('gantz-tecton');
    expect(reg.list().map((w) => w.id)).toEqual([
      'gantz-tecton',
      'phase-lattice',
    ]);
  });

  it('constructs TSL node materials and executes full GantzWork + LatticeWork physics & impulse lifecycles', () => {
    const mats = createSonobjetMaterials();
    expect(mats.gunmetalInstanced).toBeDefined();
    mats.dispose();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    const clock = new Clock();
    const matrix = new ModulationMatrix();
    const audio = new AudioEngine();

    clock.configure(GantzWork.bpm, GantzWork.bars, GantzWork.sections);
    matrix.registerMacros(GantzWork.macros);
    matrix.setRoutes(GantzWork.defaultPatches);

    const ctx = { scene, camera, audio, clock, matrix };
    const gantz = GantzWork.createInstance();
    gantz.init(ctx);
    expect(gantz.getMetrics().activeInstances).toBe(717);

    const allSubsystems: SubsystemId[] = [
      'sub-rupture',
      'spine-shear',
      'break-shred',
      'fin-cascade',
      'piston-snap',
      'modal-clang',
      'core-implode',
      'arc-discharge',
    ];

    for (const sub of allSubsystems) {
      gantz.triggerImpulse(
        {
          subsystem: sub,
          velocity: 1.0,
          pitchRatio: 1.0,
          decay: 0.9,
          sliceIndex: 4,
          reverse: true,
          locus: [0.3, -0.2, 0.5],
          audioTime: 0,
          beat: 0,
          origin: 'keyboard',
        },
        ctx,
      );
    }

    gantz.setPointerStrain?.(0.4, 0.3, 0.8, true);
    gantz.update(0.016, 1.0, clock.getState(), ctx);
    expect(gantz.getMetrics().kineticEnergy).toBeGreaterThan(0);
    gantz.dispose();
    expect(scene.children).toHaveLength(0);

    // Verify second work cleanly mounts and unmounts on same stage
    const lattice = LatticeWork.createInstance();
    lattice.init(ctx);
    expect(lattice.getMetrics().activeInstances).toBe(96);
    lattice.update(0.016, 1.0, clock.getState(), ctx);
    lattice.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
