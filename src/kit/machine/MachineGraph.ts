import type {
  FocusDescriptor,
  ImpulseEvent,
  MachineGraphSnapshot,
  GraphMacroSnapshot,
  ScoreBindingPatch,
} from '../../engine/core/types';

export type PortKind =
  | 'mechanical'
  | 'pneumatic'
  | 'optical'
  | 'magnetic'
  | 'marble'
  | 'audio'
  | 'data';

export type EdgeKind =
  | 'MECHANICAL'
  | 'PNEUMATIC'
  | 'OPTICAL'
  | 'MAGNETIC'
  | 'MARBLE'
  | 'AUDIO'
  | 'DATA';

export type TransferMode =
  | 'LINEAR'
  | 'GATE'
  | 'RESONANT'
  | 'TURBULENT'
  | 'RATCHET';

export type ScoreBindingMode =
  | 'EXCITE'
  | 'INHIBIT'
  | 'PHASE'
  | 'ENERGY'
  | 'FOCUS';

export type EnergyWaveform =
  | 'CONTINUOUS'
  | 'PULSE'
  | 'BAR'
  | 'BEAT'
  | 'CHAOTIC';

export interface MachinePortSpec {
  id: string;
  kind: PortKind;
  direction: 'in' | 'out' | 'bidir';
  localPosition: [number, number, number];
  capacity: number;
}

export interface MachineClusterSpec {
  id: string;
  label: string;
  jointId: string;
  scale: 'MACRO' | 'CLUSTER' | 'MODULE' | 'PORT' | 'CONDUIT';
  description: string;
}

export interface ModuleTargetSelector {
  tags?: string[];
  clusters?: string[];
  archetypes?: string[];
  moduleIds?: string[];
  scaleMin?: number;
  scaleMax?: number;
  limit?: number;
}

export interface MachineModuleSpec {
  id: string;
  label: string;
  archetype: string;
  cluster: string;
  jointId: string;
  parentJointId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  tags: string[];
  capacity: number;
  threshold: number;
  baseFrequency: number;
  ports: MachinePortSpec[];
}

export interface MachineEdgeSpec {
  id: string;
  fromModule: string;
  fromPort: string;
  toModule: string;
  toPort: string;
  kind: EdgeKind;
  transfer: TransferMode;
  weight: number;
  latency: number;
  curvature: number;
  enabled: boolean;
  label: string;
}

export interface EnergySourceSpec {
  id: string;
  moduleId: string;
  label: string;
  kind: string;
  waveform: EnergyWaveform;
  rate: number;
  capacity: number;
  phase: number;
}

export interface ScoreBindingSpec {
  id: string;
  source: string;
  target: ModuleTargetSelector;
  targetLabel: string;
  mode: ScoreBindingMode;
  weight: number;
  enabled: boolean;
}

export interface MachineGraphConfig {
  version: number;
  name: string;
  moduleCount: number;
  clusters: MachineClusterSpec[];
  modules: MachineModuleSpec[];
  edges: MachineEdgeSpec[];
  sources: EnergySourceSpec[];
  bindings: ScoreBindingSpec[];
  focusTargets: FocusDescriptor[];
}

export interface GraphStepContext {
  dt: number;
  elapsed: number;
  beat: number;
  bar: number;
  step16: number;
  scoreIntensity: number;
  networkCoupling: number;
  flowRate: number;
  energyChaos: number;
  narrativeScale: number;
  moduleDensity: number;
  behaviorMode: string;
}

interface ModuleRuntime {
  spec: MachineModuleSpec;
  energy: number;
  activation: number;
  fatigue: number;
  phase: number;
  input: number;
  output: number;
  lastPulse: number;
}

interface EdgeRuntime {
  spec: MachineEdgeSpec;
  flow: number;
}

interface PendingScoreEvent {
  event: ImpulseEvent;
  beat: number;
  velocity: number;
}

