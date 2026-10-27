import * as THREE from 'three/webgpu';
import type { PostFxState, TransportState } from '../../engine/core/types';
import {
  GearRatioDriver,
  KinematicRig,
  type RigJoint,
} from '../../kit/mechanism/KinematicRig';
import {
  createConduitSampler,
  type ConduitSampler,
  type ModalFlowBlueprint,
  type ModuleSpec,
  type Vec3,
} from './ModalFlowBlueprint';
import type { ModalFlowPhysics } from './ModalFlowPhysics';
import { ModalFlowMechanismLayer } from './ModalFlowMechanismLayer';

export interface ModalFlowMachineUpdate {
  dt: number;
  elapsed: number;
  transport: TransportState;
  physics: ModalFlowPhysics;
  macros: Record<string, number>;
  recentEvents: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const vec3 = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

/**
 * Parented 3D installation. Every visible mesh hangs from a KinematicRig
 * joint; conduits, marbles, module housings and moving transmission parts all
 * share one load-bearing scene graph rather than floating as particles.
 */
export class ModalFlowMachine {
  public readonly rig = new KinematicRig();
  public readonly root = this.rig.root;

  private readonly sampler: ConduitSampler;
  private readonly moduleJoints = new Map<string, RigJoint>();
  private readonly portJoints = new Map<string, RigJoint>();
  private readonly hammerJoints = new Map<string, RigJoint>();
  private readonly moduleMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly moduleLights = new Map<string, THREE.PointLight>();
  private readonly moduleFlash = new Map<string, number>();
  private readonly fillLights: Array<{ light: THREE.Light; base: number }> = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly scratchColor = new THREE.Color();
  private marbleMesh: THREE.InstancedMesh | null = null;
  private mechanismLayer: ModalFlowMechanismLayer | null = null;
  private attachedScene: THREE.Scene | null = null;
  private modulePaletteIndex = -1;
  private visualStyle = {
    palette: 0,
    lightRig: 0,
    lightIntensity: 1,
    shadowStrength: 0.62,
    neonGlow: 0.08,
    linocut: 0,
  };

  constructor(
    private readonly blueprint: ModalFlowBlueprint,
    private readonly physics: ModalFlowPhysics,
  ) {
    // KinematicRig renames its root by default; restore the rig: namespace so
    // every mesh can be proven parented to a named joint.
    this.root.name = 'rig:root';
    this.sampler = createConduitSampler(blueprint);
    this.build();
  }

  attach(scene: THREE.Scene): void {
    this.attachedScene = scene;
    scene.add(this.root);
  }

  flashModule(moduleId: string, energy: number): void {
    this.moduleFlash.set(moduleId, clamp((this.moduleFlash.get(moduleId) ?? 0) + energy, 0, 2));
  }

  setVisualStyle(style: Partial<PostFxState>): void {
    if (style.palette !== undefined) this.visualStyle.palette = style.palette;
    if (style.lightRig !== undefined) this.visualStyle.lightRig = style.lightRig;
    if (style.lightIntensity !== undefined) this.visualStyle.lightIntensity = style.lightIntensity;
    if (style.shadowStrength !== undefined) this.visualStyle.shadowStrength = style.shadowStrength;
    if (style.neonGlow !== undefined) this.visualStyle.neonGlow = style.neonGlow;
    if (style.linocut !== undefined) this.visualStyle.linocut = style.linocut;
    this.mechanismLayer?.setVisualStyle(style);
    this.applyModulePalette();
  }

  getJointDescriptors() {
    return this.rig.getJointDescriptors();
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    return this.rig.getJointWorldPosition(id);
  }

  getArticulationState(): Record<string, number> {
    const state: Record<string, number> = {};
    for (const id of this.rig.getJointIds()) {
      state[id] = this.rig.getJoint(id)?.value ?? 0;
    }
    return state;
  }

