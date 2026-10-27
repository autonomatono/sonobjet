import * as THREE from 'three/webgpu';
import type { PostFxState, TransportState } from '../../engine/core/types';
import {
  KinematicRig,
  solveFourBar,
  type RigJoint,
} from '../../kit/mechanism/KinematicRig';
import {
  createCamLobeGeometry,
  createSpokedGearGeometry,
} from '../../kit/mechanism/HorologicalMeshKit';
import type {
  ModalFlowBlueprint,
  TransmissionSpec,
  Vec3,
} from './ModalFlowBlueprint';
import type { ModalFlowPhysics } from './ModalFlowPhysics';

export interface ModalFlowMechanismUpdate {
  elapsed: number;
  transport: TransportState;
  physics: ModalFlowPhysics;
  recentEvents: number;
}

type MaterialRole =
  | 'iron'
  | 'brass'
  | 'accent'
  | 'belt'
  | 'paper'
  | 'roomWarm'
  | 'roomCool'
  | 'floor';

interface PaletteMaterial {
  material: THREE.MeshStandardMaterial;
  role: MaterialRole;
  sourceColor: THREE.Color;
  sourceEmissive: THREE.Color;
}

interface RotorVisual {
  joint: RigJoint;
  multiplier: number;
}

interface MovingLug {
  mesh: THREE.Mesh;
  offset: number;
  span: number;
  radius: number;
  crossed: boolean;
}

interface LinkageVisual {
  crank: THREE.Mesh;
  coupler: THREE.Mesh;
  rocker: THREE.Mesh;
  ground: number;
  crankLength: number;
  couplerLength: number;
  rockerLength: number;
}

interface TransmissionVisual {
  spec: TransmissionSpec;
  root: RigJoint;
  rotors: RotorVisual[];
  lugs: MovingLug[];
  linkage?: LinkageVisual;
  light: THREE.PointLight;
  accentMaterial: THREE.MeshStandardMaterial;
}

interface ProjectorRig {
  light: THREE.SpotLight;
  baseIntensity: number;
  role: 'key' | 'rim' | 'shadow';
}

const TAU = Math.PI * 2;
const X_AXIS = new THREE.Vector3(1, 0, 0);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const midpoint = (a: Vec3, b: Vec3): Vec3 => ({
  x: (a.x + b.x) * 0.5,
  y: (a.y + b.y) * 0.5,
  z: (a.z + b.z) * 0.5,
});

const PALETTES: Array<Record<MaterialRole, number>> = [
  {
    iron: 0x17232d,
    brass: 0xc39452,
    accent: 0x8ce8ff,
    belt: 0x332824,
    paper: 0xb8b0a0,
    roomWarm: 0x4b1c18,
    roomCool: 0x17354c,
    floor: 0x111820,
  },
  {
    iron: 0x17191c,
    brass: 0xd6a056,
    accent: 0x6fe8ff,
    belt: 0x361714,
    paper: 0xd0c5ae,
    roomWarm: 0x7d191b,
    roomCool: 0x0b6172,
    floor: 0x171313,
  },
  {
    iron: 0x160f22,
    brass: 0xdf70b9,
    accent: 0x70ffd4,
    belt: 0x32124b,
    paper: 0xb7a5d1,
    roomWarm: 0x4c0c65,
    roomCool: 0x073f5c,
    floor: 0x0c0715,
  },
  {
    iron: 0x17130e,
    brass: 0x5d4226,
    accent: 0xc18a48,
    belt: 0x201810,
    paper: 0xd7bd8f,
    roomWarm: 0x694629,
    roomCool: 0x635c4e,
    floor: 0x1c1710,
  },
  {
    iron: 0x1c1b18,
    brass: 0xe5952d,
    accent: 0xa3dcff,
    belt: 0x392612,
    paper: 0xc4b494,
    roomWarm: 0x713614,
    roomCool: 0x1c4a64,
    floor: 0x17120b,
  },
];