const TAU = Math.PI * 2;
const NEUTRAL_STEP_CONTEXT: GraphStepContext = {
  dt: 1 / 60,
  elapsed: 0,
  beat: 0,
  bar: 0,
  step16: 0,
  scoreIntensity: 0.5,
  networkCoupling: 0.6,
  flowRate: 0.6,
  energyChaos: 0.3,
  narrativeScale: 1,
  moduleDensity: 0.6,
  behaviorMode: 'PRECISION_ESCAPEMENT',
};
const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
const smoother = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const fract = (v: number): number => v - Math.floor(v);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const copy = <T>(value: T): T => structuredClone(value);

/**
 * A directed, weighted machine-ecology graph.
 *
 * Music events do not map one-to-one to parts. A score binding fans out to any
 * set of modules selected by tags, cluster, archetype, id or scale; modules then
 * exchange energy across typed conduits with nonlinear transfer functions.
 */
export class MachineGraph {
  private config: MachineGraphConfig;
  private readonly modules = new Map<string, ModuleRuntime>();
  private readonly edges = new Map<string, EdgeRuntime>();
  private readonly sources: EnergySourceSpec[] = [];
  private readonly bindings: ScoreBindingSpec[] = [];
  private pendingEvents: PendingScoreEvent[] = [];

  private arousal = 0.2;
  private cohesion = 0.72;
  private fatigue = 0.08;
  private curiosity = 0.32;
  private phase = 0;
  private totalEnergy = 0;
  private activeFocusId = '';

  private sourceEnergy = new Map<string, number>();
  private moduleOrder: string[] = [];
  private edgeOrder: string[] = [];

  constructor(config: MachineGraphConfig) {
    this.config = this.normalizeConfig(config);
    this.reindex();
  }

  getConfig(): MachineGraphConfig {
    return copy(this.config);
  }

  /** Replace the whole graph while preserving the public API used by live rebuilds. */
  replaceConfig(config: MachineGraphConfig): void {
    this.config = this.normalizeConfig(config);
    this.reindex();
  }

  getActiveFocusId(): string {
    return this.activeFocusId;
  }

  setActiveFocus(id: string): void {
    if (this.config.focusTargets.some((f) => f.id === id)) {
      this.activeFocusId = id;
    }
  }

  getFocusTargets(): FocusDescriptor[] {
    return copy(this.config.focusTargets);
  }

  getModule(id: string): MachineModuleSpec | undefined {
    return this.modules.get(id)?.spec;
  }

  getModuleEnergy(id: string): number {
    return this.modules.get(id)?.energy ?? 0;
  }

  getEdgeFlow(id: string): number {
    return this.edges.get(id)?.flow ?? 0;
  }

  getModuleState(id: string): { energy: number; activation: number; fatigue: number; phase: number } | null {
    const runtime = this.modules.get(id);
    if (!runtime) return null;
    return {
      energy: runtime.energy,
      activation: runtime.activation,
      fatigue: runtime.fatigue,
      phase: runtime.phase,
    };
  }

  /** How many addressable modules one music binding selects (fan-out cardinality). */
  getBindingTargetCount(id: string): number {
    const binding = this.bindings.find((b) => b.id === id);
    if (!binding) return 0;
    return this.selectModules(binding.target, NEUTRAL_STEP_CONTEXT).length;
  }

  /** How many independent music aspects can influence one module (fan-in cardinality). */
  getModuleBindingCount(moduleId: string): number {
    const module = this.modules.get(moduleId);
    if (!module) return 0;
    let count = 0;
    for (const binding of this.bindings) {
      if (!binding.enabled) continue;
      if (this.selectModules(binding.target, NEUTRAL_STEP_CONTEXT).some((m) => m.spec.id === moduleId)) {
        count++;
      }
    }
    return count;
  }

  getGlobalState(): {
    arousal: number;
    cohesion: number;
    fatigue: number;
    curiosity: number;
    phase: number;
    totalEnergy: number;
  } {
    return {
      arousal: this.arousal,
      cohesion: this.cohesion,
      fatigue: this.fatigue,
      curiosity: this.curiosity,
      phase: this.phase,
      totalEnergy: this.totalEnergy,
    };
  }