  setArticulationState(state: Record<string, number>): void {
    for (const [id, value] of Object.entries(state)) {
      if (Number.isFinite(value)) this.rig.setValue(id, value);
    }
  }

  getPostFxState(): PostFxState {
    const telemetry = this.physics.getTelemetry();
    const energy = clamp(telemetry.instrumentEnergy / 24, 0, 1);
    return {
      // Glitch is now an occasional accent, not the default visual identity.
      glitch: energy * 0.018,
      lensDistort: 0.032 + energy * 0.018,
      aberration: 0.055 + energy * 0.045,
      grain: 0.05 + energy * 0.035,
      bleachGrade: 0.16 + energy * 0.06,
      starkThreshold: 0,
      bloomStrength: 0.84 + energy * 0.22,
      linocut: this.visualStyle.linocut,
      neonGlow: this.visualStyle.neonGlow,
      palette: this.visualStyle.palette,
      exposure: 1.18,
      lightRig: this.visualStyle.lightRig,
      lightIntensity: this.visualStyle.lightIntensity,
      shadowStrength: this.visualStyle.shadowStrength,
    };
  }

  update(params: ModalFlowMachineUpdate): void {
    const { dt, elapsed, transport, physics } = params;
    const h = clamp(dt, 0.0005, 0.05);
    const flywheelSpeed = 1.05 + (params.macros.liftTorque ?? 1.18) * 0.55;
    this.rig.setValue('joint:flywheel', elapsed * flywheelSpeed);
    const diverter = this.rig.getJoint('joint:diverterRotor');
    if (diverter) {
      diverter.setTarget(elapsed * (0.55 + (params.macros.flowRate ?? 0.82) * 0.24));
    }
    const gate = this.rig.getJoint('joint:gateEscapement');
    if (gate) {
      gate.setTarget(physics.getGatePhase() * Math.PI * 2);
    }
    for (const [moduleId, joint] of this.hammerJoints) {
      const energy = physics.getModuleEnergy(moduleId);
      joint.setTarget(energy * 0.24 + (this.moduleFlash.get(moduleId) ?? 0) * 0.12);
    }
    for (const [moduleId, joint] of this.moduleJoints) {
      const energy = physics.getModuleEnergy(moduleId);
      joint.setTarget(Math.sin(elapsed * 1.4 + moduleId.length) * energy * 0.045);
    }
    for (const [moduleId, joint] of this.portJoints) {
      const energy = physics.getModuleEnergy(moduleId);
      joint.setTarget(Math.sin(elapsed * 0.83 + moduleId.length * 0.7) * energy * 0.14);
    }

    this.mechanismLayer?.update({
      elapsed,
      transport,
      physics,
      recentEvents: params.recentEvents,
    });

    this.rig.update({
      dt: h,
      elapsed,
      beat: transport.beat,
      bar: transport.bar,
      step16: transport.step16,
      scoreIntensity: params.macros.scoreIntensity ?? 0.4,
      impulseEnergy: params.recentEvents * 0.18,
      overclock: 0,
    });

    const localLightGain = [0.52, 0.22, 1.55, 0.72][
      clamp(Math.round(this.visualStyle.lightRig), 0, 3)
    ];
    for (const [moduleId, material] of this.moduleMaterials) {
      const energy = physics.getModuleEnergy(moduleId);
      const flash = this.moduleFlash.get(moduleId) ?? 0;
      material.emissiveIntensity =
        0.14 +
        energy * 1.05 +
        flash * 0.9 +
        this.visualStyle.neonGlow * 1.15 +
        this.visualStyle.linocut * 0.08;
      const light = this.moduleLights.get(moduleId);
      if (light) {
        light.intensity =
          (0.18 + energy * 8.5 + flash * 5.5) *
          localLightGain *
          this.visualStyle.lightIntensity;
      }
      this.moduleFlash.set(moduleId, flash * Math.exp(-h * 3.4));
    }
    const fillRig = clamp(Math.round(this.visualStyle.lightRig), 0, 3);
    const fillGain = fillRig === 1 ? 0.34 : fillRig === 2 ? 0.24 : fillRig === 3 ? 1.08 : 0.78;
    for (const { light, base } of this.fillLights) {
      light.intensity = base * this.visualStyle.lightIntensity * fillGain;
    }

    this.updateMarbles();
  }

