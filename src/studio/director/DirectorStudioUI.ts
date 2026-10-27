import type {
  BehaviorMapEntry,
  FocusScale,
  GraphMacroSnapshot,
  MachineGraphSnapshot,
  PatchRoute,
  PhysicsMacroSnapshot,
  PhysicsStudioSnapshot,
  PostFxState,
  RigJointDescriptor,
  ScoreBindingPatch,
} from '../../engine/core/types';
import {
  ARTICULATION_DEFINITIONS,
  BEHAVIOR_IDS,
  BEHAVIOR_PROFILES,
  type ArticulationState,
  type BehaviorId,
} from '../articulation/ArticulationRig';
import type { BehaviorPresetBank } from '../articulation/BehaviorPresetBank';
import type { DirectorCameraMode } from './FreeFlyController';
import type {
  CameraInterpolation,
  CameraKeyframe,
  KeyframeTimeline,
  LookKeyframe,
  MachineMilestone,
  MilestoneEase,
} from './KeyframeTimeline';
import { DEFAULT_POST_FX, POST_FX_KEYS } from './KeyframeTimeline';

export type SelectionKind = 'camera' | 'look' | 'milestone';
export interface DirectorSelection {
  kind: SelectionKind;
  id: string;
}

export interface DirectorFrameInfo {
  beat: number;
  bar: number;
  shotLabel: string;
  lookLabel: string;
  milestoneLabel: string;
  ecology: Record<string, number>;
  cameraMode: DirectorCameraMode;
  enabled: boolean;
  graph?: MachineGraphSnapshot | null;
  physics?: PhysicsStudioSnapshot | null;
}

export interface DirectorUICallbacks {
  onToggle(): void;
  onModeChange(mode: DirectorCameraMode): void;
  onScrub(beat: number): void;
  onSelect(selection: DirectorSelection | null): void;
  onCameraCapture(selectedId?: string): void;
  onCameraAdd(key: Omit<CameraKeyframe, 'id'>): void;
  onCameraUpdate(id: string, patch: Partial<CameraKeyframe>): void;
  onCameraDelete(id: string): void;
  onLookCapture(selectedId?: string): void;
  onLookAdd(key: Omit<LookKeyframe, 'id'>): void;
  onLookUpdate(id: string, patch: Partial<LookKeyframe>): void;
  onLookDelete(id: string): void;
  onLookLiveChange(fx: PostFxState | null): void;
  onMilestoneAdd(milestone: Omit<MachineMilestone, 'id'>): void;
  onMilestoneUpdate(id: string, patch: Partial<MachineMilestone>): void;
  onMilestoneDelete(id: string): void;
  onArticulationChange(id: string, value: number): void;
  onBehaviorChange(id: string): void;
  onReleaseManualOverrides(): void;
  onPresetBlend(fromId: string, toId: string, t: number, active: boolean): void;
  onBehaviorMapChange(id: string, patch: Partial<BehaviorMapEntry>): void;
  onPatchRouteChange(id: string, patch: Partial<PatchRoute>): void;
  onJointSelect(id: string | undefined): void;
  onImportProject(raw: string): void;
  onExportProject(): void;
  onImportPresets(raw: string): void;
  onExportPresets(): void;
  onResetProject(): void;
  onGraphMacro(id: string, value: number): void;
  onGraphBinding(id: string, patch: ScoreBindingPatch): void;
  onFocusTarget(id: string): void;
  onGrowMachine(count: number): void;
  onRebuildMachine(moduleCount: number): void;
  onExportGraphConfig(): void;
  onImportGraphConfig(raw: string): void;
  onPhysicsMacro(id: string, value: number): void;
  onPhysicsPinToggle(lane: number, step: number, enabled?: boolean): void;
  onPhysicsFocus(id: string): void;
  onPhysicsReset(): void;
  onPhysicsDrop(count: number): void;
  onExportPhysicsProgram(): void;
  onImportPhysicsProgram(raw: string): void;
}

type TabId = 'SHOTS' | 'LOOKS' | 'CONFIG' | 'MAPS' | 'PHYSICS' | 'MACHINE' | 'PROJECT';

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const button = (label: string, className = 'btn'): HTMLButtonElement => {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
};

const number = (value: number, step = 0.01): HTMLInputElement => {
  const input = el('input', 'director-input');
  input.type = 'number';
  input.step = String(step);
  input.value = String(value);
  return input;
};

type NumericControl = HTMLInputElement | HTMLSelectElement;

const num = (input: NumericControl | undefined, fallback = 0): number => {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
};

interface FxControlSpec {
  key: keyof PostFxState;
  label: string;
  min: number;
  max: number;
  step: number;
  toggle: boolean;
}

const FX_CONTROL_SPECS: FxControlSpec[] = [
  { key: 'glitch', label: 'SCAN GLITCH', min: 0, max: 1.5, step: 0.01, toggle: true },
  { key: 'lensDistort', label: 'LENS WARP', min: -0.6, max: 0.9, step: 0.01, toggle: true },
  { key: 'aberration', label: 'CHROMATIC', min: 0, max: 1.5, step: 0.01, toggle: true },
  { key: 'grain', label: 'FILM GRAIN', min: 0, max: 1, step: 0.01, toggle: true },
  { key: 'bleachGrade', label: 'BLEACH GRADE', min: 0, max: 1, step: 0.01, toggle: true },
  { key: 'starkThreshold', label: 'STARK STENCIL', min: 0, max: 1, step: 0.01, toggle: true },
  { key: 'bloomStrength', label: 'HDR BLOOM', min: 0, max: 1.8, step: 0.01, toggle: true },
  { key: 'linocut', label: 'LINO RELIEF', min: 0, max: 1, step: 0.01, toggle: true },
  { key: 'neonGlow', label: 'NEON EDGE / GI', min: 0, max: 1.5, step: 0.01, toggle: true },
  { key: 'exposure', label: 'EXPOSURE', min: 0.45, max: 2.2, step: 0.01, toggle: false },
  { key: 'lightIntensity', label: 'LIGHT ENERGY', min: 0, max: 2, step: 0.01, toggle: false },
  { key: 'shadowStrength', label: 'SHADOW DEPTH', min: 0, max: 1, step: 0.01, toggle: false },
];

const PALETTE_OPTIONS = [
  ['0', 'STEEL + XENON'],
  ['1', 'CORNELL RED + CYAN'],
  ['2', 'ULTRAVIOLET + ACID'],
  ['3', 'LINO INK + STOCK'],
  ['4', 'SODIUM + ICE'],
] as const;

const LIGHT_RIG_OPTIONS = [
  ['0', 'GALLERY SCULPTURE'],
  ['1', 'SHADOW THEATRE'],
  ['2', 'NEON GI INSTALLATION'],
  ['3', 'CLOCKMAKER INSPECTION'],
] as const;

const LOOK_PRESETS: Array<{ label: string; fx: PostFxState }> = [
  {
    label: 'RAW / CLEAN',
    fx: {
      ...DEFAULT_POST_FX,
      glitch: 0,
      lensDistort: 0,
      aberration: 0,
      grain: 0,
      bleachGrade: 0,
      starkThreshold: 0,
      bloomStrength: 0,
      linocut: 0,
      neonGlow: 0,
      exposure: 1.08,
      lightRig: 3,
      lightIntensity: 1.15,
      shadowStrength: 0.45,
    },
  },
  {
    label: 'MECHANICAL FILM',
    fx: { ...DEFAULT_POST_FX, glitch: 0, palette: 0, lightRig: 0 },
  },
  {
    label: 'LINO PRESS',
    fx: {
      ...DEFAULT_POST_FX,
      glitch: 0,
      lensDistort: 0.018,
      aberration: 0,
      grain: 0.12,
      bleachGrade: 0,
      bloomStrength: 0.2,
      linocut: 0.94,
      neonGlow: 0,
      palette: 3,
      exposure: 1.24,
      lightRig: 1,
      lightIntensity: 1.15,
      shadowStrength: 0.94,
    },
  },
  {
    label: 'NEON CORNELL',
    fx: {
      ...DEFAULT_POST_FX,
      glitch: 0,
      lensDistort: 0.025,
      aberration: 0.07,
      grain: 0.025,
      bleachGrade: 0.04,
      bloomStrength: 1.42,
      linocut: 0,
      neonGlow: 0.92,
      palette: 1,
      exposure: 1.3,
      lightRig: 2,
      lightIntensity: 1.38,
      shadowStrength: 0.76,
    },
  },
  {
    label: 'SHADOW PLAY',
    fx: {
      ...DEFAULT_POST_FX,
      glitch: 0,
      aberration: 0.02,
      grain: 0.09,
      bloomStrength: 0.48,
      palette: 4,
      exposure: 1.08,
      lightRig: 1,
      lightIntensity: 1.5,
      shadowStrength: 1,
    },
  },
  {
    label: 'ULTRAVIOLET RELAY',
    fx: {
      ...DEFAULT_POST_FX,
      glitch: 0.025,
      aberration: 0.13,
      grain: 0.035,
      bloomStrength: 1.28,
      neonGlow: 0.68,
      palette: 2,
      exposure: 1.22,
      lightRig: 2,
      lightIntensity: 1.24,
      shadowStrength: 0.68,
    },
  },
];

