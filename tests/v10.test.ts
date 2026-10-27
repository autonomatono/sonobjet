import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type { ImpulseEvent, WorkRuntimeContext } from '../src/engine/core/types';
import { createConduitSampler } from '../src/works/modal-flow/ModalFlowBlueprint';
import { ModalFlowPhysics } from '../src/works/modal-flow/ModalFlowPhysics';
import {
  createNeonPinballBlueprint,
  DEFAULT_NEON_PINBALL_MODULES,
} from '../src/works/neon-pinball/NeonPinballBlueprint';
import { NeonPinballComposer } from '../src/works/neon-pinball/NeonPinballComposer';
import {
  evaluateNeonPinballCues,
  NEON_PINBALL_BPM,
  NEON_PINBALL_TOTAL_BARS,
} from '../src/works/neon-pinball/NeonPinballScore';
import { NeonPinballWork } from '../src/works/neon-pinball/NeonPinballWork';

const DT = 1 / 60;

function makeContext(): WorkRuntimeContext & {
  scene: THREE.Scene;
  clock: Clock;
  matrix: ModulationMatrix;
} {
  const clock = new Clock();
  clock.configure(NeonPinballWork.bpm, NeonPinballWork.bars, NeonPinballWork.sections);
  const matrix = new ModulationMatrix();
  matrix.registerMacros(NeonPinballWork.macros);
  matrix.setRoutes(NeonPinballWork.defaultPatches);
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(47, 16 / 9, 0.06, 220),
    audio: new AudioEngine(),
    clock,
    matrix,
    setPostFx: () => undefined,
  };
}

function countUnparented(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh && !(object as THREE.Points).isPoints) return;
    let cursor: THREE.Object3D | null = object.parent;
    while (cursor && !cursor.name.startsWith('rig:')) cursor = cursor.parent;
    if (!cursor) count += 1;
  });
  return count;
}

