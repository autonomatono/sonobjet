import * as THREE from 'three/webgpu';
import type { AudioEngine } from '../../engine/audio/AudioEngine';
import type { Clock } from '../../engine/core/Clock';
import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type {
  BehaviorMapEntry,
  PatchRoute,
  PostFxState,
  TransportState,
  WorkSceneInstance,
} from '../../engine/core/types';
import {
  BEHAVIOR_PROFILES,
  createDefaultArticulation,
  type ArticulationState,
  type BehaviorId,
} from '../articulation/ArticulationRig';
import { BehaviorPresetBank } from '../articulation/BehaviorPresetBank';
import { FreeFlyController, type DirectorCameraMode } from './FreeFlyController';
import {
  createDefaultDirectorProject,
  DEFAULT_POST_FX,
  KeyframeTimeline,
  type CameraKeyframe,
  type CameraPose,
  type LookKeyframe,
  type MachineMilestone,
  type Vec3Tuple,
} from './KeyframeTimeline';
import { DirectorStudioUI } from './DirectorStudioUI';

export interface DirectorSystemOptions {
  mount: HTMLElement;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  clock: Clock;
  audio: AudioEngine;
  matrix: ModulationMatrix;
  setPostFx(fx: Partial<PostFxState>): void;
  onEnabledChange?(enabled: boolean): void;
}

interface ManualPresetBlend {
  articulation: ArticulationState;
  behavior: BehaviorId;
}

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const sub3 = (a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

const downloadJson = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
};

/**
 * Global interactive music-video director. It sits above any WorkSceneInstance
 * that implements the optional DirectorWorkHooks, and can override camera,
 * post-FX, articulation, behavior and input maps without touching audio score.
 */
export class DirectorSystem {
  public readonly timeline = new KeyframeTimeline(createDefaultDirectorProject());
  public readonly presets = new BehaviorPresetBank();

  private readonly freeFly: FreeFlyController;
  private readonly ui: DirectorStudioUI;
  private work: WorkSceneInstance | null = null;
  private enabled = false;
  private cameraMode: DirectorCameraMode = 'TIMELINE';
  private jointIds: string[] = [];

  private lastPose: CameraPose | null = null;
  private lastLook = { fx: { ...DEFAULT_POST_FX }, keyId: '', label: 'DEFAULT LOOK' };
  private lastMilestoneBeat = 0;
  private activeShotLabel = 'TIMELINE SHOT';
  private activeLookLabel = 'DEFAULT LOOK';
  private activeMilestoneLabel = 'M1';
  private currentBeat = 0;

  private manualArticulation: Record<string, number> | null = null;
  private manualBehavior: string | null = null;
  private manualLook: PostFxState | null = null;
  private presetBlend: ManualPresetBlend | null = null;

  constructor(private readonly options: DirectorSystemOptions) {
    this.freeFly = new FreeFlyController(options.canvas, options.camera);
    this.freeFly.setJointResolver((id) => this.resolveJoint(id));
    this.ui = new DirectorStudioUI(options.mount, this.timeline, this.presets, {
      onToggle: () => this.toggle(),
      onModeChange: (mode) => this.setCameraMode(mode),
      onScrub: (beat) => this.scrub(beat),
      onSelect: () => undefined,
      onCameraCapture: (selectedId) => this.captureCameraKey(selectedId),
      onCameraAdd: (key) => this.addCameraKey(key),
      onCameraUpdate: (id, patch) => this.updateCameraKey(id, patch),
      onCameraDelete: (id) => this.deleteCameraKey(id),
      onLookCapture: (selectedId) => this.captureLookKey(selectedId),
      onLookAdd: (key) => this.addLookKey(key),
      onLookUpdate: (id, patch) => this.updateLookKey(id, patch),
      onLookDelete: (id) => this.deleteLookKey(id),
      onLookLiveChange: (fx) => this.setManualLook(fx),
      onMilestoneAdd: (milestone) => this.addMilestone(milestone),
      onMilestoneUpdate: (id, patch) => this.updateMilestone(id, patch),
      onMilestoneDelete: (id) => this.deleteMilestone(id),
      onArticulationChange: (id, value) => this.setManualArticulation(id, value),
      onBehaviorChange: (id) => this.setManualBehavior(id),
      onReleaseManualOverrides: () => this.releaseManualOverrides(),
      onPresetBlend: (fromId, toId, t, active) =>
        this.applyPresetBlend(fromId, toId, t, active),
      onBehaviorMapChange: (id, patch) => this.updateBehaviorMap(id, patch),
      onPatchRouteChange: (id, patch) => this.updatePatchRoute(id, patch),
      onJointSelect: (id) => this.selectJoint(id),
      onImportProject: (raw) => this.importProject(raw),
      onExportProject: () => this.exportProject(),
      onImportPresets: (raw) => this.importPresets(raw),
      onExportPresets: () => this.exportPresets(),
      onResetProject: () => this.resetProject(),
    });

    window.addEventListener('keydown', this.onHotkey);
  }