const INTERPOLATIONS: CameraInterpolation[] = [
  'CUT',
  'SMOOTH_SPLINE',
  'ORBIT_ARC',
  'VERTIGO',
];

const EASES: MilestoneEase[] = ['LINEAR', 'SMOOTHER', 'STEP'];
const FOCUS_SCALES: FocusScale[] = ['MACRO', 'CLUSTER', 'MODULE', 'PORT', 'CONDUIT'];
const GRAPH_BINDING_MODES = ['EXCITE', 'INHIBIT', 'PHASE', 'ENERGY', 'FOCUS'] as const;

/** DOM cockpit for the Director System. It owns no simulation state. */
export class DirectorStudioUI {
  private readonly root: HTMLDivElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly drawer: HTMLDivElement;
  private readonly dock: HTMLDivElement;
  private readonly tabBar: HTMLDivElement;
  private readonly tabContent: HTMLDivElement;
  private readonly statusLine: HTMLDivElement;
  private readonly beatLabel: HTMLSpanElement;
  private readonly playhead: HTMLDivElement;
  private readonly cameraTrack: HTMLDivElement;
  private readonly lookTrack: HTMLDivElement;
  private readonly milestoneTrack: HTMLDivElement;
  private readonly jointSelect: HTMLSelectElement;
  private readonly behaviorSelect: HTMLSelectElement;
  private readonly presetA: HTMLSelectElement;
  private readonly presetB: HTMLSelectElement;
  private readonly crossfade: HTMLInputElement;
  private readonly articulationInputs = new Map<string, HTMLInputElement>();
  private readonly postFxInputs = new Map<keyof PostFxState, NumericControl>();
  private readonly postFxToggles = new Map<keyof PostFxState, HTMLInputElement>();
  private readonly postFxValueLabels = new Map<keyof PostFxState, HTMLSpanElement>();
  private readonly modeButtons = new Map<DirectorCameraMode, HTMLButtonElement>();
  private readonly tabButtons = new Map<TabId, HTMLButtonElement>();

  private activeTab: TabId = 'SHOTS';
  private enabled = false;
  private currentBeat = 0;
  private currentLook: PostFxState = { ...DEFAULT_POST_FX };
  private currentArticulation: Record<string, number> = {};
  private selection: DirectorSelection | null = null;
  private joints: RigJointDescriptor[] = [];
  private patchRoutes: PatchRoute[] = [];
  private behaviorMaps: BehaviorMapEntry[] = [];
  private blendActive = false;
  private machineGraph: MachineGraphSnapshot | null = null;
  private lastMachineRender = 0;
  private machineInputActive = false;
  private physicsSnapshot: PhysicsStudioSnapshot | null = null;
  private lastPhysicsRender = 0;
  private physicsInputActive = false;

