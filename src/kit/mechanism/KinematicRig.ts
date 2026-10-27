import * as THREE from 'three/webgpu';
import type { RigJointDescriptor } from '../../engine/core/types';

export type RigJointType = 'root' | 'revolute' | 'prismatic';
export type Vec3Tuple = [number, number, number];

export interface RigJointOptions {
  id: string;
  label: string;
  type?: RigJointType;
  category?: string;
  parent?: string | RigJoint;
  position?: Vec3Tuple;
  rotation?: Vec3Tuple;
  axis?: Vec3Tuple;
  min?: number;
  max?: number;
  value?: number;
  /** 0 = immediate kinematic following; > 0 = critically-inspired spring DOF. */
  springStiffness?: number;
  damping?: number;
}

export interface RigUpdateContext {
  dt: number;
  elapsed: number;
  beat: number;
  bar: number;
  step16: number;
  scoreIntensity: number;
  impulseEnergy: number;
  overclock: number;
}

export interface RigDriver {
  update(rig: KinematicRig, context: RigUpdateContext): void;
}

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const smootherStep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * One named parent-child joint. Revolute joints rotate around a local axis;
 * prismatic joints translate along it. All machine geometry is parented to a
 * joint group, so no part can drift independently of the kinematic tree.
 */
export class RigJoint {
  public readonly id: string;
  public readonly label: string;
  public readonly type: RigJointType;
  public readonly category: string;
  public readonly group = new THREE.Group();
  public readonly restPosition = new THREE.Vector3();
  public readonly restQuaternion = new THREE.Quaternion();
  public readonly axis = new THREE.Vector3(0, 0, 1);
  public readonly children = new Map<string, RigJoint>();
  public parentId: string | undefined;

  public min: number;
  public max: number;
  public value: number;
  public targetValue: number;
  public velocity = 0;
  public springStiffness: number;
  public damping: number;

  private readonly scratchQuat = new THREE.Quaternion();

  constructor(options: RigJointOptions) {
    this.id = options.id;
    this.label = options.label;
    this.type = options.type ?? 'revolute';
    this.category = options.category ?? 'mechanism';
    this.restPosition.fromArray(options.position ?? [0, 0, 0]);
    this.restQuaternion.setFromEuler(
      new THREE.Euler().fromArray(options.rotation ?? [0, 0, 0]),
    );
    this.axis.fromArray(options.axis ?? [0, 0, 1]).normalize();
    this.min = options.min ?? -Infinity;
    this.max = options.max ?? Infinity;
    this.value = clamp(options.value ?? 0, this.min, this.max);
    this.targetValue = this.value;
    this.springStiffness = options.springStiffness ?? 0;
    this.damping = options.damping ?? 14;
    this.group.name = `rig:${this.id}`;
    this.apply();
  }

  add(child: RigJoint): void {
    child.parentId = this.id;
    this.children.set(child.id, child);
    this.group.add(child.group);
  }

  setTarget(value: number, immediate = false): void {
    this.targetValue = clamp(value, this.min, this.max);
    if (immediate) this.setValue(this.targetValue);
  }

  setValue(value: number): void {
    this.value = clamp(value, this.min, this.max);
    this.targetValue = this.value;
    this.velocity = 0;
    this.apply();
  }

  step(dt: number): void {
    const h = Math.min(0.05, Math.max(0.0001, dt));
    if (this.springStiffness > 0) {
      const accel =
        (this.targetValue - this.value) * this.springStiffness -
        this.velocity * this.damping;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    } else {
      const alpha = 1 - Math.exp(-this.damping * h);
      this.value += (this.targetValue - this.value) * alpha;
    }
    this.value = clamp(this.value, this.min, this.max);
    this.apply();
  }

  apply(): void {
    this.group.position.copy(this.restPosition);
    this.group.quaternion.copy(this.restQuaternion);
    if (this.type === 'prismatic') {
      this.group.position.addScaledVector(this.axis, this.value);
    } else if (this.type === 'revolute') {
      this.scratchQuat.setFromAxisAngle(this.axis, this.value);
      this.group.quaternion.multiply(this.scratchQuat);
    }
  }

  getWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.group.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(this.group.matrixWorld);
  }
}

/** Declarative scene-graph skeleton with composable analytical drivers. */
export class KinematicRig {
  public readonly rootJoint: RigJoint;
  public readonly root: THREE.Group;
  private readonly joints = new Map<string, RigJoint>();
  private readonly drivers: RigDriver[] = [];

  constructor() {
    this.rootJoint = new RigJoint({
      id: 'root',
      label: 'MACHINE ROOT',
      type: 'root',
      category: 'chassis',
    });
    this.root = this.rootJoint.group;
    this.root.name = 'chrono-automaton-rig';
    this.joints.set(this.rootJoint.id, this.rootJoint);
  }

  createJoint(options: RigJointOptions): RigJoint {
    if (this.joints.has(options.id)) {
      throw new Error(`Duplicate rig joint: ${options.id}`);
    }
    const parent =
      typeof options.parent === 'string'
        ? this.joints.get(options.parent)
        : (options.parent ?? this.rootJoint);
    if (!parent) throw new Error(`Unknown parent joint: ${String(options.parent)}`);

    const joint = new RigJoint(options);
    parent.add(joint);
    this.joints.set(joint.id, joint);
    return joint;
  }

  getJoint(id: string): RigJoint | undefined {
    return this.joints.get(id);
  }

  requireJoint(id: string): RigJoint {
    const joint = this.joints.get(id);
    if (!joint) throw new Error(`Unknown rig joint: ${id}`);
    return joint;
  }

  getJointIds(): string[] {
    return Array.from(this.joints.keys());
  }

  getJointDescriptors(): RigJointDescriptor[] {
    return Array.from(this.joints.values()).map((j) => ({
      id: j.id,
      label: j.label,
      type: j.type,
      category: j.category,
      parentId: j.parentId,
    }));
  }

  getJointWorldPosition(id: string): [number, number, number] | null {
    const joint = this.joints.get(id);
    if (!joint) return null;
    const p = joint.getWorldPosition();
    return [p.x, p.y, p.z];
  }

  addDriver<T extends RigDriver>(driver: T): T {
    this.drivers.push(driver);
    return driver;
  }

  setTarget(id: string, value: number, immediate = false): void {
    this.joints.get(id)?.setTarget(value, immediate);
  }

  setValue(id: string, value: number): void {
    this.joints.get(id)?.setValue(value);
  }

  update(context: RigUpdateContext): void {
    for (const driver of this.drivers) driver.update(this, context);
    for (const joint of this.joints.values()) joint.step(context.dt);
  }

  dispose(): void {
    this.drivers.length = 0;
    this.joints.clear();
    this.root.clear();
  }
}

/** Rigid gear mesh: child angle = parent angle × opposite tooth ratio + phase. */
export class GearRatioDriver implements RigDriver {
  constructor(
    private readonly sourceId: string,
    private readonly targetId: string,
    private readonly ratio: number,
    private readonly phase = 0,
  ) {}

  update(rig: KinematicRig): void {
    const source = rig.getJoint(this.sourceId);
    const target = rig.getJoint(this.targetId);
    if (!source || !target) return;
    target.setValue(source.value * this.ratio + this.phase);
  }
}

export interface CamFollowerOptions {
  amplitude?: number;
  rest?: number;
  beatsPerStep?: number;
  anticipationBeats?: number;
  phaseSteps?: number;
}

/**
 * Samples a physical cam profile against transport time. Anticipation cues
 * inject extra lift 150–350ms before a strike and decay through spring return.
 */
export class CamFollowerDriver implements RigDriver {
  private cueEnergy = 0;
  private lift = 0;
  private readonly amplitude: number;
  private readonly rest: number;
  private readonly beatsPerStep: number;
  private readonly anticipationBeats: number;
  private readonly phaseSteps: number;