  setWork(work: WorkSceneInstance | null): void {
    this.work = work;
    const descriptors = work?.getJointDescriptors?.() ?? [];
    this.jointIds = descriptors.map((d) => d.id).filter(Boolean);
    this.ui.setJointDescriptors(descriptors);
    this.ui.setPatchRoutes(this.options.matrix.getRoutes());
    this.ui.setBehaviorMaps(this.timeline.getBehaviorMaps());
    this.ui.setBehaviorId(work?.getBehaviorId?.() ?? 'PRECISION_ESCAPEMENT');
    const articulation = work?.getArticulationState?.();
    if (articulation) this.ui.setArticulationValues(articulation);
    work?.setBehaviorMaps?.(this.timeline.getBehaviorMaps());
    this.freeFly.setJointId(undefined);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getBadge(): string {
    return `DIRECTOR // ${this.activeShotLabel} // MILESTONE ${this.lastMilestoneBeat.toFixed(1)}`;
  }

  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.ui.setEnabled(enabled);
    this.freeFly.setMode(enabled ? this.cameraMode : 'TIMELINE');
    this.options.onEnabledChange?.(enabled);
    if (!enabled) {
      this.manualLook = null;
      this.releaseManualOverrides();
    }
  }

  setCameraMode(mode: DirectorCameraMode): void {
    this.cameraMode = mode;
    if (
      (mode === 'FREE' || mode === 'JOINT') &&
      this.lastPose &&
      !this.freeFly.isEnabled()
    ) {
      this.freeFly.setFromPose(this.lastPose);
    }
    if (mode === 'JOINT' && !this.freeFly.getJointId() && this.jointIds.length > 0) {
      this.freeFly.setJointId(this.jointIds[0]);
    }
    this.freeFly.setMode(this.enabled ? mode : 'TIMELINE');
    this.ui.setMode(mode);
  }

  getCameraMode(): DirectorCameraMode {
    return this.cameraMode;
  }

