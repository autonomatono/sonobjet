/**
 * Reusable Kinematic & Mechanical Detent Solvers for Living Media Objects.
 */
export class ScalarSpring {
  public value: number;
  public velocity = 0;
  public target: number;
  public stiffness: number;
  public damping: number;

  constructor(initial = 0, stiffness = 240, damping = 18) {
    this.value = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  impulse(velDelta: number): void {
    this.velocity += velDelta;
  }

  step(dt: number): number {
    const h = Math.min(0.033, Math.max(0.0005, dt));
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += force * h;
    this.value += this.velocity * h;
    return this.value;
  }
}

/**
 * Quantizes continuous coordinates or angles to crisp machined CAD steps,
 * blending smoothly based on `lockFactor` [0 = free, 1 = hard step].
 */
export function quantizeDetent(
  value: number,
  stepSize: number,
  lockFactor: number,
): number {
  if (stepSize <= 0 || lockFactor <= 0) return value;
  const snapped = Math.round(value / stepSize) * stepSize;
  return value + (snapped - value) * Math.min(1, Math.max(0, lockFactor));
}
