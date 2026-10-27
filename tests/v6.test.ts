import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type {
  ImpulseEvent,
  PostFxState,
  WorkRuntimeContext,
} from '../src/engine/core/types';
import {
  MachineGraph,
  type GraphStepContext,
} from '../src/kit/machine/MachineGraph';
import {
  createOrreryFactoryConfig,
  DEFAULT_MODULE_COUNT,
  GRAPH_MACRO_DEFINITIONS,
  MAX_MODULE_COUNT,
  portJointId,
} from '../src/kit/machine/OrreryFactoryConfig';
import { DEFAULT_BEHAVIOR_MAPS } from '../src/studio/articulation/MechanismEcology';
import { OrreryCommonsWork } from '../src/works/astrarium-modular-engine/OrreryCommonsWork';

const stepContext = (overrides: Partial<GraphStepContext> = {}): GraphStepContext => ({
  dt: 0.016,
  elapsed: 1,
  beat: 4,
  bar: 1,
  step16: 4,
  scoreIntensity: 0.72,
  networkCoupling: 0.7,
  flowRate: 0.82,
  energyChaos: 0.32,
  narrativeScale: 1.2,
  moduleDensity: 0.85,
  behaviorMode: 'PRECISION_ESCAPEMENT',
  ...overrides,
});

const impulse = (
  subsystem: ImpulseEvent['subsystem'],
  velocity = 1,
): ImpulseEvent => ({
  subsystem,
  velocity,
  pitchRatio: 1,
  decay: 1,
  locus: [0.2, -0.1, 0.4],
  audioTime: 1,
  beat: 4,
  origin: 'score',
});

function countUnparentedMeshes(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    let parent: THREE.Object3D | null = object.parent;
    let foundRigAncestor = false;
    while (parent) {
      if (parent.name.startsWith('rig:')) {
        foundRigAncestor = true;
        break;
      }
      parent = parent.parent;
    }
    if (!foundRigAncestor) count++;
  });
  return count;
}

