import type {
  BehaviorMapEntry,
  PatchRoute,
  PostFxState,
  RigJointDescriptor,
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
import { DEFAULT_POST_FX } from './KeyframeTimeline';

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
}

type TabId = 'SHOTS' | 'LOOKS' | 'CONFIG' | 'MAPS' | 'PROJECT';

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

const num = (input: HTMLInputElement | undefined, fallback = 0): number => {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
};

const POST_FX_KEYS: Array<keyof PostFxState> = [
  'glitch',
  'lensDistort',
  'aberration',
  'grain',
  'bleachGrade',
  'starkThreshold',
  'bloomStrength',
];

const INTERPOLATIONS: CameraInterpolation[] = [
  'CUT',
  'SMOOTH_SPLINE',
  'ORBIT_ARC',
  'VERTIGO',
];

const EASES: MilestoneEase[] = ['LINEAR', 'SMOOTHER', 'STEP'];

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
  private readonly postFxInputs = new Map<keyof PostFxState, HTMLInputElement>();
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
    const title = el('div', 'director-title', 'DIRECTOR STUDIO');
    const subtitle = el(
      'div',
      'director-subtitle',
      'SHOTS // LOOKS // CONFIGURATIONS // MAPS',
    );
    this.statusLine = el('div', 'director-status', 'TIMELINE // IDLE');
    header.append(title, subtitle, this.statusLine);

    const modeRow = el('div', 'director-mode-row');
    const modes: Array<[DirectorCameraMode, string]> = [
      ['TIMELINE', 'TIMELINE'],
      ['FREE', 'FREE FLY'],
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
    const tabs: TabId[] = ['SHOTS', 'LOOKS', 'CONFIG', 'MAPS', 'PROJECT'];
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
    dockHead.append(this.beatLabel, hint);

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
      if (typeof value === 'number') input.value = value.toFixed(3);
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
    this.statusLine.textContent = `${info.cameraMode} // ${info.shotLabel} // AROUSAL ${arousal.toFixed(2)} // PHASE LOCK ${coherence.toFixed(2)}`;
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

    const editor = el('div', 'director-editor');
    editor.appendChild(el('div', 'director-section-title', 'LOOK / POST-FX KEYFRAME'));
    const key = this.getSelectedLookKey();
    const beatInput = number(key?.beat ?? this.currentBeat, 0.25);
    const labelInput = el('input', 'director-input');
    labelInput.type = 'text';
    labelInput.value = key?.label ?? 'NEW LOOK';
    editor.append(this.field('BEAT', beatInput), this.field('LABEL', labelInput));

    const sliders = el('div', 'director-slider-grid');
    const readFx = (): PostFxState => {
      const fx = { ...DEFAULT_POST_FX };
      for (const postKey of POST_FX_KEYS) {
        fx[postKey] = num(this.postFxInputs.get(postKey), DEFAULT_POST_FX[postKey]);
      }
      return fx;
    };
    const values = key?.fx ?? this.currentLook;
    for (const postKey of POST_FX_KEYS) {
      const input = number(values[postKey], 0.01);
      input.oninput = () => this.callbacks.onLookLiveChange(readFx());
      this.postFxInputs.set(postKey, input);
      sliders.appendChild(this.field(postKey.toUpperCase(), input));
    }
    editor.appendChild(sliders);

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
    editor.appendChild(actions);
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
        'FREE FLY: W/A/S/D move, E/Q rise/fall, Z/X roll, 0 or double-click levels horizon, mouse drag looks, wheel adjusts FOV. Shift = 3× speed, Alt = 0.2× macro precision. JOINT LOCK orbits a named rig bearing. [`] toggles Director Mode; performance pad keys are suspended while the drawer is open.',
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
