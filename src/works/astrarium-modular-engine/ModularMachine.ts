import * as THREE from 'three/webgpu';
import type {
  AnticipationCue,
  BehaviorMapEntry,
  FocusDescriptor,
  GraphMacroSnapshot,
  ImpulseEvent,
  MachineGraphSnapshot,
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
import {
  attachMesh,
  createHorologicalMaterials,
  createPleatedBellowsGeometry,
  createSkeletonBridgeGeometry,
  createSpokedGearGeometry,
  type HorologicalMaterials,
} from '../../kit/mechanism/HorologicalMeshKit';
import {
  MachineGraph,
  type EdgeKind,
  type GraphStepContext,
  type MachineEdgeSpec,
  type MachineGraphConfig,
  type MachineModuleSpec,
  type PortKind,
} from '../../kit/machine/MachineGraph';
import {
  createOrreryFactoryConfig,
  MAX_MODULE_COUNT,
  portJointId,
} from '../../kit/machine/OrreryFactoryConfig';
import {
  clampArticulation,
  createDefaultArticulation,
  type ArticulationState,
} from '../../studio/articulation/ArticulationRig';
import {
  MechanismEcology,
  type EcologySnapshot,
} from '../../studio/articulation/MechanismEcology';
import { ChronoAutomaton } from '../chrono-automaton/ChronoAutomaton';
import {
  MachineCameraDirector,
  type MachineCameraSource,
  type Vec3Tuple,
} from './MachineCameraDirector';

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const EDGE_COLORS: Record<EdgeKind, number> = {
  MECHANICAL: 0xd6a75d,
  PNEUMATIC: 0xa9d8e8,
  OPTICAL: 0x9fd9ff,
  MAGNETIC: 0x8f7fff,
  MARBLE: 0xf0e2b6,
  AUDIO: 0xffc48a,
  DATA: 0x71ffd0,
};

interface SharedGeometries {
  gear: THREE.BufferGeometry;
  smallGear: THREE.BufferGeometry;
  bridge: THREE.BufferGeometry;
  bellows: THREE.BufferGeometry;
  base: THREE.BoxGeometry;
  axle: THREE.CylinderGeometry;
  pipe: THREE.CylinderGeometry;
  tine: THREE.BoxGeometry;
  beam: THREE.BoxGeometry;
  sphere: THREE.SphereGeometry;
  planet: THREE.SphereGeometry;
  portRing: THREE.TorusGeometry;
  irisRing: THREE.TorusGeometry;
  marbleTrack: THREE.TorusGeometry;
  fluxRing: THREE.TorusGeometry;
  floor: THREE.CylinderGeometry;
  outerRing: THREE.TorusGeometry;
  innerRing: THREE.TorusGeometry;
  centralAxle: THREE.CylinderGeometry;
  dispose(): void;
}

function createSharedGeometries(): SharedGeometries {
  // Clone cached CAD-like geometry into work-owned copies: the V5 reference
  // machine may clear the global cache when it is disposed.
  const gear = createSpokedGearGeometry(18, 0.055, 0.28, 0.055, 6).clone();
  const smallGear = createSpokedGearGeometry(12, 0.04, 0.18, 0.045, 5).clone();
  const bridge = createSkeletonBridgeGeometry(1.0, 0.24, 0.055).clone();
  const bellows = createPleatedBellowsGeometry(8, 0.12, 0.46).clone();
  const base = new THREE.BoxGeometry(1, 1, 1);
  const axle = new THREE.CylinderGeometry(0.055, 0.055, 1, 10);
  const pipe = new THREE.CylinderGeometry(1, 1, 1, 12);
  const tine = new THREE.BoxGeometry(1, 1, 1);
  const beam = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(0.065, 10, 8);
  const planet = new THREE.SphereGeometry(0.13, 14, 10);
  const portRing = new THREE.TorusGeometry(0.068, 0.013, 6, 18);
  const irisRing = new THREE.TorusGeometry(0.27, 0.024, 8, 32);
  const marbleTrack = new THREE.TorusGeometry(0.34, 0.022, 8, 36);
  const fluxRing = new THREE.TorusGeometry(0.26, 0.018, 8, 32);
  const floor = new THREE.CylinderGeometry(7.25, 7.25, 0.14, 72);
  const outerRing = new THREE.TorusGeometry(6.45, 0.035, 8, 96);
  const innerRing = new THREE.TorusGeometry(6.05, 0.019, 6, 96);
  const centralAxle = new THREE.CylinderGeometry(0.16, 0.16, 4.6, 18);
  const all: THREE.BufferGeometry[] = [
    gear,
    smallGear,
    bridge,
    bellows,
    base,
    axle,
    pipe,
    tine,
    beam,
    sphere,
    planet,
    portRing,
    irisRing,
    marbleTrack,
    fluxRing,
    floor,
    outerRing,
    innerRing,
    centralAxle,
  ];
  return {
    gear,
    smallGear,
    bridge,
    bellows,
    base,
    axle,
    pipe,
    tine,
    beam,
    sphere,
    planet,
    portRing,
    irisRing,
    marbleTrack,
    fluxRing,
    floor,
    outerRing,
    innerRing,
    centralAxle,
    dispose() {
      for (const geometry of all) geometry.dispose();
    },
  };
}

interface ModuleVisual {
  spec: MachineModuleSpec;
  rotorJointId: string;
  rotorType: 'revolute' | 'prismatic';
  portJointIds: string[];
  accentMeshes: THREE.Mesh[];
}

export interface ModularMachineUpdateContext {
  graphContext: GraphStepContext;
  transport: TransportState;
  articulation: Record<string, number>;
  camera: THREE.PerspectiveCamera;
  focusDrift: number;
}

/**
 * V6 machine-building kit assembly. The visual machine is a kinematic tree:
 * macro frame → cluster rings → modules → gear trains → rotors → organs/ports.
 * Conduits are instanced meshes under the same root, with endpoints sampled
 * from the moving joints each frame. Music reaches modules through a weighted
 * many-to-many graph, never through a fixed part index.
 */
export class ModularMachine implements MachineCameraSource {
  private rig = new KinematicRig();
  private graph = new MachineGraph(createOrreryFactoryConfig());
  private config: MachineGraphConfig = this.graph.getConfig();
  private readonly materials: HorologicalMaterials = createHorologicalMaterials();
  private readonly geometries = createSharedGeometries();
  private readonly ductMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0xffffff,
    metalness: 0.7,
    roughness: 0.32,
  });
  private readonly flowMaterial = new THREE.MeshBasicNodeMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly ecology = new MechanismEcology();
  private articulation: ArticulationState = createDefaultArticulation();
  private lastEcology: EcologySnapshot = this.ecology.getSnapshot();
  private readonly reference = new ChronoAutomaton();
  private readonly cameraDirector = new MachineCameraDirector(this);
  private readonly moduleVisuals = new Map<string, ModuleVisual>();
  private readonly moduleSpecs = new Map<string, MachineModuleSpec>();
  private readonly edgeById = new Map<string, MachineEdgeSpec>();
  private readonly modulePositions = new Map<string, THREE.Vector3>();
  private readonly clusterJointIds: string[] = [];
  private readonly buildGeometries: THREE.BufferGeometry[] = [];
  private readonly conduitOwnedGeometries: THREE.BufferGeometry[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly tmpPoint = new THREE.Vector3();
  private conduitRoot = new THREE.Group();
  private conduitDucts: THREE.InstancedMesh | null = null;
  private conduitFlow: THREE.InstancedMesh | null = null;
  private edgeRuntime: MachineEdgeSpec[] = [];
  private scene: THREE.Scene | null = null;
  private macroFrameId = 'macroFrame';
  private anticipationEnergy = 0;
  private pointerStrain = 0;

  constructor() {
    this.reference.root.scale.setScalar(0.34);
    this.reference.root.position.set(0, -0.08, 0);
    this.reference.root.userData.assembly = 'v5-reference-automaton';
    this.build();
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  attach(scene: THREE.Scene): void {
    this.scene = scene;
    scene.add(this.rig.root);
  }

  dispose(): void {
    this.rig.root.removeFromParent();
    this.reference.root.removeFromParent();
    this.reference.dispose();
    this.clearConduits();
    this.clearBuildGeometries();
    this.rig.dispose();
    this.geometries.dispose();
    this.materials.dispose();
    this.ductMaterial.dispose();
    this.flowMaterial.dispose();
    this.scene = null;
  }

  update(context: ModularMachineUpdateContext): void {
    const { graphContext, transport, camera, focusDrift } = context;
    const dt = clamp(graphContext.dt, 0.0005, 0.05);
    const elapsed = graphContext.elapsed;
    this.articulation = clampArticulation(context.articulation, this.articulation);
    const effectiveGraphContext: GraphStepContext = {
      ...graphContext,
      dt,
      energyChaos: clamp(graphContext.energyChaos + this.anticipationEnergy * 0.11, 0, 1.5),
    };
    this.graph.step(effectiveGraphContext);
    this.lastEcology = this.ecology.step({
      dt,
      elapsed,
      beat: graphContext.beat,
      step16: graphContext.step16,
      scoreIntensity: graphContext.scoreIntensity,
      articulation: this.articulation,
    });

    const globalState = this.graph.getGlobalState();
    this.applyGraphToRig(effectiveGraphContext);
    const rigContext: RigUpdateContext = {
      dt,
      elapsed,
      beat: graphContext.beat,
      bar: graphContext.bar,
      step16: graphContext.step16,
      scoreIntensity: graphContext.scoreIntensity,
      impulseEnergy: globalState.arousal + this.anticipationEnergy * 0.3,
      overclock: this.articulation.overclockSpeed,
    };
    this.rig.update(rigContext);

    this.reference.setArticulationState(this.articulation);
    this.reference.setBehaviorId(this.ecology.getBehavior());
    this.reference.update({
      dt,
      elapsed,
      transport,
      scoreIntensity: graphContext.scoreIntensity,
    });

    this.updateConduits(elapsed, graphContext.flowRate);
    this.cameraDirector.update(camera, dt, elapsed, transport, focusDrift);
    this.anticipationEnergy *= Math.exp(-dt * 2.6);
  }

  triggerImpulse(event: ImpulseEvent, beat: number): void {
    this.graph.emitScore(event, beat);
    this.ecology.stimulate(event);
    this.reference.applyImpulse(event);
    this.cameraDirector.addShock(event.velocity * 0.42, event.locus);
  }

  applyAnticipation(cue: AnticipationCue): void {
    this.anticipationEnergy = clamp(this.anticipationEnergy + cue.intensity * 0.42, 0, 2);
    this.reference.applyAnticipation(cue);
    const synthetic: ImpulseEvent = {
      subsystem: cue.targetSubsystem,
      velocity: cue.intensity * 0.34,
      pitchRatio: 1,
      decay: 1,
      locus: [0, 0.2, 0],
      audioTime: cue.audioTime,
      beat: cue.audioTime,
      origin: 'score',
    };
    this.graph.emitScore(synthetic, cue.audioTime);
  }

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    this.pointerStrain = active ? clamp(tension, 0, 1) : 0;
    this.reference.setPointerStrain(x, y, tension, active);
  }

  setArticulationState(state: Record<string, number>): void {
    this.articulation = clampArticulation(state, this.articulation);
    this.reference.setArticulationState(this.articulation);
  }

  getArticulationState(): Record<string, number> {
    return { ...this.articulation };
  }

  setBehaviorId(id: string): void {
    this.ecology.setBehavior(id);
    this.reference.setBehaviorId(this.ecology.getBehavior());
  }

  getBehaviorId(): string {
    return this.ecology.getBehavior();
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.ecology.setMaps(maps);
    this.reference.setBehaviorMaps(maps);
  }

  getEcologySnapshot(): Record<string, number> {
    const graph = this.graph.getGlobalState();
    return {
      ...this.ecology.getFlatSnapshot(),
      'graph.arousal': graph.arousal,
      'graph.cohesion': graph.cohesion,
      'graph.fatigue': graph.fatigue,
      'graph.curiosity': graph.curiosity,
      'graph.energy': graph.totalEnergy,
    };
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return this.rig.getJointDescriptors();
  }

  getJointWorldPosition(id: string): Vec3Tuple | null {
    return this.rig.getJointWorldPosition(id);
  }

  getFocusTargets(): FocusDescriptor[] {
    return this.graph.getFocusTargets();
  }

  getActiveFocusId(): string {
    return this.graph.getActiveFocusId();
  }

  setActiveFocusId(id: string): void {
    this.graph.setActiveFocus(id);
  }

  getActiveFocus(): FocusDescriptor | null {
    const id = this.graph.getActiveFocusId();
    return this.graph.getFocusTargets().find((focus) => focus.id === id) ?? null;
  }

  getEdgeEndpoints(edgeId: string): [Vec3Tuple, Vec3Tuple] | null {
    const edge = this.edgeById.get(edgeId);
    if (!edge) return null;
    const from = this.getPortWorldPosition(edge.fromModule, edge.fromPort);
    const to = this.getPortWorldPosition(edge.toModule, edge.toPort);
    if (!from || !to) return null;
    return [
      [from.x, from.y, from.z],
      [to.x, to.y, to.z],
    ];
  }

  getGraphState(): {
    phase: number;
    arousal: number;
    cohesion: number;
    fatigue: number;
    curiosity: number;
    totalEnergy: number;
  } {
    return this.graph.getGlobalState();
  }

  getMachineGraphSnapshot(macros: GraphMacroSnapshot[]): MachineGraphSnapshot {
    return this.graph.getSnapshot(this.getActiveFocus()?.label ?? 'WHOLE ASTRARIUM', macros);
  }

  updateGraphBinding(id: string, patch: ScoreBindingPatch): boolean {
    return this.graph.updateBinding(id, patch);
  }

  setFocusTarget(id: string): void {
    const focus = this.getFocusTargets().find((target) => target.id === id);
    if (!focus) return;
    this.cameraDirector.focusOn(id);
  }

  growMachine(count: number): void {
    this.rebuildMachine(this.config.modules.length + count);
  }

  rebuildMachine(moduleCount: number): void {
    const target = clamp(Math.round(moduleCount), 12, MAX_MODULE_COUNT);
    this.rebuildFromConfig(createOrreryFactoryConfig(target));
  }

  exportGraphConfig(): string {
    return this.graph.exportConfigJSON();
  }

  importGraphConfig(raw: string): void {
    this.rebuildFromConfig(MachineGraph.parseConfig(raw));
  }

  getPostFxState(): Partial<PostFxState> {
    const graph = this.graph.getGlobalState();
    const averageEnergy = graph.totalEnergy / Math.max(1, this.config.modules.length);
    return {
      glitch: 0.035 + graph.curiosity * 0.085 + this.pointerStrain * 0.12,
      lensDistort: 0.052 + graph.fatigue * 0.075,
      aberration: 0.13 + graph.arousal * 0.23,
      grain: 0.075 + this.lastEcology.fatigue * 0.14,
      bleachGrade: 0.18 + graph.cohesion * 0.22,
      starkThreshold: 0,
      bloomStrength: 0.78 + clamp(averageEnergy * 0.44, 0, 0.5),
    };
  }

  getMetrics(): {
    activeInstances: number;
    structuralStress: number;
    kineticEnergy: number;
    behavioralState: string;
    activeShotBadge: string;
  } {
    const graph = this.graph.getGlobalState();
    return {
      activeInstances:
        this.config.modules.length +
        this.config.edges.length +
        this.rig.getJointIds().length,
      structuralStress: clamp(graph.fatigue * 0.58 + graph.arousal * 0.42, 0, 1),
      kineticEnergy: graph.totalEnergy / Math.max(1, this.config.modules.length),
      behavioralState: `${this.ecology.getBehavior()} // ${this.cameraDirector.getActiveFocusScale()} // ${this.config.modules.length} MODULES`,
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
  // Construction and live rebuild.
  // ---------------------------------------------------------------------------

  private build(): void {
    this.rig.root.userData.work = 'astrarium-modular-engine';
    this.moduleVisuals.clear();
    this.moduleSpecs.clear();
    this.edgeById.clear();
    this.modulePositions.clear();
    this.clusterJointIds.length = 0;
    for (const spec of this.config.modules) this.moduleSpecs.set(spec.id, spec);
    for (const edge of this.config.edges) this.edgeById.set(edge.id, edge);

    this.buildLights();
    const macroFrame = this.rig.createJoint({
      id: this.macroFrameId,
      label: 'MACRO LOAD-BEARING FRAME',
      type: 'revolute',
      parent: 'root',
      axis: [0, 1, 0],
      min: -Infinity,
      max: Infinity,
      damping: 3,
    });
    this.buildMacroGeometry(macroFrame);
    this.createClusterJoints();
    this.createModuleJoints();
    macroFrame.group.add(this.reference.root);

    const conduitFrame = this.rig.createJoint({
      id: 'conduitFrame',
      label: 'CONDUIT NETWORK LOAD FRAME',
      type: 'root',
      parent: 'root',
      category: 'conduits',
    });
    this.conduitRoot = new THREE.Group();
    this.conduitRoot.name = 'conduit-network';
    conduitFrame.group.add(this.conduitRoot);
    this.buildConduits();
    this.rig.root.updateMatrixWorld(true);
    this.updateConduits(0, 0.7);
    this.cameraDirector.invalidate();
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0x9fd9ff, 0x131820, 1.15);
    this.rig.root.add(hemi);
    const key = new THREE.PointLight(0xffd9a0, 44, 28, 2);
    key.position.set(4.5, 6.5, 5.5);
    this.rig.root.add(key);
    const rim = new THREE.PointLight(0x6f8cff, 32, 24, 2);
    rim.position.set(-5, 2.5, -4);
    this.rig.root.add(rim);
    const core = new THREE.PointLight(0x9ee9ff, 18, 9, 2);
    core.position.set(0, 0.4, 0);
    this.rig.root.add(core);
  }

  private buildMacroGeometry(macroFrame: RigJoint): void {
    const g = this.geometries;
    const outer = attachMesh(macroFrame.group, g.outerRing, this.materials.brass, [0, 1.8, 0], [Math.PI / 2, 0, 0]);
    outer.userData.assembly = 'outer-orrery-ring';
    const inner = attachMesh(macroFrame.group, g.innerRing, this.materials.bluedSteel, [0, -0.92, 0], [Math.PI / 2, 0, 0]);
    inner.userData.assembly = 'inner-orrery-ring';
    const floor = attachMesh(macroFrame.group, g.floor, this.materials.darkFloor, [0, -1.56, 0]);
    floor.userData.assembly = 'machine-plinth';
    const axle = attachMesh(macroFrame.group, g.centralAxle, this.materials.surgicalChrome, [0, 0.18, 0]);
    axle.userData.assembly = 'central-torque-axle';
    const sun = attachMesh(macroFrame.group, g.gear, this.materials.paleBrass, [0, -0.38, 0], [Math.PI / 2, 0, 0]);
    sun.scale.setScalar(1.55);
    sun.userData.assembly = 'macro-sun-gear';

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const column = attachMesh(
        macroFrame.group,
        g.base,
        this.materials.gunmetal,
        [Math.cos(angle) * 6.45, 0.16, Math.sin(angle) * 6.45],
      );
      column.scale.set(0.09, 3.3, 0.09);
      const beam = attachMesh(macroFrame.group, g.beam, this.materials.gunmetal, [0, 1.8, 0], [0, angle, 0]);
      beam.scale.set(0.045, 0.045, 12.9);
    }
  }

  private createClusterJoints(): void {
    this.config.clusters.forEach((cluster, index) => {
      const radial = this.config.modules
        .filter((module) => module.cluster === cluster.id)
        .map((module) => Math.hypot(module.position[0], module.position[2]));
      const radius = Math.max(0.9, ...radial) + 0.38;
      const tier = -0.92 + index * 0.28;
      const joint = this.rig.createJoint({
        id: cluster.jointId,
        label: cluster.label,
        type: 'revolute',
        parent: this.macroFrameId,
        position: [0, tier, 0],
        axis: [0, 1, 0],
        min: -Infinity,
        max: Infinity,
        value: index * 0.08,
        damping: 3.5,
      });
      this.clusterJointIds.push(joint.id);

      const outerRingGeometry = new THREE.TorusGeometry(radius, 0.019, 6, 64);
      const innerRingGeometry = new THREE.TorusGeometry(radius * 0.86, 0.011, 6, 64);
      this.buildGeometries.push(outerRingGeometry, innerRingGeometry);
      attachMesh(joint.group, outerRingGeometry, this.materials.brass, [0, 0, 0], [Math.PI / 2, 0, 0]);
      attachMesh(joint.group, innerRingGeometry, this.materials.bluedSteel, [0, 0.06, 0], [Math.PI / 2, 0, 0]);
      for (let spoke = 0; spoke < 3; spoke++) {
        const bar = attachMesh(
          joint.group,
          this.geometries.beam,
          this.materials.gunmetal,
          [0, 0.02, 0],
          [0, (spoke / 3) * Math.PI, 0],
        );
        bar.scale.set(0.022, 0.022, radius * 2);
      }
    });
  }

  private createModuleJoints(): void {
    const detailed = this.config.modules.length <= 96;
    this.config.modules.forEach((spec, index) => {
      const parentId = this.rig.getJoint(spec.parentJointId) ? spec.parentJointId : this.macroFrameId;
      const moduleJoint = this.rig.createJoint({
        id: spec.jointId,
        label: spec.label,
        type: 'root',
        parent: parentId,
        position: spec.position,
        rotation: spec.rotation,
      });
      moduleJoint.group.scale.setScalar(spec.scale);
      moduleJoint.group.userData.moduleId = spec.id;
      moduleJoint.group.userData.cluster = spec.cluster;

      const base = attachMesh(moduleJoint.group, this.geometries.base, this.materials.gunmetal, [0, -0.2, 0]);
      base.scale.set(0.88, 0.12, 0.7);
      const bridgeA = attachMesh(moduleJoint.group, this.geometries.bridge, this.materials.brass, [-0.28, 0, 0]);
      bridgeA.scale.set(0.8, 0.55, 0.55);
      const bridgeB = attachMesh(moduleJoint.group, this.geometries.bridge, this.materials.paleBrass, [0.28, 0, 0], [0, Math.PI / 2, 0]);
      bridgeB.scale.set(0.65, 0.45, 0.45);
      const axle = attachMesh(moduleJoint.group, this.geometries.axle, this.materials.surgicalChrome, [0, 0, 0], [Math.PI / 2, 0, 0]);
      axle.scale.set(1, 0.62, 1);

      const trainId = `${spec.jointId}:train`;
      const train = this.rig.createJoint({
        id: trainId,
        label: `${spec.label} // GEAR TRAIN`,
        type: 'revolute',
        parent: spec.jointId,
        axis: [0, 0, 1],
        min: -Infinity,
        max: Infinity,
        value: index * 0.17,
        damping: 18,
      });
      const driveGear = attachMesh(train.group, this.geometries.gear, this.materials.brass, [0, 0, 0.055]);
      driveGear.scale.setScalar(0.72);
      const ratio = (index % 2 === 0 ? -1 : 1) * (0.34 + (index % 7) * 0.09);
      this.rig.addDriver(new GearRatioDriver(parentId, trainId, ratio, index * 0.11));

      const rotorType = rotorMotionType(spec.archetype);
      const rotorId = `${spec.jointId}:rotor`;
      this.rig.createJoint({
        id: rotorId,
        label: `${spec.label} // ORGAN ROTOR`,
        type: rotorType,
        parent: trainId,
        axis: rotorAxis(spec.archetype),
        min: rotorType === 'prismatic' ? 0 : -Infinity,
        max: rotorType === 'prismatic' ? 0.34 : Infinity,
        value: 0,
        springStiffness: rotorType === 'prismatic' ? 46 : 0,
        damping: 13,
      });
      const rotorJoint = this.rig.requireJoint(rotorId);
      const accentMeshes = this.createOrganGeometry(spec, rotorJoint, index);

      const portJointIds: string[] = [];
      if (detailed || index < 24 || spec.archetype === 'CHRONO_CORE') {
        for (const port of spec.ports) {
          const id = portJointId(spec.id, port.id);
          const portJoint = this.rig.createJoint({
            id,
            label: `${spec.label} // ${port.id.toUpperCase()} ${port.kind.toUpperCase()}`,
            type: 'prismatic',
            parent: spec.jointId,
            position: port.localPosition,
            axis: [0, 1, 0],
            min: 0,
            max: 0.075,
            value: 0,
            damping: 12,
          });
          const collar = attachMesh(
            portJoint.group,
            this.geometries.portRing,
            this.portMaterial(port.kind),
            [0, 0, 0],
            [Math.PI / 2, 0, 0],
          );
          collar.scale.setScalar(0.82);
          portJointIds.push(id);
        }
      }

      this.moduleVisuals.set(spec.id, {
        spec,
        rotorJointId: rotorId,
        rotorType,
        portJointIds,
        accentMeshes,
      });
    });
  }

  private createOrganGeometry(
    spec: MachineModuleSpec,
    rotor: RigJoint,
    index: number,
  ): THREE.Mesh[] {
    const accents: THREE.Mesh[] = [];
    const addAccent = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number],
    ): void => {
      const mesh = attachMesh(rotor.group, geometry, material, position, rotation);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.userData.baseRotationZ = rotation[2];
      accents.push(mesh);
    };

    switch (spec.archetype) {
      case 'GEAR_TREE': {
        addAccent(this.geometries.gear, this.materials.paleBrass, [-0.16, 0, 0.1], [0, 0, 0.2], [0.58, 0.58, 0.58]);
        addAccent(this.geometries.smallGear, this.materials.bluedSteel, [0.2, 0.02, 0.12], [0, 0, -0.3], [0.72, 0.72, 0.72]);
        break;
      }
      case 'ESCAPEMENT': {
        addAccent(this.geometries.gear, this.materials.brass, [0, 0, 0.1], [0, 0, 0], [0.68, 0.68, 0.68]);
        addAccent(this.geometries.bridge, this.materials.surgicalChrome, [0, 0.13, 0.14], [0, 0, 0.45], [0.5, 0.38, 0.38]);
        addAccent(this.geometries.bridge, this.materials.surgicalChrome, [0, -0.13, 0.14], [0, 0, -0.45], [0.5, 0.38, 0.38]);
        break;
      }
      case 'MARBLE_GATE': {
        addAccent(this.geometries.marbleTrack, this.materials.paleBrass, [0, 0, 0], [Math.PI / 2, 0, 0.1], [1, 1, 1]);
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * TAU + index * 0.21;
          addAccent(
            this.geometries.sphere,
            this.materials.ceramic,
            [Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, 0.035],
            [0, 0, angle],
            [1, 1, 1],
          );
        }
        break;
      }
      case 'BELLOWS': {
        addAccent(this.geometries.bellows, this.materials.ceramic, [0, 0, 0], [0, 0, 0], [0.82, 0.82, 0.82]);
        addAccent(this.geometries.base, this.materials.gunmetal, [-0.26, 0, 0], [0, 0, 0], [0.09, 0.34, 0.34]);
        addAccent(this.geometries.base, this.materials.gunmetal, [0.26, 0, 0], [0, 0, 0], [0.09, 0.34, 0.34]);
        break;
      }
      case 'PIPE_ORGAN': {
        for (let i = 0; i < 5; i++) {
          const height = 0.38 + (i % 3) * 0.13;
          addAccent(
            this.geometries.pipe,
            i % 2 === 0 ? this.materials.brass : this.materials.surgicalChrome,
            [(i - 2) * 0.12, height * 0.5 - 0.16, 0],
            [0, 0, 0],
            [0.042, height, 0.042],
          );
        }
        break;
      }
      case 'TUNED_COMB': {
        addAccent(this.geometries.base, this.materials.gunmetal, [0, -0.16, 0], [0, 0, 0], [0.72, 0.08, 0.16]);
        for (let i = 0; i < 8; i++) {
          const length = 0.42 - i * 0.028;
          addAccent(
            this.geometries.tine,
            this.materials.surgicalChrome,
            [(i - 3.5) * 0.08, length * 0.5 - 0.14, 0.03],
            [0, 0, (i - 3.5) * 0.018],
            [0.035, length, 0.04],
          );
        }
        break;
      }
      case 'IRIS_VALVE': {
        addAccent(this.geometries.irisRing, this.materials.bluedSteel, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * TAU;
          addAccent(
            this.geometries.base,
            this.materials.ceramic,
            [Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, 0.03],
            [0, 0, angle + Math.PI / 4],
            [0.22, 0.055, 0.018],
          );
        }
        break;
      }
      case 'FLUX_COIL': {
        addAccent(this.geometries.fluxRing, this.materials.jewel, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
        addAccent(this.geometries.fluxRing, this.materials.plasma, [0, 0, 0], [Math.PI / 2, 0, 0], [0.82, 0.82, 0.82]);
        addAccent(this.geometries.axle, this.materials.plasma, [0, 0, 0], [0, 0, Math.PI / 2], [0.7, 0.72, 0.7]);
        break;
      }
      case 'ORRERY_ARM': {
        addAccent(this.geometries.beam, this.materials.paleBrass, [0, 0, 0.25], [0, 0, 0], [0.045, 0.045, 0.55]);
        addAccent(this.geometries.planet, this.materials.jewel, [0, 0, 0.52], [0, 0, 0], [1, 1, 1]);
        addAccent(this.geometries.portRing, this.materials.glass, [0, 0, 0.52], [Math.PI / 2, 0, 0], [1.6, 1.6, 1.6]);
        break;
      }
      case 'CHRONO_CORE': {
        addAccent(this.geometries.gear, this.materials.paleBrass, [-0.12, 0, 0.08], [0, 0, 0.2], [0.78, 0.78, 0.78]);
        addAccent(this.geometries.irisRing, this.materials.bluedSteel, [0.18, 0.04, 0.1], [0, 0, -0.15], [0.72, 0.72, 0.72]);
        addAccent(this.geometries.base, this.materials.surgicalChrome, [0, 0.22, 0.02], [0, 0, 0], [0.52, 0.045, 0.16]);
        for (let i = 0; i < 3; i++) {
          addAccent(
            this.geometries.tine,
            this.materials.jewel,
            [(i - 1) * 0.13, 0.02, 0.14],
            [0, 0, 0],
            [0.035, 0.3 - i * 0.04, 0.035],
          );
        }
        break;
      }
      default: {
        addAccent(this.geometries.gear, this.materials.brass, [0, 0, 0.08], [0, 0, 0], [0.62, 0.62, 0.62]);
        break;
      }
    }
    return accents;
  }

  private portMaterial(kind: PortKind): THREE.Material {
    switch (kind) {
      case 'pneumatic':
        return this.materials.ceramic;
      case 'optical':
        return this.materials.glass;
      case 'magnetic':
        return this.materials.plasma;
      case 'marble':
        return this.materials.paleBrass;
      case 'audio':
        return this.materials.jewel;
      case 'data':
        return this.materials.bluedSteel;
      default:
        return this.materials.brass;
    }
  }

  private applyGraphToRig(context: GraphStepContext): void {
    const global = this.graph.getGlobalState();
    this.rig.setTarget(
      this.macroFrameId,
      global.phase * 0.034 + Math.sin(context.elapsed * 0.13) * 0.04,
    );
    this.clusterJointIds.forEach((id, index) => {
      this.rig.setTarget(
        id,
        global.phase * (0.055 + index * 0.012) +
          Math.sin(context.elapsed * 0.17 + index * 0.7) * 0.028,
      );
    });

    for (const [id, visual] of this.moduleVisuals) {
      const state = this.graph.getModuleState(id);
      if (!state) continue;
      const drive =
        visual.rotorType === 'prismatic'
          ? 0.018 + state.energy * 0.21 + Math.max(0, Math.sin(state.phase)) * 0.08
          : Math.sin(state.phase) * 0.56 +
            state.energy * 0.4 +
            this.articulation.overclockSpeed * 0.07;
      this.rig.setTarget(visual.rotorJointId, drive);
      visual.portJointIds.forEach((portId, index) => {
        this.rig.setTarget(
          portId,
          0.008 + state.energy * 0.052 + Math.max(0, Math.sin(state.phase + index)) * 0.008,
        );
      });
      const accent = visual.accentMeshes[0];
      if (accent) {
        accent.rotation.z =
          (accent.userData.baseRotationZ as number | undefined ?? 0) +
          Math.sin(state.phase) * 0.055;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Conduit network.
  // ---------------------------------------------------------------------------

  private buildConduits(): void {
    this.clearConduits();
    this.edgeRuntime = this.config.edges.map((edge) => ({ ...edge }));
    const segmentCount = this.edgeRuntime.length * 2;
    if (segmentCount === 0) return;
    const ductGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    const beadGeometry = new THREE.SphereGeometry(1, 8, 6);
    this.conduitOwnedGeometries.push(ductGeometry, beadGeometry);
    this.conduitDucts = new THREE.InstancedMesh(ductGeometry, this.ductMaterial, segmentCount);
    this.conduitFlow = new THREE.InstancedMesh(beadGeometry, this.flowMaterial, segmentCount);
    this.conduitDucts.name = 'typed-conduit-ducts';
    this.conduitFlow.name = 'conduit-flow-beads';
    this.conduitDucts.frustumCulled = false;
    this.conduitFlow.frustumCulled = false;
    this.conduitDucts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.conduitFlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.edgeRuntime.length; i++) {
      const color = new THREE.Color(EDGE_COLORS[this.edgeRuntime[i].kind]);
      for (let segment = 0; segment < 2; segment++) {
        this.conduitDucts.setColorAt(i * 2 + segment, color);
        this.conduitFlow.setColorAt(i * 2 + segment, color);
      }
    }
    if (this.conduitDucts.instanceColor) this.conduitDucts.instanceColor.needsUpdate = true;
    if (this.conduitFlow.instanceColor) this.conduitFlow.instanceColor.needsUpdate = true;
    this.conduitRoot.add(this.conduitDucts, this.conduitFlow);
  }

  private updateConduits(elapsed: number, flowRate: number): void {
    if (!this.conduitDucts || !this.conduitFlow || this.edgeRuntime.length === 0) return;
    this.modulePositions.clear();
    for (const spec of this.config.modules) {
      const position = this.rig.getJointWorldPosition(spec.jointId);
      if (position) this.modulePositions.set(spec.id, new THREE.Vector3(position[0], position[1], position[2]));
    }

    for (let i = 0; i < this.edgeRuntime.length; i++) {
      const edge = this.edgeRuntime[i];
      const start =
        this.getPortWorldPosition(edge.fromModule, edge.fromPort) ??
        this.modulePositions.get(edge.fromModule)?.clone() ??
        new THREE.Vector3();
      const end =
        this.getPortWorldPosition(edge.toModule, edge.toPort) ??
        this.modulePositions.get(edge.toModule)?.clone() ??
        new THREE.Vector3();
      const direction = end.clone().sub(start);
      if (direction.lengthSq() < 1e-6) continue;
      const side = new THREE.Vector3().crossVectors(direction, this.up);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize();
      const bend = edge.curvature * (0.22 + Math.sin(i * 1.71) * 0.08);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.addScaledVector(side, bend);
      mid.y += bend * 0.48 * Math.cos(i * 0.73);
      const flow = this.graph.getEdgeFlow(edge.id);
      const radius = 0.011 + edge.weight * 0.012 + flow * 0.01;
      this.placeDuctSegment(i * 2, start, mid, radius);
      this.placeDuctSegment(i * 2 + 1, mid, end, radius);

      for (let bead = 0; bead < 2; bead++) {
        const t =
          (elapsed * (0.11 + flowRate * 0.72) + i * 0.137 + bead * 0.5) % 1;
        const point = this.pointOnPolyline(start, mid, end, t);
        const scale = Math.max(0.004, 0.014 + flow * 0.045 + edge.weight * 0.008);
        this.dummy.position.copy(point);
        this.dummy.quaternion.identity();
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        this.conduitFlow.setMatrixAt(i * 2 + bead, this.dummy.matrix);
      }
    }
    this.conduitDucts.instanceMatrix.needsUpdate = true;
    this.conduitFlow.instanceMatrix.needsUpdate = true;
  }

  private placeDuctSegment(
    index: number,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
  ): void {
    if (!this.conduitDucts) return;
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (length < 1e-5) return;
    this.dummy.position.copy(start).add(end).multiplyScalar(0.5);
    this.dummy.quaternion.setFromUnitVectors(this.up, delta.normalize());
    this.dummy.scale.set(radius, length, radius);
    this.dummy.updateMatrix();
    this.conduitDucts.setMatrixAt(index, this.dummy.matrix);
  }

  private pointOnPolyline(
    start: THREE.Vector3,
    mid: THREE.Vector3,
    end: THREE.Vector3,
    t: number,
  ): THREE.Vector3 {
    const x = clamp(t, 0, 1);
    if (x < 0.5) return this.tmpPoint.copy(start).lerp(mid, x * 2);
    return this.tmpPoint.copy(mid).lerp(end, (x - 0.5) * 2);
  }

  private getPortWorldPosition(moduleId: string, portId: string): THREE.Vector3 | null {
    const joint = this.rig.getJoint(portJointId(moduleId, portId));
    if (joint) return joint.getWorldPosition();
    const spec = this.moduleSpecs.get(moduleId);
    if (!spec) return null;
    const moduleJoint = this.rig.getJoint(spec.jointId);
    const port = spec.ports.find((candidate) => candidate.id === portId);
    if (!moduleJoint || !port) return this.modulePositions.get(moduleId)?.clone() ?? null;
    moduleJoint.group.updateWorldMatrix(true, false);
    return new THREE.Vector3(...port.localPosition).applyMatrix4(moduleJoint.group.matrixWorld);
  }

  private clearConduits(): void {
    if (this.conduitDucts) {
      this.conduitDucts.removeFromParent();
      this.conduitDucts.dispose();
      this.conduitDucts = null;
    }
    if (this.conduitFlow) {
      this.conduitFlow.removeFromParent();
      this.conduitFlow.dispose();
      this.conduitFlow = null;
    }
    for (const geometry of this.conduitOwnedGeometries) geometry.dispose();
    this.conduitOwnedGeometries.length = 0;
    this.conduitRoot.clear();
    this.edgeRuntime = [];
  }

  private clearBuildGeometries(): void {
    for (const geometry of this.buildGeometries) geometry.dispose();
    this.buildGeometries.length = 0;
  }

  private rebuildFromConfig(config: MachineGraphConfig): void {
    this.graph.replaceConfig(config);
    this.config = this.graph.getConfig();
    const scene = this.scene;
    this.rig.root.removeFromParent();
    this.reference.root.removeFromParent();
    this.clearConduits();
    this.clearBuildGeometries();
    this.rig.dispose();
    this.rig = new KinematicRig();
    this.build();
    if (scene) scene.add(this.rig.root);
  }
}

function rotorMotionType(archetype: string): 'revolute' | 'prismatic' {
  return archetype === 'BELLOWS' || archetype === 'PIPE_ORGAN' || archetype === 'TUNED_COMB'
    ? 'prismatic'
    : 'revolute';
}

function rotorAxis(archetype: string): Vec3Tuple {
  if (archetype === 'ORRERY_ARM') return [0, 1, 0];
  if (archetype === 'IRIS_VALVE' || archetype === 'FLUX_COIL') return [0, 0, 1];
  return [0, 0, 1];
}