  constructor(
    private readonly targetId: string,
    private readonly profile: number[],
    options: CamFollowerOptions = {},
  ) {
    this.amplitude = options.amplitude ?? 0.18;
    this.rest = options.rest ?? 0;
    this.beatsPerStep = options.beatsPerStep ?? 0.25;
    this.anticipationBeats = options.anticipationBeats ?? 0.5;
    this.phaseSteps = options.phaseSteps ?? 0;
  }

  triggerCue(intensity: number): void {
    this.cueEnergy = Math.min(1.6, this.cueEnergy + intensity);
  }

  getLift(): number {
    return this.lift;
  }

  update(rig: KinematicRig, context: RigUpdateContext): void {
    const target = rig.getJoint(this.targetId);
    if (!target || this.profile.length === 0) return;
    this.cueEnergy *= Math.exp(-context.dt * 3.4);

    const lookaheadBeat =
      (context.beat + this.anticipationBeats) / this.beatsPerStep +
      this.phaseSteps;
    const step = Math.floor(lookaheadBeat);
    const frac = lookaheadBeat - step;
    const n = this.profile.length;
    const a = this.profile[((step % n) + n) % n];
    const b = this.profile[(((step + 1) % n) + n) % n];
    const camLift = a + (b - a) * smootherStep(frac);
    this.lift = clamp(
      this.rest + camLift * this.amplitude + this.cueEnergy * 0.11,
      target.min,
      target.max,
    );
    target.setTarget(this.lift);
  }
}

/** Geneva intermittent motion: a dwell followed by a fast indexed advance. */
export class GenevaIndexerDriver implements RigDriver {
  private index = 0;

  constructor(
    private readonly targetId: string,
    private readonly slots = 16,
    private readonly stepsPerBeat = 4,
    private readonly activeFraction = 0.22,
  ) {}

  getIndex(): number {
    return this.index;
  }

  update(rig: KinematicRig, context: RigUpdateContext): void {
    const target = rig.getJoint(this.targetId);
    if (!target) return;
    const raw = context.beat * this.stepsPerBeat;
    const whole = Math.floor(raw);
    const frac = raw - whole;
    const u = clamp((frac - (1 - this.activeFraction)) / this.activeFraction, 0, 1);
    this.index = whole;
    target.setValue(
      (whole + smootherStep(u)) * ((Math.PI * 2) / Math.max(1, this.slots)),
    );
  }
}

export interface FourBarLengths {
  ground: number;
  crank: number;
  coupler: number;
  rocker: number;
}

export interface FourBarSolution {
  valid: boolean;
  crankAngle: number;
  couplerAngle: number;
  rockerAngle: number;
  crankPin: [number, number];
  rockerPin: [number, number];
}

/** Exact circle-intersection solver; pin coincidence is guaranteed analytically. */
export function solveFourBar(
  crankAngle: number,
  lengths: FourBarLengths,
): FourBarSolution {
  const { ground, crank, coupler, rocker } = lengths;
  const bx = crank * Math.cos(crankAngle);
  const by = crank * Math.sin(crankAngle);
  const dx = ground - bx;
  const dy = -by;
  const d = Math.hypot(dx, dy);

  const valid =
    d > 1e-6 &&
    d <= coupler + rocker &&
    d >= Math.abs(coupler - rocker);

  if (!valid) {
    return {
      valid: false,
      crankAngle,
      couplerAngle: 0,
      rockerAngle: 0,
      crankPin: [bx, by],
      rockerPin: [ground, 0],
    };
  }

  const a = (coupler * coupler - rocker * rocker + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, coupler * coupler - a * a));
  const mx = bx + (a * dx) / d;
  const my = by + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;

  const c1: [number, number] = [mx + rx, my + ry];
  const c2: [number, number] = [mx - rx, my - ry];
  // Open configuration: choose the assembly above the ground link.
  const c = c1[1] >= c2[1] ? c1 : c2;

  return {
    valid: true,
    crankAngle,
    couplerAngle: Math.atan2(c[1] - by, c[0] - bx),
    rockerAngle: Math.atan2(c[1], c[0] - ground),
    crankPin: [bx, by],
    rockerPin: c,
  };
}