  addModule(spec: MachineModuleSpec): void {
    if (this.modules.has(spec.id)) return;
    this.config.modules.push(copy(spec));
    this.config.moduleCount = this.config.modules.length;
    this.modules.set(spec.id, this.createRuntime(spec));
    this.moduleOrder.push(spec.id);
  }

  addEdge(spec: MachineEdgeSpec): void {
    if (this.edges.has(spec.id)) return;
    if (!this.modules.has(spec.fromModule) || !this.modules.has(spec.toModule)) return;
    this.config.edges.push(copy(spec));
    this.edges.set(spec.id, { spec: copy(spec), flow: 0 });
    this.edgeOrder.push(spec.id);
  }

  addSource(spec: EnergySourceSpec): void {
    if (!this.modules.has(spec.moduleId)) return;
    this.config.sources.push(copy(spec));
    this.sources.push(copy(spec));
    this.sourceEnergy.set(spec.id, 0);
  }

  updateBinding(id: string, patch: ScoreBindingPatch): boolean {
    const binding = this.bindings.find((b) => b.id === id);
    if (!binding) return false;
    if (typeof patch.weight === 'number') binding.weight = clamp(patch.weight, 0, 2);
    if (typeof patch.enabled === 'boolean') binding.enabled = patch.enabled;
    if (patch.mode) binding.mode = patch.mode as ScoreBindingMode;
    const configBinding = this.config.bindings.find((b) => b.id === id);
    if (configBinding) Object.assign(configBinding, binding);
    return true;
  }

  updateBindingBySource(source: string, weight: number, enabled: boolean): number {
    let count = 0;
    for (const binding of this.bindings) {
      if (binding.source !== source) continue;
      binding.weight = clamp(weight, 0, 2);
      binding.enabled = enabled;
      count++;
    }
    this.config.bindings = this.bindings.map(copy);
    return count;
  }

  emitScore(event: ImpulseEvent, beat: number, velocityScale = 1): void {
    this.pendingEvents.push({
      event,
      beat,
      velocity: event.velocity * velocityScale,
    });
    if (this.pendingEvents.length > 256) {
      this.pendingEvents = this.pendingEvents.slice(-256);
    }
  }

  step(context: GraphStepContext): void {
    const dt = clamp(context.dt, 0.0001, 0.05);
    for (const runtime of this.modules.values()) {
      runtime.input = 0;
      runtime.output = 0;
    }

    this.applyEnergySources(context, dt);
    this.applyContinuousBindings(context, dt);
    this.applyScoreEvents(context, dt);
    this.propagateEdges(context, dt);
    this.integrateModules(context, dt);
    this.updateGlobalState(context, dt);
    this.pendingEvents = [];
  }

  getSnapshot(
    activeFocusLabel: string,
    macros: GraphMacroSnapshot[],
  ): MachineGraphSnapshot {
    const modules = this.moduleOrder
      .map((id) => this.modules.get(id))
      .filter((m): m is ModuleRuntime => Boolean(m))
      .sort((a, b) => b.energy - a.energy);
    const edges = this.edgeOrder
      .map((id) => this.edges.get(id))
      .filter((e): e is EdgeRuntime => Boolean(e))
      .sort((a, b) => b.flow - a.flow);

    return {
      moduleCount: this.modules.size,
      edgeCount: this.edges.size,
      sourceCount: this.sources.length,
      bindingCount: this.bindings.length,
      arousal: this.arousal,
      cohesion: this.cohesion,
      fatigue: this.fatigue,
      curiosity: this.curiosity,
      activeFocusId: this.activeFocusId,
      activeFocusLabel,
      modules: modules.map((m) => ({
        id: m.spec.id,
        label: m.spec.label,
        archetype: m.spec.archetype,
        cluster: m.spec.cluster,
        jointId: m.spec.jointId,
        scale: m.spec.scale,
        energy: m.energy,
        activation: m.activation,
        fatigue: m.fatigue,
        tags: [...m.spec.tags],
      })),
      edges: edges.map((e) => ({
        id: e.spec.id,
        from: e.spec.fromModule,
        to: e.spec.toModule,
        kind: e.spec.kind,
        weight: e.spec.weight,
        flow: e.flow,
        enabled: e.spec.enabled,
      })),
      sources: this.sources.map((s) => ({
        id: s.id,
        moduleId: s.moduleId,
        label: s.label,
        kind: s.kind,
        rate: s.rate,
        energy: this.sourceEnergy.get(s.id) ?? 0,
      })),
      bindings: this.bindings.map((b) => ({
        id: b.id,
        source: b.source,
        target: b.targetLabel,
        mode: b.mode,
        weight: b.weight,
        enabled: b.enabled,
      })),
      focusTargets: copy(this.config.focusTargets),
      macros,
    };
  }

