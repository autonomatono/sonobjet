import type { MacroDefinition, PatchRoute } from './types';

/**
 * Composable Signal & Modulation Patchbay.
 *
 * Unifies continuous signals from:
 * - Performative inputs (`mouse.x`, `mouse.y`, `mouse.strain`, `key.punch.*`)
 * - Live sensors (`mediapipe.handSpan`, `mediapipe.leftPinch`, `mediapipe.rightPinch`, `mediapipe.velocity`, `webcam.motion`, `mic.energy`, `midi.cc1`)
 * - Internal LFOs / Lorenz chaotic attractors (`chaos.x`, `chaos.y`, `score.intensity`)
 *
 * And routes them with attenuverters & exponential slew smoothing into
 * Macro targets and Synthesis/Kinematic parameters.
 */
export class ModulationMatrix {
  private sources = new Map<string, number>();
  private macros = new Map<string, { def: MacroDefinition; baseValue: number }>();
  private routes: PatchRoute[] = [];
  private smoothedRouteValues = new Map<string, number>();

  // Built-in chaotic Lorenz attractor state for organic non-repeating micro-drift
  private lorenz = { x: 0.1, y: 0.0, z: 0.0 };

  constructor() {
    this.resetDefaultSources();
  }

  resetDefaultSources(): void {
    const defaults: Record<string, number> = {
      'mouse.x': 0,
      'mouse.y': 0,
      'mouse.velocity': 0,
      'mouse.strain': 0,
      'mediapipe.active': 0,
      'mediapipe.handSpan': 0,
      'mediapipe.leftPinch': 0,
      'mediapipe.rightPinch': 0,
      'mediapipe.velocity': 0,
      'mediapipe.tilt': 0,
      'webcam.motion': 0,
      'mic.energy': 0,
      'mic.centroid': 0,
      'gamepad.lx': 0,
      'gamepad.ly': 0,
      'gamepad.trigger': 0,
      'chaos.x': 0,
      'chaos.y': 0,
      'score.intensity': 0.5,
      'punch.stutter': 0,
      'punch.ratchet': 0,
      'punch.halftime': 0,
      'punch.comb-scream': 0,
      'punch.reverse-slice': 0,
      'punch.tectonic-explode': 0,
      'punch.hard-lock': 0,
    };
    for (const [k, v] of Object.entries(defaults)) {
      this.sources.set(k, v);
    }
  }

  registerMacros(defs: MacroDefinition[]): void {
    this.macros.clear();
    for (const def of defs) {
      this.macros.set(def.id, { def, baseValue: def.defaultValue });
    }
  }

  setRoutes(routes: PatchRoute[]): void {
    this.routes = routes.map((r) => ({ ...r }));
    this.smoothedRouteValues.clear();
  }

  getRoutes(): PatchRoute[] {
    return this.routes;
  }

  updateRoute(id: string, patch: Partial<PatchRoute>): void {
    const route = this.routes.find((r) => r.id === id);
    if (route) {
      Object.assign(route, patch);
    }
  }

  addRoute(route: PatchRoute): void {
    this.routes.push({ ...route });
  }

  setSource(name: string, value: number): void {
    this.sources.set(name, Number.isFinite(value) ? value : 0);
  }

  getSource(name: string): number {
    return this.sources.get(name) ?? 0;
  }

  getAllSources(): Record<string, number> {
    return Object.fromEntries(this.sources.entries());
  }

  setMacroBase(id: string, value: number): void {
    const entry = this.macros.get(id);
    if (!entry) return;
    entry.baseValue = Math.max(
      entry.def.min,
      Math.min(entry.def.max, value),
    );
  }

  getMacroBase(id: string): number {
    return this.macros.get(id)?.baseValue ?? 0;
  }

  getMacroDefinitions(): MacroDefinition[] {
    return Array.from(this.macros.values()).map((m) => m.def);
  }

  /** Step internal chaotic modulators and slew filters */
  step(dt: number): void {
    const clampedDt = Math.min(0.05, Math.max(0.0005, dt));
    // Lorenz system
    const sigma = 10;
    const rho = 28;
    const beta = 8 / 3;
    const { x, y, z } = this.lorenz;
    const subDt = clampedDt * 0.45;
    this.lorenz.x = x + sigma * (y - x) * subDt;
    this.lorenz.y = y + (x * (rho - z) - y) * subDt;
    this.lorenz.z = z + (x * y - beta * z) * subDt;

    this.sources.set('chaos.x', Math.max(-1, Math.min(1, this.lorenz.x / 20)));
    this.sources.set('chaos.y', Math.max(-1, Math.min(1, this.lorenz.y / 25)));

    for (const route of this.routes) {
      if (!route.enabled) {
        this.smoothedRouteValues.set(route.id, 0);
        continue;
      }
      const raw = (this.sources.get(route.source) ?? 0) * route.amount;
      const slew = route.slew ?? 0.03;
      if (slew <= 0.001) {
        this.smoothedRouteValues.set(route.id, raw);
      } else {
        const prev = this.smoothedRouteValues.get(route.id) ?? raw;
        const alpha = 1 - Math.exp(-clampedDt / slew);
        this.smoothedRouteValues.set(route.id, prev + (raw - prev) * alpha);
      }
    }
  }

  /**
   * Evaluates effective macro value = baseValue + sum(active patch routes) * span,
   * clamped cleanly to [min, max].
   */
  getTarget(id: string, fallback = 0): number {
    const macro = this.macros.get(id);
    let modSum = 0;
    for (const route of this.routes) {
      if (route.enabled && route.target === id) {
        modSum += this.smoothedRouteValues.get(route.id) ?? 0;
      }
    }
    if (!macro) {
      return fallback + modSum;
    }
    const span = macro.def.max - macro.def.min;
    const combined = macro.baseValue + modSum * span;
    return Math.max(macro.def.min, Math.min(macro.def.max, combined));
  }
}