  update(dt: number, transport: TransportState): void {
    if (!this.enabled) return;
    const totalBeats = this.timeline.getTotalBeats();
    const beat = ((transport.beat % totalBeats) + totalBeats) % totalBeats;
    this.currentBeat = beat;

    const pose = this.timeline.evaluateCamera(beat, (id) => this.resolveJoint(id));
    const lookEval = this.timeline.evaluateLook(beat);
    const milestone = this.timeline.evaluateMilestone(beat, this.presets);
    this.lastPose = pose;
    this.lastLook = lookEval;
    this.lastMilestoneBeat = milestone.beat;
    this.activeShotLabel = `${pose.interpolation} // ${pose.label}`;
    this.activeLookLabel = lookEval.label;
    this.activeMilestoneLabel = milestone.label;

    if (this.cameraMode === 'TIMELINE') {
      this.applyCameraPose(pose);
    } else {
      this.freeFly.update(dt);
    }

    const fx = this.manualLook ?? lookEval.fx;
    this.options.setPostFx(fx);
    if (!this.manualLook) this.ui.setLiveLook(lookEval.fx);

    if (this.presetBlend) {
      this.work?.setArticulationState?.(this.presetBlend.articulation);
      this.work?.setBehaviorId?.(this.presetBlend.behavior);
      this.ui.setArticulationValues(this.presetBlend.articulation);
      this.ui.setBehaviorId(this.presetBlend.behavior);
    } else if (this.manualArticulation || this.manualBehavior) {
      if (this.manualArticulation) {
        this.work?.setArticulationState?.(this.manualArticulation);
      }
      if (this.manualBehavior) this.work?.setBehaviorId?.(this.manualBehavior);
    } else {
      this.work?.setArticulationState?.(milestone.articulation);
      this.work?.setBehaviorId?.(milestone.behavior);
      this.ui.setArticulationValues(milestone.articulation);
      this.ui.setBehaviorId(milestone.behavior);
    }

    const ecology = this.work?.getEcologySnapshot?.() ?? {};
    this.ui.updateFrame({
      beat,
      bar: transport.bar,
      shotLabel: this.activeShotLabel,
      lookLabel: this.activeLookLabel,
      milestoneLabel: this.activeMilestoneLabel,
      ecology,
      cameraMode: this.cameraMode,
      enabled: this.enabled,
    });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onHotkey);
    this.freeFly.dispose();
  }

  // ---------------------------------------------------------------------------
  // Runtime helpers.
  // ---------------------------------------------------------------------------

  private resolveJoint(id: string): Vec3Tuple | null {
    return this.work?.getJointWorldPosition?.(id) ?? null;
  }

  private applyCameraPose(pose: CameraPose): void {
    const camera = this.options.camera;
    camera.position.fromArray(pose.position);
    if (Math.abs(camera.fov - pose.fov) > 0.02) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    camera.up.set(Math.sin(pose.roll), Math.cos(pose.roll), 0);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  }

  private scrub(beat: number): void {
    const seconds = (beat * 60) / Math.max(40, this.options.clock.getBpm());
    this.options.clock.seekSeconds(seconds, this.options.audio.getCurrentTime());
  }

  private captureCurrentCamera(): {
    position: Vec3Tuple;
    target: Vec3Tuple;
    fov: number;
    roll: number;
    jointId?: string;
  } {
    if (this.freeFly.isEnabled()) {
      const pose = this.freeFly.capturePose();
      if (pose.jointId) {
        const anchor = this.resolveJoint(pose.jointId);
        if (anchor) {
          return {
            position: sub3(pose.position, anchor),
            target: sub3(pose.target, anchor),
            fov: pose.fov,
            roll: pose.roll,
            jointId: pose.jointId,
          };
        }
      }
      return pose;
    }
    if (this.lastPose) {
      return {
        position: [...this.lastPose.position] as Vec3Tuple,
        target: [...this.lastPose.target] as Vec3Tuple,
        fov: this.lastPose.fov,
        roll: this.lastPose.roll,
        jointId: this.timeline
          .getCameraKeys()
          .find((k) => k.id === this.lastPose?.keyId)?.jointId,
      };
    }
    const camera = this.options.camera;
    const direction = camera.getWorldDirection(new THREE.Vector3());
    const target: Vec3Tuple = [
      camera.position.x + direction.x * 3,
      camera.position.y + direction.y * 3,
      camera.position.z + direction.z * 3,
    ];
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target,
      fov: camera.fov,
      roll: 0,
    };
  }

  private captureCameraKey(selectedId?: string): void {
    const pose = this.captureCurrentCamera();
    if (selectedId) {
      const existing = this.timeline.getCameraKeys().find((k) => k.id === selectedId);
      this.timeline.updateCameraKey(selectedId, {
        beat: this.currentBeat,
        position: pose.position,
        target: pose.target,
        fov: pose.fov,
        roll: pose.roll,
        jointId: pose.jointId,
        label: existing?.label ?? 'UPDATED SHOT',
        interpolation: existing?.interpolation ?? 'SMOOTH_SPLINE',
      });
      this.ui.refreshProject();
      this.ui.showMessage(`UPDATED CAMERA KEY ${selectedId}`);
      return;
    }
    const count = this.timeline.getCameraKeys().length + 1;
    const created = this.timeline.addCameraKey({
      beat: this.currentBeat,
      label: `DIRECTOR SHOT ${String(count).padStart(2, '0')}`,
      position: pose.position,
      target: pose.target,
      fov: pose.fov,
      roll: pose.roll,
      interpolation: 'SMOOTH_SPLINE',
      jointId: pose.jointId,
    });
    this.ui.setSelection({ kind: 'camera', id: created.id });
    this.ui.showMessage(`ADDED CAMERA KEY @ BEAT ${this.currentBeat.toFixed(2)}`);
  }

  private addCameraKey(key: Omit<CameraKeyframe, 'id'>): void {
    const created = this.timeline.addCameraKey(key);
    this.ui.setSelection({ kind: 'camera', id: created.id });
  }

  private updateCameraKey(id: string, patch: Partial<CameraKeyframe>): void {
    this.timeline.updateCameraKey(id, patch);
    this.ui.refreshProject();
  }

  private deleteCameraKey(id: string): void {
    this.timeline.deleteCameraKey(id);
    this.ui.refreshProject();
  }

  private captureLookKey(selectedId?: string): void {
    const fx = this.manualLook ?? this.lastLook.fx;
    if (selectedId) {
      const existing = this.timeline.getLookKeys().find((k) => k.id === selectedId);
      this.timeline.updateLookKey(selectedId, {
        beat: this.currentBeat,
        label: existing?.label ?? 'UPDATED LOOK',
        fx: { ...fx },
      });
      this.ui.refreshProject();
      this.ui.showMessage(`UPDATED LOOK KEY ${selectedId}`);
      return;
    }
    const count = this.timeline.getLookKeys().length + 1;
    const created = this.timeline.addLookKey({
      beat: this.currentBeat,
      label: `DIRECTOR LOOK ${String(count).padStart(2, '0')}`,
      fx: { ...fx },
    });
    this.ui.setSelection({ kind: 'look', id: created.id });
    this.ui.showMessage(`ADDED LOOK KEY @ BEAT ${this.currentBeat.toFixed(2)}`);
  }

  private addLookKey(key: Omit<LookKeyframe, 'id'>): void {
    const created = this.timeline.addLookKey(key);
    this.ui.setSelection({ kind: 'look', id: created.id });
  }

  private updateLookKey(id: string, patch: Partial<LookKeyframe>): void {
    this.timeline.updateLookKey(id, patch);
    this.ui.refreshProject();
  }

  private deleteLookKey(id: string): void {
    this.timeline.deleteLookKey(id);
    this.ui.refreshProject();
  }

  private addMilestone(milestone: Omit<MachineMilestone, 'id'>): void {
    const created = this.timeline.addMilestone(milestone);
    this.ui.setSelection({ kind: 'milestone', id: created.id });
  }

  private updateMilestone(id: string, patch: Partial<MachineMilestone>): void {
    this.timeline.updateMilestone(id, patch);
    this.ui.refreshProject();
  }

  private deleteMilestone(id: string): void {
    this.timeline.deleteMilestone(id);
    this.ui.refreshProject();
  }

  private setManualLook(fx: PostFxState | null): void {
    this.manualLook = fx ? { ...fx } : null;
    if (!fx) this.ui.setLiveLook(this.lastLook.fx);
  }

  private setManualArticulation(id: string, value: number): void {
    const base =
      this.manualArticulation ??
      this.work?.getArticulationState?.() ??
      createDefaultArticulation();
    this.manualArticulation = { ...base, [id]: value };
    this.presetBlend = null;
    this.ui.setBlendActive(false);
    this.work?.setArticulationState?.(this.manualArticulation);
  }

  private setManualBehavior(id: string): void {
    if (!(id in BEHAVIOR_PROFILES)) return;
    this.manualBehavior = id;
    this.presetBlend = null;
    this.ui.setBlendActive(false);
    this.ui.setBehaviorId(id);
    this.work?.setBehaviorId?.(id);
  }

  private releaseManualOverrides(): void {
    this.manualArticulation = null;
    this.manualBehavior = null;
    this.presetBlend = null;
    this.ui.setBlendActive(false);
  }

  private applyPresetBlend(
    fromId: string,
    toId: string,
    t: number,
    active: boolean,
  ): void {
    if (!active) {
      this.releaseManualOverrides();
      return;
    }
    const blended = this.presets.blend(fromId, toId, clamp(t, 0, 1));
    this.presetBlend = {
      articulation: blended.articulation,
      behavior: blended.behavior,
    };
    this.manualArticulation = blended.articulation;
    this.manualBehavior = blended.behavior;
    this.ui.setBlendActive(true);
    this.ui.setArticulationValues(blended.articulation);
    this.ui.setBehaviorId(blended.behavior);
    this.work?.setArticulationState?.(blended.articulation);
    this.work?.setBehaviorId?.(blended.behavior);
  }

  private updateBehaviorMap(id: string, patch: Partial<BehaviorMapEntry>): void {
    this.timeline.updateBehaviorMap(id, patch);
    const maps = this.timeline.getBehaviorMaps();
    this.work?.setBehaviorMaps?.(maps);
    this.ui.setBehaviorMaps(maps);
  }

  private updatePatchRoute(id: string, patch: Partial<PatchRoute>): void {
    this.options.matrix.updateRoute(id, patch);
  }

  private selectJoint(id: string | undefined): void {
    this.freeFly.setJointId(id);
    if (id) this.setCameraMode('JOINT');
  }

  private importProject(raw: string): void {
    try {
      const imported = this.timeline.replaceWithImported(raw);
      this.timeline.setProject({
        ...imported,
        bars: 96,
        bpm: this.options.clock.getBpm(),
      });
      const maps = this.timeline.getBehaviorMaps();
      this.work?.setBehaviorMaps?.(maps);
      this.ui.setBehaviorMaps(maps);
      this.ui.refreshProject();
      this.ui.showMessage('DIRECTOR PROJECT IMPORTED');
    } catch (err) {
      console.error('[DirectorSystem] Project import error:', err);
      this.ui.showMessage(`IMPORT FAILED: ${(err as Error).message}`);
    }
  }

  private exportProject(): void {
    downloadJson('sonobjet-director-project.json', this.timeline.exportJSON());
  }

  private importPresets(raw: string): void {
    try {
      this.presets.importJSON(raw, true);
      this.ui.refreshProject();
      this.ui.showMessage('PRESET BANK MERGED');
    } catch (err) {
      console.error('[DirectorSystem] Preset import error:', err);
      this.ui.showMessage(`PRESET IMPORT FAILED: ${(err as Error).message}`);
    }
  }

  private exportPresets(): void {
    downloadJson('sonobjet-machine-presets.json', this.presets.exportJSON());
  }

  private resetProject(): void {
    this.timeline.reset();
    this.timeline.setProject({
      ...this.timeline.getProject(),
      bars: 96,
      bpm: this.options.clock.getBpm(),
    });
    const maps = this.timeline.getBehaviorMaps();
    this.work?.setBehaviorMaps?.(maps);
    this.ui.setBehaviorMaps(maps);
    this.releaseManualOverrides();
    this.ui.refreshProject();
    this.ui.showMessage('DEFAULT 96-BAR FILM RESTORED');
  }

  private onHotkey = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (e.code === 'Backquote') {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (!this.enabled) return;
    const key = e.key.toLowerCase();
    if (key === 'k') {
      e.preventDefault();
      this.captureCameraKey();
    } else if (key === 'l') {
      e.preventDefault();
      this.captureLookKey();
    } else if (key === 'm') {
      e.preventDefault();
      this.addMilestone({
        beat: this.currentBeat,
        presetId: this.presets.list()[0]?.id ?? 'M1',
        blendBeats: 8,
        ease: 'SMOOTHER',
        label: 'DIRECTOR MILESTONE',
      });
    }
  };
}
