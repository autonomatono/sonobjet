import type { ImpulseEvent } from './types';

export interface DOFConfig {
  id: string;
  initial?: number;
  min?: number;
  max?: number;
  /** Spring stiffness (rad/s or m/s^2 equivalent) */
  stiffness: number;
  /** Damping coefficient */
  damping: number;
  /** Optional quantized detent step (0 = smooth, >0 = snaps to mechanical CAD steps) */
  detentStep?: number;
}

export interface DOFState extends DOFConfig {
  value: number;
  velocity: number;
  target: number;
}

/**
 * Base Living Audiovisual Entity (`Sonobjet`).
 *
 * Unlike a passive visualizer that maps FFT bins to geometry after sound is rendered,
 * a `Sonobjet` owns physical Degrees of Freedom (DOFs), tensile stress, mechanical detents,
 * and rupture thresholds. Impulses actuate its physical state AND acoustic synthesis
 * simultaneously, and excessive physical strain spontaneously discharges acoustic ruptures.
 */
export class SonobjetCore {
  public readonly id: string;
  private dofs = new Map<string, DOFState>();
  private structuralStress = 0;
  private kineticEnergy = 0;
  private externalStrain = 0;
  private ruptureCooldown = 0;

  constructor(id: string, configs: DOFConfig[] = []) {
    this.id = id;
    for (const cfg of configs) {
      this.defineDOF(cfg);
    }
  }

  defineDOF(cfg: DOFConfig): void {
    const initial = cfg.initial ?? 0;
    this.dofs.set(cfg.id, {
      ...cfg,
      min: cfg.min ?? -10,
      max: cfg.max ?? 10,
      value: initial,
      velocity: 0,
      target: initial,
    });
  }

  kickDOF(id: string, impulseVelocity: number, newTarget?: number): void {
    const dof = this.dofs.get(id);
    if (!dof) return;
    dof.velocity += impulseVelocity;
    if (newTarget !== undefined) {
      dof.target = Math.max(dof.min!, Math.min(dof.max!, newTarget));
    }
  }

  setDOFTarget(id: string, target: number): void {
    const dof = this.dofs.get(id);
    if (!dof) return;
    dof.target = Math.max(dof.min!, Math.min(dof.max!, target));
  }

  snapDOF(id: string, value: number): void {
    const dof = this.dofs.get(id);
    if (!dof) return;
    dof.value = Math.max(dof.min!, Math.min(dof.max!, value));
  }

  getDOF(id: string): number {
    return this.dofs.get(id)?.value ?? 0;
  }

  getDOFVelocity(id: string): number {
    return this.dofs.get(id)?.velocity ?? 0;
  }

  setExternalStrain(strain: number): void {
    this.externalStrain = Math.max(0, Math.min(2, strain));
  }

  getStructuralStress(): number {
    return this.structuralStress;
  }

  getKineticEnergy(): number {
    return this.kineticEnergy;
  }

  /**
   * Integrates physical DOFs with semi-implicit Euler + hard stop restitution + CAD detents.
   * Returns an autonomous rupture ImpulseEvent if tensile stress breaches threshold!
   */
  stepPhysics(dt: number, hardLock = false): ImpulseEvent | null {
    const stepDt = Math.min(0.033, Math.max(0.0005, dt));
    let totalEnergy = 0;
    let totalDisplacement = 0;

    for (const dof of this.dofs.values()) {
      if (hardLock) {
        // Hard CAD lockup: quantize immediately to sharp industrial steps
        const q = dof.detentStep && dof.detentStep > 0 ? dof.detentStep : 0.25;
        dof.value = Math.round(dof.value / q) * q;
        dof.velocity *= 0.2;
        continue;
      }

      const effectiveTarget =
        dof.detentStep && dof.detentStep > 0 && Math.abs(dof.velocity) < 1.8
          ? Math.round(dof.target / dof.detentStep) * dof.detentStep
          : dof.target;

      const displacement = dof.value - effectiveTarget;
      const springForce = -dof.stiffness * displacement;
      const dampingForce = -dof.damping * dof.velocity;
      const accel = springForce + dampingForce;

      dof.velocity += accel * stepDt;
      dof.value += dof.velocity * stepDt;

      // Hard mechanical end-stops with crisp metallic recoil
      if (dof.value < dof.min!) {
        dof.value = dof.min!;
        dof.velocity = -dof.velocity * 0.32;
      } else if (dof.value > dof.max!) {
        dof.value = dof.max!;
        dof.velocity = -dof.velocity * 0.32;
      }

      totalEnergy += 0.5 * dof.velocity * dof.velocity;
      totalDisplacement += Math.abs(displacement);
    }

    const dofCount = Math.max(1, this.dofs.size);
    this.kineticEnergy = Math.min(2.5, totalEnergy / (dofCount * 8));
    const targetStress = Math.min(
      1.5,
      totalDisplacement / (dofCount * 0.85) + this.externalStrain * 0.9,
    );
    this.structuralStress +=
      (targetStress - this.structuralStress) * Math.min(1, stepDt * 14);

    if (this.ruptureCooldown > 0) {
      this.ruptureCooldown = Math.max(0, this.ruptureCooldown - stepDt);
    }

    // Autonomous viscoelastic rupture: when strained past critical yield, the object snaps!
    if (this.externalStrain > 0.86 && this.ruptureCooldown <= 0) {
      this.ruptureCooldown = 0.22;
      return {
        subsystem: 'spine-shear',
        velocity: Math.min(1.3, 0.75 + this.externalStrain * 0.45),
        pitchRatio: 0.85 + this.structuralStress * 0.6,
        decay: 0.35,
        locus: [
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
        ],
        audioTime: 0,
        beat: 0,
        origin: 'sensor',
      };
    }

    return null;
  }
}