/**
 * The non-marble half of Modal Flow: a Cornell-box machine room containing
 * interlocking gear trains, belts, exact four-bars, camshafts, chains and nested
 * resonators. Every visible part is a child of the same KinematicRig as the
 * tubes and marbles. Transmission phase comes from ModalFlowPhysics, and each
 * tooth/lug/cam crossing is eligible to become a musical event.
 */
export class ModalFlowMechanismLayer {
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly paletteMaterials: PaletteMaterial[] = [];
  private readonly transmissions: TransmissionVisual[] = [];
  private readonly projectors: ProjectorRig[] = [];
  private readonly practicalLights: THREE.PointLight[] = [];
  private readonly shadowGobos: RigJoint[] = [];
  private hemisphere: THREE.HemisphereLight | null = null;
  private paletteIndex = -1;
  private style: Pick<
    PostFxState,
    'palette' | 'lightRig' | 'lightIntensity' | 'shadowStrength' | 'neonGlow' | 'linocut'
  > = {
    palette: 0,
    lightRig: 0,
    lightIntensity: 1,
    shadowStrength: 0.62,
    neonGlow: 0.08,
    linocut: 0,
  };

  constructor(
    private readonly rig: KinematicRig,
    private readonly blueprint: ModalFlowBlueprint,
  ) {
    const frame = rig.createJoint({
      id: 'mechanismFrame',
      label: 'INTERLOCKING TRANSMISSION FRAME',
      type: 'root',
      category: 'transmission',
    });
    this.buildCornellRoom(frame);
    this.buildSectionChassis(frame);
    for (const transmission of blueprint.transmissions) {
      this.buildTransmission(frame, transmission);
    }
    this.applyPalette(0);
  }

  setVisualStyle(style: Partial<PostFxState>): void {
    if (style.palette !== undefined) this.style.palette = style.palette;
    if (style.lightRig !== undefined) this.style.lightRig = style.lightRig;
    if (style.lightIntensity !== undefined) this.style.lightIntensity = style.lightIntensity;
    if (style.shadowStrength !== undefined) this.style.shadowStrength = style.shadowStrength;
    if (style.neonGlow !== undefined) this.style.neonGlow = style.neonGlow;
    if (style.linocut !== undefined) this.style.linocut = style.linocut;
    const palette = clamp(Math.round(this.style.palette), 0, PALETTES.length - 1);
    if (palette !== this.paletteIndex) this.applyPalette(palette);
  }

