import * as THREE from 'three/webgpu';
import type {
  AnticipationCue,
  BehaviorMapEntry,
  FocusDescriptor,
  GraphMacroSnapshot,
  ImpulseEvent,
  MachineGraphSnapshot,
  PhysicalPartSnapshot,
  PhysicsMacroSnapshot,
  PhysicsStudioSnapshot,
  PostFxState,
  RigJointDescriptor,
  ScoreBindingPatch,
  TransportState,
} from '../../engine/core/types';
import {
  GearRatioDriver,
  KinematicRig,
  type RigJoint,
  type RigUpdateContext,
} from '../../kit/mechanism/KinematicRig';
import { createSpokedGearGeometry } from '../../kit/mechanism/HorologicalMeshKit';
import {
  createMarbleBlueprint,
  DEFAULT_MARBLE_COUNT,
  LANE_COUNT,
  PHYSICS_MACRO_DEFINITIONS,
  PHYSICS_MACRO_IDS,
  PROGRAM_STEPS,
  PROGRAM_STEPS_PER_BEAT,
  TAU,
  type MarbleBlueprint,
  type MarbleSegmentSpec,
  type Vec2Tuple,
} from '../../kit/physics/MarbleBlueprint';
import {
  MarblePhysics,
  normalizeAngle,
  type PhysicsStepResult,
  type PhysicsTelemetry,
} from '../../kit/physics/MarblePhysics';
import {
  createDefaultProgram,
  ProgrammingWheel,
} from '../../kit/physics/ProgrammingWheel';
import {
  BEHAVIOR_IDS,
  clampArticulation,
  createDefaultArticulation,
  type ArticulationState,
  type BehaviorId,
} from '../../studio/articulation/ArticulationRig';
import {
  MachineCameraDirector,
  type MachineCameraSource,
  type Vec3Tuple,
} from '../astrarium-modular-engine/MachineCameraDirector';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

interface MarbleMaterials {
  wood: THREE.MeshStandardNodeMaterial;
  woodDark: THREE.MeshStandardNodeMaterial;
  backdrop: THREE.MeshStandardNodeMaterial;
  steel: THREE.MeshStandardNodeMaterial;
  brass: THREE.MeshStandardNodeMaterial;
  marble: THREE.MeshStandardNodeMaterial;
  glass: THREE.MeshStandardNodeMaterial;
  vibraphone: THREE.MeshStandardNodeMaterial;
  drum: THREE.MeshStandardNodeMaterial;
  cymbal: THREE.MeshStandardNodeMaterial;
  pin: THREE.MeshStandardNodeMaterial;
  gate: THREE.MeshStandardNodeMaterial;
  bucket: THREE.MeshStandardNodeMaterial;
  flywheel: THREE.MeshStandardNodeMaterial;
  dispose(): void;
}

interface MarbleGeometries {
  box: THREE.BoxGeometry;
  rod: THREE.CylinderGeometry;
  sphere: THREE.SphereGeometry;
  tube: THREE.CylinderGeometry;
  collar: THREE.TorusGeometry;
  pin: THREE.BoxGeometry;
  bucket: THREE.BoxGeometry;
  cymbal: THREE.CylinderGeometry;
  drum: THREE.CylinderGeometry;
  flywheelGear: THREE.BufferGeometry;
  programGear: THREE.BufferGeometry;
  rim: THREE.TorusGeometry;
  trackRing: THREE.TorusGeometry;
  dispose(): void;
}

