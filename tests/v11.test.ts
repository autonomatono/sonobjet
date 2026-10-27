import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { Clock } from '../src/engine/core/Clock';
import { ModulationMatrix } from '../src/engine/core/ModulationMatrix';
import type { WorkDefinition, WorkRuntimeContext } from '../src/engine/core/types';
import { createBraindanceBlueprint } from '../src/works/braindance-collider/BraindanceBlueprint';
import {
  BRAINDANCE_BARS,
  evaluateBraindanceCues,
} from '../src/works/braindance-collider/BraindanceScore';
import { BraindanceWork } from '../src/works/braindance-collider/BraindanceWork';
import { ModalFlowPhysics } from '../src/works/modal-flow/ModalFlowPhysics';
import { quantizePhysicsAudioTime } from '../src/works/modal-flow/ModalFlowWork';
import { createNeonPinballBlueprint } from '../src/works/neon-pinball/NeonPinballBlueprint';
import { NeonPinballComposer } from '../src/works/neon-pinball/NeonPinballComposer';
import { NeonPinballWork } from '../src/works/neon-pinball/NeonPinballWork';
import {
  ANTARCTIC_BARS,
  evaluateAntarcticCues,
} from '../src/works/spatial-sequencer/AntarcticScore';
import { AntarcticWork } from '../src/works/spatial-sequencer/AntarcticWork';
import {
  createSpatialSequencerBlueprint,
  DEFAULT_ANTARCTIC_MODULES,
  DEFAULT_LUMEN_MODULES,
} from '../src/works/spatial-sequencer/SpatialSequencerBlueprint';
import {
  SPATIAL_TRANCE_BARS,
  evaluateSpatialTranceCues,
} from '../src/works/spatial-sequencer/SpatialTranceScore';
import { SpatialTranceWork } from '../src/works/spatial-sequencer/SpatialTranceWork';

function makeContext(work: WorkDefinition): WorkRuntimeContext & { scene: THREE.Scene; clock: Clock } {
  const clock = new Clock();
  clock.configure(work.bpm, work.bars, work.sections);
  const matrix = new ModulationMatrix();
  matrix.registerMacros(work.macros);
  matrix.setRoutes(work.defaultPatches);
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(47, 16 / 9, 0.06, 220),
    audio: new AudioEngine(),
    clock,
    matrix,
    setPostFx: () => undefined,
  };
}

function allCues(
  work: WorkDefinition,
  bars: number,
  evaluate: (step: number, bar: number, section: number) => ReturnType<typeof evaluateSpatialTranceCues>,
) {
  const cues = [];
  for (let bar = 0; bar < bars; bar++) {
    const section = work.sections.findIndex((item) => bar >= item.startBar && bar < item.endBar);
    for (let step = 0; step < 64; step++) cues.push(...evaluate(step, bar, section));
  }
  return cues;
}

function countUnparented(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (
      !(object as THREE.Mesh).isMesh &&
      !(object as THREE.Points).isPoints &&
      !(object as THREE.LineSegments).isLineSegments
    ) return;
    let cursor: THREE.Object3D | null = object.parent;
    while (cursor && !cursor.name.startsWith('rig:')) cursor = cursor.parent;
    if (!cursor) count += 1;
  });
  return count;
}