  constructor(
    mount: HTMLElement,
    private readonly timeline: KeyframeTimeline,
    private readonly presets: BehaviorPresetBank,
    private readonly callbacks: DirectorUICallbacks,
  ) {
    this.root = el('div', 'director-root');
    mount.appendChild(this.root);

    this.toggleBtn = button('DIRECTOR [`]', 'director-toggle');
    this.toggleBtn.onclick = () => callbacks.onToggle();
    this.root.appendChild(this.toggleBtn);

    this.drawer = el('div', 'director-drawer');
    this.root.appendChild(this.drawer);

    const header = el('div', 'director-header');
    const headerTop = el('div', 'director-header-top');
    const title = el('div', 'director-title', 'DIRECTOR STUDIO');
    const headerActions = el('div', 'director-header-actions');
    const minimizeDrawer = button('−', 'btn director-panel-toggle');
    minimizeDrawer.title = 'Minimize Director sidebar';
    minimizeDrawer.onclick = () => {
      const minimized = this.drawer.classList.toggle('minimized');
      minimizeDrawer.textContent = minimized ? '+' : '−';
    };
    const closeDrawer = button('×', 'btn director-panel-toggle');
    closeDrawer.title = 'Close Director Studio';
    closeDrawer.onclick = () => callbacks.onToggle();
    headerActions.append(minimizeDrawer, closeDrawer);
    headerTop.append(title, headerActions);
    const subtitle = el(
      'div',
      'director-subtitle',
      'SHOTS // LOOKS // CONFIG // MAPS // PHYSICS // GRAPH',
    );
    this.statusLine = el('div', 'director-status', 'TIMELINE // IDLE');
    header.append(headerTop, subtitle, this.statusLine);

    const modeRow = el('div', 'director-mode-row');
    const modes: Array<[DirectorCameraMode, string]> = [
      ['TIMELINE', 'TIMELINE'],
      ['FREE', 'FREE FLY'],
      ['DRONE', 'DRONE PILOT'],
      ['JOINT', 'JOINT LOCK'],
    ];
    for (const [mode, label] of modes) {
      const btn = button(label, 'btn director-mode');
      btn.onclick = () => callbacks.onModeChange(mode);
      modeRow.appendChild(btn);
      this.modeButtons.set(mode, btn);
    }

    const jointRow = el('div', 'director-joint-row');
    jointRow.appendChild(el('span', '', 'ATTACH TO JOINT'));
    this.jointSelect = el('select', 'director-select');
    this.jointSelect.onchange = () =>
      callbacks.onJointSelect(this.jointSelect.value || undefined);
    jointRow.appendChild(this.jointSelect);

    this.tabBar = el('div', 'director-tabs');
    const tabs: TabId[] = ['SHOTS', 'LOOKS', 'CONFIG', 'MAPS', 'PHYSICS', 'MACHINE', 'PROJECT'];
    for (const tab of tabs) {
      const btn = button(tab, 'btn director-tab');
      btn.onclick = () => this.setTab(tab);
      this.tabBar.appendChild(btn);
      this.tabButtons.set(tab, btn);
    }
    this.tabContent = el('div', 'director-tab-content');

    this.drawer.append(header, modeRow, jointRow, this.tabBar, this.tabContent);

    this.dock = el('div', 'director-dock');
    const dockHead = el('div', 'director-dock-head');
    this.beatLabel = el('span', 'director-beat', 'BAR 001.1');
    const hint = el(
      'span',
      'director-hint',
      'CLICK = SCRUB // DIAMONDS = SELECT // [`] TOGGLE // K ADD SHOT',
    );
    const minimizeDock = button('− TIMELINE', 'btn director-panel-toggle');
    minimizeDock.title = 'Minimize Director timeline';
    minimizeDock.onclick = () => {
      const minimized = this.dock.classList.toggle('minimized');
      minimizeDock.textContent = minimized ? '+ TIMELINE' : '− TIMELINE';
    };
    dockHead.append(this.beatLabel, hint, minimizeDock);

    const ruler = el('div', 'director-ruler');
    for (let i = 0; i <= 8; i++) {
      const tick = el('span', 'director-ruler-tick', `${i * 12}`);
      tick.style.left = `${(i / 8) * 100}%`;
      ruler.appendChild(tick);
    }

    this.cameraTrack = el('div', 'director-track camera');
    this.lookTrack = el('div', 'director-track looks');
    this.milestoneTrack = el('div', 'director-track milestones');
    for (const [track, label] of [
      [this.cameraTrack, 'CAM'],
      [this.lookTrack, 'LOOK'],
      [this.milestoneTrack, 'MCH'],
    ] as const) {
      const trackLabel = el('span', 'director-track-label', label);
      track.appendChild(trackLabel);
      track.onclick = (e) => this.onTrackClick(e, track);
    }

    this.playhead = el('div', 'director-playhead');
    const tracksWrap = el('div', 'director-tracks');
    tracksWrap.append(this.cameraTrack, this.lookTrack, this.milestoneTrack, this.playhead);

    const dockActions = el('div', 'director-dock-actions');
    const addCam = button('+ CAM KEY [K]', 'btn director-action');
    addCam.onclick = () => callbacks.onCameraCapture();
    const addLook = button('+ LOOK KEY', 'btn director-action');
    addLook.onclick = () => callbacks.onLookCapture();
    const addMilestone = button('+ MILESTONE', 'btn director-action');
    addMilestone.onclick = () => this.addMilestoneAtPlayhead();
    const del = button('DELETE SELECTED', 'btn director-action danger');
    del.onclick = () => this.deleteSelected();
    dockActions.append(addCam, addLook, addMilestone, del);

    this.dock.append(dockHead, ruler, tracksWrap, dockActions);
    this.root.appendChild(this.dock);

    const behaviorRow = el('div', 'director-hidden-behavior');
    this.behaviorSelect = el('select', 'director-select');
    for (const id of BEHAVIOR_IDS) {
      const option = el('option', '', BEHAVIOR_PROFILES[id].label);
      option.value = id;
      this.behaviorSelect.appendChild(option);
    }
    this.behaviorSelect.onchange = () => callbacks.onBehaviorChange(this.behaviorSelect.value);
    behaviorRow.appendChild(this.behaviorSelect);
    this.drawer.appendChild(behaviorRow);

    this.presetA = el('select', 'director-select');
    this.presetB = el('select', 'director-select');
    this.crossfade = el('input', 'director-range');
    this.crossfade.type = 'range';
    this.crossfade.min = '0';
    this.crossfade.max = '1';
    this.crossfade.step = '0.01';
    this.crossfade.value = '0';
    this.crossfade.oninput = () => this.emitPresetBlend(this.blendActive);

    this.setJointDescriptors([]);
    this.setTab('SHOTS');
    this.setMode('TIMELINE');
    this.refreshProject();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.toggleBtn.classList.toggle('active', enabled);
    this.drawer.classList.toggle('visible', enabled);
    this.dock.classList.toggle('visible', enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  showLooks(): void {
    this.setTab('LOOKS');
  }

  setMode(mode: DirectorCameraMode): void {
    for (const [key, btn] of this.modeButtons) btn.classList.toggle('active', key === mode);
    this.statusLine.textContent = `${mode} // ${this.enabled ? 'LIVE' : 'IDLE'}`;
  }

  setJointDescriptors(joints: RigJointDescriptor[]): void {
    this.joints = joints;
    this.jointSelect.innerHTML = '';
    const none = el('option', '', 'NONE // WORLD SPACE');
    none.value = '';
    this.jointSelect.appendChild(none);
    for (const joint of joints) {
      const option = el('option', '', `${joint.label} [${joint.id}]`);
      option.value = joint.id;
      this.jointSelect.appendChild(option);
    }
  }

  setPatchRoutes(routes: PatchRoute[]): void {
    this.patchRoutes = routes;
    if (this.activeTab === 'MAPS') this.renderMapsTab();
  }

  setBehaviorMaps(maps: BehaviorMapEntry[]): void {
    this.behaviorMaps = maps;
    if (this.activeTab === 'MAPS') this.renderMapsTab();
  }

  setMachineGraph(snapshot: MachineGraphSnapshot | null): void {
    this.machineGraph = snapshot;
    const now = Date.now();
    const editing =
      this.activeTab === 'MACHINE' && this.tabContent.contains(document.activeElement);
    if (
      this.activeTab === 'MACHINE' &&
      !this.machineInputActive &&
      !editing &&
      now - this.lastMachineRender > 320
    ) {
      this.renderMachineTab();
    }
  }

  setPhysicsSnapshot(snapshot: PhysicsStudioSnapshot | null): void {
    this.physicsSnapshot = snapshot;
    const now = Date.now();
    const editing =
      this.activeTab === 'PHYSICS' && this.tabContent.contains(document.activeElement);
    if (
      this.activeTab === 'PHYSICS' &&
      !this.physicsInputActive &&
      !editing &&
      now - this.lastPhysicsRender > 320
    ) {
      this.renderPhysicsTab();
    }
  }

  setArticulationValues(state: ArticulationState | Record<string, number>): void {
    this.currentArticulation = { ...state };
    for (const [id, input] of this.articulationInputs) {
      const value = state[id];
      if (typeof value === 'number') input.value = value.toFixed(3);
    }
  }

  setBehaviorId(id: string): void {
    this.behaviorSelect.value = id;
  }

  setLiveLook(fx: PostFxState): void {
    this.currentLook = { ...fx };
    for (const [key, input] of this.postFxInputs) {
      const value = fx[key];
      if (typeof value !== 'number') continue;
      input.value = input instanceof HTMLSelectElement
        ? String(Math.round(value))
        : value.toFixed(3);
      const toggle = this.postFxToggles.get(key);
      if (toggle && !toggle.disabled) toggle.checked = Math.abs(value) > 0.0001;
      const label = this.postFxValueLabels.get(key);
      if (label) label.textContent = value.toFixed(2);
    }
  }

  setSelection(selection: DirectorSelection | null): void {
    this.selection = selection;
    this.callbacks.onSelect(selection);
    this.refreshProject();
  }

  getSelection(): DirectorSelection | null {
    return this.selection;
  }

  setBlendActive(active: boolean): void {
    this.blendActive = active;
  }

  updateFrame(info: DirectorFrameInfo): void {
    this.currentBeat = info.beat;
    const totalBeats = this.timeline.getTotalBeats();
    const pct = totalBeats > 0 ? (info.beat / totalBeats) * 100 : 0;
    this.playhead.style.left = `${Math.max(0, Math.min(100, pct))}%`;
    const beatInBar = Math.floor(info.beat % 4) + 1;
    const sub = Math.floor((info.beat % 1) * 4) + 1;
    this.beatLabel.textContent = `BAR ${String(info.bar + 1).padStart(3, '0')}.${beatInBar}.${sub}`;
    const arousal = info.ecology['ecology.arousal'] ?? 0;
    const coherence = info.ecology['ecology.resonance'] ?? 0;
    this.setMachineGraph(info.graph ?? null);
    this.setPhysicsSnapshot(info.physics ?? null);
    if (info.physics) {
      const t = info.physics.telemetry;
      this.statusLine.textContent = `${info.cameraMode} // ${info.physics.activeFocusLabel} // FREE ${t.freeMarbles ?? 0} // IMPACTS ${t.impactCount ?? 0} // JAMS ${t.jamCount ?? 0}`;
    } else if (info.graph) {
      this.statusLine.textContent = `${info.cameraMode} // ${info.graph.moduleCount} MODULES // ${info.graph.edgeCount} CONDUITS // ${info.graph.activeFocusLabel}`;
    } else {
      this.statusLine.textContent = `${info.cameraMode} // ${info.shotLabel} // AROUSAL ${arousal.toFixed(2)} // PHASE LOCK ${coherence.toFixed(2)}`;
    }
  }

  refreshProject(): void {
    this.renderPresetSelects();
    this.renderTimelineMarkers();
    this.renderActiveTab();
  }

  showMessage(message: string): void {
    this.statusLine.textContent = message;
  }

  // ---------------------------------------------------------------------------
  // Tabs and editors.
  // ---------------------------------------------------------------------------

  private setTab(tab: TabId): void {
    this.activeTab = tab;
    for (const [key, btn] of this.tabButtons) btn.classList.toggle('active', key === tab);
    this.renderActiveTab();
  }

  private renderActiveTab(): void {
    this.tabContent.innerHTML = '';
    this.articulationInputs.clear();
    this.postFxInputs.clear();
    this.postFxToggles.clear();
    this.postFxValueLabels.clear();
    switch (this.activeTab) {
      case 'SHOTS':
        this.renderShotsTab();
        break;
      case 'LOOKS':
        this.renderLooksTab();
        break;
      case 'CONFIG':
        this.renderConfigTab();
        break;
      case 'MAPS':
        this.renderMapsTab();
        break;
      case 'PHYSICS':
        this.renderPhysicsTab();
        break;
      case 'MACHINE':
        this.renderMachineTab();
        break;
      case 'PROJECT':
        this.renderProjectTab();
        break;
    }
  }

  private renderShotsTab(): void {
    const list = el('div', 'director-list');
    for (const key of this.timeline.getCameraKeys()) {
      const row = button(
        `${(key.beat / 4 + 1).toFixed(2).padStart(6, '0')} // ${key.label}`,
        'director-list-row',
      );
      row.classList.toggle('selected', this.selection?.kind === 'camera' && this.selection.id === key.id);
      row.onclick = () => {
        this.selection = { kind: 'camera', id: key.id };
        this.callbacks.onSelect(this.selection);
        this.callbacks.onScrub(key.beat);
        this.renderTimelineMarkers();
        this.renderActiveTab();
      };
      list.appendChild(row);
    }
    this.tabContent.appendChild(list);

    const editor = el('div', 'director-editor');
    editor.appendChild(el('div', 'director-section-title', 'CAMERA KEYFRAME EDITOR'));
    const key = this.getSelectedCameraKey();
    const beatInput = number(key?.beat ?? this.currentBeat, 0.25);
    const labelInput = el('input', 'director-input');
    labelInput.type = 'text';
    labelInput.value = key?.label ?? 'NEW SHOT';
    editor.appendChild(this.field('BEAT', beatInput));
    editor.appendChild(this.field('LABEL', labelInput));

    const pos = key?.position ?? [0, 1.5, 8];
    const target = key?.target ?? [0, 0, 0];
    const px = number(pos[0]);
    const py = number(pos[1]);
    const pz = number(pos[2]);
    const tx = number(target[0]);
    const ty = number(target[1]);
    const tz = number(target[2]);
    const vecRow = el('div', 'director-vector-row');
    vecRow.append(
      this.field('POS X', px),
      this.field('POS Y', py),
      this.field('POS Z', pz),
      this.field('TGT X', tx),
      this.field('TGT Y', ty),
      this.field('TGT Z', tz),
    );
    editor.appendChild(vecRow);

    const fovInput = number(key?.fov ?? 42, 1);
    const rollInput = number(key?.roll ?? 0, 0.01);
    const interp = el('select', 'director-select');
    for (const mode of INTERPOLATIONS) {
      const option = el('option', '', mode);
      option.value = mode;
      interp.appendChild(option);
    }
    interp.value = key?.interpolation ?? 'SMOOTH_SPLINE';
    const joint = el('select', 'director-select');
    const none = el('option', '', 'WORLD SPACE');
    none.value = '';
    joint.appendChild(none);
    for (const descriptor of this.joints) {
      const option = el('option', '', descriptor.label);
      option.value = descriptor.id;
      joint.appendChild(option);
    }
    joint.value = key?.jointId ?? '';

    const opticsRow = el('div', 'director-vector-row');
    opticsRow.append(
      this.field('FOV', fovInput),
      this.field('ROLL', rollInput),
      this.field('INTERP', interp),
      this.field('JOINT', joint),
    );
    editor.appendChild(opticsRow);

    const read = (): Omit<CameraKeyframe, 'id'> => ({
      beat: num(beatInput),
      label: labelInput.value || 'SHOT',
      position: [num(px), num(py), num(pz)],
      target: [num(tx), num(ty), num(tz)],
      fov: num(fovInput, 42),
      roll: num(rollInput),
      interpolation: interp.value as CameraInterpolation,
      jointId: joint.value || undefined,
    });

    const actions = el('div', 'director-editor-actions');
    const capture = button('CAPTURE CURRENT CAMERA', 'btn director-action');
    capture.onclick = () => this.callbacks.onCameraCapture(key?.id);
    const add = button('ADD AT BEAT', 'btn director-action');
    add.onclick = () => this.callbacks.onCameraAdd(read());
    const update = button('UPDATE SELECTED', 'btn director-action');
    update.disabled = !key;
    update.onclick = () => {
      if (key) this.callbacks.onCameraUpdate(key.id, read());
    };
    actions.append(capture, add, update);
    editor.appendChild(actions);
    this.tabContent.appendChild(editor);
  }

  private renderLooksTab(): void {
    const list = el('div', 'director-list');
    for (const key of this.timeline.getLookKeys()) {
      const row = button(
        `${(key.beat / 4 + 1).toFixed(2).padStart(6, '0')} // ${key.label}`,
        'director-list-row',
      );
      row.classList.toggle('selected', this.selection?.kind === 'look' && this.selection.id === key.id);
      row.onclick = () => {
        this.selection = { kind: 'look', id: key.id };
        this.callbacks.onSelect(this.selection);
        this.callbacks.onScrub(key.beat);
        this.callbacks.onLookLiveChange(key.fx);
        this.renderTimelineMarkers();
        this.renderActiveTab();
      };
      list.appendChild(row);
    }
    this.tabContent.appendChild(list);

    const editor = el('div', 'director-editor director-look-editor');
    editor.appendChild(el('div', 'director-section-title', 'VISUAL LAB // INDEPENDENT FX + LIGHTING'));
    editor.appendChild(
      el(
        'div',
        'director-help',
        'Start from a render style, then bypass any trick independently. Palette and light rig drive both the TSL image treatment and the physical installation. These are the live controls you see changing during the score.',
      ),
    );

    const key = this.getSelectedLookKey();
    const values = key?.fx ?? this.currentLook;

    const readFx = (): PostFxState => {
      const fx = { ...DEFAULT_POST_FX };
      for (const postKey of POST_FX_KEYS) {
        fx[postKey] = num(this.postFxInputs.get(postKey), DEFAULT_POST_FX[postKey]);
      }
      return fx;
    };
    const emitLive = (): void => this.callbacks.onLookLiveChange(readFx());
    const applyFx = (fx: PostFxState): void => {
      for (const postKey of POST_FX_KEYS) {
        const control = this.postFxInputs.get(postKey);
        if (control) control.value = String(fx[postKey]);
        const toggle = this.postFxToggles.get(postKey);
        if (toggle) toggle.checked = Math.abs(fx[postKey]) > 0.0001;
        const valueLabel = this.postFxValueLabels.get(postKey);
        if (valueLabel) valueLabel.textContent = fx[postKey].toFixed(2);
      }
      this.currentLook = { ...fx };
      this.callbacks.onLookLiveChange(fx);
    };

    const presetBlock = el('div', 'director-look-presets');
    for (const preset of LOOK_PRESETS) {
      const presetButton = button(preset.label, 'btn director-look-preset');
      presetButton.onclick = () => applyFx({ ...preset.fx });
      presetBlock.appendChild(presetButton);
    }
    editor.appendChild(presetBlock);

    const selectors = el('div', 'director-look-selectors');
    const paletteSelect = el('select', 'director-select');
    for (const [value, label] of PALETTE_OPTIONS) {
      const option = el('option', '', label);
      option.value = value;
      paletteSelect.appendChild(option);
    }
    paletteSelect.value = String(Math.max(0, Math.min(4, Math.round(values.palette))));
    paletteSelect.onchange = emitLive;
    this.postFxInputs.set('palette', paletteSelect);

    const lightRigSelect = el('select', 'director-select');
    for (const [value, label] of LIGHT_RIG_OPTIONS) {
      const option = el('option', '', label);
      option.value = value;
      lightRigSelect.appendChild(option);
    }
    lightRigSelect.value = String(Math.max(0, Math.min(3, Math.round(values.lightRig))));
    lightRigSelect.onchange = emitLive;
    this.postFxInputs.set('lightRig', lightRigSelect);
    selectors.append(
      this.field('PALETTE', paletteSelect),
      this.field('PHYSICAL LIGHT RIG', lightRigSelect),
    );
    editor.appendChild(selectors);

    const controls = el('div', 'director-fx-controls');
    for (const spec of FX_CONTROL_SPECS) {
      const row = el('div', 'director-fx-row');
      const toggle = el('input', 'director-fx-toggle');
      toggle.type = 'checkbox';
      toggle.checked = !spec.toggle || Math.abs(values[spec.key]) > 0.0001;
      toggle.disabled = !spec.toggle;
      toggle.title = spec.toggle ? `Toggle ${spec.label}` : `${spec.label} is continuously variable`;

      const label = el('span', 'director-fx-label', spec.label);
      const input = el('input', 'director-range');
      input.type = 'range';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(values[spec.key]);
      input.dataset.lastValue = String(
        Math.abs(values[spec.key]) > 0.0001
          ? values[spec.key]
          : Math.max(DEFAULT_POST_FX[spec.key], spec.step),
      );
      const value = el('span', 'director-fx-value', Number(input.value).toFixed(2));
      input.oninput = () => {
        const current = Number(input.value);
        if (Math.abs(current) > 0.0001) input.dataset.lastValue = input.value;
        if (spec.toggle) toggle.checked = Math.abs(current) > 0.0001;
        value.textContent = current.toFixed(2);
        emitLive();
      };
      toggle.onchange = () => {
        if (!toggle.checked) {
          if (Math.abs(Number(input.value)) > 0.0001) input.dataset.lastValue = input.value;
          input.value = '0';
        } else {
          input.value = input.dataset.lastValue ?? String(Math.max(DEFAULT_POST_FX[spec.key], spec.step));
        }
        value.textContent = Number(input.value).toFixed(2);
        emitLive();
      };
      this.postFxInputs.set(spec.key, input);
      this.postFxToggles.set(spec.key, toggle);
      this.postFxValueLabels.set(spec.key, value);
      row.append(toggle, label, input, value);
      controls.appendChild(row);
    }
    editor.appendChild(controls);

    const keyBlock = el('div', 'director-look-keyframe');
    keyBlock.appendChild(el('div', 'director-section-title', 'LOOK KEYFRAME'));
    const beatInput = number(key?.beat ?? this.currentBeat, 0.25);
    const labelInput = el('input', 'director-input');
    labelInput.type = 'text';
    labelInput.value = key?.label ?? 'NEW LOOK';
    const keyFields = el('div', 'director-look-selectors');
    keyFields.append(this.field('BEAT', beatInput), this.field('LABEL', labelInput));
    keyBlock.appendChild(keyFields);

    const read = (): Omit<LookKeyframe, 'id'> => ({
      beat: num(beatInput),
      label: labelInput.value || 'LOOK',
      fx: readFx(),
    });
    const actions = el('div', 'director-editor-actions');
    const capture = button('CAPTURE LIVE LOOK', 'btn director-action');
    capture.onclick = () => this.callbacks.onLookCapture(key?.id);
    const add = button('ADD AT BEAT', 'btn director-action');
    add.onclick = () => this.callbacks.onLookAdd(read());
    const update = button('UPDATE SELECTED', 'btn director-action');
    update.disabled = !key;
    update.onclick = () => {
      if (key) this.callbacks.onLookUpdate(key.id, read());
    };
    const release = button('RELEASE LIVE LOOK', 'btn director-action');
    release.onclick = () => this.callbacks.onLookLiveChange(null);
    actions.append(capture, add, update, release);
    keyBlock.appendChild(actions);
    editor.appendChild(keyBlock);
    this.tabContent.appendChild(editor);
  }

  private renderConfigTab(): void {
    const behaviorBlock = el('div', 'director-editor');
    behaviorBlock.appendChild(el('div', 'director-section-title', 'BEHAVIOR GENERATOR'));
    const behaviorSelect = el('select', 'director-select');
    for (const id of BEHAVIOR_IDS) {
      const option = el('option', '', BEHAVIOR_PROFILES[id].label);
      option.value = id;
      behaviorSelect.appendChild(option);
    }
    behaviorSelect.value = this.behaviorSelect.value || BEHAVIOR_IDS[0];
    behaviorSelect.onchange = () => {
      this.behaviorSelect.value = behaviorSelect.value;
      this.callbacks.onBehaviorChange(behaviorSelect.value);
    };
    behaviorBlock.appendChild(this.field('ACTIVE BEHAVIOR', behaviorSelect));
    const description = el(
      'div',
      'director-help',
      BEHAVIOR_PROFILES[(behaviorSelect.value || BEHAVIOR_IDS[0]) as BehaviorId].description,
    );
    behaviorSelect.onchange = () => {
      this.behaviorSelect.value = behaviorSelect.value;
      description.textContent =
        BEHAVIOR_PROFILES[behaviorSelect.value as BehaviorId]?.description ?? '';
      this.callbacks.onBehaviorChange(behaviorSelect.value);
    };
    behaviorBlock.appendChild(description);
    this.tabContent.appendChild(behaviorBlock);

    const articulationBlock = el('div', 'director-editor');
    articulationBlock.appendChild(el('div', 'director-section-title', '12 MECHANICAL DOFs'));
    const grid = el('div', 'director-slider-grid');
    for (const def of ARTICULATION_DEFINITIONS) {
      const current = this.currentArticulation[def.id] ?? def.defaultValue;
      const input = number(current, def.step);
      input.min = String(def.min);
      input.max = String(def.max);
      input.title = def.description;
      input.oninput = () => {
        const value = num(input, def.defaultValue);
        this.currentArticulation[def.id] = value;
        this.callbacks.onArticulationChange(def.id, value);
      };
      this.articulationInputs.set(def.id, input);
      grid.appendChild(this.field(def.label, input));
    }
    articulationBlock.appendChild(grid);
    this.tabContent.appendChild(articulationBlock);

    const abBlock = el('div', 'director-editor');
    abBlock.appendChild(el('div', 'director-section-title', 'LIVE PRESET A/B CROSSFADER'));
    const a = el('select', 'director-select');
    const b = el('select', 'director-select');
    for (const preset of this.presets.list()) {
      for (const select of [a, b]) {
        const option = el('option', '', preset.name);
        option.value = preset.id;
        select.appendChild(option);
      }
    }
    a.value = this.presetA.value || this.presets.list()[0]?.id || 'M1';
    b.value = this.presetB.value || this.presets.list()[1]?.id || 'M2';
    const fade = el('input', 'director-range');
    fade.type = 'range';
    fade.min = '0';
    fade.max = '1';
    fade.step = '0.01';
    fade.value = this.crossfade.value;
    const emit = (active: boolean): void => {
      this.blendActive = active;
      this.presetA.value = a.value;
      this.presetB.value = b.value;
      this.crossfade.value = fade.value;
      this.callbacks.onPresetBlend(a.value, b.value, num(fade), active);
    };
    fade.oninput = () => emit(this.blendActive);
    const apply = button('APPLY A/B OVERRIDE', 'btn director-action');
    apply.onclick = () => emit(true);
    const release = button('RELEASE ALL MANUAL OVERRIDES', 'btn director-action');
    release.onclick = () => {
      this.blendActive = false;
      emit(false);
      this.callbacks.onReleaseManualOverrides();
    };
    const abRow = el('div', 'director-vector-row');
    abRow.append(this.field('PRESET A', a), this.field('PRESET B', b), this.field('CROSSFADE', fade));
    abBlock.append(abRow, apply, release);
    this.tabContent.appendChild(abBlock);

    const milestoneBlock = el('div', 'director-editor');
    milestoneBlock.appendChild(el('div', 'director-section-title', 'MACHINE PRESET MILESTONE'));
    const milestone = this.getSelectedMilestone();
    const beatInput = number(milestone?.beat ?? this.currentBeat, 0.25);
    const blendInput = number(milestone?.blendBeats ?? 8, 0.25);
    const presetSelect = el('select', 'director-select');
    for (const preset of this.presets.list()) {
      const option = el('option', '', preset.name);
      option.value = preset.id;
      presetSelect.appendChild(option);
    }
    presetSelect.value = milestone?.presetId ?? this.presets.list()[0]?.id ?? 'M1';
    const easeSelect = el('select', 'director-select');
    for (const ease of EASES) {
      const option = el('option', '', ease);
      option.value = ease;
      easeSelect.appendChild(option);
    }
    easeSelect.value = milestone?.ease ?? 'SMOOTHER';
    const labelInput = el('input', 'director-input');
    labelInput.type = 'text';
    labelInput.value = milestone?.label ?? 'NEW MILESTONE';
    const milestoneRow = el('div', 'director-vector-row');
    milestoneRow.append(
      this.field('BEAT', beatInput),
      this.field('PRESET', presetSelect),
      this.field('BLEND BEATS', blendInput),
      this.field('EASE', easeSelect),
      this.field('LABEL', labelInput),
    );
    milestoneBlock.appendChild(milestoneRow);
    const readMilestone = (): Omit<MachineMilestone, 'id'> => ({
      beat: num(beatInput),
      presetId: presetSelect.value,
      blendBeats: Math.max(0, num(blendInput, 8)),
      ease: easeSelect.value as MilestoneEase,
      label: labelInput.value || 'MILESTONE',
    });
    const milestoneActions = el('div', 'director-editor-actions');
    const addM = button('ADD MILESTONE', 'btn director-action');
    addM.onclick = () => this.callbacks.onMilestoneAdd(readMilestone());
    const updateM = button('UPDATE SELECTED', 'btn director-action');
    updateM.disabled = !milestone;
    updateM.onclick = () => {
      if (milestone) this.callbacks.onMilestoneUpdate(milestone.id, readMilestone());
    };
    milestoneActions.append(addM, updateM);
    milestoneBlock.appendChild(milestoneActions);
    this.tabContent.appendChild(milestoneBlock);
  }

  private renderMapsTab(): void {
    const behaviorBlock = el('div', 'director-editor');
    behaviorBlock.appendChild(el('div', 'director-section-title', 'SCORE → ORGAN BEHAVIOR MAP'));
    const list = el('div', 'director-map-list');
    const organs = [
      'escapement',
      'barrel',
      'strikers',
      'combs',
      'bellows',
      'iris',
      'armor',
      'flux',
    ];
    for (const map of this.behaviorMaps) {
      const row = el('div', 'director-map-row');
      row.appendChild(el('span', 'director-map-source', map.source));
      const target = el('select', 'director-select');
      for (const organ of organs) {
        const option = el('option', '', organ.toUpperCase());
        option.value = organ;
        target.appendChild(option);
      }
      target.value = map.target;
      target.onchange = () => this.callbacks.onBehaviorMapChange(map.id, { target: target.value });
      const gain = number(map.gain, 0.01);
      gain.min = '0';
      gain.max = '2';
      gain.oninput = () => this.callbacks.onBehaviorMapChange(map.id, { gain: num(gain, 1) });
      const enabled = el('input');
      enabled.type = 'checkbox';
      enabled.checked = map.enabled;
      enabled.onchange = () =>
        this.callbacks.onBehaviorMapChange(map.id, { enabled: enabled.checked });
      row.append(target, gain, enabled);
      list.appendChild(row);
    }
    behaviorBlock.appendChild(list);
    this.tabContent.appendChild(behaviorBlock);

    const patchBlock = el('div', 'director-editor');
    patchBlock.appendChild(el('div', 'director-section-title', 'LIVE INPUT PATCHBAY'));
    const patchList = el('div', 'director-map-list');
    for (const route of this.patchRoutes) {
      const row = el('div', 'director-map-row');
      row.appendChild(el('span', 'director-map-source', `${route.source} → ${route.target}`));
      const amount = number(route.amount, 0.01);
      amount.min = '-2';
      amount.max = '2';
      amount.oninput = () =>
        this.callbacks.onPatchRouteChange(route.id, { amount: num(amount, route.amount) });
      const enabled = el('input');
      enabled.type = 'checkbox';
      enabled.checked = route.enabled;
      enabled.onchange = () =>
        this.callbacks.onPatchRouteChange(route.id, { enabled: enabled.checked });
      row.append(amount, enabled);
      patchList.appendChild(row);
    }
    patchBlock.appendChild(patchList);
    this.tabContent.appendChild(patchBlock);
  }

  private renderMachineTab(): void {
    this.tabContent.innerHTML = '';
    this.articulationInputs.clear();
    this.postFxInputs.clear();
    this.lastMachineRender = Date.now();
    const snapshot = this.machineGraph;
    const header = el('div', 'director-editor');
    header.appendChild(el('div', 'director-section-title', 'MACHINE ECOLOGY // LIVE GRAPH'));
    if (!snapshot) {
      header.appendChild(
        el(
          'div',
          'director-help',
          'This work does not expose a machine graph. Load MODAL FLOW // RESONANT RELAY or ASTRARIUM // MODULAR ENGINE to author modules, ports, conduits, mechanical transmissions, bindings and focus scales.',
        ),
      );
      this.tabContent.appendChild(header);
      return;
    }

    const summary = el('div', 'director-graph-summary');
    summary.textContent = `${snapshot.moduleCount} MODULES // ${snapshot.edgeCount} CONDUITS // ${snapshot.sourceCount} SOURCES // ${snapshot.bindings.length} BINDINGS // FOCUS ${snapshot.activeFocusLabel}`;
    header.appendChild(summary);

    const canvas = el('canvas', 'director-graph-canvas');
    canvas.width = 640;
    canvas.height = 220;
    header.appendChild(canvas);
    this.tabContent.appendChild(header);
    this.drawGraphMap(canvas, snapshot);

    const focusBlock = el('div', 'director-editor');
    focusBlock.appendChild(el('div', 'director-section-title', 'MULTI-SCALE FOCUS TARGET'));
    const focusSelect = el('select', 'director-select');
    for (const scale of FOCUS_SCALES) {
      const group = el('optgroup');
      group.label = `${scale} SCALE`;
      for (const focus of snapshot.focusTargets.filter((f) => f.scale === scale)) {
        const option = el('option', '', focus.label);
        option.value = focus.id;
        group.appendChild(option);
      }
      focusSelect.appendChild(group);
    }
    focusSelect.value = snapshot.activeFocusId;
    focusSelect.onchange = () => this.callbacks.onFocusTarget(focusSelect.value);
    focusBlock.appendChild(focusSelect);
    const scaleRow = el('div', 'director-editor-actions director-graph-scale-row');
    for (const scale of FOCUS_SCALES) {
      const target = snapshot.focusTargets.find((f) => f.scale === scale);
      if (!target) continue;
      const btn = button(scale, 'btn director-action');
      btn.onclick = () => this.callbacks.onFocusTarget(target.id);
      scaleRow.appendChild(btn);
    }
    focusBlock.appendChild(scaleRow);
    this.tabContent.appendChild(focusBlock);

    const macroBlock = el('div', 'director-editor');
    macroBlock.appendChild(el('div', 'director-section-title', 'GRAPH MACROS // LIVE ECOLOGY CONTROLS'));
    snapshot.macros.forEach((macro: GraphMacroSnapshot) => {
      const row = el('div', 'director-graph-macro');
      const value = el('span', 'director-graph-value', macro.value.toFixed(2));
      const range = el('input', 'director-range');
      range.type = 'range';
      range.min = String(macro.min);
      range.max = String(macro.max);
      range.step = '0.01';
      range.value = String(macro.value);
      range.onpointerdown = () => {
        this.machineInputActive = true;
      };
      range.onpointerup = () => {
        this.machineInputActive = false;
      };
      range.oninput = () => {
        const next = Number(range.value);
        value.textContent = next.toFixed(2);
        this.callbacks.onGraphMacro(macro.id, next);
      };
      row.append(el('span', '', macro.label), value, range);
      macroBlock.appendChild(row);
    });
    this.tabContent.appendChild(macroBlock);

    const growthBlock = el('div', 'director-editor');
    growthBlock.appendChild(el('div', 'director-section-title', 'LIVE INSTALLATION GROWTH'));
    growthBlock.appendChild(
      el(
        'div',
        'director-help',
        'Modules, ports, gear trains, energy sources, many-to-many conduits and focus descriptors are regenerated deterministically. Growth preserves the 96-bar score and the V5 reference core.',
      ),
    );
    const growRow = el('div', 'director-editor-actions');
    for (const count of [8, 16, 32]) {
      const btn = button(`+${count} MODULES`, 'btn director-action');
      btn.onclick = () => this.callbacks.onGrowMachine(count);
      growRow.appendChild(btn);
    }
    const double = button('DOUBLE INSTALLATION', 'btn director-action');
    double.onclick = () => this.callbacks.onGrowMachine(snapshot.moduleCount);
    growRow.appendChild(double);
    growthBlock.appendChild(growRow);
    const rebuildRow = el('div', 'director-editor-actions');
    for (const total of [48, 96, 144, 192, 256]) {
      const btn = button(`REBUILD ${total}`, 'btn director-action');
      btn.onclick = () => this.callbacks.onRebuildMachine(total);
      rebuildRow.appendChild(btn);
    }
    growthBlock.appendChild(rebuildRow);
    const configRow = el('div', 'director-editor-actions');
    const exportGraph = button('EXPORT MACHINE GRAPH .JSON', 'btn director-action');
    exportGraph.onclick = () => this.callbacks.onExportGraphConfig();
    const importGraph = button('IMPORT MACHINE GRAPH .JSON', 'btn director-action');
    const graphInput = this.fileInput((text) => this.callbacks.onImportGraphConfig(text));
    importGraph.onclick = () => graphInput.click();
    configRow.append(exportGraph, importGraph, graphInput);
    growthBlock.appendChild(configRow);
    this.tabContent.appendChild(growthBlock);

    const bindingBlock = el('div', 'director-editor');
    bindingBlock.appendChild(
      el('div', 'director-section-title', 'MANY-TO-MANY SCORE BINDINGS'),
    );
    const bindingList = el('div', 'director-graph-list');
    for (const binding of snapshot.bindings) {
      const row = el('div', 'director-graph-binding-row');
      row.appendChild(
        el('span', 'director-graph-source', `${binding.source} → ${binding.target} [${binding.mode}]`),
      );
      const mode = el('select', 'director-select');
      for (const modeId of GRAPH_BINDING_MODES) {
        const option = el('option', '', modeId);
        option.value = modeId;
        mode.appendChild(option);
      }
      mode.value = binding.mode;
      mode.onchange = () => this.callbacks.onGraphBinding(binding.id, { mode: mode.value });
      const weight = number(binding.weight, 0.01);
      weight.min = '0';
      weight.max = '2';
      weight.onchange = () =>
        this.callbacks.onGraphBinding(binding.id, { weight: num(weight, binding.weight) });
      const enabled = el('input');
      enabled.type = 'checkbox';
      enabled.checked = binding.enabled;
      enabled.onchange = () =>
        this.callbacks.onGraphBinding(binding.id, { enabled: enabled.checked });
      row.append(mode, weight, enabled);
      bindingList.appendChild(row);
    }
    bindingBlock.appendChild(bindingList);
    this.tabContent.appendChild(bindingBlock);

    const telemetryBlock = el('div', 'director-editor');
    telemetryBlock.appendChild(el('div', 'director-section-title', 'ENERGY / FLOW TELEMETRY'));
    const columns = el('div', 'director-graph-columns');
    const moduleColumn = el('div', 'director-graph-column');
    moduleColumn.appendChild(el('div', 'director-graph-column-title', 'TOP MODULES'));
    for (const module of snapshot.modules.slice(0, 7)) {
      this.appendMeter(moduleColumn, `${module.label} [${module.archetype}]`, module.energy, 1.5);
    }
    const edgeColumn = el('div', 'director-graph-column');
    edgeColumn.appendChild(el('div', 'director-graph-column-title', 'ACTIVE CONDUITS'));
    for (const edge of snapshot.edges.slice(0, 7)) {
      this.appendMeter(edgeColumn, `${edge.from}→${edge.to} [${edge.kind}]`, edge.flow, 1.2);
    }
    const sourceColumn = el('div', 'director-graph-column');
    sourceColumn.appendChild(el('div', 'director-graph-column-title', 'PRIME MOVERS'));
    for (const source of snapshot.sources.slice(0, 7)) {
      this.appendMeter(sourceColumn, `${source.label} [${source.kind}]`, source.energy, 1.5);
    }
    columns.append(moduleColumn, edgeColumn, sourceColumn);
    telemetryBlock.appendChild(columns);
    this.tabContent.appendChild(telemetryBlock);
  }

  private appendMeter(parent: HTMLElement, label: string, value: number, max: number): void {
    const row = el('div', 'director-graph-meter-row');
    row.appendChild(el('span', 'director-graph-meter-label', label));
    const track = el('span', 'director-graph-meter');
    const fill = el('span', 'director-graph-meter-fill');
    const pct = Math.max(0, Math.min(100, (value / Math.max(0.001, max)) * 100));
    fill.style.width = `${pct.toFixed(1)}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'director-graph-value', value.toFixed(2)));
    parent.appendChild(row);
  }

  private drawGraphMap(canvas: HTMLCanvasElement, snapshot: MachineGraphSnapshot): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 8) * w, 0);
      ctx.lineTo((i / 8) * w, h);
      ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / 4) * h);
      ctx.lineTo(w, (i / 4) * h);
      ctx.stroke();
    }

    const modules = snapshot.modules.slice(0, Math.min(96, snapshot.modules.length));
    const positions = new Map<string, { x: number; y: number }>();
    modules.forEach((module, index) => {
      const angle = (index / Math.max(1, modules.length)) * Math.PI * 6 + (index % 7) * 0.19;
      const radius = 18 + ((index % 13) / 13) * 94;
      positions.set(module.id, {
        x: w * 0.5 + Math.cos(angle) * radius * 2.35,
        y: h * 0.5 + Math.sin(angle) * radius * 0.78,
      });
    });

    for (const edge of snapshot.edges.slice(0, 260)) {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to || !edge.enabled) continue;
      const flow = Math.max(0, Math.min(1, edge.flow));
      ctx.strokeStyle = `rgba(125, 210, 255, ${0.05 + flow * 0.48})`;
      ctx.lineWidth = 0.4 + flow * 2.1;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    const active = snapshot.focusTargets.find((f) => f.id === snapshot.activeFocusId);
    for (const module of modules) {
      const p = positions.get(module.id);
      if (!p) continue;
      const isFocus = active?.moduleId === module.id;
      const energy = Math.max(0, Math.min(1, module.energy));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + energy * 3.8 + (isFocus ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = isFocus ? '#ffe4a3' : `rgba(140, 220, 255, ${0.35 + energy * 0.65})`;
      ctx.fill();
      if (isFocus) {
        ctx.strokeStyle = '#ffe4a3';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(190, 214, 235, 0.72)';
    ctx.font = '10px monospace';
    ctx.fillText(`${snapshot.moduleCount} ADDRESSABLE MODULES // ${snapshot.edgeCount} TYPED CONDUITS`, 10, 16);
    ctx.fillStyle = 'rgba(255, 220, 150, 0.82)';
    ctx.fillText(`FOCUS: ${snapshot.activeFocusLabel}`, 10, h - 10);
  }

  private renderPhysicsTab(): void {
    this.tabContent.innerHTML = '';
    this.articulationInputs.clear();
    this.postFxInputs.clear();
    this.lastPhysicsRender = Date.now();
    const snapshot = this.physicsSnapshot;
    const header = el('div', 'director-editor');
    header.appendChild(el('div', 'director-section-title', 'PHYSICS MACHINE // PROGRAMMING WHEEL'));
    if (!snapshot) {
      header.appendChild(
        el(
          'div',
          'director-help',
          'This work does not expose a custom physics machine. Load MODAL FLOW // RESONANT RELAY or PENDULUM // MARBLE ENGINE to edit flow, gravity, gate timing, routing pins and the marble/mechanism registry.',
        ),
      );
      this.tabContent.appendChild(header);
      return;
    }

    const summary = el('div', 'director-graph-summary');
    summary.textContent = `${snapshot.name} // ${snapshot.parts.length} PARTS // ${snapshot.pins.length} PINS // ${snapshot.laneCount} LANES × ${snapshot.stepCount} STEPS // FOCUS ${snapshot.activeFocusLabel}`;
    header.appendChild(summary);

    const canvas = el('canvas', 'director-physics-canvas');
    canvas.width = 760;
    canvas.height = 210;
    header.appendChild(canvas);
    this.tabContent.appendChild(header);
    this.drawProgramGrid(canvas, snapshot);

    const focusBlock = el('div', 'director-editor');
    focusBlock.appendChild(el('div', 'director-section-title', 'PHYSICS FOCUS'));
    const focusSelect = el('select', 'director-select');
    for (const focus of snapshot.focusTargets) {
      const option = el('option', '', `${focus.scale} // ${focus.label}`);
      option.value = focus.id;
      focusSelect.appendChild(option);
    }
    focusSelect.value = snapshot.activeFocusId;
    focusSelect.onchange = () => this.callbacks.onPhysicsFocus(focusSelect.value);
    focusBlock.appendChild(focusSelect);
    this.tabContent.appendChild(focusBlock);

    const macroBlock = el('div', 'director-editor');
    macroBlock.appendChild(el('div', 'director-section-title', 'CUSTOM SOLVER MACROS'));
    snapshot.macros.forEach((macro: PhysicsMacroSnapshot) => {
      const row = el('div', 'director-graph-macro');
      const value = el('span', 'director-graph-value', macro.value.toFixed(2));
      const range = el('input', 'director-range');
      range.type = 'range';
      range.min = String(macro.min);
      range.max = String(macro.max);
      range.step = '0.01';
      range.value = String(macro.value);
      range.onpointerdown = () => {
        this.physicsInputActive = true;
      };
      range.onpointerup = () => {
        this.physicsInputActive = false;
      };
      range.onchange = () => {
        this.physicsInputActive = false;
      };
      range.oninput = () => {
        const next = Number(range.value);
        value.textContent = next.toFixed(2);
        this.callbacks.onPhysicsMacro(macro.id, next);
      };
      row.append(el('span', '', macro.label), value, range);
      macroBlock.appendChild(row);
    });
    this.tabContent.appendChild(macroBlock);

    const actions = el('div', 'director-editor');
    actions.appendChild(el('div', 'director-section-title', 'PHYSICS ACTIONS & PROGRAM I/O'));
    const actionRow = el('div', 'director-editor-actions');
    const reset = button('RESET SOLVER', 'btn director-action danger');
    reset.onclick = () => this.callbacks.onPhysicsReset();
    actionRow.appendChild(reset);
    for (const count of [8, 16, 32]) {
      const drop = button(`DROP ${count}`, 'btn director-action');
      drop.onclick = () => this.callbacks.onPhysicsDrop(count);
      actionRow.appendChild(drop);
    }
    actions.appendChild(actionRow);
    const ioRow = el('div', 'director-editor-actions');
    const exportProgram = button('EXPORT PROGRAM .JSON', 'btn director-action');
    exportProgram.onclick = () => this.callbacks.onExportPhysicsProgram();
    const importProgram = button('IMPORT PROGRAM .JSON', 'btn director-action');
    const programInput = this.fileInput((text) => this.callbacks.onImportPhysicsProgram(text));
    importProgram.onclick = () => programInput.click();
    ioRow.append(exportProgram, importProgram, programInput);
    actions.appendChild(ioRow);
    actions.appendChild(
      el(
        'div',
        'director-help',
        'Click the grid to toggle a programming-wheel pin; right-click clears a pin. Pins are sampled from the rotating wheel angle, and every released marble is simulated by the custom fixed-step solver.',
      ),
    );
    this.tabContent.appendChild(actions);

    const partsBlock = el('div', 'director-editor');
    partsBlock.appendChild(el('div', 'director-section-title', 'PHYSICAL PART REGISTRY'));
    const partList = el('div', 'director-graph-list director-physics-parts');
    for (const part of snapshot.parts) {
      this.appendMeter(partList, `${part.label} // ${part.state}`, part.energy, 1.2);
    }
    partsBlock.appendChild(partList);
    this.tabContent.appendChild(partsBlock);

    const telemetryBlock = el('div', 'director-editor');
    telemetryBlock.appendChild(el('div', 'director-section-title', 'LIVE SOLVER TELEMETRY'));
    const columns = el('div', 'director-graph-columns');
    const columnA = el('div', 'director-graph-column');
    const columnB = el('div', 'director-graph-column');
    const columnC = el('div', 'director-graph-column');
    columnA.appendChild(el('div', 'director-graph-column-title', 'MARBLE STATES'));
    columnB.appendChild(el('div', 'director-graph-column-title', 'CAUSAL EVENTS'));
    columnC.appendChild(el('div', 'director-graph-column-title', 'GOVERNOR & ERROR'));
    const metersA: Array<[string, number, string]> = [
      ['freeMarbles', 80, 'FREE'],
      ['queuedMarbles', 170, 'QUEUED'],
      ['liftingMarbles', 60, 'LIFTING'],
      ['activeGates', 12, 'OPEN GATES'],
    ];
    const metersB: Array<[string, number, string]> = [
      ['impactCount', 500, 'IMPACTS'],
      ['releaseCount', 250, 'RELEASES'],
      ['recycleCount', 250, 'RECYCLES'],
      ['instrumentEnergy', 10, 'INSTRUMENT ENERGY'],
    ];
    const metersC: Array<[string, number, string]> = [
      ['jamCount', 20, 'JAMS'],
      ['lostCount', 10, 'LOST'],
      ['releaseJitterMs', 10, 'JITTER ms'],
      ['governorEnergy', 3, 'GOVERNOR ENERGY'],
    ];
    for (const [key, max, label] of metersA) {
      this.appendMeter(columnA, label, snapshot.telemetry[key] ?? 0, max);
    }
    for (const [key, max, label] of metersB) {
      this.appendMeter(columnB, label, snapshot.telemetry[key] ?? 0, max);
    }
    for (const [key, max, label] of metersC) {
      this.appendMeter(columnC, label, snapshot.telemetry[key] ?? 0, max);
    }
    columns.append(columnA, columnB, columnC);
    telemetryBlock.appendChild(columns);
    this.tabContent.appendChild(telemetryBlock);
  }

  private drawProgramGrid(
    canvas: HTMLCanvasElement,
    snapshot: PhysicsStudioSnapshot,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const labelWidth = 92;
    const top = 18;
    const gridWidth = w - labelWidth - 12;
    const gridHeight = 180;
    const cellW = gridWidth / snapshot.stepCount;
    const cellH = gridHeight / snapshot.laneCount;
    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= snapshot.stepCount; i++) {
      const x = labelWidth + i * cellW;
      ctx.strokeStyle = i % 8 === 0 ? 'rgba(140, 200, 255, 0.28)' : 'rgba(140, 200, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + gridHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= snapshot.laneCount; i++) {
      const y = top + i * cellH;
      ctx.beginPath();
      ctx.moveTo(labelWidth, y);
      ctx.lineTo(labelWidth + gridWidth, y);
      ctx.stroke();
    }
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(180, 210, 235, 0.8)';
    for (let lane = 0; lane < snapshot.laneCount; lane++) {
      ctx.fillText(snapshot.laneLabels[lane] ?? `L${lane}`, 8, top + (lane + 0.68) * cellH);
    }
    for (let step = 0; step < snapshot.stepCount; step += 8) {
      ctx.fillText(String(step).padStart(2, '0'), labelWidth + step * cellW + 2, top - 5);
    }
    for (const pin of snapshot.pins) {
      const x = labelWidth + pin.step * cellW + 1.2;
      const y = top + pin.lane * cellH + 1.2;
      ctx.fillStyle = pin.lane < 8 ? '#ffd48a' : '#9ee9ff';
      ctx.fillRect(x, y, Math.max(2, cellW - 2.4), Math.max(2, cellH - 2.4));
    }
    const activeStep = Math.max(
      0,
      Math.min(snapshot.stepCount - 1, Math.floor(snapshot.telemetry.programStep ?? 0)),
    );
    ctx.strokeStyle = '#ff6b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(labelWidth + (activeStep + 0.5) * cellW, top);
    ctx.lineTo(labelWidth + (activeStep + 0.5) * cellW, top + gridHeight);
    ctx.stroke();
    ctx.fillStyle = 'rgba(180, 210, 235, 0.62)';
    ctx.fillText('CLICK = TOGGLE PIN // RIGHT-CLICK = CLEAR // 64 EIGHTH-NOTE STEPS', labelWidth, h - 7);

    const locate = (event: MouseEvent): { lane: number; step: number } | null => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
      const y = (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
      if (x < labelWidth || x > labelWidth + gridWidth || y < top || y > top + gridHeight) {
        return null;
      }
      return {
        lane: Math.max(0, Math.min(snapshot.laneCount - 1, Math.floor((y - top) / cellH))),
        step: Math.max(0, Math.min(snapshot.stepCount - 1, Math.floor((x - labelWidth) / cellW))),
      };
    };
    canvas.onclick = (event) => {
      const cell = locate(event);
      if (cell) this.callbacks.onPhysicsPinToggle(cell.lane, cell.step);
    };
    canvas.oncontextmenu = (event) => {
      event.preventDefault();
      const cell = locate(event);
      if (cell) this.callbacks.onPhysicsPinToggle(cell.lane, cell.step, false);
    };
  }

  private renderProjectTab(): void {
    const block = el('div', 'director-editor');
    block.appendChild(el('div', 'director-section-title', 'DIRECTOR PROJECT I/O'));
    const summary = el('div', 'director-help');
    summary.textContent = `${this.timeline.getCameraKeys().length} camera keys // ${this.timeline.getLookKeys().length} look keys // ${this.timeline.getMilestones().length} milestones // ${this.presets.list().length} presets`;
    block.appendChild(summary);

    const exportProject = button('EXPORT DIRECTOR PROJECT .JSON', 'btn director-action');
    exportProject.onclick = () => this.callbacks.onExportProject();
    const importProject = button('IMPORT DIRECTOR PROJECT .JSON', 'btn director-action');
    const projectInput = this.fileInput((text) => this.callbacks.onImportProject(text));
    importProject.onclick = () => projectInput.click();
    const exportPresets = button('EXPORT PRESET BANK .JSON', 'btn director-action');
    exportPresets.onclick = () => this.callbacks.onExportPresets();
    const importPresets = button('IMPORT PRESET BANK .JSON', 'btn director-action');
    const presetInput = this.fileInput((text) => this.callbacks.onImportPresets(text));
    importPresets.onclick = () => presetInput.click();
    const reset = button('RESET TO DEFAULT FILM', 'btn director-action danger');
    reset.onclick = () => this.callbacks.onResetProject();

    block.append(exportProject, importProject, projectInput, exportPresets, importPresets, presetInput, reset);
    this.tabContent.appendChild(block);

    const help = el('div', 'director-editor');
    help.appendChild(el('div', 'director-section-title', 'DIRECTOR CONTROLS'));
    help.appendChild(
      el(
        'div',
        'director-help',
        'FREE FLY: W/A/S/D move, E/Q rise/fall, Z/X roll, 0 or double-click levels horizon, mouse drag looks, wheel adjusts FOV. Shift = 3× speed, Alt = 0.2× macro precision. DRONE PILOT adds inertial banked flight: F locks the lead marble, V toggles cinematic drift, C cycles follow distance, wheel trims speed and FOV. JOINT LOCK orbits a named rig bearing. [`] toggles Director Mode; performance pad keys are suspended while the drawer is open.',
      ),
    );
    this.tabContent.appendChild(help);
  }

  // ---------------------------------------------------------------------------
  // Timeline markers, forms and helpers.
  // ---------------------------------------------------------------------------

  private renderTimelineMarkers(): void {
    for (const track of [this.cameraTrack, this.lookTrack, this.milestoneTrack]) {
      track.querySelectorAll('.director-marker').forEach((node) => node.remove());
    }
    const addMarker = (
      track: HTMLDivElement,
      kind: SelectionKind,
      id: string,
      beat: number,
      label: string,
      extraClass: string,
    ): void => {
      const marker = el('button', `director-marker ${extraClass}`, '');
      marker.type = 'button';
      marker.title = `${label} @ beat ${beat.toFixed(2)}`;
      marker.style.left = `${(beat / Math.max(1, this.timeline.getTotalBeats())) * 100}%`;
      marker.dataset.kind = kind;
      marker.dataset.id = id;
      marker.onclick = (e) => {
        e.stopPropagation();
        this.selection = { kind, id };
        this.callbacks.onSelect(this.selection);
        this.callbacks.onScrub(beat);
        if (kind === 'look') {
          const lookKey = this.timeline.getLookKeys().find((k) => k.id === id);
          if (lookKey) this.callbacks.onLookLiveChange(lookKey.fx);
        }
        this.renderTimelineMarkers();
        this.renderActiveTab();
      };
      marker.classList.toggle(
        'selected',
        this.selection?.kind === kind && this.selection.id === id,
      );
      track.appendChild(marker);
    };
    for (const key of this.timeline.getCameraKeys()) {
      addMarker(this.cameraTrack, 'camera', key.id, key.beat, key.label, key.interpolation.toLowerCase());
    }
    for (const key of this.timeline.getLookKeys()) {
      addMarker(this.lookTrack, 'look', key.id, key.beat, key.label, 'look');
    }
    for (const milestone of this.timeline.getMilestones()) {
      addMarker(this.milestoneTrack, 'milestone', milestone.id, milestone.beat, milestone.label, 'milestone');
    }
  }

  private onTrackClick(e: MouseEvent, track: HTMLDivElement): void {
    if ((e.target as HTMLElement).classList.contains('director-marker')) return;
    const rect = track.getBoundingClientRect();
    const norm = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const beat = norm * this.timeline.getTotalBeats();
    this.callbacks.onScrub(beat);
  }

  private addMilestoneAtPlayhead(): void {
    const presetId = this.presets.list()[0]?.id ?? 'M1';
    this.callbacks.onMilestoneAdd({
      beat: this.currentBeat,
      presetId,
      blendBeats: 8,
      ease: 'SMOOTHER',
      label: 'NEW MACHINE MILESTONE',
    });
  }

  private deleteSelected(): void {
    if (!this.selection) return;
    if (this.selection.kind === 'camera') this.callbacks.onCameraDelete(this.selection.id);
    else if (this.selection.kind === 'look') this.callbacks.onLookDelete(this.selection.id);
    else this.callbacks.onMilestoneDelete(this.selection.id);
    this.selection = null;
    this.callbacks.onSelect(null);
  }

  private renderPresetSelects(): void {
    for (const select of [this.presetA, this.presetB]) {
      const previous = select.value;
      select.innerHTML = '';
      for (const preset of this.presets.list()) {
        const option = el('option', '', preset.name);
        option.value = preset.id;
        select.appendChild(option);
      }
      select.value = previous || this.presets.list()[0]?.id || 'M1';
    }
  }

  private emitPresetBlend(active: boolean): void {
    this.callbacks.onPresetBlend(
      this.presetA.value,
      this.presetB.value,
      num(this.crossfade),
      active,
    );
  }

  private getSelectedCameraKey(): CameraKeyframe | undefined {
    if (this.selection?.kind !== 'camera') return undefined;
    return this.timeline.getCameraKeys().find((k) => k.id === this.selection?.id);
  }

  private getSelectedLookKey(): LookKeyframe | undefined {
    if (this.selection?.kind !== 'look') return undefined;
    return this.timeline.getLookKeys().find((k) => k.id === this.selection?.id);
  }

  private getSelectedMilestone(): MachineMilestone | undefined {
    if (this.selection?.kind !== 'milestone') return undefined;
    return this.timeline.getMilestones().find((m) => m.id === this.selection?.id);
  }

  private field(label: string, input: HTMLElement): HTMLDivElement {
    const wrap = el('div', 'director-field');
    wrap.appendChild(el('span', 'director-field-label', label));
    wrap.appendChild(input);
    return wrap;
  }

  private fileInput(onText: (text: string) => void): HTMLInputElement {
    const input = el('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      onText(await file.text());
      input.value = '';
    };
    return input;
  }
}
