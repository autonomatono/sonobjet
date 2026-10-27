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
  CamFollowerDriver,
  GenevaIndexerDriver,
  GearRatioDriver,
  KinematicRig,
  MagneticSlipRail,
  solveCrankSlider,
  solveFourBar,
  type RigUpdateContext,
} from '../src/kit/mechanism/KinematicRig';
import {
  createHorologicalMaterials,
  createSkeletonBridgeGeometry,
  createSpokedGearGeometry,
  disposeGeometryCache,
} from '../src/kit/mechanism/HorologicalMeshKit';
import {
  ARTICULATION_DEFINITIONS,
  BEHAVIOR_IDS,
  createDefaultArticulation,
  type ArticulationState,
} from '../src/studio/articulation/ArticulationRig';
import {
  BehaviorPresetBank,
  BUILT_IN_PRESETS,
} from '../src/studio/articulation/BehaviorPresetBank';
import {
  DEFAULT_BEHAVIOR_MAPS,
  MechanismEcology,
} from '../src/studio/articulation/MechanismEcology';
import {
  createDefaultDirectorProject,
  KeyframeTimeline,
  type CameraKeyframe,
} from '../src/studio/director/KeyframeTimeline';
import { ChronoAutomaton } from '../src/works/chrono-automaton/ChronoAutomaton';
import { ChronoAutomatonWork } from '../src/works/chrono-automaton/ChronoAutomatonWork';

const rigContext = (overrides: Partial<RigUpdateContext> = {}): RigUpdateContext => ({
  dt: 0.016,
  elapsed: 1,
  beat: 0,
  bar: 0,
  step16: 0,
  scoreIntensity: 0.6,
  impulseEnergy: 0.3,
  overclock: 0.5,
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
  beat: 0,
  origin: 'score',
});