describe('V11 spatial variations and live-performance upgrades', () => {
  it('keeps Space Pinball while adding strong scale contrast, liquid neon and polychrome atmosphere', () => {
    const blueprint = createNeonPinballBlueprint();
    const scales = blueprint.modules.map((module) => module.scale);
    expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(5);
    expect(blueprint.environmentTheme).toBe('arcade');
    expect(NeonPinballWork.macros.find((macro) => macro.id === 'eventQuantize')?.defaultValue).toBe(1);
    expect(quantizePhysicsAudioTime(1.1, 10, 120, 4)).toBeCloseTo(10.075, 5);
    expect(quantizePhysicsAudioTime(1.1, 10, 120, 8)).toBeCloseTo(10.2, 5);

    const ctx = makeContext(NeonPinballWork);
    const instance = NeonPinballWork.createInstance();
    instance.init(ctx);
    const root = ctx.scene.getObjectByName('rig:root');
    expect(root).toBeDefined();
    let liquid = 0;
    let movers = 0;
    let beams = 0;
    let constellations = 0;
    let lightning = 0;
    let fireflies = 0;
    root?.traverse((object) => {
      if (object.name.startsWith('liquid-neon:')) liquid += 1;
      if (
        object.name.startsWith('light:chromatic-point:') ||
        object.name.startsWith('light:chromatic-spot:')
      ) movers += 1;
      if (object.name.startsWith('light:volumetric-beam:')) beams += 1;
      if (object.name === 'vfx:responsive-constellation') constellations += 1;
      if (object.name === 'vfx:tesla-lightning') lightning += 1;
      if (object.name === 'vfx:musical-fireflies') fireflies += 1;
    });
    expect(liquid).toBeGreaterThan(blueprint.conduits.length * 2);
    expect(movers).toBe(8);
    expect(beams).toBe(4);
    expect(constellations).toBe(1);
    expect(lightning).toBe(1);
    expect(fireflies).toBe(1);
    expect(countUnparented(root as THREE.Object3D)).toBe(0);
    instance.dispose();
  });

  it('builds a legible 3D geometric sequencer with a restrained trance score', () => {
    const blueprint = createSpatialSequencerBlueprint('lumen');
    expect(blueprint.moduleCount).toBe(DEFAULT_LUMEN_MODULES);
    expect(blueprint.environmentTheme).toBe('constellation');
    expect(blueprint.marbleCount).toBe(28);
    expect(blueprint.conduits.length).toBeGreaterThan(20);
    const scales = blueprint.modules.map((module) => module.scale);
    expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(5);
    const cues = allCues(SpatialTranceWork, SPATIAL_TRANCE_BARS, evaluateSpatialTranceCues);
    expect(cues.length).toBeGreaterThan(500);
    expect(cues.length).toBeLessThan(1800);
    expect(cues.some((cue) => cue.chordNotes?.length === 4)).toBe(true);
    expect(cues.every((cue) => blueprint.modules.some((module) => module.id === cue.moduleId))).toBe(true);
  });

  it('creates an original high-density braindance collider with grid and free-electric lanes', () => {
    const blueprint = createBraindanceBlueprint();
    expect(blueprint.environmentTheme).toBe('plasma');
    expect(blueprint.marbleCount).toBe(96);
    expect(blueprint.moduleCount).toBe(40);
    expect(blueprint.conduits.some((edge) => edge.id.startsWith('conduit-chaos-cross-'))).toBe(true);
    expect(blueprint.transmissions).toHaveLength(21);
    const scales = blueprint.modules.map((module) => module.scale);
    expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(10);
    const cues = allCues(BraindanceWork, BRAINDANCE_BARS, evaluateBraindanceCues);
    expect(cues.length).toBeGreaterThan(6000);
    expect(cues.some((cue) => cue.subsystem === 'arc-discharge' && cue.id.includes('free-electric'))).toBe(true);
    expect(cues.filter((cue) => cue.ratchetTotal).length).toBeGreaterThan(500);
  });

  it('makes a sparse Antarctic work with ice, underwater chords and slow light', () => {
    const blueprint = createSpatialSequencerBlueprint('antarctic');
    expect(blueprint.moduleCount).toBe(DEFAULT_ANTARCTIC_MODULES);
    expect(blueprint.environmentTheme).toBe('glacial');
    expect(blueprint.marbleCount).toBe(18);
    const cues = allCues(AntarcticWork, ANTARCTIC_BARS, evaluateAntarcticCues);
    expect(cues.length).toBeGreaterThan(60);
    expect(cues.length).toBeLessThan(260);
    expect(cues.some((cue) => cue.chordNotes?.length === 4)).toBe(true);
    expect(cues.some((cue) => cue.subsystem === 'glass-armonica')).toBe(true);
    expect(cues.some((cue) => cue.subsystem === 'break-shred')).toBe(false);

    const chord = cues.find((cue) => cue.chordNotes);
    expect(chord).toBeDefined();
    if (!chord) return;
    const physics = new ModalFlowPhysics(blueprint);
    physics.injectEnergy(chord.energy, chord.moduleId, {
      sequenced: true,
      voice: chord.subsystem,
      chordNotes: chord.chordNotes,
      velocity: chord.energy,
    });
    const event = physics.drainEvents().find((candidate) => candidate.sequenced);
    expect(event?.chordNotes).toEqual(chord.chordNotes);
    const impulse = event ? new NeonPinballComposer('ambient').map(event, 0, 0.1) : null;
    expect(impulse?.subsystem).toBe('bellows-choir');
    expect(impulse?.durationSec).toBeGreaterThan(4);
  });

  it('integrates and cleanly disposes all three V11 works', () => {
    for (const work of [SpatialTranceWork, BraindanceWork, AntarcticWork]) {
      const ctx = makeContext(work);
      const instance = work.createInstance();
      instance.init(ctx);
      const root = ctx.scene.getObjectByName('rig:root');
      expect(root, work.id).toBeDefined();
      expect(countUnparented(root as THREE.Object3D), work.id).toBe(0);
      expect(instance.getPhysicsSnapshot?.().version, work.id).toBe(11);
      instance.update(1 / 60, 0, ctx.clock.getState(), ctx);
      expect(instance.getMetrics().activeInstances, work.id).toBeGreaterThan(20);
      instance.dispose();
      expect(ctx.scene.getObjectByName('rig:root'), work.id).toBeUndefined();
    }
  });
});
