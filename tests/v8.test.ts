import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type {
  ImpulseEvent,
  TransportState,
  WorkRuntimeContext,
} from '../src/engine/core/types';
import { FreeFlyController } from '../src/studio/director/FreeFlyController';
import {
  createConduitSampler,
  createModalFlowBlueprint,
  DEFAULT_MODAL_FLOW_MODULES,
  MODAL_FLOW_PROGRAM_STEPS,
  ROUTING_LANE_COUNT,
} from '../src/works/modal-flow/ModalFlowBlueprint';
import { ModalFlowComposer } from '../src/works/modal-flow/ModalFlowComposer';
import { ModalFlowPhysics } from '../src/works/modal-flow/ModalFlowPhysics';
import {
  evaluateModalFlowEnergyCue,
  isModalFlowScaleNote,
  modalFlowDegreeToMidi,
  MODAL_FLOW_SECTIONS,
} from '../src/works/modal-flow/ModalFlowScore';
import { ModalFlowWork } from '../src/works/modal-flow/ModalFlowWork';

const DT = 1 / 60;

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
    if (!found) count += 1;
  });
  return count;
}

function makeContext(): WorkRuntimeContext & {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: Clock;
  matrix: ModulationMatrix;
} {
  const audio = new AudioEngine();
  const clock = new Clock();
  clock.configure(ModalFlowWork.bpm, ModalFlowWork.bars, ModalFlowWork.sections);
  const matrix = new ModulationMatrix();
  matrix.registerMacros(ModalFlowWork.macros);
  matrix.setRoutes(ModalFlowWork.defaultPatches);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(47, 16 / 9, 0.1, 120);
  camera.position.set(0, 4.2, 13.5);
  camera.lookAt(0, 0.5, 0);
  return {
    scene,
    camera,
    audio,
    clock,
    matrix,
    setPostFx: () => undefined,
  };
}

function transportFrom(ctx: WorkRuntimeContext): TransportState {
  return ctx.clock.getState();
}