  update(params: ModalFlowMechanismUpdate): void {
    const section = params.transport.sectionIndex;
    const globalPulse = 0.82 + Math.sin(params.elapsed * 1.7) * 0.08;
    for (const visual of this.transmissions) {
      const phase = params.physics.getTransmissionPhase(visual.spec.id);
      const energy = params.physics.getTransmissionEnergy(visual.spec.id);
      const angle = phase * TAU;
      for (const rotor of visual.rotors) {
        rotor.joint.setValue(angle * rotor.multiplier);
      }
      for (const lug of visual.lugs) {
        this.placeLug(lug, (phase + lug.offset) % 1);
      }
      if (visual.linkage) this.updateLinkage(visual.linkage, angle);

      const sectionDistance = Math.abs(section - visual.spec.section);
      const focus = sectionDistance === 0 ? 1 : sectionDistance === 1 ? 0.48 : 0.16;
      const neon = clamp(this.style.neonGlow, 0, 1.5);
      visual.accentMaterial.emissiveIntensity =
        0.25 + energy * 2.2 + focus * (0.35 + neon * 1.4) + params.recentEvents * 0.025;
      visual.light.intensity =
        (0.25 + energy * 9 + focus * 2.8) *
        this.style.lightIntensity *
        (0.45 + neon * 0.9) *
        globalPulse;
    }

    this.shadowGobos.forEach((joint, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      joint.setValue(
        params.elapsed * direction * (0.11 + section * 0.018 + index * 0.025),
      );
    });
    this.updateLightRig(section, params.elapsed);
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.paletteMaterials.length = 0;
    this.transmissions.length = 0;
    this.projectors.length = 0;
    this.practicalLights.length = 0;
    this.shadowGobos.length = 0;
    this.hemisphere = null;
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private material(
    role: MaterialRole,
    color: number,
    options: {
      emissive?: number;
      emissiveIntensity?: number;
      metalness?: number;
      roughness?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
      depthWrite?: boolean;
    } = {},
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      metalness: options.metalness ?? 0.74,
      roughness: options.roughness ?? 0.3,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      depthWrite: options.depthWrite ?? true,
    });
    this.materials.push(material);
    this.paletteMaterials.push({
      material,
      role,
      sourceColor: material.color.clone(),
      sourceEmissive: material.emissive.clone(),
    });
    return material;
  }

  private addMesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(position);
    mesh.rotation.fromArray(rotation);
    mesh.scale.fromArray(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildCornellRoom(frame: RigJoint): void {
    const floorMat = this.material('floor', 0x111820, { metalness: 0.28, roughness: 0.78 });
    const warmWall = this.material('roomWarm', 0x4b1c18, { metalness: 0.04, roughness: 0.88 });
    const coolWall = this.material('roomCool', 0x17354c, { metalness: 0.04, roughness: 0.88 });
    const paper = this.material('paper', 0xaaa397, { metalness: 0.02, roughness: 0.92 });
    const ink = this.material('iron', 0x11151a, { metalness: 0.58, roughness: 0.52 });
    const neon = this.material('accent', 0x7ee8ff, {
      emissive: 0x3faed0,
      emissiveIntensity: 2.1,
      metalness: 0.05,
      roughness: 0.14,
    });

    // Open-front Cornell box: generous negative-Z depth gives projectors real
    // receiving surfaces while leaving the drone free to enter the mechanism.
    // The room encloses the 12.8-unit auto-camera orbit as well as the machine,
    // so a cinematic move never accidentally films the outside of a wall.
    this.addMesh(frame.group, this.geometry(new THREE.BoxGeometry(29, 0.18, 24)), floorMat, [0, -3.22, -3.4]);
    this.addMesh(frame.group, this.geometry(new THREE.BoxGeometry(29, 14, 0.18)), paper, [0, 3.7, -15.3]);
    this.addMesh(frame.group, this.geometry(new THREE.BoxGeometry(0.18, 14, 24)), warmWall, [-14.4, 3.7, -3.4]);
    this.addMesh(frame.group, this.geometry(new THREE.BoxGeometry(0.18, 14, 24)), coolWall, [14.4, 3.7, -3.4]);
    this.addMesh(frame.group, this.geometry(new THREE.BoxGeometry(29, 0.14, 24)), paper, [0, 10.65, -3.4]);

    // Three pale shadow scrims sit behind independent sections. Their slight
    // offsets let chains, linkages and perforated gobos throw readable shadows.
    const scrimGeo = this.geometry(new THREE.BoxGeometry(5.1, 5.5, 0.055));
    for (let i = 0; i < 3; i++) {
      this.addMesh(frame.group, scrimGeo, paper, [-5.6 + i * 5.6, 0.25 + (i % 2) * 1.2, -5.85]);
    }

    // Practical neon lines provide the luminous "GI" language without faking
    // detached particles: every tube is physically fixed to a wall or deck.
    const tubeGeo = this.geometry(new THREE.CylinderGeometry(0.035, 0.035, 4.4, 8));
    for (let i = 0; i < 6; i++) {
      this.addMesh(
        frame.group,
        tubeGeo,
        neon,
        [-8.9 + i * 3.55, 5.9 - (i % 2) * 1.15, -7.16],
        [0, 0, i % 2 === 0 ? 0.2 : -0.2],
      );
    }

    // Perforated, rotating shadow wheels occupy an actual projection lane.
    for (let i = 0; i < 3; i++) {
      const gobo = this.rig.createJoint({
        id: `joint:shadowGobo:${i}`,
        label: `SHADOW GOBO ${i + 1}`,
        type: 'revolute',
        category: 'shadow',
        parent: frame.id,
        position: [-5.6 + i * 5.6, 1.3 + (i % 2) * 1.1, -4.6],
        axis: [0, 0, 1],
      });
      const gear = this.geometry(createSpokedGearGeometry(18 + i * 4, 0.18, 1.05, 0.07, 6).clone());
      this.addMesh(gobo.group, gear, ink);
      const cross = this.geometry(new THREE.BoxGeometry(2.55, 0.07, 0.06));
      this.addMesh(gobo.group, cross, ink, [0, 0, -0.06], [0, 0, i * 0.52]);
      this.shadowGobos.push(gobo);
    }

    this.hemisphere = new THREE.HemisphereLight(0xbddcff, 0x2a160d, 0.72);
    frame.group.add(this.hemisphere);
    this.addProjector(frame.group, [-6.8, 6.8, 4.8], [-3.8, 0.4, -6], 0xffc58f, 72, 'key');
    this.addProjector(frame.group, [6.8, 5.6, 3.2], [3.7, 1.3, -6], 0x69cfff, 66, 'rim');
    this.addProjector(frame.group, [0, 7.7, -1.6], [0, 0.5, -6.2], 0xff835e, 82, 'shadow');
  }

  private addProjector(
    parent: THREE.Object3D,
    position: [number, number, number],
    targetPosition: [number, number, number],
    color: number,
    intensity: number,
    role: ProjectorRig['role'],
  ): void {
    const target = new THREE.Object3D();
    target.position.fromArray(targetPosition);
    parent.add(target);
    const light = new THREE.SpotLight(color, intensity, 28, Math.PI * 0.16, 0.42, 1.45);
    light.position.fromArray(position);
    light.target = target;
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 30;
    light.shadow.bias = -0.00025;
    parent.add(light);
    this.projectors.push({ light, baseIntensity: intensity, role });
  }

  private buildSectionChassis(frame: RigJoint): void {
    const iron = this.material('iron', 0x1d2a34, { metalness: 0.84, roughness: 0.37 });
    const brass = this.material('brass', 0xb98b4e, { metalness: 0.92, roughness: 0.22 });
    const deckGeo = this.geometry(new THREE.BoxGeometry(5.3, 0.11, 3.8));
    const pillarGeo = this.geometry(new THREE.CylinderGeometry(0.065, 0.085, 4.8, 8));
    const railGeo = this.geometry(new THREE.BoxGeometry(5.2, 0.065, 0.065));
    const sections: Array<[number, number, number]> = [
      [-4.2, -2.45, 1.0],
      [0.15, -0.7, -0.9],
      [4.1, 1.2, -1.65],
      [-1.2, 3.65, -1.15],
    ];
    for (const [x, y, z] of sections) {
      this.addMesh(frame.group, deckGeo, iron, [x, y, z]);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          this.addMesh(frame.group, pillarGeo, brass, [x + sx * 2.38, y - 2.35, z + sz * 1.65]);
        }
      }
      this.addMesh(frame.group, railGeo, brass, [x, y + 0.22, z - 1.78]);
      this.addMesh(frame.group, railGeo, brass, [x, y + 0.22, z + 1.78]);
    }
  }

  private buildTransmission(frame: RigJoint, spec: TransmissionSpec): void {
    const from = this.blueprint.modules.find((module) => module.id === spec.from);
    const to = this.blueprint.modules.find((module) => module.id === spec.to);
    if (!from || !to) return;
    const center = midpoint(from.position, to.position);
    const direction = new THREE.Vector3(
      to.position.x - from.position.x,
      to.position.y - from.position.y,
      to.position.z - from.position.z,
    );
    const distance = Math.max(1, direction.length());
    direction.normalize();

    const root = this.rig.createJoint({
      id: `transmission:${spec.id}`,
      label: spec.label,
      type: 'root',
      category: spec.kind,
      parent: frame.id,
      position: [center.x, center.y, center.z],
    });
    root.restQuaternion.setFromUnitVectors(X_AXIS, direction);
    root.apply();

    const iron = this.material('iron', 0x25323a, { metalness: 0.88, roughness: 0.32 });
    const brass = this.material('brass', 0xc29450, { metalness: 0.93, roughness: 0.2 });
    const belt = this.material('belt', 0x332824, { metalness: 0.14, roughness: 0.72 });
    const accent = this.material('accent', spec.color, {
      emissive: spec.color,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.2,
    });
    const rotors: RotorVisual[] = [];
    const lugs: MovingLug[] = [];
    let linkage: LinkageVisual | undefined;

    // A rigid torque rail makes each non-marble path spatially legible between
    // its source and destination modules.
    this.addMesh(
      root.group,
      this.geometry(new THREE.BoxGeometry(distance * 0.82, 0.035, 0.035)),
      iron,
    );
    const bearingGeo = this.geometry(new THREE.TorusGeometry(0.13, 0.035, 7, 18));
    this.addMesh(root.group, bearingGeo, brass, [-distance * 0.41, 0, 0]);
    this.addMesh(root.group, bearingGeo, brass, [distance * 0.41, 0, 0]);

    if (spec.kind === 'gear-train') {
      const radii = [0.38, 0.27, 0.45].map((radius) => radius * spec.scale);
      const positions = [-radii[0], 0.08, radii[2] + 0.15];
      radii.forEach((radius, index) => {
        const rotor = this.createRotor(
          root,
          spec,
          index,
          [positions[index], index === 1 ? 0.13 : 0, 0],
          [0, 0, 1],
        );
        const gearGeo = this.geometry(
          createSpokedGearGeometry(14 + index * 6, radius * 0.2, radius, 0.09, 5 + index).clone(),
        );
        this.addMesh(rotor.group, gearGeo, index === 1 ? accent : brass);
        rotors.push({ joint: rotor, multiplier: index === 0 ? 1 : index === 1 ? -1.42 : spec.ratio });
      });
    } else if (spec.kind === 'belt' || spec.kind === 'chain') {
      const span = Math.min(distance * 0.62, 2.6) * spec.scale;
      const radius = 0.31 * spec.scale;
      for (let index = 0; index < 2; index++) {
        const rotor = this.createRotor(
          root,
          spec,
          index,
          [index === 0 ? -span * 0.5 : span * 0.5, 0, 0],
          [0, 0, 1],
        );
        const pulley = this.geometry(new THREE.CylinderGeometry(radius, radius, 0.11, 20));
        pulley.rotateX(Math.PI / 2);
        this.addMesh(rotor.group, pulley, index === 0 ? brass : accent);
        this.addMesh(rotor.group, this.geometry(new THREE.TorusGeometry(radius, 0.045, 7, 24)), iron);
        rotors.push({ joint: rotor, multiplier: index === 0 ? 1 : spec.ratio });
      }
      if (spec.kind === 'belt') {
        const strip = this.geometry(new THREE.BoxGeometry(span, 0.055, 0.075));
        const crossed = spec.ratio < 0;
        const tilt = crossed ? Math.atan2(radius * 2, span) : 0;
        this.addMesh(root.group, strip, belt, [0, radius, 0], [0, 0, -tilt]);
        this.addMesh(root.group, strip, belt, [0, -radius, 0], [0, 0, tilt]);
      }
      const lugGeo = this.geometry(new THREE.BoxGeometry(0.11, 0.07, 0.09));
      const lugCount = spec.kind === 'chain' ? 18 : 12;
      for (let i = 0; i < lugCount; i++) {
        const mesh = this.addMesh(root.group, lugGeo, spec.kind === 'chain' ? brass : accent);
        lugs.push({
          mesh,
          offset: i / lugCount,
          span,
          radius,
          crossed: spec.kind === 'belt' && spec.ratio < 0,
        });
      }
    } else if (spec.kind === 'four-bar') {
      const ground = Math.min(distance * 0.48, 1.85) * spec.scale;
      const crankLength = ground * 0.27;
      const rockerLength = ground * 0.55;
      const couplerLength = ground * 0.95;
      const drive = this.createRotor(root, spec, 0, [-ground * 0.5, 0, 0], [0, 0, 1]);
      const output = this.createRotor(root, spec, 1, [ground * 0.5, 0, 0], [0, 0, 1]);
      rotors.push({ joint: drive, multiplier: 1 }, { joint: output, multiplier: spec.ratio * 0.28 });
      const unitBar = this.geometry(new THREE.BoxGeometry(1, 0.07, 0.085));
      const crank = this.addMesh(root.group, unitBar, brass);
      const coupler = this.addMesh(root.group, unitBar, accent);
      const rocker = this.addMesh(root.group, unitBar, brass);
      linkage = { crank, coupler, rocker, ground, crankLength, couplerLength, rockerLength };
    } else if (spec.kind === 'camshaft') {
      const drive = this.createRotor(root, spec, 0, [0, 0, 0], [1, 0, 0]);
      rotors.push({ joint: drive, multiplier: 1 });
      const shaft = this.geometry(new THREE.CylinderGeometry(0.055, 0.055, 1.7 * spec.scale, 10));
      shaft.rotateZ(Math.PI / 2);
      this.addMesh(drive.group, shaft, brass);
      for (let i = 0; i < 5; i++) {
        const cam = this.geometry(createCamLobeGeometry(2 + (i % 2), 0.18, 0.08, 0.075).clone());
        this.addMesh(
          drive.group,
          cam,
          i % 2 === 0 ? accent : brass,
          [-0.68 * spec.scale + i * 0.34 * spec.scale, 0, 0],
          [0, Math.PI / 2, i * 0.6],
        );
        const follower = this.geometry(new THREE.BoxGeometry(0.065, 0.65, 0.075));
        this.addMesh(root.group, follower, iron, [-0.68 * spec.scale + i * 0.34 * spec.scale, 0.42, 0]);
      }
    } else {
      const axes: Array<[number, number, number]> = [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0],
      ];
      axes.forEach((axis, index) => {
        const rotor = this.createRotor(root, spec, index, [0, 0, 0], axis);
        const ring = this.geometry(new THREE.TorusGeometry((0.34 + index * 0.15) * spec.scale, 0.035, 7, 30));
        this.addMesh(rotor.group, ring, index === 1 ? accent : brass);
        rotors.push({ joint: rotor, multiplier: (index + 1) * (index % 2 === 0 ? 1 : spec.ratio) });
      });
      this.addMesh(root.group, this.geometry(new THREE.IcosahedronGeometry(0.16 * spec.scale, 1)), accent);
    }

    const light = new THREE.PointLight(spec.color, 0, 4.8, 2);
    light.position.set(0, 0.3, 0.28);
    root.group.add(light);
    this.practicalLights.push(light);
    this.transmissions.push({ spec, root, rotors, lugs, linkage, light, accentMaterial: accent });
  }

  private createRotor(
    parent: RigJoint,
    spec: TransmissionSpec,
    index: number,
    position: [number, number, number],
    axis: [number, number, number],
  ): RigJoint {
    return this.rig.createJoint({
      id: `joint:${spec.id}:rotor:${index}`,
      label: `${spec.label} ROTOR ${index + 1}`,
      type: 'revolute',
      category: spec.kind,
      parent: parent.id,
      position,
      axis,
    });
  }

  private placeLug(lug: MovingLug, phase: number): void {
    const straight = lug.span;
    const arc = Math.PI * lug.radius;
    const perimeter = straight * 2 + arc * 2;
    let d = ((phase % 1) + 1) % 1 * perimeter;
    let x = 0;
    let y = 0;
    let angle = 0;
    if (d < straight) {
      x = -lug.span * 0.5 + d;
      y = lug.radius;
    } else if ((d -= straight) < arc) {
      const a = Math.PI * 0.5 - d / lug.radius;
      x = lug.span * 0.5 + Math.cos(a) * lug.radius;
      y = Math.sin(a) * lug.radius;
      angle = a - Math.PI * 0.5;
    } else if ((d -= arc) < straight) {
      x = lug.span * 0.5 - d;
      y = -lug.radius;
      angle = Math.PI;
    } else {
      d -= straight;
      const a = -Math.PI * 0.5 - d / lug.radius;
      x = -lug.span * 0.5 + Math.cos(a) * lug.radius;
      y = Math.sin(a) * lug.radius;
      angle = a - Math.PI * 0.5;
    }
    if (lug.crossed) y *= Math.cos((x / Math.max(0.001, lug.span)) * Math.PI);
    lug.mesh.position.set(x, y, 0);
    lug.mesh.rotation.z = angle;
  }

  private updateLinkage(linkage: LinkageVisual, angle: number): void {
    const solution = solveFourBar(angle, {
      ground: linkage.ground,
      crank: linkage.crankLength,
      coupler: linkage.couplerLength,
      rocker: linkage.rockerLength,
    });
    const leftX = -linkage.ground * 0.5;
    const crankPin: [number, number] = [
      leftX + solution.crankPin[0],
      solution.crankPin[1],
    ];
    const rockerPin: [number, number] = [
      leftX + solution.rockerPin[0],
      solution.rockerPin[1],
    ];
    this.placeBar(linkage.crank, [leftX, 0], crankPin);
    this.placeBar(linkage.coupler, crankPin, rockerPin);
    this.placeBar(linkage.rocker, [leftX + linkage.ground, 0], rockerPin);
  }

  private placeBar(
    mesh: THREE.Mesh,
    a: [number, number],
    b: [number, number],
  ): void {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    mesh.position.set((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, 0);
    mesh.rotation.set(0, 0, Math.atan2(dy, dx));
    mesh.scale.set(Math.max(0.001, Math.hypot(dx, dy)), 1, 1);
  }

  private updateLightRig(section: number, elapsed: number): void {
    const rig = clamp(Math.round(this.style.lightRig), 0, 3);
    const master = clamp(this.style.lightIntensity, 0, 2);
    const shadow = clamp(this.style.shadowStrength, 0, 1);
    const profiles = [
      { hemi: 0.72, key: 1, rim: 0.82, shadow: 0.34, practical: 0.65 },
      { hemi: 0.2, key: 1.16, rim: 0.38, shadow: 1.38, practical: 0.22 },
      { hemi: 0.3, key: 0.34, rim: 0.48, shadow: 0.2, practical: 1.5 },
      { hemi: 1.18, key: 0.9, rim: 0.9, shadow: 0.62, practical: 0.42 },
    ][rig];
    if (this.hemisphere) this.hemisphere.intensity = profiles.hemi * master * (1 - shadow * 0.28);
    for (const projector of this.projectors) {
      const factor = projector.role === 'key'
        ? profiles.key
        : projector.role === 'rim'
          ? profiles.rim
          : profiles.shadow;
      const sectionPulse = 0.92 + Math.sin(elapsed * 0.37 + section * 1.7) * 0.08;
      projector.light.intensity = projector.baseIntensity * factor * master * sectionPulse;
      projector.light.castShadow = shadow > 0.08;
    }
    for (const light of this.practicalLights) {
      light.intensity *= profiles.practical;
    }
  }

  private applyPalette(index: number): void {
    this.paletteIndex = index;
    const palette = PALETTES[index] ?? PALETTES[0];
    for (const entry of this.paletteMaterials) {
      const target = new THREE.Color(palette[entry.role]);
      // Accent sources keep a trace of their module identity in every palette.
      if (entry.role === 'accent') target.lerp(entry.sourceColor, index === 3 ? 0.12 : 0.34);
      entry.material.color.copy(target);
      if (entry.material.emissive.getHex() !== 0 || entry.role === 'accent') {
        entry.material.emissive.copy(target).multiplyScalar(entry.role === 'accent' ? 0.62 : 0.18);
      }
    }
    const lightColors = [0x85dcff, 0x62e7ff, 0x70ffd1, 0xd09b55, 0xa6dcff];
    for (const light of this.practicalLights) light.color.setHex(lightColors[index] ?? lightColors[0]);
  }
}