describe('V6 machine-building kit graph', () => {
  it('ships a dense, scalable blueprint with many-to-many bindings and every focus scale', () => {
    const config = createOrreryFactoryConfig(DEFAULT_MODULE_COUNT);
    expect(config.version).toBe(2);
    expect(config.modules).toHaveLength(72);
    expect(config.edges.length).toBeGreaterThanOrEqual(216);
    expect(config.sources.length).toBeGreaterThanOrEqual(12);
    expect(config.bindings.length).toBeGreaterThanOrEqual(18);
    expect(config.focusTargets.length).toBeGreaterThanOrEqual(10);
    expect(config.modules.filter((m) => m.archetype === 'CHRONO_CORE')).toHaveLength(2);

    const scales = new Set(config.focusTargets.map((f) => f.scale));
    for (const scale of ['MACRO', 'CLUSTER', 'MODULE', 'PORT', 'CONDUIT'] as const) {
      expect(scales.has(scale)).toBe(true);
    }
    expect(new Set(config.sources.map((s) => s.waveform)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(config.edges.map((e) => e.transfer)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(config.edges.map((e) => e.kind)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(config.bindings.map((b) => b.mode)).size).toBeGreaterThanOrEqual(5);
    expect(config.bindings.some((b) => b.source === 'any')).toBe(true);
    expect(
      config.modules.every((module) =>
        config.edges.some((edge) => edge.fromModule === module.id || edge.toModule === module.id),
      ),
    ).toBe(true);

    const graph = new MachineGraph(config);
    const fanOuts = config.bindings.map((binding) => graph.getBindingTargetCount(binding.id));
    const fanIns = config.modules.map((module) => graph.getModuleBindingCount(module.id));
    expect(Math.max(...fanOuts)).toBeGreaterThan(1);
    expect(Math.max(...fanIns)).toBeGreaterThan(1);
    expect(fanOuts.filter((count) => count > 1).length).toBeGreaterThan(5);
    expect(fanIns.filter((count) => count > 1).length).toBeGreaterThan(20);

    const initialEnergy = graph.getGlobalState().totalEnergy;
    graph.emitScore(impulse('sub-rupture', 1.25), 4);
    graph.emitScore(impulse('bellows-choir', 0.9), 4.25);
    for (let frame = 0; frame < 36; frame++) {
      graph.step(stepContext({ elapsed: 1 + frame * 0.016, beat: 4 + frame * 0.04 }));
    }
    expect(graph.getGlobalState().totalEnergy).toBeGreaterThan(initialEnergy);
    expect(graph.getEdgeFlow(config.edges[0].id)).toBeGreaterThanOrEqual(0);

    const snapshot = graph.getSnapshot('TEST FOCUS', []);
    expect(snapshot.moduleCount).toBe(72);
    expect(snapshot.edgeCount).toBe(config.edges.length);
    expect(snapshot.sourceCount).toBe(config.sources.length);
    expect(snapshot.bindings).toHaveLength(config.bindings.length);
    expect(snapshot.modules.every((module) => Number.isFinite(module.energy))).toBe(true);

    graph.updateBinding('bind-sub-rupture', {
      weight: 1.7,
      enabled: false,
      mode: 'INHIBIT',
    });
    const changed = graph.getConfig().bindings.find((b) => b.id === 'bind-sub-rupture');
    expect(changed?.weight).toBeCloseTo(1.7, 4);
    expect(changed?.enabled).toBe(false);
    expect(changed?.mode).toBe('INHIBIT');

    const exported = graph.exportConfigJSON();
    const parsed = MachineGraph.parseConfig(exported);
    expect(parsed.version).toBe(2);
    expect(parsed.modules).toHaveLength(72);
    expect(parsed.edges).toHaveLength(config.edges.length);
    expect(() => MachineGraph.parseConfig('{}')).toThrow();

    graph.replaceConfig(createOrreryFactoryConfig(96));
    expect(graph.getConfig().modules).toHaveLength(96);
    expect(graph.getActiveFocusId()).toBe(graph.getConfig().focusTargets[0].id);
  });

  it('clamps generated installations from a dozen modules up to hundreds', () => {
    const small = createOrreryFactoryConfig(4);
    const large = createOrreryFactoryConfig(999);
    expect(small.modules).toHaveLength(12);
    expect(large.modules).toHaveLength(MAX_MODULE_COUNT);
    expect(large.edges.length).toBeGreaterThanOrEqual(MAX_MODULE_COUNT * 3);
    expect(new Set(large.focusTargets.map((f) => f.scale)).size).toBe(5);
    expect(large.edges.every((edge) => edge.fromModule !== edge.toModule)).toBe(true);
  });
});

describe('V6 ASTRARIUM modular engine work', () => {
  it('builds a joint-parented installation, authors graph state and grows live', () => {
    const clock = new Clock();
    clock.configure(
      OrreryCommonsWork.bpm,
      OrreryCommonsWork.bars,
      OrreryCommonsWork.sections,
    );
    const matrix = new ModulationMatrix();
    matrix.registerMacros(OrreryCommonsWork.macros);
    matrix.setRoutes(OrreryCommonsWork.defaultPatches);
    const audio = new AudioEngine();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.06, 220);
    let capturedPostFx: Partial<PostFxState> = {};
    const ctx: WorkRuntimeContext = {
      scene,
      camera,
      audio,
      clock,
      matrix,
      setPostFx: (fx) => {
        capturedPostFx = { ...capturedPostFx, ...fx };
      },
    };

    const work = OrreryCommonsWork.createInstance();
    work.init(ctx);
    expect(scene.children).toHaveLength(1);
    expect(countUnparentedMeshes(scene.children[0])).toBe(0);

    const snapshot = work.getMachineGraphSnapshot?.();
    expect(snapshot).toBeDefined();
    expect(snapshot?.moduleCount).toBe(DEFAULT_MODULE_COUNT);
    expect(snapshot?.edgeCount).toBeGreaterThanOrEqual(216);
    expect(snapshot?.sourceCount).toBeGreaterThanOrEqual(12);
    expect(snapshot?.macros).toHaveLength(GRAPH_MACRO_DEFINITIONS.length);
    expect(new Set(snapshot?.focusTargets.map((f) => f.scale)).size).toBe(5);
    expect(work.getJointDescriptors?.().length).toBeGreaterThan(200);
    expect(
      work.getJointDescriptors?.().some((joint) => joint.id === portJointId('m002', 'vent')),
    ).toBe(true);
    expect(work.getMetrics().activeInstances).toBeGreaterThan(300);

    work.setArticulationState?.({
      magneticUnpin: 0.8,
      chronoShear: 0.6,
      overclockSpeed: 1.4,
    });
    expect(work.getArticulationState?.().magneticUnpin).toBeCloseTo(0.8, 2);
    work.setBehaviorId?.('OVERCLOCK_CADENZA');
    expect(work.getBehaviorId?.()).toBe('OVERCLOCK_CADENZA');
    work.setBehaviorMaps?.(DEFAULT_BEHAVIOR_MAPS);

    work.setGraphMacro?.('networkCoupling', 0.9);
    expect(
      work.getMachineGraphSnapshot?.().macros.find((macro) => macro.id === 'networkCoupling')?.value,
    ).toBeCloseTo(0.9, 2);

    work.updateGraphBinding?.('bind-sub-rupture', {
      weight: 1.35,
      enabled: false,
      mode: 'INHIBIT',
    });
    const binding = work.getMachineGraphSnapshot?.().bindings.find(
      (candidate) => candidate.id === 'bind-sub-rupture',
    );
    expect(binding?.weight).toBeCloseTo(1.35, 2);
    expect(binding?.enabled).toBe(false);
    expect(binding?.mode).toBe('INHIBIT');

    const conduitFocus = snapshot?.focusTargets.find((focus) => focus.scale === 'CONDUIT');
    expect(conduitFocus).toBeDefined();
    work.setFocusTarget?.(conduitFocus!.id);
    expect(work.getMachineGraphSnapshot?.().activeFocusId).toBe(conduitFocus!.id);

    work.triggerImpulse(impulse('sub-rupture', 1.2), ctx);
    work.triggerImpulse(impulse('glass-armonica', 0.9), ctx);
    work.update(0.016, 1.2, clock.getState(), ctx);

    expect(capturedPostFx.bloomStrength).toBeGreaterThan(0.5);
    expect(work.getEcologySnapshot?.()['graph.arousal']).toBeGreaterThan(0);
    expect(work.getMetrics().behavioralState).toContain('OVERCLOCK_CADENZA');
    expect(work.getMachineGraphSnapshot?.().activeFocusId).toBe(conduitFocus!.id);

    const exported = work.exportGraphConfig?.();
    expect(exported).toBeTruthy();
    expect(JSON.parse(exported!).modules).toHaveLength(DEFAULT_MODULE_COUNT);

    work.growMachine?.(16);
    expect(work.getMachineGraphSnapshot?.().moduleCount).toBe(88);
    expect(scene.children).toHaveLength(1);
    expect(countUnparentedMeshes(scene.children[0])).toBe(0);

    work.rebuildMachine?.(96);
    expect(work.getMachineGraphSnapshot?.().moduleCount).toBe(96);
    expect(countUnparentedMeshes(scene.children[0])).toBe(0);

    work.importGraphConfig?.(JSON.stringify(createOrreryFactoryConfig(48)));
    expect(work.getMachineGraphSnapshot?.().moduleCount).toBe(48);
    expect(scene.children).toHaveLength(1);
    expect(countUnparentedMeshes(scene.children[0])).toBe(0);

    work.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
