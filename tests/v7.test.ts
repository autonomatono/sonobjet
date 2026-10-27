import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type {
  AnticipationCue,
  ImpulseEvent,
  PostFxState,
  WorkRuntimeContext,
} from '../src/engine/core/types';
import {
  createMarbleBlueprint,
  DEFAULT_MARBLE_COUNT,
  LANE_COUNT,
  PHYSICS_MACRO_DEFINITIONS,
  PROGRAM_STEPS,
  TAU,
  pointOnPolyline,
} from '../src/kit/physics/MarbleBlueprint';
import { MarblePhysics } from '../src/kit/physics/MarblePhysics';
import {
  createDefaultProgram,
  ProgrammingWheel,
} from '../src/kit/physics/ProgrammingWheel';
import { MarblePendulumWork } from '../src/works/marble-pendulum/MarblePendulumWork';

const impulse = (
  subsystem: ImpulseEvent['subsystem'],
  velocity = 1,
  origin: ImpulseEvent['origin'] = 'keyboard',
): ImpulseEvent => ({
  subsystem,
  velocity,
  pitchRatio: 1,
  decay: 1,
  locus: [0.2, -0.1, 0.4],
  audioTime: 0,
  beat: 0,
  origin,
});

function countUnparented(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    let parent: THREE.Object3D | null = object.parent;
    let found = false;
    while (parent) {
      if (parent.name.startsWith('rig:')) {
        found = true;
        break;
      }
      parent = parent.parent;
    }
    if (!found) count++;
  });
  return count;
}

describe('V7 custom marble physics engine', () => {
  it('ships a complete physical blueprint with all five focus scales', () => {
    const blueprint = createMarbleBlueprint();
    expect(blueprint.gates).toHaveLength(LANE_COUNT);
    expect(blueprint.instruments).toHaveLength(LANE_COUNT);
    expect(blueprint.queues).toHaveLength(LANE_COUNT);
    expect(blueprint.parts.length).toBeGreaterThan(40);
    expect(blueprint.segments.length).toBeGreaterThan(50);
    expect(new Set(blueprint.focusTargets.map((focus) => focus.scale)).size).toBe(5);
    expect(new Set(blueprint.instruments.map((instrument) => instrument.kind)).size).toBeGreaterThanOrEqual(5);
    const start = pointOnPolyline(blueprint.liftPath, 0);
    const end = pointOnPolyline(blueprint.liftPath, 1);
    expect(start[0]).toBeCloseTo(blueprint.liftPath[0][0], 6);
    expect(start[1]).toBeCloseTo(blueprint.liftPath[0][1], 6);
    expect(end[0]).toBeCloseTo(blueprint.liftPath[blueprint.liftPath.length - 1][0], 6);
    expect(end[1]).toBeCloseTo(blueprint.liftPath[blueprint.liftPath.length - 1][1], 6);
  });

  it('releases, collides, recycles and governs deterministically with zero jams', () => {
    const blueprint = createMarbleBlueprint();
    const physics = new MarblePhysics(blueprint);
    const wheel = new ProgrammingWheel(createDefaultProgram());
    let releases = 0;
    let impacts = 0;
    let recycled = 0;
    for (let frame = 0; frame < 900; frame++) {
      const time = frame / 60;
      const beat = (time * 164) / 60;
      const angle = wheel.angleForBeat(beat);
      physics.setDriveState({
        flywheelAngle: beat * TAU,
        programWheelAngle: angle,
        programStep: wheel.stepFromAngle(angle),
        scoreIntensity: 0.72,
        beat,
      });
      for (const cue of wheel.sampleAngle(angle, time, 0.75)) {
        if (physics.releaseGate(cue.lane, cue.scheduledTime, cue.velocity, cue.step)) releases++;
      }
      const result = physics.step(1 / 60);
      impacts += result.impacts.length;
      recycled += result.recycled;
    }
    const telemetry = physics.getTelemetry();
    expect(releases).toBeGreaterThan(100);
    expect(impacts).toBeGreaterThan(200);
    expect(recycled).toBeGreaterThan(50);
    expect(telemetry.totalMarbles).toBe(DEFAULT_MARBLE_COUNT);
    expect(telemetry.jamCount).toBe(0);
    expect(telemetry.lostCount).toBe(0);
    expect(telemetry.releaseJitterMs).toBeLessThan(0.01);
    expect(
      physics.getMarbles().every((marble) => Number.isFinite(marble.x) && Number.isFinite(marble.y)),
    ).toBe(true);

    const before = physics.getGovernor().energy;
    physics.kickImpulse(1.2, [0.3, 0.2, 0]);
    for (let i = 0; i < 24; i++) physics.step(1 / 60);
    expect(physics.getGovernor().energy).toBeGreaterThan(before);

    expect(physics.setMacro('gravityScale', 1.6)).toBe(true);
    expect(physics.getOptions().gravityScale).toBeCloseTo(1.6, 4);
    expect(physics.setMacro('not-a-macro', 1)).toBe(false);
  });
});