  exportConfigJSON(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  static parseConfig(raw: string): MachineGraphConfig {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.modules)) {
      throw new Error('Machine graph config must contain a modules array');
    }
    return new MachineGraph(parsed as unknown as MachineGraphConfig).getConfig();
  }

  private reindex(): void {
    this.modules.clear();
    this.edges.clear();
    this.sources.length = 0;
    this.bindings.length = 0;
    this.moduleOrder = [];
    this.edgeOrder = [];
    this.sourceEnergy.clear();

    for (const spec of this.config.modules) {
      this.modules.set(spec.id, this.createRuntime(spec));
      this.moduleOrder.push(spec.id);
    }
    for (const spec of this.config.edges) {
      if (!this.modules.has(spec.fromModule) || !this.modules.has(spec.toModule)) continue;
      this.edges.set(spec.id, { spec: copy(spec), flow: 0 });
      this.edgeOrder.push(spec.id);
    }
    for (const spec of this.config.sources) {
      if (!this.modules.has(spec.moduleId)) continue;
      this.sources.push(copy(spec));
      this.sourceEnergy.set(spec.id, 0);
    }
    for (const spec of this.config.bindings) this.bindings.push(copy(spec));
    this.activeFocusId = this.config.focusTargets[0]?.id ?? '';
  }

  private createRuntime(spec: MachineModuleSpec): ModuleRuntime {
    const seed = hashString(spec.id);
    return {
      spec: copy(spec),
      energy: 0.08 + (seed % 17) * 0.006,
      activation: 0.05,
      fatigue: 0.02 + (seed % 11) * 0.004,
      phase: ((seed % 1000) / 1000) * TAU,
      input: 0,
      output: 0,
      lastPulse: 0,
    };
  }

  private normalizeConfig(input: MachineGraphConfig): MachineGraphConfig {
    const clusters = asArray<MachineClusterSpec>(input.clusters).map((c, i) => ({
      id: c.id ?? `cluster-${i}`,
      label: c.label ?? `CLUSTER ${i}`,
      jointId: c.jointId ?? `ringJoint${i}`,
      scale: c.scale ?? 'CLUSTER',
      description: c.description ?? '',
    }));
    const modules = asArray<MachineModuleSpec>(input.modules).map((m, i) => {
      const id = m.id ?? `module-${i}`;
      return {
        id,
        label: m.label ?? `MODULE ${i}`,
        archetype: m.archetype ?? 'GENERIC',
        cluster: m.cluster ?? clusters[i % Math.max(1, clusters.length)]?.id ?? 'CORE',
        jointId: m.jointId ?? `${id}Joint`,
        parentJointId: m.parentJointId ?? 'root',
        position: normalizeVec(m.position, [0, 0, 0]),
        rotation: normalizeVec(m.rotation, [0, 0, 0]),
        scale: typeof m.scale === 'number' ? m.scale : 1,
        tags: Array.isArray(m.tags) ? m.tags : ['general'],
        capacity: typeof m.capacity === 'number' ? m.capacity : 1,
        threshold: typeof m.threshold === 'number' ? m.threshold : 0.2,
        baseFrequency: typeof m.baseFrequency === 'number' ? m.baseFrequency : 0.2,
        ports: Array.isArray(m.ports)
          ? m.ports.map((p, pi) => ({
              id: p.id ?? `port-${pi}`,
              kind: p.kind ?? 'mechanical',
              direction: p.direction ?? 'bidir',
              localPosition: normalizeVec(p.localPosition, [0, 0, 0]),
              capacity: typeof p.capacity === 'number' ? p.capacity : 1,
            }))
          : defaultPorts(),
      };
    });
    const moduleIds = new Set(modules.map((m) => m.id));
    const edges = asArray<MachineEdgeSpec>(input.edges)
      .filter((e) => moduleIds.has(e.fromModule) && moduleIds.has(e.toModule))
      .map((e, i) => ({
        id: e.id ?? `edge-${i}`,
        fromModule: e.fromModule,
        fromPort: e.fromPort ?? 'out',
        toModule: e.toModule,
        toPort: e.toPort ?? 'in',
        kind: e.kind ?? 'MECHANICAL',
        transfer: e.transfer ?? 'LINEAR',
        weight: typeof e.weight === 'number' ? e.weight : 0.5,
        latency: typeof e.latency === 'number' ? e.latency : 0,
        curvature: typeof e.curvature === 'number' ? e.curvature : 0.2,
        enabled: e.enabled !== false,
        label: e.label ?? `EDGE ${i}`,
      }));
    const sources = asArray<EnergySourceSpec>(input.sources)
      .filter((s) => moduleIds.has(s.moduleId))
      .map((s, i) => ({
        id: s.id ?? `source-${i}`,
        moduleId: s.moduleId,
        label: s.label ?? `SOURCE ${i}`,
        kind: s.kind ?? 'MAINSPRING',
        waveform: s.waveform ?? 'CONTINUOUS',
        rate: typeof s.rate === 'number' ? s.rate : 0.5,
        capacity: typeof s.capacity === 'number' ? s.capacity : 1,
        phase: typeof s.phase === 'number' ? s.phase : 0,
      }));
    const bindings = asArray<ScoreBindingSpec>(input.bindings).map((b, i) => ({
      id: b.id ?? `binding-${i}`,
      source: b.source ?? 'any',
      target: isRecord(b.target) ? (copy(b.target) as ModuleTargetSelector) : { tags: ['general'] },
      targetLabel: b.targetLabel ?? describeTarget(b.target),
      mode: b.mode ?? 'EXCITE',
      weight: typeof b.weight === 'number' ? b.weight : 0.6,
      enabled: b.enabled !== false,
    }));
    const focusTargets = asArray<FocusDescriptor>(input.focusTargets).map((f, i) => ({
      id: f.id ?? `focus-${i}`,
      label: f.label ?? `FOCUS ${i}`,
      scale: f.scale ?? 'MODULE',
      jointId: f.jointId,
      moduleId: f.moduleId,
      clusterId: f.clusterId,
      edgeId: f.edgeId,
      priority: typeof f.priority === 'number' ? f.priority : 0.5,
      tags: Array.isArray(f.tags) ? f.tags : [],
    }));
    return {
      version: typeof input.version === 'number' ? input.version : 1,
      name: typeof input.name === 'string' ? input.name : 'MODULAR MACHINE',
      moduleCount: modules.length,
      clusters,
      modules,
      edges,
      sources,
      bindings,
      focusTargets,
    };
  }

  private applyEnergySources(context: GraphStepContext, dt: number): void {
    for (const source of this.sources) {
      const target = this.modules.get(source.moduleId);
      if (!target) continue;
      const phase = context.beat + source.phase;
      let wave = 1;
      switch (source.waveform) {
        case 'PULSE':
          wave = Math.exp(-fract(context.beat * 4) * 6);
          break;
        case 'BAR':
          wave = Math.exp(-fract(context.beat / 4) * 5);
          break;
        case 'BEAT':
          wave = Math.exp(-fract(context.beat) * 7);
          break;
        case 'CHAOTIC':
          wave =
            0.55 +
            0.45 * Math.sin(phase * 1.7 + Math.sin(phase * 0.31) * 3.1 + context.energyChaos * 2.4);
          break;
        default:
          wave = 0.82 + Math.sin(phase * 0.23) * 0.18;
      }
      const energy =
        source.rate *
        source.capacity *
        (0.55 + context.scoreIntensity * 0.85) *
        Math.max(0, wave) *
        dt *
        6;
      target.input += energy;
      this.sourceEnergy.set(source.id, clamp(energy / Math.max(0.001, dt * 6), 0, 2));
    }
  }

  private applyContinuousBindings(context: GraphStepContext, dt: number): void {
    for (const binding of this.bindings) {
      if (!binding.enabled) continue;
      if (binding.source !== 'score.intensity' && binding.source !== 'beat' && binding.source !== 'bar') {
        continue;
      }
      let amount = 0;
      if (binding.source === 'score.intensity') amount = context.scoreIntensity * binding.weight * dt * 2.4;
      else if (binding.source === 'beat') amount = Math.exp(-fract(context.beat) * 8) * binding.weight * dt * 6;
      else amount = Math.exp(-fract(context.beat / 4) * 6) * binding.weight * dt * 6;
      this.applyBindingToTargets(binding, amount, context, 'EXCITE');
    }
  }

  private applyScoreEvents(context: GraphStepContext, _dt: number): void {
    for (const pending of this.pendingEvents) {
      for (const binding of this.bindings) {
        if (!binding.enabled) continue;
        if (!this.bindingMatchesSource(binding.source, pending.event, context)) continue;
        const amount = pending.velocity * binding.weight * 0.55;
        this.applyBindingToTargets(binding, amount, context, binding.mode, pending.event);
      }
    }
  }

  private bindingMatchesSource(
    source: string,
    event: ImpulseEvent,
    _context: GraphStepContext,
  ): boolean {
    if (source === 'any') return true;
    if (source === event.subsystem) return true;
    if (source.startsWith('origin:')) return source.slice(7) === event.origin;
    if (source.startsWith('velocity:')) {
      const threshold = Number(source.slice(9));
      return Number.isFinite(threshold) && event.velocity >= threshold;
    }
    return false;
  }

  private applyBindingToTargets(
    binding: ScoreBindingSpec,
    amount: number,
    context: GraphStepContext,
    mode: ScoreBindingMode,
    event?: ImpulseEvent,
  ): void {
    const selected = this.selectModules(binding.target, context);
    for (const module of selected) {
      const spatial =
        1 +
        (event ? event.locus[0] * 0.12 + event.locus[1] * 0.08 : 0) +
        context.narrativeScale * 0.02;
      const scaled = amount * spatial;
      switch (mode) {
        case 'INHIBIT':
          module.energy = clamp(module.energy - scaled * 0.5, 0, module.spec.capacity);
          module.fatigue = clamp(module.fatigue + scaled * 0.08, 0, 1);
          break;
        case 'PHASE':
          module.phase += scaled * 1.7;
          module.input += scaled * 0.1;
          break;
        case 'ENERGY':
          module.input += scaled * 2.2;
          break;
        case 'FOCUS':
          module.energy += scaled * 0.25;
          module.phase += scaled * 0.3;
          break;
        default:
          module.input += scaled * 1.4;
          break;
      }
      module.lastPulse = Math.min(1.5, module.lastPulse + scaled);
    }
  }

  private selectModules(
    selector: ModuleTargetSelector,
    context: GraphStepContext,
  ): ModuleRuntime[] {
    let result: ModuleRuntime[] = [];
    for (const id of this.moduleOrder) {
      const module = this.modules.get(id);
      if (!module) continue;
      const spec = module.spec;
      if (selector.moduleIds?.length && !selector.moduleIds.includes(spec.id)) continue;
      if (selector.clusters?.length && !selector.clusters.includes(spec.cluster)) continue;
      if (selector.archetypes?.length && !selector.archetypes.includes(spec.archetype)) continue;
      if (selector.tags?.length && !selector.tags.some((tag) => spec.tags.includes(tag))) continue;
      if (typeof selector.scaleMin === 'number' && spec.scale < selector.scaleMin) continue;
      if (typeof selector.scaleMax === 'number' && spec.scale > selector.scaleMax) continue;
      result.push(module);
    }
    if (selector.limit && selector.limit > 0 && result.length > selector.limit) {
      result.sort((a, b) => {
        const phaseA = Math.sin(
          a.phase + this.phase * 0.17 + context.narrativeScale * 0.03 + (hashString(a.spec.id) % 977) * 0.001,
        );
        const phaseB = Math.sin(
          b.phase + this.phase * 0.17 + context.narrativeScale * 0.03 + (hashString(b.spec.id) % 977) * 0.001,
        );
        return phaseB - phaseA;
      });
      result = result.slice(0, selector.limit);
    }
    return result;
  }

  private propagateEdges(context: GraphStepContext, dt: number): void {
    for (let edgeIndex = 0; edgeIndex < this.edgeOrder.length; edgeIndex++) {
      const edgeId = this.edgeOrder[edgeIndex];
      const runtime = this.edges.get(edgeId);
      if (!runtime || !runtime.spec.enabled) continue;
      const from = this.modules.get(runtime.spec.fromModule);
      const to = this.modules.get(runtime.spec.toModule);
      if (!from || !to) continue;
      const transfer = this.transferValue(runtime.spec, from, to, context, edgeIndex);
      const rawFlow =
        runtime.spec.weight *
        (0.25 + context.networkCoupling * 1.25) *
        from.activation *
        transfer *
        (1 - to.fatigue * 0.38);
      const alpha = 1 - Math.exp(-dt * (5 + runtime.spec.latency * 8));
      runtime.flow += (clamp(rawFlow, 0, 2) - runtime.flow) * alpha;
      to.input += runtime.flow * context.flowRate * dt * 4.2;
      from.output += runtime.flow * dt * 1.6;
    }
  }

  private transferValue(
    edge: MachineEdgeSpec,
    from: ModuleRuntime,
    to: ModuleRuntime,
    context: GraphStepContext,
    edgeIndex: number,
  ): number {
    switch (edge.transfer) {
      case 'GATE':
        return from.activation > 0.52 ? 1 : 0.04;
      case 'RESONANT':
        return 0.15 + 0.85 * Math.pow((Math.cos(from.phase - to.phase) + 1) * 0.5, 2);
      case 'TURBULENT':
        return clamp(
          0.55 +
            Math.sin(context.beat * 2.7 + edgeIndex * 0.41) * 0.35 +
            Math.sin(context.elapsed * 5.3 + edgeIndex) * context.energyChaos * 0.28,
          0.02,
          1.4,
        );
      case 'RATCHET':
        return Math.exp(-fract(context.beat * 4) * (4 + edge.weight * 4));
      default:
        return 0.72 + edge.weight * 0.28;
    }
  }

  private integrateModules(context: GraphStepContext, dt: number): void {
    const behaviorBoost =
      context.behaviorMode === 'OVERCLOCK_CADENZA'
        ? 1.8
        : context.behaviorMode === 'BROKEN_MAINSPRING'
          ? 0.45
          : context.behaviorMode === 'PENDULUM_BREATH'
            ? 0.7
            : 1;
    for (const [index, id] of this.moduleOrder.entries()) {
      const module = this.modules.get(id);
      if (!module) continue;
      const spec = module.spec;
      const decay = Math.exp(-dt * (0.62 + context.moduleDensity * 0.22));
      const inflow = module.input * dt * 5.5;
      const outflow = module.output * dt * 1.8;
      module.energy = clamp(
        module.energy * decay + inflow - outflow,
        0,
        spec.capacity,
      );
      const normalized = (module.energy - spec.threshold) / Math.max(0.08, spec.capacity - spec.threshold);
      module.activation = smoother(normalized);
      module.fatigue = clamp(
        module.fatigue +
          dt * (module.activation * 0.16 - (1 - module.activation) * 0.11),
        0.02,
        1,
      );
      const phaseSpeed =
        spec.baseFrequency *
        behaviorBoost *
        (0.7 + module.energy * 1.8 + context.energyChaos * 0.35) *
        (1 + (index % 7) * 0.018);
      module.phase += dt * TAU * phaseSpeed;
      module.lastPulse *= Math.exp(-dt * 4.2);
    }
  }

  private updateGlobalState(context: GraphStepContext, dt: number): void {
    let energySum = 0;
    let fatigueSum = 0;
    let sinSum = 0;
    let cosSum = 0;
    let topEnergy = 0;
    let count = 0;
    for (const module of this.modules.values()) {
      energySum += module.energy;
      fatigueSum += module.fatigue;
      sinSum += Math.sin(module.phase);
      cosSum += Math.cos(module.phase);
      topEnergy = Math.max(topEnergy, module.energy);
      count++;
    }
    const avgEnergy = count > 0 ? energySum / count : 0;
    this.totalEnergy = energySum;
    this.arousal +=
      (clamp(avgEnergy * 0.65 + topEnergy * 0.35 + context.scoreIntensity * 0.18, 0, 1) -
        this.arousal) *
      (1 - Math.exp(-dt * 2.4));
    this.fatigue +=
      (clamp(count > 0 ? fatigueSum / count : 0, 0, 1) - this.fatigue) *
      (1 - Math.exp(-dt * 1.6));
    const coherence = count > 0 ? Math.hypot(sinSum / count, cosSum / count) : 0;
    this.cohesion +=
      (clamp(coherence * 0.8 + context.networkCoupling * 0.2, 0, 1) - this.cohesion) *
      (1 - Math.exp(-dt * 1.9));
    this.phase +=
      dt *
      (0.55 +
        this.arousal * 1.4 +
        context.energyChaos * 0.55 +
        context.narrativeScale * 0.04);
    this.curiosity = clamp(
      0.42 +
        Math.sin(this.phase * 0.73) * 0.22 +
        Math.sin(this.phase * 1.91 + this.arousal * 3.4) * 0.14 +
        context.energyChaos * Math.sin(this.phase * 3.1) * 0.18,
      0,
      1,
    );
  }
}