describe('V10 NEON PINBALL // breakcore computer', () => {
  it('builds a genuinely spatial open machine with non-coplanar mouths and new instrument families', () => {
    const blueprint = createNeonPinballBlueprint(DEFAULT_NEON_PINBALL_MODULES);
    expect(blueprint.environment).toBe('open-pinball');
    expect(blueprint.spatialPorts).toBe(true);
    expect(blueprint.cameraEnvelopeRadius).toBeGreaterThan(14);
    expect(blueprint.modules).toHaveLength(DEFAULT_NEON_PINBALL_MODULES);
    for (const kind of ['ratchet', 'bells', 'crystal', 'percussion', 'loom', 'pinball', 'computer', 'neon']) {
      expect(blueprint.modules.some((module) => module.kind === kind)).toBe(true);
    }
    expect(blueprint.modules.filter((module) => module.orientation).length).toBeGreaterThan(20);
    const yValues = blueprint.modules.map((module) => module.position.y);
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(14);

    const transmissionKinds = new Set(blueprint.transmissions.map((item) => item.kind));
    for (const kind of ['ratchet', 'music-box', 'bell-crank', 'solenoid']) {
      expect([...transmissionKinds]).toContain(kind);
    }
    expect(blueprint.transmissions.length).toBeGreaterThan(14);

    const edge = blueprint.conduits.find((candidate) => candidate.id === 'conduit-switchyard-crystal');
    expect(edge).toBeDefined();
    if (!edge) return;
    const sampler = createConduitSampler(blueprint);
    const [start, end] = sampler.endpoints(edge);
    const from = blueprint.modules.find((module) => module.id === edge.from);
    const to = blueprint.modules.find((module) => module.id === edge.to);
    expect(Math.hypot(
      start.x - (from?.position.x ?? 0),
      start.y - (from?.position.y ?? 0),
      start.z - (from?.position.z ?? 0),
    )).toBeGreaterThan(0.3);
    expect(Math.hypot(
      end.x - (to?.position.x ?? 0),
      end.y - (to?.position.y ?? 0),
      end.z - (to?.position.z ?? 0),
    )).toBeGreaterThan(0.3);
    const points = sampler.points(edge, 20);
    expect(new Set(points.map((point) => point.y.toFixed(2))).size).toBeGreaterThan(8);
    expect(new Set(points.map((point) => point.z.toFixed(2))).size).toBeGreaterThan(8);
  });

  it('programs a 174 BPM IDM/DnB song by addressing physical organs first', () => {
    expect(NEON_PINBALL_BPM).toBe(174);
    expect(NEON_PINBALL_TOTAL_BARS).toBe(64);
    const blueprint = createNeonPinballBlueprint();
    const moduleIds = new Set(blueprint.modules.map((module) => module.id));
    const allCues = [];
    for (let bar = 0; bar < NEON_PINBALL_TOTAL_BARS; bar++) {
      const section = NeonPinballWork.sections.findIndex(
        (candidate) => bar >= candidate.startBar && bar < candidate.endBar,
      );
      for (let step = 0; step < 64; step++) {
        allCues.push(...evaluateNeonPinballCues(step, bar, section));
      }
    }
    expect(allCues.length).toBeGreaterThan(1800);
    expect(allCues.every((cue) => moduleIds.has(cue.moduleId))).toBe(true);
    expect(allCues.filter((cue) => cue.subsystem === 'break-shred').length).toBeGreaterThan(450);
    expect(allCues.some((cue) => cue.subsystem === 'glass-armonica')).toBe(true);
    expect(allCues.some((cue) => cue.subsystem === 'acid-squelch')).toBe(true);
    expect(allCues.some((cue) => cue.ratchetTotal && cue.ratchetTotal >= 8)).toBe(true);
    expect(evaluateNeonPinballCues(58, 35, 3)).toEqual(
      evaluateNeonPinballCues(58, 35, 3),
    );
  });

  it('carries score metadata through deterministic physics before emitting break, crystal and neon voices', () => {
    const blueprint = createNeonPinballBlueprint();
    const physics = new ModalFlowPhysics(blueprint, { seed: 1010 });
    const composer = new NeonPinballComposer();
    composer.setParams({ phraseDensity: 1.04, scoreIntensity: 1, sectionIndex: 4 });
    const sourceCues = [
      ...evaluateNeonPinballCues(0, 45, 4),
      ...evaluateNeonPinballCues(44, 46, 4),
      ...evaluateNeonPinballCues(8, 48, 4),
    ];
    const impulses: ImpulseEvent[] = [];
    for (const cue of sourceCues) {
      physics.injectEnergy(cue.energy * 0.78, cue.moduleId, {
        sequenced: true,
        voice: cue.subsystem,
        noteIndex: cue.noteIndex,
        midiNote: cue.midiNote,
        sliceIndex: cue.sliceIndex,
        reverse: cue.reverse,
        ratchetStep: cue.ratchetStep,
        ratchetTotal: cue.ratchetTotal,
        sourceBeat: 180,
        velocity: cue.energy * 0.72,
      });
    }
    const events = physics.drainEvents().filter(
      (event) => event.kind === 'energy' && event.sequenced,
    );
    expect(events).toHaveLength(sourceCues.length);
    for (const event of events) {
      const impulse = composer.map(event, 180, 0.02);
      if (impulse) impulses.push(impulse);
    }
    expect(impulses).toHaveLength(events.length);
    expect(impulses.every((impulse) => impulse.origin === 'physics')).toBe(true);
    expect(new Set(impulses.map((impulse) => impulse.subsystem)).size).toBeGreaterThan(3);
    expect(impulses.some((impulse) => impulse.subsystem === 'break-shred')).toBe(true);
    expect(impulses.some((impulse) => impulse.subsystem === 'glass-armonica')).toBe(true);
    expect(impulses.some((impulse) => impulse.subsystem === 'arc-discharge')).toBe(true);
  });

  it('integrates the open shadow sails, charge particles and inspectable V10 mechanisms', () => {
    const ctx = makeContext();
    const instance = NeonPinballWork.createInstance();
    instance.init(ctx);
    const root = ctx.scene.children.find((child) => child.name === 'rig:root');
    expect(root).toBeDefined();
    expect(countUnparented(root as THREE.Object3D)).toBe(0);

    let particleFields = 0;
    let shadowSails = 0;
    root?.traverse((object) => {
      if (object.name === 'vfx:open-charge-field') particleFields += 1;
      if (object.name.startsWith('shadow:sail:')) shadowSails += 1;
    });
    expect(particleFields).toBe(1);
    expect(shadowSails).toBe(4);

    const joints = instance.getJointDescriptors?.() ?? [];
    expect(joints.filter((joint) => joint.id.startsWith('transmission:')).length).toBeGreaterThan(14);
    expect(joints.filter((joint) => joint.id.startsWith('joint:shadowGobo:')).length).toBe(4);
    expect(joints.some((joint) => joint.id.includes('loom'))).toBe(true);
    expect(joints.some((joint) => joint.id.includes('crystal'))).toBe(true);
    expect(joints.some((joint) => joint.id.includes('pinball'))).toBe(true);

    const physics = instance.getPhysicsSnapshot?.();
    expect(physics?.version).toBe(10);
    expect(physics?.name).toContain('RATCHETS');
    expect(physics?.instrumentLabels.some((label) => label.includes('CRYSTAL'))).toBe(true);
    expect(instance.getMachineGraphSnapshot?.().moduleCount).toBe(DEFAULT_NEON_PINBALL_MODULES);

    for (let frame = 0; frame < 12; frame++) {
      instance.update(DT, frame * DT, ctx.clock.getState(), ctx);
    }
    expect(instance.getMetrics().activeInstances).toBeGreaterThan(DEFAULT_NEON_PINBALL_MODULES);
    instance.dispose();
    expect(ctx.scene.children.filter((child) => child.name === 'rig:root')).toHaveLength(0);
  });
});