describe('V7 pinned programming wheel', () => {
  it('samples angle crossings, edits pins and round-trips JSON', () => {
    const program = createDefaultProgram();
    expect(program.stepCount).toBe(PROGRAM_STEPS);
    expect(program.laneCount).toBe(LANE_COUNT);
    expect(program.pins.length).toBeGreaterThan(100);
    expect(new Set(program.pins.map((pin) => pin.lane)).size).toBe(LANE_COUNT);

    const wheel = new ProgrammingWheel(program);
    const step0 = wheel.sampleAngle(0, 0, 0.8);
    expect(step0.length).toBeGreaterThan(0);
    expect(step0.every((cue) => cue.step === 0)).toBe(true);
    expect(wheel.sampleAngle(0, 1, 0.8)).toHaveLength(0);
    const step1 = wheel.sampleAngle((1.5 / PROGRAM_STEPS) * TAU, 2, 0.8);
    expect(step1.some((cue) => cue.step === 1)).toBe(true);

    const count = wheel.getPinCount();
    expect(wheel.togglePin(0, 0, false)).toBe(false);
    expect(wheel.getPinCount()).toBe(count - 1);
    expect(wheel.togglePin(0, 0, true)).toBe(true);
    expect(wheel.getPinCount()).toBe(count);

    const exported = wheel.exportJSON();
    const imported = new ProgrammingWheel(createDefaultProgram());
    imported.importJSON(exported);
    expect(imported.getPinCount()).toBe(wheel.getPinCount());
    expect(() => imported.importJSON('{}')).toThrow();
  });
});