export interface CrankSliderSolution {
  valid: boolean;
  sliderX: number;
  rodAngle: number;
  crankPin: [number, number];
}

export function solveCrankSlider(
  crankAngle: number,
  crankLength: number,
  rodLength: number,
  offset = 0,
): CrankSliderSolution {
  const px = crankLength * Math.cos(crankAngle);
  const py = crankLength * Math.sin(crankAngle);
  const dy = py - offset;
  const inner = rodLength * rodLength - dy * dy;
  if (inner < 0) {
    return { valid: false, sliderX: px, rodAngle: 0, crankPin: [px, py] };
  }
  const sliderX = px + Math.sqrt(inner);
  return {
    valid: true,
    sliderX,
    rodAngle: Math.atan2(dy, sliderX - px),
    crankPin: [px, py],
  };
}

export interface FourBarLinkageOptions {
  inputJointId: string;
  couplerJointId: string;
  outputJointId: string;
  lengths: FourBarLengths;
  inputAngleOffset?: number;
  outputAngleOffset?: number;
}

/**
 * Drives a crank pivot, a coupler joint parented at the crank pin, and a rocker
 * pivot at the opposite ground bearing. The rods themselves are joint children.
 */
export class FourBarLinkageDriver implements RigDriver {
  private solution: FourBarSolution | null = null;

  constructor(private readonly options: FourBarLinkageOptions) {}

  getSolution(): FourBarSolution | null {
    return this.solution;
  }

  update(rig: KinematicRig): void {
    const input = rig.getJoint(this.options.inputJointId);
    const coupler = rig.getJoint(this.options.couplerJointId);
    const output = rig.getJoint(this.options.outputJointId);
    if (!input || !coupler || !output) return;

    const theta = input.value + (this.options.inputAngleOffset ?? 0);
    const solution = solveFourBar(theta, this.options.lengths);
    this.solution = solution;
    if (!solution.valid) return;

    coupler.setValue(solution.couplerAngle - theta);
    output.setValue(solution.rockerAngle + (this.options.outputAngleOffset ?? 0));
  }
}

export interface MagneticSlipRailOptions {
  jointId: string;
  anchor: THREE.Object3D;
  beam: THREE.Mesh;
  beamParent: THREE.Object3D;
  maxDistance: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Future anomaly rail: unlatching moves a prismatic child along its axle while
 * a taut plasma torque-beam is stretched between fixed and moving bearings.
 */
export class MagneticSlipRail implements RigDriver {
  private unpin = 0;
  private readonly aWorld = new THREE.Vector3();
  private readonly bWorld = new THREE.Vector3();
  private readonly parentInverse = new THREE.Matrix4();
  private readonly direction = new THREE.Vector3();

  constructor(private readonly options: MagneticSlipRailOptions) {
    this.options.beam.geometry.computeBoundingBox();
  }

  setUnpin(value: number): void {
    this.unpin = clamp(value, 0, 1);
  }

  update(rig: KinematicRig, _context?: RigUpdateContext): void {
    const joint = rig.getJoint(this.options.jointId);
    if (!joint) return;
    joint.setTarget(this.unpin * this.options.maxDistance);

    const parent = this.options.beamParent;
    parent.updateWorldMatrix(true, true);
    parent.getWorldPosition(this.aWorld); // keep matrixWorld fresh before inverse
    this.parentInverse.copy(parent.matrixWorld).invert();

    this.options.anchor.getWorldPosition(this.aWorld);
    joint.group.getWorldPosition(this.bWorld);
    const aLocal = this.aWorld.clone().applyMatrix4(this.parentInverse);
    const bLocal = this.bWorld.clone().applyMatrix4(this.parentInverse);
    this.direction.subVectors(bLocal, aLocal);
    const length = Math.max(0.0001, this.direction.length());

    const beam = this.options.beam;
    beam.position.copy(aLocal).add(bLocal).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(Y_AXIS, this.direction.normalize());
    beam.scale.set(1, length, 1);
    beam.visible = this.unpin > 0.002;
  }
}