describe('V5 KinematicRig: parenting, meshing gears, analytical linkages and flux rails', () => {
  it('parents joints in a named tree and keeps meshed gears rigidly coupled', () => {
    const rig = new KinematicRig();
    const frame = rig.createJoint({
      id: 'frame',
      label: 'FRAME',
      type: 'root',
      parent: 'root',
    });
    const drive = rig.createJoint({
      id: 'drive',
      label: 'DRIVE',
      parent: 'frame',
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    const driven = rig.createJoint({
      id: 'driven',
      label: 'DRIVEN',
      parent: 'frame',
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    rig.addDriver(new GearRatioDriver('drive', 'driven', -24 / 16));

    drive.setValue(0.4);
    rig.update(rigContext());

    expect(driven.parentId).toBe('frame');
    expect(driven.group.parent).toBe(frame.group);
    expect(driven.value).toBeCloseTo(-0.6, 6);
    expect(rig.getJointDescriptors().map((j) => j.id)).toContain('driven');
    rig.dispose();
  });

  it('solves exact four-bar pin coincidence and crank-slider travel', () => {
    const lengths = { ground: 1.05, crank: 0.36, coupler: 0.92, rocker: 0.72 };
    for (const angle of [-0.7, 0, 0.6, 1.2, 2.4]) {
      const solution = solveFourBar(angle, lengths);
      expect(solution.valid).toBe(true);
      const couplerLength = Math.hypot(
        solution.rockerPin[0] - solution.crankPin[0],
        solution.rockerPin[1] - solution.crankPin[1],
      );
      const rockerLength = Math.hypot(
        solution.rockerPin[0] - lengths.ground,
        solution.rockerPin[1],
      );
      expect(couplerLength).toBeCloseTo(lengths.coupler, 6);
      expect(rockerLength).toBeCloseTo(lengths.rocker, 6);
    }

    const slider = solveCrankSlider(Math.PI / 4, 0.2, 0.72);
    expect(slider.valid).toBe(true);
    expect(slider.sliderX).toBeGreaterThan(0.5);
    expect(slider.crankPin[1]).toBeGreaterThan(0);
  });

  it('lifts cam followers ahead of cues and indexes Geneva wheels in dwell steps', () => {
    const rig = new KinematicRig();
    rig.createJoint({
      id: 'follower',
      label: 'FOLLOWER',
      type: 'prismatic',
      axis: [0, 1, 0],
      min: 0,
      max: 0.3,
      springStiffness: 60,
      damping: 12,
    });
    const cam = rig.addDriver(
      new CamFollowerDriver('follower', [0, 1, 0, 0], {
        amplitude: 0.2,
        beatsPerStep: 1,
        anticipationBeats: 0,
      }),
    );
    cam.triggerCue(1);
    rig.update(rigContext({ beat: 0.5 }));
    expect(cam.getLift()).toBeGreaterThan(0.1);

    const geneva = rig.createJoint({
      id: 'geneva',
      label: 'GENEVA',
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    const indexer = rig.addDriver(new GenevaIndexerDriver('geneva', 16, 4, 0.2));
    rig.update(rigContext({ beat: 1.02 }));
    expect(indexer.getIndex()).toBe(4);
    expect(geneva.value).toBeCloseTo((4 * Math.PI * 2) / 16, 6);
    rig.dispose();
  });

  it('stretches a visible plasma torque-axle between a fixed bearing and slip rail', () => {
    const rig = new KinematicRig();
    const beamParent = new THREE.Group();
    beamParent.add(rig.root);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 0, 0);
    beamParent.add(anchor);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1, 8),
      new THREE.MeshBasicMaterial(),
    );
    beamParent.add(beam);
    const joint = rig.createJoint({
      id: 'flux',
      label: 'FLUX',
      type: 'prismatic',
      axis: [0, 0, 1],
      min: 0,
      max: 1.8,
    });
    const rail = new MagneticSlipRail({
      jointId: 'flux',
      anchor,
      beam,
      beamParent,
      maxDistance: 1.4,
    });
    joint.setValue(1.1);
    rail.setUnpin(1);
    rail.update(rig, rigContext());
    expect(beam.visible).toBe(true);
    expect(beam.scale.y).toBeCloseTo(1.1, 4);
    rig.dispose();
  });

  it('builds real toothed gear and skeleton bridge geometry with bores', () => {
    const gear = createSpokedGearGeometry(24, 0.07, 0.5, 0.1, 6);
    const bridge = createSkeletonBridgeGeometry(4, 1.2, 0.12);
    expect(gear.getAttribute('position').count).toBeGreaterThan(200);
    expect(bridge.getAttribute('position').count).toBeGreaterThan(50);
    const materials = createHorologicalMaterials();
    expect(materials.surgicalChrome.metalness).toBeGreaterThan(0.9);
    materials.dispose();
    disposeGeometryCache();
  });
});

describe('V5 ecological behavior and machine preset bank', () => {
  it('exposes 12 articulation DOFs, 6 behaviors and a coupled score→organ ecology', () => {
    expect(ARTICULATION_DEFINITIONS).toHaveLength(12);
    expect(BEHAVIOR_IDS).toHaveLength(6);
    expect(DEFAULT_BEHAVIOR_MAPS.length).toBeGreaterThanOrEqual(8);

    const ecology = new MechanismEcology();
    ecology.setBehavior('OVERCLOCK_CADENZA');
    const articulation: ArticulationState = createDefaultArticulation();
    const before = ecology.getDrive('strikers');
    ecology.stimulate(impulse('sub-rupture', 1.3));
    for (let i = 0; i < 12; i++) {
      ecology.step({
        dt: 0.016,
        elapsed: i * 0.016,
        beat: i * 0.1,
        step16: i % 16,
        scoreIntensity: 0.75,
        articulation,
      });
    }
    expect(ecology.getDrive('strikers')).toBeGreaterThan(before);
    const snapshot = ecology.getSnapshot();
    expect(snapshot.arousal).toBeGreaterThan(0.15);
    expect(snapshot.fatigue).toBeGreaterThan(0.05);
    expect(snapshot.organDrives.bellows).toBeGreaterThan(0);
    expect(ecology.getFlatSnapshot()['drive.strikers']).toBeGreaterThan(0);
    ecology.reset();
    expect(ecology.getSnapshot().arousal).toBeCloseTo(0.18, 2);
  });

  it('ships 8 built-in milestones, crossfades articulation and round-trips JSON', () => {
    expect(BUILT_IN_PRESETS).toHaveLength(8);
    const bank = new BehaviorPresetBank();
    expect(bank.list()).toHaveLength(8);
    const blend = bank.blend('M1', 'M7', 0.5);
    expect(blend.articulation.chassisUnfold).toBeGreaterThan(0.4);
    expect(blend.articulation.chronoShear).toBeGreaterThan(0.3);
    expect(blend.postFx.bloomStrength).toBeGreaterThan(0.8);

    const duplicate = bank.duplicate('M4', 'U1', 'USER PRESET');
    expect(duplicate?.name).toBe('USER PRESET');
    expect(bank.list()).toHaveLength(9);

    const bank2 = new BehaviorPresetBank([]);
    bank2.importJSON(bank.exportJSON(), false);
    expect(bank2.list()).toHaveLength(9);
    expect(bank2.get('U1')?.behavior).toBe('PENDULUM_BREATH');
  });
});

describe('V5 96-bar Director KeyframeTimeline', () => {
  it('ships a rich default film with 24 camera shots, 8 looks and 10 milestones', () => {
    const timeline = new KeyframeTimeline(createDefaultDirectorProject());
    expect(timeline.getCameraKeys()).toHaveLength(24);
    expect(timeline.getLookKeys()).toHaveLength(8);
    expect(timeline.getMilestones()).toHaveLength(10);
    expect(timeline.getBehaviorMaps().length).toBeGreaterThanOrEqual(8);
    expect(timeline.getTotalBeats()).toBe(384);

    const firstKey = timeline.getCameraKeys()[0];
    const cut = timeline.evaluateCamera(1);
    expect(cut.interpolation).toBe('CUT');
    expect(cut.position).toEqual(firstKey.position);

    const look = timeline.evaluateLook(0);
    expect(look.fx.bloomStrength).toBeCloseTo(0.72, 2);

    const bank = new BehaviorPresetBank();
    const m0 = timeline.evaluateMilestone(0, bank);
    const m47 = timeline.evaluateMilestone(47, bank);
    expect(m47.articulation.chassisUnfold).toBeGreaterThan(
      m0.articulation.chassisUnfold,
    );
    expect(m47.t).toBeGreaterThan(0.5);
  });

  it('evaluates joint-attached shots, VERTIGO width and JSON project round-trip', () => {
    const project = createDefaultDirectorProject();
    const keyA: CameraKeyframe = {
      id: 'a',
      beat: 0,
      label: 'VERTIGO A',
      position: [0, 0, 10],
      target: [0, 0, 0],
      fov: 60,
      roll: 0,
      interpolation: 'VERTIGO',
    };
    const keyB: CameraKeyframe = {
      id: 'b',
      beat: 4,
      label: 'VERTIGO B',
      position: [0, 0, 2],
      target: [0, 0, 0],
      fov: 20,
      roll: 0,
      interpolation: 'CUT',
      jointId: 'chronoBarrel',
    };
    project.cameraKeys = [
      keyA,
      keyB,
      {
        ...keyB,
        id: 'c',
        beat: 8,
        interpolation: 'CUT',
        position: [1, 0, 0],
        target: [0, 0, 0],
      },
    ];
    const timeline = new KeyframeTimeline(project);
    const zolly = timeline.evaluateCamera(2);
    const framedWidth =
      zolly.position[2] * Math.tan((zolly.fov * Math.PI) / 360);
    expect(framedWidth).toBeCloseTo(2.05, 1);

    const attached = timeline.evaluateCamera(8.2, (id) =>
      id === 'chronoBarrel' ? [5, 0, 0] : null,
    );
    expect(attached.position[0]).toBe(6);

    const imported = new KeyframeTimeline();
    imported.replaceWithImported(JSON.stringify(timeline.getProject()));
    expect(imported.getCameraKeys()).toHaveLength(3);
    expect(imported.getCameraKeys()[1].id).toBe('b');
    expect(imported.getMilestones()).toHaveLength(10);
    expect(imported.exportJSON()).toContain('VERTIGO A');
  });
});

describe('V5 ChronoAutomaton work integration', () => {
  it('builds a fully parented mechanism with valid four-bar linkages and director hooks', () => {
    const clock = new Clock();
    clock.configure(
      ChronoAutomatonWork.bpm,
      ChronoAutomatonWork.bars,
      ChronoAutomatonWork.sections,
    );
    const matrix = new ModulationMatrix();
    matrix.registerMacros(ChronoAutomatonWork.macros);
    matrix.setRoutes(ChronoAutomatonWork.defaultPatches);
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

    const work = ChronoAutomatonWork.createInstance();
    work.init(ctx);
    expect(scene.children).toHaveLength(1);

    const metrics = work.getMetrics();
    expect(metrics.activeInstances).toBeGreaterThan(180);
    expect(work.getJointDescriptors?.().length).toBeGreaterThan(40);
    expect(
      work.getJointDescriptors?.().some((j) => j.id === 'chronoBarrel'),
    ).toBe(true);

    // Golden rule: every visible mesh must have a RigJoint ancestor.
    let unparentedMeshes = 0;
    scene.children[0].traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      let parent: THREE.Object3D | null = obj.parent;
      let found = false;
      while (parent) {
        if (parent.name.startsWith('rig:')) {
          found = true;
          break;
        }
        parent = parent.parent;
      }
      if (!found) unparentedMeshes += 1;
    });
    expect(unparentedMeshes).toBe(0);

    work.setArticulationState?.({
      magneticUnpin: 0.8,
      chronoShear: 0.6,
      overclockSpeed: 1.4,
    });
    expect(work.getArticulationState?.().magneticUnpin).toBeCloseTo(0.8, 2);
    work.setBehaviorId?.('OVERCLOCK_CADENZA');
    expect(work.getBehaviorId?.()).toBe('OVERCLOCK_CADENZA');
    work.setBehaviorMaps?.(DEFAULT_BEHAVIOR_MAPS);

    work.triggerImpulse(impulse('sub-rupture', 1.2), ctx);
    work.triggerImpulse(impulse('glass-armonica', 0.9), ctx);
    work.update(0.016, 1.2, clock.getState(), ctx);

    expect(capturedPostFx.bloomStrength).toBeGreaterThan(0.5);
    expect(work.getEcologySnapshot?.()['ecology.arousal']).toBeGreaterThan(0);
    expect(work.getMetrics().behavioralState).toContain('OVERCLOCK_CADENZA');

    const machine = new ChronoAutomaton();
    machine.update({
      dt: 0.016,
      elapsed: 2,
      transport: clock.getState(),
      scoreIntensity: 0.8,
    });
    const solutions = machine.getFourBarSolutions();
    expect(solutions).toHaveLength(6);
    for (const solution of solutions) expect(solution?.valid).toBe(true);
    machine.dispose();

    work.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