function normalizeVec(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(value) && value.length >= 3) {
    const [a, b, c] = value;
    if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') return [a, b, c];
  }
  return [...fallback];
}

function defaultPorts(): MachinePortSpec[] {
  return [
    { id: 'in', kind: 'mechanical', direction: 'in', localPosition: [-0.42, 0, 0], capacity: 1 },
    { id: 'out', kind: 'mechanical', direction: 'out', localPosition: [0.42, 0, 0], capacity: 1 },
    { id: 'vent', kind: 'pneumatic', direction: 'bidir', localPosition: [0, 0.36, 0], capacity: 0.6 },
    { id: 'axis', kind: 'data', direction: 'bidir', localPosition: [0, -0.36, 0], capacity: 0.5 },
  ];
}

function describeTarget(target: ModuleTargetSelector | undefined): string {
  if (!target) return 'ALL MODULES';
  if (target.moduleIds?.length) return `IDS ${target.moduleIds.slice(0, 2).join(',')}`;
  if (target.clusters?.length) return `CLUSTERS ${target.clusters.join(',')}`;
  if (target.archetypes?.length) return `TYPES ${target.archetypes.join(',')}`;
  if (target.tags?.length) return `TAGS ${target.tags.join(',')}`;
  return 'ALL MODULES';
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