function createMarbleMaterials(): MarbleMaterials {
  const wood = new THREE.MeshStandardNodeMaterial({ color: 0xb98b55, roughness: 0.78, metalness: 0.04 });
  const woodDark = new THREE.MeshStandardNodeMaterial({ color: 0x4a3423, roughness: 0.84, metalness: 0.03 });
  const backdrop = new THREE.MeshStandardNodeMaterial({ color: 0x171a1d, roughness: 0.92, metalness: 0.02 });
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0xb8c5d0, roughness: 0.22, metalness: 0.92 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: 0xc9a056, roughness: 0.28, metalness: 0.86 });
  const marble = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.96 });
  const glass = new THREE.MeshStandardNodeMaterial({
    color: 0xbfe7ff,
    roughness: 0.08,
    metalness: 0.02,
    transparent: true,
    opacity: 0.19,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const vibraphone = new THREE.MeshStandardNodeMaterial({ color: 0xd8c58b, roughness: 0.2, metalness: 0.88 });
  const drum = new THREE.MeshStandardNodeMaterial({ color: 0xe6e9ec, roughness: 0.46, metalness: 0.08 });
  const cymbal = new THREE.MeshStandardNodeMaterial({ color: 0xd9a94c, roughness: 0.18, metalness: 0.94 });
  const pin = new THREE.MeshStandardNodeMaterial({ color: 0xffd48a, roughness: 0.28, metalness: 0.72, emissive: 0x3a2408 });
  const gate = new THREE.MeshStandardNodeMaterial({ color: 0xd9e1e8, roughness: 0.26, metalness: 0.8 });
  const bucket = new THREE.MeshStandardNodeMaterial({ color: 0x8c6d42, roughness: 0.54, metalness: 0.28 });
  const flywheel = new THREE.MeshStandardNodeMaterial({ color: 0x20252c, roughness: 0.36, metalness: 0.82 });
  const all = [wood, woodDark, backdrop, steel, brass, marble, glass, vibraphone, drum, cymbal, pin, gate, bucket, flywheel];
  return {
    wood,
    woodDark,
    backdrop,
    steel,
    brass,
    marble,
    glass,
    vibraphone,
    drum,
    cymbal,
    pin,
    gate,
    bucket,
    flywheel,
    dispose() {
      for (const material of all) material.dispose();
    },
  };
}

function createMarbleGeometries(): MarbleGeometries {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const rod = new THREE.CylinderGeometry(1, 1, 1, 10);
  const sphere = new THREE.SphereGeometry(1, 18, 14);
  const tube = new THREE.CylinderGeometry(0.14, 0.14, 1, 20, 1, true);
  const collar = new THREE.TorusGeometry(0.145, 0.014, 6, 18);
  const pin = new THREE.BoxGeometry(0.055, 0.17, 0.055);
  const bucket = new THREE.BoxGeometry(0.26, 0.14, 0.2);
  const cymbal = new THREE.CylinderGeometry(0.3, 0.3, 0.025, 32);
  const drum = new THREE.CylinderGeometry(0.28, 0.28, 0.09, 24);
  const flywheelGear = createSpokedGearGeometry(48, 0.48, 1.28, 0.18, 8).clone();
  const programGear = createSpokedGearGeometry(64, 0.7, 1.55, 0.22, 12).clone();
  const rim = new THREE.TorusGeometry(1, 0.035, 8, 72);
  const trackRing = new THREE.TorusGeometry(1.47, 0.006, 4, 72);
  const all: THREE.BufferGeometry[] = [
    box,
    rod,
    sphere,
    tube,
    collar,
    pin,
    bucket,
    cymbal,
    drum,
    flywheelGear,
    programGear,
    rim,
    trackRing,
  ];
  return {
    box,
    rod,
    sphere,
    tube,
    collar,
    pin,
    bucket,
    cymbal,
    drum,
    flywheelGear,
    programGear,
    rim,
    trackRing,
    dispose() {
      for (const geometry of all) geometry.dispose();
    },
  };
}

export interface MarbleMachineUpdateContext {
  dt: number;
  elapsed: number;
  transport: TransportState;
  macros: Record<string, number>;
  scoreIntensity: number;
  audioTime: number;
  camera: THREE.PerspectiveCamera;
}

/**
 * V7: a blank-slate physical machine inspired by Wintergatan's marble music
 * boxes and the original pendulum study. No V6 graph modules are reused here;
 * the drama comes from steel marbles obeying a custom fixed-step solver.
 */
export class MarblePendulumMachine implements MachineCameraSource {
  private readonly rig = new KinematicRig();
  private readonly blueprint: MarbleBlueprint = createMarbleBlueprint();
  private readonly physics: MarblePhysics;
  private readonly program = new ProgrammingWheel(createDefaultProgram());
  private readonly cameraDirector = new MachineCameraDirector(this);
  private readonly materials = createMarbleMaterials();
  private readonly geometries = createMarbleGeometries();
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  private frameJoint!: RigJoint;
  private flywheelJoint!: RigJoint;
  private programWheelJoint!: RigJoint;
  private pendulumJoint!: RigJoint;
  private gateBankJoint!: RigJoint;
  private instrumentBankJoint!: RigJoint;
  private trackFrameJoint!: RigJoint;
  private liftChainJoint!: RigJoint;
  private marbleFieldJoint!: RigJoint;
  private crankPinMesh!: THREE.Mesh;
  private pendulumBob!: THREE.Mesh;
  private crankRodMesh!: THREE.Mesh;
  private pinMesh!: THREE.InstancedMesh;
  private bucketMesh!: THREE.InstancedMesh;
  private marbleMesh!: THREE.InstancedMesh;

  private readonly bucketCount = 28;
  private readonly pinCapacity = PROGRAM_STEPS * LANE_COUNT;
  private machineVersion = 1;
  private lastProgramVersion = -1;
  private lastTelemetry: PhysicsTelemetry;
  private lastWheelAngle = 0;
  private lastFlywheelAngle = 0;
  private lastProgramStep = 0;
  private activeFocusId: string;
  private behaviorId = 'PRECISION_ESCAPEMENT';
  private articulation: ArticulationState = createDefaultArticulation();
  private behaviorOverrides: Record<string, number> = {};

  constructor() {
    this.physics = new MarblePhysics(this.blueprint, {
      totalMarbles: DEFAULT_MARBLE_COUNT,
    });
    this.lastTelemetry = this.physics.getTelemetry();
    this.activeFocusId = this.blueprint.focusTargets[0]?.id ?? 'focus-machine';
    this.build();
    this.rig.root.updateMatrixWorld(true);
    this.updatePinMesh(true);
    this.updateMarbles();
    this.updateBuckets(0);
    this.updateCrankRod();
    this.cameraDirector.setMode(0);
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  attach(scene: THREE.Scene): void {
    scene.add(this.rig.root);
  }

  dispose(): void {
    this.rig.root.removeFromParent();
    this.pinMesh.dispose();
    this.bucketMesh.dispose();
    this.marbleMesh.dispose();
    this.rig.dispose();
    this.geometries.dispose();
    this.materials.dispose();
  }

  update(context: MarbleMachineUpdateContext): PhysicsStepResult {
    const { dt, elapsed, transport, macros, scoreIntensity, audioTime, camera } = context;
    this.applyPhysicsMacros(macros);
    const beat = transport.beat;
    const flywheelAngle = beat * TAU;
    const gearRatio = PROGRAM_STEPS_PER_BEAT / PROGRAM_STEPS;
    const wheelAngle = normalizeAngle(flywheelAngle * gearRatio);
    const step = this.program.stepFromAngle(wheelAngle);
    this.lastFlywheelAngle = flywheelAngle;
    this.lastWheelAngle = wheelAngle;
    this.lastProgramStep = step;

    this.physics.setDriveState({
      flywheelAngle,
      programWheelAngle: wheelAngle,
      programStep: step,
      scoreIntensity,
      beat,
    });

    const density = clamp(
      scoreIntensity * 0.55 + (macros.marbleBlend ?? 0.82) * 0.34,
      0.15,
      1.15,
    );
    for (const cue of this.program.sampleAngle(wheelAngle, audioTime, density)) {
      this.physics.releaseGate(cue.lane, cue.scheduledTime, cue.velocity, cue.step);
    }

    const result = this.physics.step(dt);

    this.rig.setValue('flywheel', flywheelAngle);
    this.rig.setTarget('pendulum', this.physics.getGovernor().angle);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const gate = this.physics.getGateState(lane);
      this.rig.setTarget(`gate${lane}`, (gate?.leverValue ?? 0) * 0.115);
      const instrumentEnergy = this.physics.getInstrumentEnergy(`instrument${lane}`);
      this.rig.setTarget(`instrument${lane}`, clamp(instrumentEnergy * 0.045, -0.08, 0.08));
    }
    const rigContext: RigUpdateContext = {
      dt,
      elapsed,
      beat,
      bar: transport.bar,
      step16: transport.step16,
      scoreIntensity,
      impulseEnergy: result.telemetry.shock,
      overclock: macros.timeScale ?? 1,
    };
    this.rig.update(rigContext);

    for (const impact of result.impacts) {
      if (
        impact.subsystem === 'sub-rupture' ||
        impact.subsystem === 'piston-snap' ||
        impact.subsystem === 'break-shred'
      ) {
        this.cameraDirector.addShock(impact.velocity * 0.16, [
          impact.x / 5.5,
          impact.y / 5.5,
          0.2,
        ]);
      }
    }

    const actualWheelAngle = this.programWheelJoint.value;
    this.physics.setDriveState({ programWheelAngle: normalizeAngle(actualWheelAngle) });
    if (this.program.getVersion() !== this.lastProgramVersion) this.updatePinMesh(true);
    this.updateMarbles();
    this.updateBuckets(elapsed);
    this.updateCrankRod();
    this.cameraDirector.update(
      camera,
      dt,
      elapsed,
      transport,
      clamp(scoreIntensity * 0.55 + (macros.scoreBlend ?? 0.32) * 0.4, 0.08, 1),
    );
    this.lastTelemetry = this.physics.getTelemetry();
    return result;
  }

  triggerImpulse(event: ImpulseEvent): void {
    if (event.origin === 'sensor') {
      this.physics.kickImpulse(event.velocity * 0.22, event.locus);
      return;
    }
    if (event.origin === 'score') {
      this.physics.kickImpulse(event.velocity * 0.34, event.locus);
      return;
    }
    const lane = this.laneForEvent(event);
    this.physics.releaseGate(lane, 0, clamp(event.velocity, 0.2, 1.4), -1);
    this.physics.kickImpulse(event.velocity, event.locus);
    this.cameraDirector.addShock(event.velocity * 0.3, event.locus);
  }

  applyAnticipation(cue: AnticipationCue): void {
    this.physics.kickImpulse(cue.intensity * 0.32, [0, 0.2, 0]);
  }

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    if (active) this.physics.kickImpulse(tension * 0.22, [x, y, 0]);
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.rig.getJointDescriptors();
  }

  getJointWorldPosition(id: string): Vec3Tuple | null {
    return this.rig.getJointWorldPosition(id);
  }

  getFocusTargets(): FocusDescriptor[] {
    return this.blueprint.focusTargets;
  }

  getActiveFocusId(): string {
    return this.activeFocusId;
  }

  setActiveFocusId(id: string): void {
    if (this.blueprint.focusTargets.some((focus) => focus.id === id)) {
      this.activeFocusId = id;
    }
  }

  getActiveFocusLabel(): string {
    return (
      this.blueprint.focusTargets.find((focus) => focus.id === this.activeFocusId)?.label ??
      'WHOLE MARBLE ENGINE'
    );
  }

  setFocusTarget(id: string): void {
    this.cameraDirector.focusOn(id);
  }

  getEdgeEndpoints(edgeId: string): [Vec3Tuple, Vec3Tuple] | null {
    if (edgeId === 'tube0') {
      const z = this.laneZ(0);
      return [
        [-4.4, 4.9, z],
        [-4.4, 1.25, z],
      ];
    }
    if (edgeId === 'liftPath') {
      return [
        [5.08, -3.0, 0.1],
        [5.4, 4.9, 0.1],
      ];
    }
    const match = /^drop-(\d+)$/.exec(edgeId);
    if (match) {
      const lane = Number(match[1]);
      const z = this.laneZ(lane);
      return [
        [this.blueprint.laneXs[lane] ?? 0, 1.25, z],
        [this.blueprint.laneXs[lane] ?? 0, -1.12, z],
      ];
    }
    return null;
  }

  getGraphState() {
    const t = this.lastTelemetry;
    return {
      phase: this.lastWheelAngle,
      arousal: clamp(t.freeMarbles / 60, 0, 1),
      cohesion: clamp(1 - t.jamCount / 30, 0, 1),
      fatigue: clamp(t.jamCount / 30, 0, 1),
      curiosity: clamp(t.impactCount / 400, 0, 1),
      totalEnergy: t.kineticEnergy,
    };
  }

  getPhysicsSnapshot(macros: PhysicsMacroSnapshot[]): PhysicsStudioSnapshot {
    const telemetry = this.physics.getTelemetry();
    const parts = this.blueprint.parts.map((part) => this.decoratePart(part, telemetry));
    const pins = this.program.getPins();
    const numericTelemetry: Record<string, number> = {
      ...telemetry,
      pinCount: pins.length,
      programVersion: this.program.getVersion(),
      machineVersion: this.machineVersion,
      partCount: parts.length,
      wheelStep: this.lastProgramStep,
      wheelAngle: this.lastWheelAngle,
      flywheelAngle: this.lastFlywheelAngle,
      activeFocusIndex: Math.max(
        0,
        this.blueprint.focusTargets.findIndex((focus) => focus.id === this.activeFocusId),
      ),
    };
    return {
      name: this.blueprint.name,
      version: this.machineVersion + this.program.getVersion() * 1000,
      laneCount: this.blueprint.laneCount,
      stepCount: this.blueprint.stepCount,
      laneLabels: [...this.blueprint.laneLabels],
      instrumentLabels: [...this.blueprint.instrumentLabels],
      pins,
      macros,
      parts,
      focusTargets: this.blueprint.focusTargets,
      activeFocusId: this.activeFocusId,
      activeFocusLabel: this.getActiveFocusLabel(),
      telemetry: numericTelemetry,
    };
  }

  getMachineGraphSnapshot(macros: PhysicsMacroSnapshot[]): MachineGraphSnapshot {
    const snapshot = this.getPhysicsSnapshot(macros);
    const parts = snapshot.parts;
    const partIds = new Set(parts.map((part) => part.id));
    const telemetry = snapshot.telemetry;
    const edges: MachineGraphSnapshot['edges'] = [];
    for (const part of parts) {
      if (part.parentId && partIds.has(part.parentId)) {
        edges.push({
          id: `relation-${part.id}`,
          from: part.parentId,
          to: part.id,
          kind: 'MECHANICAL',
          weight: 0.72,
          flow: part.energy,
          enabled: true,
        });
      }
    }
    const pinCounts = new Array(LANE_COUNT).fill(0) as number[];
    for (const pin of this.program.getPins()) pinCounts[pin.lane]++;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const gate = this.physics.getGateState(lane);
      edges.push({
        id: `pin-${lane}`,
        from: 'programWheel',
        to: `gate${lane}`,
        kind: 'DATA',
        weight: clamp(pinCounts[lane] / 12, 0.1, 1),
        flow: gate?.leverValue ?? 0,
        enabled: pinCounts[lane] > 0,
      });
      edges.push({
        id: `drop-${lane}`,
        from: `gate${lane}`,
        to: `instrument${lane}`,
        kind: 'MARBLE',
        weight: 1,
        flow: this.physics.getQueueLength(lane) / 6,
        enabled: true,
      });
    }
    edges.push(
      { id: 'recycle-funnel', from: 'instrumentBank', to: 'funnel', kind: 'MARBLE', weight: 0.9, flow: telemetry.freeMarbles / 60, enabled: true },
      { id: 'recycle-lift', from: 'funnel', to: 'liftChain', kind: 'MECHANICAL', weight: 0.8, flow: telemetry.liftingMarbles / 50, enabled: true },
      { id: 'recycle-reservoir', from: 'liftChain', to: 'trackFrame', kind: 'MARBLE', weight: 0.8, flow: telemetry.queuedMarbles / 160, enabled: true },
      { id: 'drive-wheel', from: 'flywheel', to: 'programWheel', kind: 'MECHANICAL', weight: 1, flow: Math.abs(Math.sin(telemetry.flywheelAngle)), enabled: true },
      { id: 'governor-link', from: 'flywheel', to: 'pendulum', kind: 'MECHANICAL', weight: 0.6, flow: telemetry.governorEnergy, enabled: true },
    );

    const bindings = pinCounts.map((count, lane) => ({
      id: `bind-lane-${lane}`,
      source: 'program.step',
      target: this.blueprint.laneLabels[lane],
      mode: 'EXCITE',
      weight: clamp(count / 12, 0, 1.5),
      enabled: count > 0,
    }));

    return {
      moduleCount: parts.length,
      edgeCount: edges.length,
      sourceCount: 5,
      bindingCount: bindings.length,
      arousal: clamp(telemetry.freeMarbles / 60, 0, 1),
      cohesion: clamp(1 - telemetry.jamCount / 30, 0, 1),
      fatigue: clamp(telemetry.jamCount / 30, 0, 1),
      curiosity: clamp(telemetry.impactCount / 400, 0, 1),
      activeFocusId: snapshot.activeFocusId,
      activeFocusLabel: snapshot.activeFocusLabel,
      modules: parts.map((part) => ({
        id: part.id,
        label: part.label,
        archetype: part.kind,
        cluster: part.parentId ?? 'machine',
        jointId: part.jointId,
        scale: 1,
        energy: part.energy,
        activation: clamp(part.energy, 0, 1),
        fatigue: clamp(telemetry.jamCount / 40, 0, 1),
        tags: [...part.tags],
      })),
      edges,
      sources: [
        { id: 'gravity', moduleId: 'frame', label: 'GRAVITY', kind: 'PHYSICS', rate: Math.abs(telemetry.gravity), energy: telemetry.kineticEnergy },
        { id: 'crank', moduleId: 'flywheel', label: 'HAND CRANK', kind: 'KINETIC', rate: Math.abs(telemetry.flywheelAngle) / 100, energy: Math.abs(Math.sin(telemetry.flywheelAngle)) },
        { id: 'score-memory', moduleId: 'programWheel', label: 'PINNED WHEEL', kind: 'DATA', rate: telemetry.pinCount / 100, energy: telemetry.programVersion / 10 },
        { id: 'marble-reservoir', moduleId: 'trackFrame', label: 'QUEUE RESERVOIR', kind: 'MARBLE', rate: telemetry.queuedMarbles / 100, energy: telemetry.queuedMarbles / 200 },
        { id: 'governor', moduleId: 'pendulum', label: 'PENDULUM GOVERNOR', kind: 'TIME', rate: telemetry.governorEnergy, energy: telemetry.governorEnergy },
      ],
      bindings,
      focusTargets: snapshot.focusTargets,
      macros: macros as GraphMacroSnapshot[],
    };
  }

  setPhysicsMacro(id: string, value: number): void {
    delete this.behaviorOverrides[id];
    this.physics.setMacro(id, value);
    this.lastTelemetry = this.physics.getTelemetry();
    this.machineVersion++;
  }

  setGraphMacro(id: string, value: number): void {
    this.setPhysicsMacro(id, value);
  }

  updateGraphBinding(id: string, patch: ScoreBindingPatch): boolean {
    const match = /^bind-lane-(\d+)$/.exec(id);
    if (!match) return false;
    const lane = Number(match[1]);
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANE_COUNT) return false;
    if (typeof patch.enabled === 'boolean') {
      this.program.togglePin(lane, 0, patch.enabled);
      this.updatePinMesh(true);
      this.machineVersion++;
    }
    return true;
  }

  toggleProgrammingPin(lane: number, step: number, enabled?: boolean): void {
    this.program.togglePin(lane, step, enabled);
    this.updatePinMesh(true);
    this.machineVersion++;
  }

  resetPhysics(): void {
    this.physics.reset();
    this.program.resetSampling();
    this.rebuildMarbleMesh();
    this.lastTelemetry = this.physics.getTelemetry();
    this.machineVersion++;
  }

  dropMarbles(count: number): void {
    this.physics.dropMarbles(count);
    this.lastTelemetry = this.physics.getTelemetry();
    this.machineVersion++;
  }

  exportPhysicsProgram(): string {
    return this.program.exportJSON();
  }

  importPhysicsProgram(raw: string): void {
    this.program.importJSON(raw);
    this.program.resetSampling();
    this.updatePinMesh(true);
    this.machineVersion++;
  }

  growMachine(count: number): void {
    this.setMarbleCount(this.physics.getOptions().totalMarbles + count);
  }

  rebuildMachine(moduleCount: number): void {
    this.setMarbleCount(moduleCount);
  }

  exportGraphConfig(): string {
    return JSON.stringify(
      {
        name: this.blueprint.name,
        version: 1,
        parts: this.getPhysicsSnapshot([]).parts,
        program: JSON.parse(this.program.exportJSON()) as unknown,
        macros: PHYSICS_MACRO_DEFINITIONS,
      },
      null,
      2,
    );
  }

  importGraphConfig(raw: string): void {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return;
    const record = parsed as Record<string, unknown>;
    const program = record.program ?? (Array.isArray(record.pins) ? parsed : null);
    if (program) {
      this.program.importJSON(JSON.stringify(program));
      this.program.resetSampling();
      this.updatePinMesh(true);
    }
    this.machineVersion++;
  }

  setBehaviorId(id: string): void {
    if (!BEHAVIOR_IDS.includes(id as BehaviorId)) return;
    this.behaviorId = id;
    switch (id) {
      case 'OVERCLOCK_CADENZA':
        this.behaviorOverrides = { timeScale: 1.4, releaseVelocity: 0.82, pendulumDrive: 1.1 };
        break;
      case 'BROKEN_MAINSPRING':
        this.behaviorOverrides = { trackFriction: 0.42, liftSpeed: 0.6, gateDuration: 0.2 };
        break;
      case 'PENDULUM_BREATH':
        this.behaviorOverrides = { timeScale: 0.78, pendulumDrive: 1.2 };
        break;
      case 'ZERO_G_DISASSEMBLY':
        this.behaviorOverrides = { gravityScale: 0.48, marbleBounce: 0.66 };
        break;
      case 'BARREL_AUTOMATON_PLAY':
        this.behaviorOverrides = { gateDuration: 0.15, releaseVelocity: 0.62 };
        break;
      default:
        this.behaviorOverrides = {};
        break;
    }
  }

  getBehaviorId(): string {
    return this.behaviorId;
  }

  setBehaviorMaps(_maps: BehaviorMapEntry[]): void {
    // The programming wheel is the behavior map for V7.
  }

  getArticulationState(): Record<string, number> {
    return { ...this.articulation };
  }

  setArticulationState(state: Record<string, number>): void {
    this.articulation = clampArticulation(state, this.articulation);
    this.behaviorOverrides = {
      ...this.behaviorOverrides,
      gravityScale: 0.72 + this.articulation.overclockSpeed * 0.48,
      gateDuration: 0.07 + this.articulation.chassisUnfold * 0.12,
      marbleBounce: 0.2 + this.articulation.magneticUnpin * 0.38,
      trackFriction: 0.08 + this.articulation.irisAperture * 0.24,
      releaseVelocity: 0.34 + this.articulation.bellowsBreathing * 0.55,
    };
  }

  getEcologySnapshot(): Record<string, number> {
    const t = this.lastTelemetry;
    return {
      'ecology.arousal': clamp(t.freeMarbles / 60, 0, 1),
      'ecology.cohesion': clamp(1 - t.jamCount / 30, 0, 1),
      'ecology.fatigue': clamp(t.jamCount / 30, 0, 1),
      'ecology.curiosity': clamp(t.impactCount / 400, 0, 1),
      'ecology.phase': this.lastWheelAngle / TAU,
      'ecology.resonance': clamp(t.instrumentEnergy / 8, 0, 1),
      'physics.free': t.freeMarbles,
      'physics.queued': t.queuedMarbles,
      'physics.lifting': t.liftingMarbles,
      'physics.impacts': t.impactCount,
      'physics.recycles': t.recycleCount,
      'physics.jams': t.jamCount,
      'physics.jitterMs': t.releaseJitterMs,
    };
  }

  getPostFxState(): Partial<PostFxState> {
    const t = this.lastTelemetry;
    return {
      glitch: 0.025 + t.shock * 0.08 + clamp(t.jamCount / 100, 0, 0.12),
      lensDistort: 0.045 + t.shock * 0.035,
      aberration: 0.12 + t.shock * 0.1 + clamp(t.instrumentEnergy / 60, 0, 0.1),
      grain: 0.075 + clamp(t.freeMarbles / 500, 0, 0.08),
      bleachGrade: 0.2 + clamp(t.impactCount / 1200, 0, 0.18),
      starkThreshold: 0,
      bloomStrength: 0.78 + clamp(t.instrumentEnergy / 22, 0, 0.35),
    };
  }

  getMetrics() {
    const t = this.lastTelemetry;
    return {
      activeInstances: this.physics.getMarbles().length + this.rig.getJointIds().length + this.program.getPinCount(),
      structuralStress: clamp(t.jamCount / 25 + t.shock * 0.25, 0, 1),
      kineticEnergy: t.kineticEnergy,
      behavioralState: `${this.behaviorId} // ${t.freeMarbles} FREE // ${t.queuedMarbles} QUEUED // ${t.liftingMarbles} LIFTING`,
      activeShotBadge: this.cameraDirector.getActiveShotBadge(),
    };
  }

  setCameraMode(mode: number): void {
    this.cameraDirector.setMode(mode);
  }

  getCameraMode(): number {
    return this.cameraDirector.getMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.cameraDirector.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cameraDirector.zoom(delta);
  }

  getActiveShotBadge(): string {
    return this.cameraDirector.getActiveShotBadge();
  }

  // ---------------------------------------------------------------------------
  // Construction.
  // ---------------------------------------------------------------------------

  private build(): void {
    this.buildLights();
    this.buildFrame();
    this.buildFlywheel();
    this.buildProgramWheel();
    this.rig.addDriver(
      new GearRatioDriver('flywheel', 'programWheel', PROGRAM_STEPS_PER_BEAT / PROGRAM_STEPS, 0),
    );
    this.buildPendulum();
    this.buildGateBank();
    this.buildInstrumentBank();
    this.buildTrackFrame();
    this.buildLiftChain();
    this.buildMarbleField();
  }

  private buildLights(): void {
    this.rig.root.add(new THREE.HemisphereLight(0xd8ecff, 0x24170f, 1.35));
    const key = new THREE.PointLight(0xffd9a0, 58, 32, 2);
    key.position.set(4.5, 6.5, 8);
    this.rig.root.add(key);
    const rim = new THREE.PointLight(0x86b9ff, 36, 26, 2);
    rim.position.set(-6, 2, -4);
    this.rig.root.add(rim);
    const warm = new THREE.PointLight(0xffb46a, 26, 18, 2);
    warm.position.set(0, -2.5, 5);
    this.rig.root.add(warm);
  }

  private buildFrame(): void {
    this.frameJoint = this.rig.createJoint({
      id: 'frame',
      label: 'PLYWOOD A-FRAME',
      type: 'root',
      parent: 'root',
    });
    const f = this.frameJoint.group;

    const backdrop = new THREE.Mesh(this.geometries.box, this.materials.backdrop);
    backdrop.position.set(0, 0.65, -1.15);
    backdrop.scale.set(11.4, 8.9, 0.12);
    f.add(backdrop);

    const plinth = new THREE.Mesh(this.geometries.box, this.materials.woodDark);
    plinth.position.set(0, -3.66, 0);
    plinth.scale.set(11.8, 0.2, 2.5);
    f.add(plinth);

    for (const z of [-0.5, 0.5]) {
      for (const x of [-5.35, 5.35]) {
        this.createBeam(f, [x, -3.55, z], [x, 5.05, z], 0.2, 0.2, this.materials.wood);
      }
      this.createBeam(f, [-5.35, 5.05, z], [5.35, 5.05, z], 0.18, 0.2, this.materials.wood);
      this.createBeam(f, [-5.35, -3.55, z], [5.35, -3.55, z], 0.18, 0.2, this.materials.wood);
      this.createBeam(f, [-5.35, -3.45, z], [-3.9, 2.15, z], 0.12, 0.12, this.materials.woodDark);
      this.createBeam(f, [5.35, -3.45, z], [3.9, 2.15, z], 0.12, 0.12, this.materials.woodDark);
    }
    this.createBeam(f, [-5.1, 1.1, -0.5], [5.1, 1.1, -0.5], 0.1, 0.16, this.materials.woodDark);
    this.createBeam(f, [-5.1, -1.3, 0.5], [5.1, -1.3, 0.5], 0.1, 0.16, this.materials.woodDark);
  }

  private buildFlywheel(): void {
    this.flywheelJoint = this.rig.createJoint({
      id: 'flywheel',
      label: 'HAND-CRANK FLYWHEEL',
      type: 'revolute',
      parent: 'frame',
      position: [-4.35, -0.35, -0.55],
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    const gear = new THREE.Mesh(this.geometries.flywheelGear, this.materials.flywheel);
    this.flywheelJoint.group.add(gear);
    const rim = new THREE.Mesh(this.geometries.rim, this.materials.brass);
    rim.scale.setScalar(1.28);
    this.flywheelJoint.group.add(rim);
    const hub = new THREE.Mesh(this.geometries.rod, this.materials.steel);
    hub.rotation.x = Math.PI / 2;
    hub.scale.set(0.19, 0.26, 0.19);
    this.flywheelJoint.group.add(hub);
    this.createBeam(
      this.flywheelJoint.group,
      [0, 0, 0.2],
      [0.82, 0, 0.2],
      0.075,
      0.075,
      this.materials.steel,
    );
    this.crankPinMesh = new THREE.Mesh(this.geometries.sphere, this.materials.brass);
    this.crankPinMesh.position.set(0.82, 0, 0.24);
    this.crankPinMesh.scale.setScalar(0.11);
    this.flywheelJoint.group.add(this.crankPinMesh);

    const smallGear = new THREE.Mesh(this.geometries.programGear, this.materials.brass);
    smallGear.scale.setScalar(0.33);
    smallGear.position.set(0, 0, 0.28);
    this.flywheelJoint.group.add(smallGear);
  }

  private buildProgramWheel(): void {
    this.programWheelJoint = this.rig.createJoint({
      id: 'programWheel',
      label: '64-STEP PROGRAMMING WHEEL',
      type: 'revolute',
      parent: 'frame',
      position: [0, 2.8, -0.85],
      axis: [0, 0, 1],
      min: -Infinity,
      max: Infinity,
    });
    const gear = new THREE.Mesh(this.geometries.programGear, this.materials.wood);
    this.programWheelJoint.group.add(gear);
    const rim = new THREE.Mesh(this.geometries.rim, this.materials.brass);
    rim.scale.setScalar(1.55);
    this.programWheelJoint.group.add(rim);
    const hub = new THREE.Mesh(this.geometries.rod, this.materials.steel);
    hub.rotation.x = Math.PI / 2;
    hub.scale.set(0.24, 0.32, 0.24);
    this.programWheelJoint.group.add(hub);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const ring = new THREE.Mesh(this.geometries.trackRing, this.materials.woodDark);
      ring.position.z = this.laneZ(lane);
      this.programWheelJoint.group.add(ring);
    }
    this.pinMesh = new THREE.InstancedMesh(
      this.geometries.pin,
      this.materials.pin,
      this.pinCapacity,
    );
    this.pinMesh.name = 'program-wheel-pins';
    this.pinMesh.count = 0;
    this.pinMesh.frustumCulled = false;
    this.pinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.programWheelJoint.group.add(this.pinMesh);

    this.crankRodMesh = new THREE.Mesh(this.geometries.rod, this.materials.steel);
    this.crankRodMesh.name = 'flywheel-pendulum-pitman';
    this.frameJoint.group.add(this.crankRodMesh);
  }

  private buildPendulum(): void {
    this.pendulumJoint = this.rig.createJoint({
      id: 'pendulum',
      label: 'PENDULUM GOVERNOR',
      type: 'revolute',
      parent: 'frame',
      position: [3.85, 4.62, -0.35],
      axis: [0, 0, 1],
      min: -1.05,
      max: 1.05,
      damping: 14,
    });
    const rod = new THREE.Mesh(this.geometries.rod, this.materials.steel);
    rod.position.set(0, -1.05, 0);
    rod.scale.set(0.045, 2.1, 0.045);
    this.pendulumJoint.group.add(rod);
    this.pendulumBob = new THREE.Mesh(this.geometries.sphere, this.materials.brass);
    this.pendulumBob.position.set(0, -2.1, 0);
    this.pendulumBob.scale.setScalar(0.34);
    this.pendulumJoint.group.add(this.pendulumBob);
    const arc = new THREE.Mesh(this.geometries.rim, this.materials.woodDark);
    arc.position.set(3.85, 4.62, -1.02);
    arc.scale.setScalar(2.1);
    this.frameJoint.group.add(arc);
  }

  private buildGateBank(): void {
    this.gateBankJoint = this.rig.createJoint({
      id: 'gateBank',
      label: 'GATE BANK',
      type: 'root',
      parent: 'frame',
      position: [0, 1.25, 0],
    });
    this.createBeam(
      this.gateBankJoint.group,
      [-5.0, -0.16, 0],
      [5.0, -0.16, 0],
      0.1,
      1.35,
      this.materials.woodDark,
    );
    for (const gate of this.blueprint.gates) {
      const joint = this.rig.createJoint({
        id: gate.id,
        label: gate.label,
        type: 'prismatic',
        parent: 'gateBank',
        position: [gate.x, 0, this.laneZ(gate.lane)],
        axis: [0, 1, 0],
        min: 0,
        max: 0.12,
        damping: 13,
      });
      const paddle = new THREE.Mesh(this.geometries.box, this.materials.gate);
      paddle.scale.set(gate.width, 0.045, 0.11);
      joint.group.add(paddle);
      const lever = new THREE.Mesh(this.geometries.rod, this.materials.steel);
      lever.position.set(0, 0.21, 0);
      lever.scale.set(0.018, 0.42, 0.018);
      joint.group.add(lever);
    }
  }

  private buildInstrumentBank(): void {
    this.instrumentBankJoint = this.rig.createJoint({
      id: 'instrumentBank',
      label: 'INSTRUMENT BANK',
      type: 'root',
      parent: 'frame',
      position: [0, -1.12, 0],
    });
    this.createBeam(
      this.instrumentBankJoint.group,
      [-5.0, -0.2, 0],
      [5.0, -0.2, 0],
      0.1,
      1.5,
      this.materials.woodDark,
    );
    for (const instrument of this.blueprint.instruments) {
      const joint = this.rig.createJoint({
        id: instrument.id,
        label: instrument.label,
        type: 'revolute',
        parent: 'instrumentBank',
        position: [instrument.x, 0, this.laneZ(instrument.lane)],
        axis: [0, 0, 1],
        min: -0.08,
        max: 0.08,
        springStiffness: 48,
        damping: 12,
      });
      if (instrument.kind === 'VIBRAPHONE') {
        const bar = new THREE.Mesh(this.geometries.box, this.materials.vibraphone);
        bar.scale.set(instrument.width, 0.075, 0.17);
        joint.group.add(bar);
      } else if (instrument.kind === 'HI_HAT' || instrument.kind === 'CYMBAL') {
        const disc = new THREE.Mesh(this.geometries.cymbal, this.materials.cymbal);
        disc.rotation.x = Math.PI / 2;
        disc.scale.set(instrument.kind === 'CYMBAL' ? 1.15 : 0.85, 1, 1);
        joint.group.add(disc);
      } else {
        const pad = new THREE.Mesh(this.geometries.drum, this.materials.drum);
        pad.rotation.x = Math.PI / 2;
        joint.group.add(pad);
      }
      const mount = new THREE.Mesh(this.geometries.box, this.materials.woodDark);
      mount.position.set(0, -0.12, 0);
      mount.scale.set(0.42, 0.06, 0.2);
      joint.group.add(mount);
    }
  }

  private buildTrackFrame(): void {
    this.trackFrameJoint = this.rig.createJoint({
      id: 'trackFrame',
      label: 'TUBES / RAILS / FUNNEL',
      type: 'root',
      parent: 'frame',
    });
    for (const queue of this.blueprint.queues) {
      const bottom = queue.gateY + 0.17;
      const top = queue.topY + 0.1;
      const height = top - bottom;
      const tube = new THREE.Mesh(this.geometries.tube, this.materials.glass);
      tube.position.set(queue.x, (top + bottom) * 0.5, this.laneZ(queue.lane));
      tube.scale.set(1, height, 1);
      this.trackFrameJoint.group.add(tube);
      for (const y of [bottom, top]) {
        const collar = new THREE.Mesh(this.geometries.collar, this.materials.steel);
        collar.position.set(queue.x, y, this.laneZ(queue.lane));
        collar.rotation.x = Math.PI / 2;
        this.trackFrameJoint.group.add(collar);
      }
    }

    for (const segment of this.blueprint.segments) {
      if (segment.kind === 'TUBE' || segment.kind === 'GATE' || segment.kind === 'INSTRUMENT') continue;
      if (segment.kind === 'FUNNEL') {
        this.createFunnelTrough(segment);
        continue;
      }
      const material =
        segment.kind === 'RAIL'
          ? this.materials.brass
          : segment.kind === 'RAMP'
            ? this.materials.steel
            : this.materials.woodDark;
      this.createSegmentMesh(
        this.trackFrameJoint.group,
        segment.a,
        segment.b,
        segment.radius,
        material,
        0,
      );
    }
  }

  private createFunnelTrough(spec: MarbleSegmentSpec): void {
    const dx = spec.b[0] - spec.a[0];
    const dy = spec.b[1] - spec.a[1];
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const midX = (spec.a[0] + spec.b[0]) * 0.5;
    const midY = (spec.a[1] + spec.b[1]) * 0.5;
    const trough = new THREE.Mesh(this.geometries.box, this.materials.woodDark);
    trough.position.set(midX, midY - 0.06, 0);
    trough.rotation.z = angle;
    trough.scale.set(length, 0.13, 1.85);
    this.trackFrameJoint.group.add(trough);
    for (const z of [-0.96, 0.96]) {
      const rail = new THREE.Mesh(this.geometries.box, this.materials.wood);
      rail.position.set(midX, midY + 0.08, z);
      rail.rotation.z = angle;
      rail.scale.set(length, 0.16, 0.07);
      this.trackFrameJoint.group.add(rail);
    }
  }

  private buildLiftChain(): void {
    this.liftChainJoint = this.rig.createJoint({
      id: 'liftChain',
      label: 'BUCKET RETURN LIFT',
      type: 'root',
      parent: 'frame',
    });
    for (let i = 0; i < this.blueprint.liftPath.length - 1; i++) {
      this.createSegmentMesh(
        this.liftChainJoint.group,
        this.blueprint.liftPath[i],
        this.blueprint.liftPath[i + 1],
        0.045,
        this.materials.steel,
        0.55,
      );
    }
    this.bucketMesh = new THREE.InstancedMesh(
      this.geometries.bucket,
      this.materials.bucket,
      this.bucketCount,
    );
    this.bucketMesh.name = 'return-lift-buckets';
    this.bucketMesh.frustumCulled = false;
    this.bucketMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.liftChainJoint.group.add(this.bucketMesh);
  }

  private buildMarbleField(): void {
    this.marbleFieldJoint = this.rig.createJoint({
      id: 'marbleField',
      label: 'STEEL MARBLE FIELD',
      type: 'root',
      parent: 'frame',
    });
    this.marbleMesh = new THREE.InstancedMesh(
      this.geometries.sphere,
      this.materials.marble,
      this.physics.getMarbles().length,
    );
    this.marbleMesh.name = 'physics-steel-marbles';
    this.marbleMesh.frustumCulled = false;
    this.marbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.marbleFieldJoint.group.add(this.marbleMesh);
  }

  // ---------------------------------------------------------------------------
  // Visual helpers.
  // ---------------------------------------------------------------------------

  private createBeam(
    parent: THREE.Object3D,
    a: Vec3Tuple,
    b: Vec3Tuple,
    thickness: number,
    depth: number,
    material: THREE.Material,
  ): void {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const length = delta.length();
    const mesh = new THREE.Mesh(this.geometries.box, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
    mesh.scale.set(thickness, length, depth);
    parent.add(mesh);
  }

  private createSegmentMesh(
    parent: THREE.Object3D,
    a: Vec2Tuple,
    b: Vec2Tuple,
    radius: number,
    material: THREE.Material,
    z: number,
  ): void {
    const start = new THREE.Vector3(a[0], a[1], z);
    const end = new THREE.Vector3(b[0], b[1], z);
    const delta = end.clone().sub(start);
    const length = delta.length();
    const mesh = new THREE.Mesh(this.geometries.rod, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
    mesh.scale.set(radius, length, radius);
    parent.add(mesh);
  }

  private updatePinMesh(force = false): void {
    if (!force && this.program.getVersion() === this.lastProgramVersion) return;
    const pins = this.program.getPins().slice(0, this.pinCapacity);
    for (let index = 0; index < pins.length; index++) {
      const pin = pins[index];
      const angle = (pin.step / this.program.getStepCount()) * TAU;
      const radius = 1.47;
      this.dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        this.laneZ(pin.lane),
      );
      this.dummy.rotation.set(0, 0, angle - Math.PI / 2);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.pinMesh.setMatrixAt(index, this.dummy.matrix);
      this.color.setHex(pin.lane < 8 ? 0xffd48a : 0x9ee9ff);
      this.pinMesh.setColorAt(index, this.color);
    }
    this.pinMesh.count = pins.length;
    this.pinMesh.instanceMatrix.needsUpdate = true;
    if (this.pinMesh.instanceColor) this.pinMesh.instanceColor.needsUpdate = true;
    this.lastProgramVersion = this.program.getVersion();
  }

  private updateMarbles(): void {
    const marbles = this.physics.getMarbles();
    for (let index = 0; index < marbles.length; index++) {
      const marble = marbles[index];
      this.dummy.position.set(marble.x, marble.y, this.laneZ(marble.lane));
      this.dummy.rotation.set(0, 0, marble.spin);
      this.dummy.scale.setScalar(marble.radius * (1 + marble.impactEnergy * 0.06));
      this.dummy.updateMatrix();
      this.marbleMesh.setMatrixAt(index, this.dummy.matrix);
      if (marble.state === 'queued') this.color.setRGB(0.62, 0.72, 0.82);
      else if (marble.state === 'lifting') this.color.setRGB(0.96, 0.68, 0.32);
      else this.color.setRGB(0.86 + marble.impactEnergy * 0.12, 0.92, 1);
      this.marbleMesh.setColorAt(index, this.color);
    }
    this.marbleMesh.count = marbles.length;
    this.marbleMesh.instanceMatrix.needsUpdate = true;
    if (this.marbleMesh.instanceColor) this.marbleMesh.instanceColor.needsUpdate = true;
  }

  private updateBuckets(elapsed: number): void {
    const speed = this.physics.getOptions().liftSpeed;
    for (let i = 0; i < this.bucketCount; i++) {
      const t = (i / this.bucketCount + elapsed * 0.052 * speed) % 1;
      const point = this.physics.getLiftPoint(t);
      const next = this.physics.getLiftPoint(Math.min(1, t + 0.01));
      const angle = Math.atan2(next[1] - point[1], next[0] - point[0]) - Math.PI / 2;
      this.dummy.position.set(point[0], point[1], 0.25 + (i % 5) * 0.09);
      this.dummy.rotation.set(0, 0, angle);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.bucketMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.bucketMesh.instanceMatrix.needsUpdate = true;
  }

  private updateCrankRod(): void {
    const pin = this.crankPinMesh.getWorldPosition(new THREE.Vector3());
    const bob = this.pendulumBob.getWorldPosition(new THREE.Vector3());
    const mid = pin.clone().add(bob).multiplyScalar(0.5);
    const direction = bob.clone().sub(pin);
    const length = direction.length();
    if (length < 1e-5) return;
    this.frameJoint.group.worldToLocal(mid);
    const inverse = this.frameJoint.group.getWorldQuaternion(new THREE.Quaternion()).invert();
    const localDirection = direction.normalize().applyQuaternion(inverse);
    this.crankRodMesh.position.copy(mid);
    this.crankRodMesh.quaternion.setFromUnitVectors(UP, localDirection);
    this.crankRodMesh.scale.set(0.045, length, 0.045);
    this.crankRodMesh.updateMatrix();
  }

  private rebuildMarbleMesh(): void {
    this.marbleMesh.removeFromParent();
    this.marbleMesh.dispose();
    this.marbleMesh = new THREE.InstancedMesh(
      this.geometries.sphere,
      this.materials.marble,
      this.physics.getMarbles().length,
    );
    this.marbleMesh.name = 'physics-steel-marbles';
    this.marbleMesh.frustumCulled = false;
    this.marbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.marbleFieldJoint.group.add(this.marbleMesh);
    this.updateMarbles();
  }

  private applyPhysicsMacros(macros: Record<string, number>): void {
    for (const id of PHYSICS_MACRO_IDS) {
      const value = this.behaviorOverrides[id] ?? macros[id] ?? this.physics.getMacro(id);
      this.physics.setMacro(id, value);
    }
  }

  private setMarbleCount(count: number): void {
    this.physics.reset(count);
    this.program.resetSampling();
    this.rebuildMarbleMesh();
    this.lastTelemetry = this.physics.getTelemetry();
    this.machineVersion++;
  }

  private decoratePart(part: PhysicalPartSnapshot, telemetry: PhysicsTelemetry): PhysicalPartSnapshot {
    let state = 'IDLE';
    let energy = 0;
    const gateMatch = /^gate(\d+)$/.exec(part.id);
    const instrumentMatch = /^instrument(\d+)$/.exec(part.id);
    if (gateMatch) {
      const gate = this.physics.getGateState(Number(gateMatch[1]));
      state = gate?.open ? 'OPEN' : 'CLOSED';
      energy = gate?.leverValue ?? 0;
    } else if (instrumentMatch) {
      energy = this.physics.getInstrumentEnergy(part.id);
      state = energy > 0.06 ? 'RESONATING' : 'READY';
    } else if (part.id === 'flywheel') {
      energy = Math.abs(Math.sin(telemetry.flywheelAngle));
      state = 'DRIVING';
    } else if (part.id === 'programWheel') {
      energy = this.program.getPinCount() / 200;
      state = 'SEQUENCING';
    } else if (part.id === 'pendulum') {
      energy = telemetry.governorEnergy;
      state = 'GOVERNING';
    } else if (part.id === 'liftChain') {
      energy = telemetry.liftingMarbles / 50;
      state = 'RECYCLING';
    } else if (part.id === 'funnel') {
      energy = telemetry.freeMarbles / 60;
      state = 'COLLECTING';
    } else if (part.id === 'marbleField') {
      energy = telemetry.kineticEnergy;
      state = 'SIMULATING';
    } else if (part.id === 'trackFrame') {
      energy = telemetry.queuedMarbles / 160;
      state = `QUEUED ${Math.round(telemetry.queuedMarbles)}`;
    } else if (part.id === 'gateBank') {
      energy = telemetry.activeGates / LANE_COUNT;
      state = `${telemetry.activeGates} ACTIVE`;
    } else if (part.id === 'instrumentBank') {
      energy = telemetry.instrumentEnergy / 12;
      state = 'RESONANT';
    } else if (part.id === 'crankRod') {
      energy = telemetry.governorEnergy;
      state = 'TRANSMITTING';
    }
    return { ...part, state, energy, tags: [...part.tags] };
  }

  private laneForEvent(event: ImpulseEvent): number {
    if (event.sliceIndex !== undefined) {
      return ((event.sliceIndex % LANE_COUNT) + LANE_COUNT) % LANE_COUNT;
    }
    switch (event.subsystem) {
      case 'sub-rupture':
        return 8;
      case 'piston-snap':
        return 9;
      case 'break-shred':
        return 10;
      case 'glass-armonica':
        return 11;
      case 'modal-clang':
        return clamp(Math.floor((event.pitchRatio - 1) * 8), 0, 7);
      default:
        return Math.abs(Math.floor(event.pitchRatio * 7 + event.velocity * 3)) % LANE_COUNT;
    }
  }

  private laneZ(lane: number): number {
    return -0.36 + clamp(lane, 0, LANE_COUNT - 1) * 0.065;
  }
}