describe('V8 MODAL FLOW // physics-generated song', () => {
  it('ships a new short D-Lydian composition instead of the preserved 96-bar score', () => {
    expect(ModalFlowWork.bars).toBe(48);
    expect(ModalFlowWork.sections).toHaveLength(6);
    expect(ModalFlowWork.bpm).toBe(132);
    expect(ModalFlowWork.cameraModeLabels?.[1]).toContain('DRONE');
    expect(MODAL_FLOW_SECTIONS[0].name).toContain('WIND');
    expect(evaluateModalFlowEnergyCue(0, 0, 0)).not.toBeNull();
    expect(evaluateModalFlowEnergyCue(1, 0, 0)).toBeNull();
    expect(modalFlowDegreeToMidi(0, 0)).toBe(50);
    expect(isModalFlowScaleNote(50)).toBe(true);
    expect(isModalFlowScaleNote(51)).toBe(false);
    expect(isModalFlowScaleNote(56)).toBe(true); // G# / bright Lydian #4
  });

  it('builds a deep modular 3D blueprint with many-to-many conduits and all focus scales', () => {
    const blueprint = createModalFlowBlueprint(32);
    expect(blueprint.modules).toHaveLength(32);
    expect(blueprint.modules.filter((m) => m.kind === 'satellite')).toHaveLength(20);
    expect(blueprint.modules.find((m) => m.id === 'gate-bank')).toBeDefined();
    expect(blueprint.conduits.length).toBeGreaterThan(40);
    expect(blueprint.sources.length).toBeGreaterThanOrEqual(8);
    expect(blueprint.bindings.length).toBeGreaterThanOrEqual(16);
    expect(new Set(blueprint.focusTargets.map((focus) => focus.scale)).size).toBe(5);
    expect(blueprint.routingLanes).toHaveLength(ROUTING_LANE_COUNT);
    expect(blueprint.programSteps).toBe(MODAL_FLOW_PROGRAM_STEPS);
    expect(blueprint.defaultProgram).toHaveLength(ROUTING_LANE_COUNT);
    expect(blueprint.defaultProgram[0]).toHaveLength(MODAL_FLOW_PROGRAM_STEPS);
    const diverter = blueprint.modules.find((m) => m.id === 'tri-diverter');
    expect(diverter?.outputs.length).toBeGreaterThan(5);
    const sampler = createConduitSampler(blueprint);
    const lift = blueprint.conduits.find((edge) => edge.id === 'conduit-flywheel-lift');
    expect(lift).toBeDefined();
    if (lift) {
      const start = sampler.sample(lift, 0);
      const end = sampler.sample(lift, 1);
      const from = blueprint.modules.find((m) => m.id === lift.from);
      const to = blueprint.modules.find((m) => m.id === lift.to);
      expect(start.x).toBeCloseTo(from?.position.x ?? 0, 6);
      expect(end.y).toBeCloseTo(to?.position.y ?? 0, 6);
    }
    expect(DEFAULT_MODAL_FLOW_MODULES).toBeGreaterThan(12);
  });

  it('runs deterministic 3D physics with visible flow, collisions and zero lost marbles', () => {
    const blueprint = createModalFlowBlueprint(DEFAULT_MODAL_FLOW_MODULES);
    const physics = new ModalFlowPhysics(blueprint, { seed: 99 });
    const events: string[] = [];
    for (let i = 0; i < 900; i++) {
      for (const event of physics.step(DT)) {
        events.push(`${event.id}:${event.kind}:${event.moduleId}:${event.marbleId}`);
      }
    }
    const telemetry = physics.getTelemetry();
    expect(events.length).toBeGreaterThan(50);
    expect(events.some((event) => event.includes(':strike:'))).toBe(true);
    expect(events.some((event) => event.includes(':gate:'))).toBe(true);
    expect(events.some((event) => event.includes(':lift:'))).toBe(true);
    expect(events.some((event) => event.includes(':collision:'))).toBe(true);
    expect(telemetry.lostCount).toBe(0);
    expect(telemetry.activeMarbles).toBeGreaterThan(5);
    expect(telemetry.recycleCount).toBeGreaterThan(0);
    expect(physics.getMostEnergeticMarble()).not.toBeNull();

    const twin = new ModalFlowPhysics(blueprint, { seed: 99 });
    const twinEvents: string[] = [];
    for (let i = 0; i < 900; i++) {
      for (const event of twin.step(DT)) {
        twinEvents.push(`${event.id}:${event.kind}:${event.moduleId}:${event.marbleId}`);
      }
    }
    expect(twinEvents.slice(0, 40)).toEqual(events.slice(0, 40));
  });

  it('rations physical events into sparse audible D-Lydian phrases', () => {
    const blueprint = createModalFlowBlueprint(DEFAULT_MODAL_FLOW_MODULES);
    const physics = new ModalFlowPhysics(blueprint, { seed: 314 });
    const composer = new ModalFlowComposer();
    const impulses: ImpulseEvent[] = [];
    let physicalEvents = 0;
    const seconds = 14;
    for (let i = 0; i < seconds * 60; i++) {
      const events = physics.step(DT);
      physicalEvents += events.length;
      for (const event of events) {
        const impulse = composer.map(event, (i / 60) * 2.2, 0.02);
        if (impulse) impulses.push(impulse);
      }
    }
    const state = composer.getState(physics.getTime());
    expect(physicalEvents).toBeGreaterThan(impulses.length);
    expect(impulses.length).toBeGreaterThan(3);
    // 0.85 + 0.62 * 1.9 ≈ 2.03 notes/sec before phrase rests.
    expect(impulses.length).toBeLessThan(seconds * 2.4);
    expect(state.dropped).toBeGreaterThan(0);
    for (const impulse of impulses) {
      expect(impulse.origin).toBe('physics');
      expect(impulse.midiNote).toBeDefined();
      expect(isModalFlowScaleNote(impulse.midiNote ?? 0)).toBe(true);
      expect(impulse.subsystem).not.toBe('larynx-lead');
      expect(impulse.subsystem).not.toBe('bellows-choir');
      expect(impulse.velocity).toBeGreaterThan(0.1);
      expect(impulse.velocity).toBeLessThan(1.2);
    }
  });

  it('integrates the work with parented meshes, graph/physics director tabs and module growth', () => {
    const ctx = makeContext();
    const instance = ModalFlowWork.createInstance();
    instance.init(ctx);
    const root = ctx.scene.children.find((child) => child.name === 'rig:root');
    expect(root).toBeDefined();
    expect(countUnparented(root as THREE.Object3D)).toBe(0);

    const graph = instance.getMachineGraphSnapshot?.();
    const physics = instance.getPhysicsSnapshot?.();
    expect(graph).toBeDefined();
    expect(graph?.moduleCount).toBe(DEFAULT_MODAL_FLOW_MODULES);
    expect(graph?.edgeCount).toBeGreaterThan(18);
    expect(graph?.sourceCount).toBeGreaterThanOrEqual(8);
    expect(graph?.bindingCount).toBeGreaterThanOrEqual(16);
    expect(new Set(graph?.focusTargets.map((focus) => focus.scale)).size).toBe(5);
    expect(physics).toBeDefined();
    expect(physics?.pins.length).toBeGreaterThan(0);
    expect(physics?.laneLabels).toHaveLength(ROUTING_LANE_COUNT);
    expect(physics?.parts.length).toBeGreaterThan(graph?.moduleCount ?? 0);
    expect(physics?.telemetry.governorEnergy).toBeGreaterThanOrEqual(0);

    instance.setCameraMode?.(1);
    expect(instance.getCameraMode?.()).toBe(1);
    instance.setDirectorEnabled?.(true);
    instance.setDirectorEnabled?.(false);
    instance.setFocusTarget?.('focus-gate-bank');
    expect(instance.getMachineGraphSnapshot?.().activeFocusId).toBe('focus-gate-bank');
    instance.toggleProgrammingPin?.(0, 0, false);
    instance.dropMarbles?.(4);
    const program = instance.exportPhysicsProgram?.() ?? '';
    expect(program).toContain('MODAL FLOW ROUTING WHEEL');
    instance.importPhysicsProgram?.(program);
    const config = instance.exportGraphConfig?.() ?? '';
    expect(config).toContain('MODAL FLOW CONFIG');
    instance.importGraphConfig?.(config);
    instance.resetPhysics?.();

    for (let i = 0; i < 12; i++) {
      instance.update(DT, i * DT, transportFrom(ctx), ctx);
    }
    expect(instance.getMetrics().activeShotBadge).toContain('DRONE');

    instance.growMachine?.(12);
    expect(instance.getMachineGraphSnapshot?.().moduleCount).toBe(DEFAULT_MODAL_FLOW_MODULES + 12);
    const rebuiltRoot = ctx.scene.children.find((child) => child.name === 'rig:root');
    expect(rebuiltRoot).toBeDefined();
    expect(countUnparented(rebuiltRoot as THREE.Object3D)).toBe(0);
    expect(ctx.scene.children.filter((child) => child.name === 'rig:root')).toHaveLength(1);

    instance.dispose();
    expect(ctx.scene.children.filter((child) => child.name === 'rig:root')).toHaveLength(0);
  });

  it('extends the Director free-fly controller with a drone camera mode', () => {
    const globalAny = globalThis as Record<string, unknown> & { window?: unknown };
    const previousWindow = globalAny.window;
    const listeners = new Map<string, Array<(event: unknown) => void>>();
    const windowStub = {
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
      removeEventListener: (type: string, fn: (event: unknown) => void) => {
        const list = listeners.get(type) ?? [];
        listeners.set(type, list.filter((candidate) => candidate !== fn));
      },
    };
    const canvasStub = {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      setPointerCapture: () => undefined,
    };
    globalAny.window = windowStub;
    try {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const controller = new FreeFlyController(
        canvasStub as unknown as HTMLCanvasElement,
        camera,
      );
      controller.setFromPose({
        position: [0, 3, 10],
        target: [0, 0, 0],
        fov: 48,
        roll: 0,
      });
      controller.setMode('DRONE');
      controller.setDroneTuning(1.4);
      controller.setFollowTarget([0, 1, 0]);
      expect(controller.getDroneState().mode).toBe('DRONE');
      expect(controller.getDroneState().speed).toBeCloseTo(1.4, 6);
      const fire = (type: string, event: Record<string, unknown>) => {
        for (const fn of listeners.get(type) ?? []) fn(event);
      };
      fire('keydown', {
        key: 'f',
        code: 'KeyF',
        repeat: false,
        target: null,
        preventDefault: () => undefined,
      });
      expect(controller.getDroneState().follow).toBe(true);
      fire('keydown', {
        key: 'v',
        code: 'KeyV',
        repeat: false,
        target: null,
        preventDefault: () => undefined,
      });
      expect(controller.getDroneState().cinematic).toBe(false);
      controller.update(0.016);
      expect(Number.isFinite(camera.position.x)).toBe(true);
      expect(Number.isFinite(camera.fov)).toBe(true);
      controller.dispose();
    } finally {
      if (previousWindow === undefined) delete globalAny.window;
      else globalAny.window = previousWindow;
    }
  });
});
