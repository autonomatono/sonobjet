import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type { WorkRuntimeContext } from '../src/engine/core/types';
import {
  createModalFlowBlueprint,
  DEFAULT_MODAL_FLOW_MODULES,
} from '../src/works/modal-flow/ModalFlowBlueprint';
import { ModalFlowComposer } from '../src/works/modal-flow/ModalFlowComposer';
import { ModalFlowPhysics } from '../src/works/modal-flow/ModalFlowPhysics';
import { isModalFlowScaleNote } from '../src/works/modal-flow/ModalFlowScore';
import { ModalFlowWork } from '../src/works/modal-flow/ModalFlowWork';
import {
  createDefaultDirectorProject,
  DEFAULT_POST_FX,
} from '../src/studio/director/KeyframeTimeline';

const DT = 1 / 60;

function countUnparented(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    let cursor: THREE.Object3D | null = object.parent;
    while (cursor && !cursor.name.startsWith('rig:')) cursor = cursor.parent;
    if (!cursor) count += 1;
  });
  return count;
}

function makeContext(): WorkRuntimeContext {
  const audio = new AudioEngine();
  const clock = new Clock();
  clock.configure(ModalFlowWork.bpm, ModalFlowWork.bars, ModalFlowWork.sections);
  const matrix = new ModulationMatrix();
  matrix.registerMacros(ModalFlowWork.macros);
  matrix.setRoutes(ModalFlowWork.defaultPatches);
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(47, 16 / 9, 0.1, 120),
    audio,
    clock,
    matrix,
    setPostFx: () => undefined,
  };
}

describe('V9 MODAL FLOW // resonant relay', () => {
  it('adds a heterogeneous many-to-many mechanical transmission network', () => {
    const blueprint = createModalFlowBlueprint(DEFAULT_MODAL_FLOW_MODULES);
    expect(blueprint.transmissions).toHaveLength(10);
    expect(new Set(blueprint.transmissions.map((link) => link.kind))).toEqual(
      new Set(['gear-train', 'belt', 'four-bar', 'camshaft', 'chain', 'nested-ring']),
    );
    expect(blueprint.transmissions.every((link) => link.pulses >= 3)).toBe(true);
    expect(blueprint.transmissions.every((link) => link.efficiency > 0.6)).toBe(true);
    expect(blueprint.focusTargets.some((focus) => focus.tags.includes('linkage'))).toBe(true);
    expect(blueprint.focusTargets.some((focus) => focus.tags.includes('shadow'))).toBe(true);
  });

  it('turns gear teeth, belt lugs, cams and linkages into deterministic musical events', () => {
    const blueprint = createModalFlowBlueprint(DEFAULT_MODAL_FLOW_MODULES);
    const physics = new ModalFlowPhysics(blueprint, { seed: 909 });
    const composer = new ModalFlowComposer();
    const mechanisms: string[] = [];
    const notes: number[] = [];
    for (let frame = 0; frame < 18 * 60; frame++) {
      for (const event of physics.step(DT)) {
        if (event.kind !== 'mechanism') continue;
        mechanisms.push(`${event.id}:${event.edgeId}:${event.moduleId}`);
        const impulse = composer.map(event, frame * DT * 2.2, 0.02);
        if (impulse?.midiNote !== undefined) notes.push(impulse.midiNote);
      }
    }
    expect(mechanisms.length).toBeGreaterThan(20);
    expect(new Set(mechanisms.map((event) => event.split(':')[1])).size).toBeGreaterThan(5);
    expect(physics.getTelemetry().mechanismPulseCount).toBe(mechanisms.length);
    expect(physics.getTransmissionPhase('transmission-crank-lift-gears')).toBeGreaterThanOrEqual(0);
    expect(physics.getTransmissionEnergy('transmission-gate-tines-linkage')).toBeGreaterThan(0);
    expect(notes.length).toBeGreaterThan(2);
    expect(notes.every(isModalFlowScaleNote)).toBe(true);

    const twin = new ModalFlowPhysics(blueprint, { seed: 909 });
    const twinMechanisms: string[] = [];
    for (let frame = 0; frame < 18 * 60; frame++) {
      for (const event of twin.step(DT)) {
        if (event.kind === 'mechanism') {
          twinMechanisms.push(`${event.id}:${event.edgeId}:${event.moduleId}`);
        }
      }
    }
    expect(twinMechanisms).toEqual(mechanisms);
  });

  it('builds a parented Cornell room, shadow rig and inspectable transmission parts', () => {
    const ctx = makeContext();
    const instance = ModalFlowWork.createInstance();
    instance.init(ctx);
    const root = ctx.scene.children.find((child) => child.name === 'rig:root');
    expect(root).toBeDefined();
    expect(countUnparented(root as THREE.Object3D)).toBe(0);

    const joints = instance.getJointDescriptors?.() ?? [];
    expect(joints.some((joint) => joint.id === 'mechanismFrame')).toBe(true);
    expect(joints.filter((joint) => joint.id.startsWith('transmission:')).length).toBe(10);
    expect(joints.filter((joint) => joint.id.startsWith('joint:shadowGobo:')).length).toBe(3);

    const graph = instance.getMachineGraphSnapshot?.();
    const physics = instance.getPhysicsSnapshot?.();
    expect(graph?.edgeCount).toBe(
      (blueprintEdgeCount(DEFAULT_MODAL_FLOW_MODULES)),
    );
    expect(graph?.edges.some((edge) => edge.kind === 'four-bar')).toBe(true);
    expect(physics?.version).toBe(9);
    expect(physics?.parts.filter((part) => part.tags.includes('transmission')).length).toBeGreaterThan(10);

    instance.setVisualStyle?.({
      palette: 3,
      lightRig: 1,
      lightIntensity: 1.4,
      shadowStrength: 1,
      linocut: 0.95,
      glitch: 0,
    });
    instance.update(DT, DT, ctx.clock.getState(), ctx);
    expect(instance.getMetrics().activeInstances).toBeGreaterThan(DEFAULT_MODAL_FLOW_MODULES);
    instance.dispose();
    expect(ctx.scene.children.filter((child) => child.name === 'rig:root')).toHaveLength(0);
  });

  it('ships clean, linocut and neon render languages without mandatory glitch', () => {
    expect(DEFAULT_POST_FX.glitch).toBeLessThan(0.02);
    expect(DEFAULT_POST_FX.linocut).toBe(0);
    expect(DEFAULT_POST_FX.neonGlow).toBeGreaterThan(0);
    expect(DEFAULT_POST_FX.lightIntensity).toBe(1);
    const project = createDefaultDirectorProject();
    expect(project.lookKeys.some((look) => look.fx.linocut > 0.7)).toBe(true);
    expect(project.lookKeys.some((look) => look.fx.neonGlow > 0.7)).toBe(true);
    expect(Math.max(...project.lookKeys.map((look) => look.fx.glitch))).toBeLessThan(0.12);
    expect(new Set(project.lookKeys.map((look) => Math.round(look.fx.palette))).size).toBeGreaterThan(3);
  });
});

function blueprintEdgeCount(moduleCount: number): number {
  const blueprint = createModalFlowBlueprint(moduleCount);
  return blueprint.conduits.length + blueprint.transmissions.length;
}