  dispose(): void {
    this.attachedScene?.remove(this.root);
    this.attachedScene = null;
    this.mechanismLayer?.dispose();
    this.mechanismLayer = null;
    this.rig.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.moduleJoints.clear();
    this.portJoints.clear();
    this.hammerJoints.clear();
    this.moduleMaterials.clear();
    this.moduleLights.clear();
    this.fillLights.length = 0;
    this.moduleFlash.clear();
    this.marbleMesh = null;
  }

  private applyModulePalette(): void {
    const palette = clamp(Math.round(this.visualStyle.palette), 0, 4);
    if (palette === this.modulePaletteIndex) return;
    this.modulePaletteIndex = palette;
    const families = [
      [0x83dfff, 0xe1a85f, 0xa8d9b1],
      [0x61e8ff, 0xff604d, 0xffbf66],
      [0x6fffd2, 0xe864ce, 0x8e83ff],
      [0xb57a3d, 0x4d3421, 0xd0ae72],
      [0x9fdcff, 0xf0a12f, 0xffd080],
    ];
    const family = families[palette] ?? families[0];
    for (const module of this.blueprint.modules) {
      const material = this.moduleMaterials.get(module.id);
      const light = this.moduleLights.get(module.id);
      const target = new THREE.Color(
        palette === 0 ? module.color : family[Math.abs(module.noteRole) % family.length],
      );
      if (palette !== 0) {
        target.lerp(new THREE.Color(module.color), palette === 3 ? 0.08 : 0.22);
      }
      material?.color.copy(target);
      material?.emissive.copy(target).multiplyScalar(palette === 3 ? 0.32 : 0.58);
      light?.color.copy(target);
    }
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private material(
    color: number,
    options: {
      emissive?: number;
      emissiveIntensity?: number;
      metalness?: number;
      roughness?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
    } = {},
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      metalness: options.metalness ?? 0.72,
      roughness: options.roughness ?? 0.32,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
    });
    this.materials.push(material);
    return material;
  }