describe('V7 PENDULUM // MARBLE ENGINE work integration', () => {
  it('builds a parented physics machine, authors it live and deploys cleanly', () => {
    const clock = new Clock();
    clock.configure(
      MarblePendulumWork.bpm,
      MarblePendulumWork.bars,
      MarblePendulumWork.sections,
    );
    const matrix = new ModulationMatrix();
    matrix.registerMacros(MarblePendulumWork.macros);
    matrix.setRoutes(MarblePendulumWork.defaultPatches);
    const scene = new THREE.Scene();
    let capturedPostFx: Partial<PostFxState> = {};
    const ctx: WorkRuntimeContext = {
      scene,
      camera: new THREE.PerspectiveCamera(45, 16 / 9, 0.06, 220),
      audio: new AudioEngine(),
      clock,
      matrix,
      setPostFx: (fx) => {
        capturedPostFx = { ...capturedPostFx, ...fx };
      },
    };

    const work = MarblePendulumWork.createInstance();
    work.init(ctx);
    expect(scene.children).toHaveLength(1);
    expect(countUnparented(scene.children[0])).toBe(0);

    const initial = work.getPhysicsSnapshot?.();
    expect(initial).toBeDefined();
    expect(initial!.parts.length).toBeGreaterThan(40);
    expect(initial!.pins.length).toBeGreaterThan(100);
    expect(initial!.macros).toHaveLength(PHYSICS_MACRO_DEFINITIONS.length);
    expect(new Set(initial!.focusTargets.map((focus) => focus.scale)).size).toBe(5);
    expect(work.getJointDescriptors?.().length).toBeGreaterThan(30);

    const graph = work.getMachineGraphSnapshot?.();
    expect(graph!.moduleCount).toBeGreaterThan(40);
    expect(graph!.edgeCount).toBeGreaterThan(60);
    expect(graph!.bindings).toHaveLength(LANE_COUNT);
    expect(graph!.macros).toHaveLength(PHYSICS_MACRO_DEFINITIONS.length);

    expect(initial!.pins.some((pin) => pin.lane === 0 && pin.step === 0)).toBe(true);
    work.toggleProgrammingPin?.(0, 0, false);
    expect(
      work.getPhysicsSnapshot?.().pins.some((pin) => pin.lane === 0 && pin.step === 0),
    ).toBe(false);
    work.toggleProgrammingPin?.(0, 0, true);
    expect(
      work.getPhysicsSnapshot?.().pins.some((pin) => pin.lane === 0 && pin.step === 0),
    ).toBe(true);

    const conduitFocus = initial!.focusTargets.find((focus) => focus.scale === 'CONDUIT');
    expect(conduitFocus).toBeDefined();
    work.setFocusTarget?.(conduitFocus!.id);
    expect(work.getPhysicsSnapshot?.().activeFocusId).toBe(conduitFocus!.id);

    const live = impulse('sub-rupture', 1.1);
    work.triggerImpulse(live, ctx);
    const anticipation: AnticipationCue = {
      targetSubsystem: 'sub-rupture',
      intensity: 0.8,
      leadTimeSec: 0.2,
      audioTime: 0.01,
    };
    work.triggerAnticipation?.(anticipation, ctx);
    work.scheduleStep?.(0, 0, 0.01, ctx);

    for (let frame = 0; frame < 900; frame++) {
      const time = frame / 60;
      clock.seekSeconds(time, time);
      work.update(1 / 60, time, clock.getState(), ctx);
      const tick = clock.tick(time, 1 / 60, 1);
      for (const event of tick.dueEvents) work.triggerImpulse(event, ctx);
    }

    const after = work.getPhysicsSnapshot?.();
    expect(after!.telemetry.impactCount).toBeGreaterThan(100);
    expect(after!.telemetry.releaseCount).toBeGreaterThan(100);
    expect(after!.telemetry.recycleCount).toBeGreaterThan(40);
    expect(after!.telemetry.jamCount).toBe(0);
    expect(after!.telemetry.lostCount).toBe(0);
    expect(after!.activeFocusId).toBe(conduitFocus!.id);
    expect(work.getEcologySnapshot?.()['physics.impacts']).toBeGreaterThan(0);
    expect(work.getMetrics().activeInstances).toBeGreaterThan(200);
    expect(capturedPostFx.bloomStrength).toBeGreaterThan(0.5);

    work.setPhysicsMacro?.('gravityScale', 1.4);
    expect(
      work.getPhysicsSnapshot?.().macros.find((macro) => macro.id === 'gravityScale')?.value,
    ).toBeCloseTo(1.4, 2);
    work.setGraphMacro?.('marbleBounce', 0.6);
    expect(
      work.getPhysicsSnapshot?.().macros.find((macro) => macro.id === 'marbleBounce')?.value,
    ).toBeCloseTo(0.6, 2);

    work.setBehaviorId?.('OVERCLOCK_CADENZA');
    expect(work.getBehaviorId?.()).toBe('OVERCLOCK_CADENZA');
    work.setArticulationState?.({ overclockSpeed: 1.4 });
    expect(work.getArticulationState?.().overclockSpeed).toBeCloseTo(1.4, 2);

    const exportedProgram = work.exportPhysicsProgram?.();
    expect(exportedProgram).toBeTruthy();
    expect(JSON.parse(exportedProgram!).pins.length).toBeGreaterThan(100);
    work.importPhysicsProgram?.(exportedProgram!);
    expect(work.getPhysicsSnapshot?.().pins.length).toBeGreaterThan(100);

    work.resetPhysics?.();
    expect(work.getPhysicsSnapshot?.().telemetry.impactCount).toBe(0);
    work.dropMarbles?.(8);
    expect(work.getPhysicsSnapshot?.().telemetry.releaseCount).toBeGreaterThan(0);

    work.growMachine?.(16);
    expect(work.getPhysicsSnapshot?.().telemetry.totalMarbles).toBe(DEFAULT_MARBLE_COUNT + 16);
    expect(scene.children).toHaveLength(1);
    expect(countUnparented(scene.children[0])).toBe(0);

    work.rebuildMachine?.(120);
    expect(work.getPhysicsSnapshot?.().telemetry.totalMarbles).toBe(120);
    expect(countUnparented(scene.children[0])).toBe(0);

    work.importGraphConfig?.(JSON.stringify({ program: JSON.parse(exportedProgram!) }));
    expect(work.getPhysicsSnapshot?.().pins.length).toBeGreaterThan(100);
    expect(scene.children).toHaveLength(1);
    expect(countUnparented(scene.children[0])).toBe(0);

    work.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