  private addMesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: Vec3 = { x: 0, y: 0, z: 0 },
    rotation: Vec3 = { x: 0, y: 0, z: 0 },
    scale: Vec3 = { x: 1, y: 1, z: 1 },
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    mesh.scale.set(scale.x, scale.y, scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private build(): void {
    const chassis = this.rig.createJoint({
      id: 'chassisFrame',
      label: 'MODAL FLOW CHASSIS',
      type: 'root',
      category: 'chassis',
    });
    const conduitFrame = this.rig.createJoint({
      id: 'conduitFrame',
      label: 'CONDUIT FRAME',
      type: 'root',
      category: 'conduit',
    });
    const marbleFrame = this.rig.createJoint({
      id: 'marbleFrame',
      label: 'MARBLE FRAME',
      type: 'root',
      category: 'marble',
    });

    const baseMaterial = this.material(0x1a2530, { metalness: 0.5, roughness: 0.62 });
    const baseGeo = this.geometry(new THREE.CylinderGeometry(7.6, 8.1, 0.18, 48));
    this.addMesh(chassis.group, baseGeo, baseMaterial, { x: 0, y: -3.05, z: 0.8 });
    const ringGeo = this.geometry(new THREE.TorusGeometry(7.3, 0.06, 8, 64));
    this.addMesh(chassis.group, ringGeo, baseMaterial, { x: 0, y: -2.92, z: 0.8 }, { x: Math.PI / 2, y: 0, z: 0 });
    this.buildLights(chassis.group);

    for (const module of this.blueprint.modules) {
      this.buildModule(module);
    }
    this.buildConduits(conduitFrame.group);
    this.buildMarbles(marbleFrame.group);
    this.applyModulePalette();
    this.mechanismLayer = new ModalFlowMechanismLayer(this.rig, this.blueprint);
    this.mechanismLayer.setVisualStyle(this.visualStyle);

    this.rig.addDriver(new GearRatioDriver('joint:flywheel', 'joint:liftAuger', -2.35));
    this.rig.addDriver(new GearRatioDriver('joint:flywheel', 'joint:gateEscapement', 1.45, 0.2));
  }

  private buildLights(parent: THREE.Group): void {
    const hemisphere = new THREE.HemisphereLight(0xcfe7ff, 0x1a120c, 0.52);
    parent.add(hemisphere);
    this.fillLights.push({ light: hemisphere, base: 0.52 });
    const key = new THREE.PointLight(0xffd7a0, 22, 34, 2);
    key.position.set(-4.5, 6.5, 5.5);
    parent.add(key);
    this.fillLights.push({ light: key, base: 22 });
    const rim = new THREE.PointLight(0x7dc4ff, 18, 30, 2);
    rim.position.set(5.5, 3.5, -5.5);
    parent.add(rim);
    this.fillLights.push({ light: rim, base: 18 });
    const warm = new THREE.PointLight(0xff9d5c, 12, 22, 2);
    warm.position.set(0, -1.8, 5.5);
    parent.add(warm);
    this.fillLights.push({ light: warm, base: 12 });
  }

  private buildModule(module: ModuleSpec): void {
    const joint = this.rig.createJoint({
      id: `module:${module.id}`,
      label: module.label,
      type: 'revolute',
      category: 'module',
      position: [module.position.x, module.position.y, module.position.z],
      axis: [0, 1, 0],
      min: -0.18,
      max: 0.18,
    });
    this.moduleJoints.set(module.id, joint);
    const port = this.rig.createJoint({
      id: `port:${module.id}`,
      label: `${module.label} PORT`,
      type: 'revolute',
      category: 'port',
      parent: `module:${module.id}`,
      position: [0, module.scale * 0.52, 0],
      axis: [0, 1, 0],
    });
    this.portJoints.set(module.id, port);

    const scale = module.scale;
    const housing = this.material(0x263542, { metalness: 0.82, roughness: 0.3 });
    const glow = this.material(module.color, {
      emissive: module.color,
      emissiveIntensity: 0.22,
      metalness: 0.6,
      roughness: 0.24,
    });
    this.moduleMaterials.set(module.id, glow);
    const localLight = new THREE.PointLight(module.color, 0, 4.2 * scale, 2);
    localLight.position.set(0, 0.48 * scale, 0);
    joint.group.add(localLight);
    this.moduleLights.set(module.id, localLight);
    const brass = this.material(0xb98b4e, { metalness: 0.9, roughness: 0.22 });
    const glass = this.material(0x8fd4e8, {
      emissive: 0x1b4c60,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.12,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
    });

    const plateGeo = this.geometry(new THREE.CylinderGeometry(0.62 * scale, 0.7 * scale, 0.12, 18));
    this.addMesh(joint.group, plateGeo, housing, { x: 0, y: -0.4 * scale, z: 0 });
    const ringGeo = this.geometry(new THREE.TorusGeometry(0.58 * scale, 0.035, 8, 26));
    this.addMesh(joint.group, ringGeo, glow, { x: 0, y: -0.32 * scale, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 });

    const postGeo = this.geometry(new THREE.CylinderGeometry(0.08, 0.1, 0.9 * scale, 10));
    this.addMesh(joint.group, postGeo, housing, { x: 0, y: 0.05 * scale, z: 0 });
    const collarGeo = this.geometry(new THREE.TorusGeometry(0.22 * scale, 0.045, 8, 18));
    this.addMesh(port.group, collarGeo, brass, { x: 0, y: 0, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 });

    switch (module.kind) {
      case 'source':
      case 'collector': {
        const funnelGeo = this.geometry(new THREE.ConeGeometry(0.72 * scale, 0.9 * scale, 20, 1, true));
        this.addMesh(joint.group, funnelGeo, glass, { x: 0, y: 0.28 * scale, z: 0 });
        const basinGeo = this.geometry(new THREE.CylinderGeometry(0.5 * scale, 0.58 * scale, 0.28, 18));
        this.addMesh(joint.group, basinGeo, housing, { x: 0, y: -0.1 * scale, z: 0 });
        break;
      }
      case 'flywheel': {
        const wheel = this.rig.createJoint({
          id: 'joint:flywheel',
          label: 'FLYWHEEL SHAFT',
          type: 'revolute',
          category: 'transmission',
          parent: `module:${module.id}`,
          position: [0, 0.12, 0],
          axis: [0, 0, 1],
        });
        const wheelGeo = this.geometry(new THREE.TorusGeometry(0.62 * scale, 0.09, 10, 32));
        this.addMesh(wheel.group, wheelGeo, brass);
        const hubGeo = this.geometry(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 12));
        this.addMesh(wheel.group, hubGeo, housing, { x: 0, y: 0, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 });
        const spokeGeo = this.geometry(new THREE.BoxGeometry(1.16 * scale, 0.055, 0.055));
        for (let i = 0; i < 4; i++) {
          this.addMesh(wheel.group, spokeGeo, brass, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: (i * Math.PI) / 4 });
        }
        const crankGeo = this.geometry(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8));
        this.addMesh(wheel.group, crankGeo, glow, { x: 0.52 * scale, y: 0, z: 0.18 }, { x: Math.PI / 2, y: 0, z: 0 });
        break;
      }
      case 'lift': {
        const auger = this.rig.createJoint({
          id: 'joint:liftAuger',
          label: 'HELIX AUGER',
          type: 'revolute',
          category: 'transmission',
          parent: `module:${module.id}`,
          position: [0, 0.1, 0],
          axis: [0, 1, 0],
        });
        const coreGeo = this.geometry(new THREE.CylinderGeometry(0.16, 0.16, 1.5 * scale, 12));
        this.addMesh(auger.group, coreGeo, brass, { x: 0, y: 0.3, z: 0 });
        const beadGeo = this.geometry(new THREE.SphereGeometry(0.09, 8, 6));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 4;
          this.addMesh(
            auger.group,
            beadGeo,
            glow,
            { x: Math.cos(a) * 0.34 * scale, y: -0.25 + (i / 12) * 1.35 * scale, z: Math.sin(a) * 0.34 * scale },
          );
        }
        break;
      }
      case 'aqueduct': {
        const troughGeo = this.geometry(new THREE.BoxGeometry(2.1 * scale, 0.16, 0.38));
        this.addMesh(joint.group, troughGeo, housing, { x: 0, y: 0.1, z: 0 });
        const railGeo = this.geometry(new THREE.BoxGeometry(2.15 * scale, 0.06, 0.05));
        for (let i = -1; i <= 1; i += 2) {
          this.addMesh(joint.group, railGeo, glow, { x: 0, y: 0.2, z: i * 0.19 });
        }
        const supportGeo = this.geometry(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8));
        for (let i = -1; i <= 1; i += 2) {
          this.addMesh(joint.group, supportGeo, brass, { x: i * 0.75 * scale, y: -0.55, z: 0 });
        }
        break;
      }
      case 'diverter': {
        const rotor = this.rig.createJoint({
          id: 'joint:diverterRotor',
          label: 'DIVERTER ROTOR',
          type: 'revolute',
          category: 'routing',
          parent: `module:${module.id}`,
          position: [0, 0.15, 0],
          axis: [0, 1, 0],
        });
        const armGeo = this.geometry(new THREE.BoxGeometry(0.72 * scale, 0.08, 0.1));
        for (let i = 0; i < 3; i++) {
          this.addMesh(rotor.group, armGeo, brass, { x: 0, y: 0, z: 0 }, { x: 0, y: (i * Math.PI * 2) / 3, z: 0 });
        }
        const capGeo = this.geometry(new THREE.ConeGeometry(0.28 * scale, 0.42, 3));
        this.addMesh(rotor.group, capGeo, glow, { x: 0, y: 0.28, z: 0 });
        break;
      }
      case 'gate': {
        const escapement = this.rig.createJoint({
          id: 'joint:gateEscapement',
          label: 'GATE ESCAPEMENT',
          type: 'revolute',
          category: 'gate',
          parent: `module:${module.id}`,
          position: [0, 0.16, 0],
          axis: [0, 0, 1],
        });
        const wheelGeo = this.geometry(new THREE.TorusGeometry(0.48 * scale, 0.07, 8, 28));
        this.addMesh(escapement.group, wheelGeo, brass);
        const toothGeo = this.geometry(new THREE.BoxGeometry(0.08, 0.2, 0.08));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.addMesh(
            escapement.group,
            toothGeo,
            glow,
            { x: Math.cos(a) * 0.48 * scale, y: Math.sin(a) * 0.48 * scale, z: 0 },
            { x: 0, y: 0, z: a },
          );
        }
        const rodGeo = this.geometry(new THREE.CylinderGeometry(0.025, 0.025, 0.78 * scale, 6));
        for (let i = 0; i < 12; i++) {
          const a = -0.9 + (i / 11) * 1.8;
          this.addMesh(joint.group, rodGeo, glass, {
            x: Math.sin(a) * 0.82 * scale,
            y: -0.02,
            z: Math.cos(a) * 0.82 * scale - 0.35,
          });
        }
        break;
      }
      case 'tines': {
        const hammer = this.createHammer(module.id, joint);
        this.hammerJoints.set(module.id, hammer);
        const barGeo = this.geometry(new THREE.BoxGeometry(0.12, 0.06, 1));
        for (let i = 0; i < 8; i++) {
          const length = (0.55 + i * 0.075) * scale;
          this.addMesh(joint.group, barGeo, glow, {
            x: -0.66 * scale + i * 0.19 * scale,
            y: -0.08,
            z: 0,
          }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: length });
        }
        break;
      }
      case 'resonator':
      case 'satellite': {
        const hammer = this.createHammer(module.id, joint);
        this.hammerJoints.set(module.id, hammer);
        const bowlGeo = this.geometry(
          new THREE.SphereGeometry(0.72 * scale, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        );
        this.addMesh(joint.group, bowlGeo, glass, { x: 0, y: 0.1, z: 0 }, { x: Math.PI, y: 0, z: 0 });
        const rimGeo = this.geometry(new THREE.TorusGeometry(0.72 * scale, 0.045, 8, 28));
        this.addMesh(joint.group, rimGeo, glow, { x: 0, y: 0.1, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 });
        break;
      }
      case 'chime': {
        const hammer = this.createHammer(module.id, joint);
        this.hammerJoints.set(module.id, hammer);
        const tubeGeo = this.geometry(new THREE.CylinderGeometry(0.055, 0.055, 1, 8));
        for (let i = 0; i < 7; i++) {
          const height = (0.5 + ((i * 3) % 7) * 0.11) * scale;
          const a = (i / 7) * Math.PI * 2;
          this.addMesh(
            joint.group,
            tubeGeo,
            glow,
            { x: Math.cos(a) * 0.5 * scale, y: height * 0.5 - 0.1, z: Math.sin(a) * 0.5 * scale },
            { x: 0, y: 0, z: 0 },
            { x: 1, y: height, z: 1 },
          );
        }
        break;
      }
      case 'drum': {
        const hammer = this.createHammer(module.id, joint);
        this.hammerJoints.set(module.id, hammer);
        const drumGeo = this.geometry(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 14));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.addMesh(joint.group, drumGeo, glow, {
            x: Math.cos(a) * 0.6 * scale,
            y: -0.08,
            z: Math.sin(a) * 0.6 * scale,
          });
        }
        break;
      }
      case 'return': {
        const spiralGeo = this.geometry(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(
              Array.from({ length: 18 }, (_, i) => {
                const t = i / 17;
                const a = t * Math.PI * 3;
                return new THREE.Vector3(
                  Math.cos(a) * 0.52 * scale,
                  -0.35 + t * 0.85 * scale,
                  Math.sin(a) * 0.52 * scale,
                );
              }),
            ),
            30,
            0.07,
            6,
            false,
          ),
        );
        this.addMesh(joint.group, spiralGeo, glass);
        break;
      }
    }
  }

  private createHammer(moduleId: string, parent: RigJoint): RigJoint {
    const hammer = this.rig.createJoint({
      id: `joint:hammer:${moduleId}`,
      label: `${moduleId} HAMMER`,
      type: 'prismatic',
      category: 'hammer',
      parent: parent.id,
      position: [0, 0.42, 0],
      axis: [0, 1, 0],
      min: 0,
      max: 0.34,
    });
    const headGeo = this.geometry(new THREE.SphereGeometry(0.14, 10, 8));
    const headMat = this.material(0xe0c487, { emissive: 0x5a3a12, emissiveIntensity: 0.25, metalness: 0.9, roughness: 0.2 });
    this.addMesh(hammer.group, headGeo, headMat);
    return hammer;
  }

  private buildConduits(parent: THREE.Group): void {
    const outer = this.material(0x6f9bad, {
      emissive: 0x183a48,
      emissiveIntensity: 0.18,
      metalness: 0.25,
      roughness: 0.18,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    const inner = this.material(0x9fe8ff, {
      emissive: 0x2b7fa0,
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.62,
    });
    for (const edge of this.blueprint.conduits) {
      const points = this.sampler.points(edge, 28).map(vec3);
      const curve = new THREE.CatmullRomCurve3(points);
      const outerGeo = this.geometry(new THREE.TubeGeometry(curve, 32, 0.105, 7, false));
      const innerGeo = this.geometry(new THREE.TubeGeometry(curve, 32, 0.032, 5, false));
      this.addMesh(parent, outerGeo, outer);
      this.addMesh(parent, innerGeo, inner);
    }
  }

  private buildMarbles(parent: THREE.Group): void {
    const geometry = this.geometry(new THREE.SphereGeometry(0.115, 12, 8));
    const material = this.material(0xdfe9ef, {
      emissive: 0x2a3c48,
      emissiveIntensity: 0.28,
      metalness: 0.95,
      roughness: 0.12,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.physics.marbles.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    this.marbleMesh = mesh;
    this.updateMarbles();
  }

  private updateMarbles(): void {
    const mesh = this.marbleMesh;
    if (!mesh) return;
    const source = this.blueprint.modules.find((m) => m.id === 'source-reservoir');
    for (let i = 0; i < this.physics.marbles.length; i++) {
      const marble = this.physics.marbles[i];
      if (marble.state === 'queued' && source) {
        const a = marble.id * 2.399963;
        const r = 0.18 + (marble.id % 6) * 0.045;
        this.dummy.position.set(
          source.position.x + Math.cos(a) * r,
          source.position.y + 0.1 + (marble.id % 5) * 0.035,
          source.position.z + Math.sin(a) * r,
        );
      } else {
        this.dummy.position.set(marble.position.x, marble.position.y, marble.position.z);
      }
      this.dummy.scale.setScalar(0.86 + marble.energy * 0.24);
      this.dummy.rotation.set(0, marble.id * 0.37, 0);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      const heat = clamp(marble.energy, 0, 1);
      this.scratchColor.setRGB(0.58 + heat * 0.4, 0.68 + heat * 0.26, 0.76 + heat * 0.2);
      mesh.setColorAt(i, this.scratchColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}
