import './studio/ui/styles.css';
import './studio/director/director.css';
import { AudioEngine } from './engine/audio/AudioEngine';
import { Clock } from './engine/core/Clock';
import { ModulationMatrix } from './engine/core/ModulationMatrix';
import type {
  ImpulseEvent,
  PunchFxId,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from './engine/core/types';
import { WorkRegistry } from './engine/core/WorkRegistry';
import { WebGPUStage } from './engine/render/WebGPUStage';
import { KeyboardMouseRig } from './studio/input/KeyboardMouseRig';
import { TakeRecorder } from './studio/recorder/TakeRecorder';
import { VideoExporter } from './studio/recorder/VideoExporter';
import { MediaPipeSensor } from './studio/sensors/MediaPipeSensor';
import { MicSensor } from './studio/sensors/MicSensor';
import { MidiGamepadSensor } from './studio/sensors/MidiGamepadSensor';
import { DirectorSystem } from './studio/director/DirectorSystem';
import { StudioShell } from './studio/ui/StudioShell';
import { NeonPinballWork } from './works/neon-pinball/NeonPinballWork';
import { SpatialTranceWork } from './works/spatial-sequencer/SpatialTranceWork';
import { BraindanceWork } from './works/braindance-collider/BraindanceWork';
import { AntarcticWork } from './works/spatial-sequencer/AntarcticWork';
import { ModalFlowWork } from './works/modal-flow/ModalFlowWork';
import { MarblePendulumWork } from './works/marble-pendulum/MarblePendulumWork';
import { OrreryCommonsWork } from './works/astrarium-modular-engine/OrreryCommonsWork';
import { ChronoAutomatonWork } from './works/chrono-automaton/ChronoAutomatonWork';
import { GantzWork } from './works/gantz-tecton/GantzWork';
import { LatticeWork } from './works/lattice-pendulum/LatticeWork';

async function bootstrap(): Promise<void> {
  const mount = document.getElementById('app');
  if (!mount) throw new Error('Missing #app container');

  const registry = new WorkRegistry();
  registry.register(NeonPinballWork, true);
  registry.register(SpatialTranceWork);
  registry.register(BraindanceWork);
  registry.register(AntarcticWork);
  registry.register(ModalFlowWork);
  registry.register(MarblePendulumWork);
  registry.register(OrreryCommonsWork);
  registry.register(ChronoAutomatonWork);
  registry.register(GantzWork);
  registry.register(LatticeWork);

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('work');
  let activeWorkDef: WorkDefinition =
    (requestedId ? registry.get(requestedId) : undefined) ??
    registry.getDefault();

  const audio = new AudioEngine();
  const clock = new Clock();
  const matrix = new ModulationMatrix();
  const mediaPipe = new MediaPipeSensor();
  const mic = new MicSensor();
  const midiGamepad = new MidiGamepadSensor();
  const takeRecorder = new TakeRecorder();
  const videoExporter = new VideoExporter();

  let activeInstance: WorkSceneInstance | null = null;
  let director: DirectorSystem | null = null;
  let stage: WebGPUStage;
  let inputRig: KeyboardMouseRig | null = null;
  let lastImpulse: ImpulseEvent | null = null;
  let impulseCount = 0;
  let ignited = false;
  const workHasDrone = (id: string): boolean => [
    'modal-flow',
    'neon-pinball',
    'spatial-trance',
    'braindance-collider',
    'antarctica',
  ].includes(id);

  const applyVisualStyle = (fx: Parameters<WebGPUStage['setPostFx']>[0]): void => {
    stage.setPostFx(fx);
    activeInstance?.setVisualStyle?.(fx);
  };

  const getRuntimeCtx = (): WorkRuntimeContext => ({
    scene: stage.scene,
    camera: stage.camera,
    canvas: stage.canvas,
    audio,
    clock,
    matrix,
    setPostFx: applyVisualStyle,
  });

  const dispatchLiveImpulse = (event: ImpulseEvent): void => {
    void audio.ensureStarted(clock.getBpm());
    lastImpulse = event;
    impulseCount++;
    activeInstance?.triggerImpulse(event, getRuntimeCtx());
    shell.flashImpulsePad(event);
    if (event.origin !== 'take') {
      takeRecorder.record(performance.now() * 0.001, {
        kind: 'impulse',
        impulse: event,
      });
    }
  };

  const loadWork = (work: WorkDefinition): void => {
    const wasPlaying = clock.isPlaying();
    clock.pause();
    activeInstance?.dispose();
    activeInstance = null;

    activeWorkDef = work;
    applyVisualStyle({
      glitch: 0,
      lensDistort: 0.035,
      aberration: 0.06,
      grain: 0.055,
      bleachGrade: 0.18,
      starkThreshold: 0,
      bloomStrength: 0.86,
      linocut: 0,
      neonGlow: 0.06,
      palette: 0,
      exposure: 1.18,
      lightRig: 0,
      lightIntensity: 1,
      shadowStrength: 0.62,
    });
    clock.configure(work.bpm, work.bars, work.sections);
    audio.setBpm(work.bpm);
    matrix.registerMacros(work.macros);
    matrix.setRoutes(work.defaultPatches);

    activeInstance = work.createInstance();
    activeInstance.init(getRuntimeCtx());
    shell.bindWorkSchema(work, matrix);
    const initialCameraMode = activeInstance.getCameraMode?.() ?? 0;
    shell.setCameraActive(initialCameraMode);
    inputRig?.setDroneMode(initialCameraMode === 1 && workHasDrone(work.id));
    activeInstance.setDirectorEnabled?.(director?.isEnabled() ?? false);
    director?.setWork(activeInstance);

    const url = new URL(window.location.href);
    url.searchParams.set('work', work.id);
    window.history.replaceState({}, '', url);

    if (wasPlaying) {
      clock.play(audio.getCurrentTime());
    }
  };

  const shell = new StudioShell(
    mount,
    registry.list(),
    activeWorkDef,
    {
      onStartExperience: async (mode) => {
        ignited = true;
        await audio.ensureStarted(clock.getBpm());
        clock.setMode(mode);
        if (mode === 'hybrid') {
          clock.play(audio.getCurrentTime());
        }
      },
      onTogglePlay: async () => {
        if (!ignited) {
          ignited = true;
          shell.dismissIgnition();
        }
        await audio.ensureStarted(clock.getBpm());
        clock.toggle(audio.getCurrentTime());
      },
      onSelectWork: (workId) => {
        const next = registry.get(workId);
        if (next) loadWork(next);
      },
      onModeChange: (mode) => {
        clock.setMode(mode);
        if (mode === 'hybrid' && !clock.isPlaying() && ignited) {
          clock.play(audio.getCurrentTime());
        }
      },
      onBpmChange: (delta) => {
        const nextBpm = clock.getBpm() + delta;
        clock.setBpm(nextBpm);
        audio.setBpm(clock.getBpm());
      },
      onSeekNormalized: (norm) => {
        clock.seekSeconds(norm * clock.getDurationSec(), audio.getCurrentTime());
      },
      onSectionSelect: (sectionIndex) => {
        const sec = activeWorkDef.sections[sectionIndex];
        if (sec) {
          clock.seekBar(sec.startBar, audio.getCurrentTime());
        }
      },
      onMacroInput: (macroId, val) => {
        matrix.setMacroBase(macroId, val);
        takeRecorder.record(performance.now() * 0.001, {
          kind: 'macro',
          macroId,
          value: val,
        });
      },
      onTogglePatchRoute: (routeId, enabled) => {
        matrix.updateRoute(routeId, { enabled });
      },
      onToggleMediaPipe: () => mediaPipe.toggle(),
      onToggleMic: () => mic.toggle(),
      onSelectCamera: (mode) => {
        activeInstance?.setCameraMode?.(mode);
        inputRig?.setDroneMode(mode === 1 && workHasDrone(activeWorkDef.id));
        shell.setCameraActive(mode);
        takeRecorder.record(performance.now() * 0.001, {
          kind: 'camera',
          mode,
        });
      },
      onTriggerPad: (subsystem) => {
        if (!ignited) {
          ignited = true;
          shell.dismissIgnition();
        }
        inputRig?.triggerPad(subsystem, 1.0);
      },
      onSetPunch: (id, active) => {
        inputRig?.setPunch(id, active);
      },
      onToggleTakeRec: () => {
        const nowSec = performance.now() * 0.001;
        if (takeRecorder.isRecording()) {
          takeRecorder.stopRecording(nowSec);
        } else {
          takeRecorder.startRecording(
            activeWorkDef.id,
            clock.getBpm(),
            nowSec,
            true,
          );
        }
      },
      onToggleTakeReplay: () => {
        const nowSec = performance.now() * 0.001;
        if (takeRecorder.isReplaying()) {
          takeRecorder.stopReplay();
        } else {
          void audio.ensureStarted(clock.getBpm());
          takeRecorder.startReplay(nowSec);
        }
      },
      onClearTake: () => {
        takeRecorder.clear();
      },
      onExportTake: () => {
        const json = takeRecorder.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeWorkDef.id}.sonobjet-take.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      },
      onImportTake: (raw) => {
        try {
          const take = takeRecorder.importJSON(raw);
          const targetWork = registry.get(take.workId);
          if (targetWork && targetWork.id !== activeWorkDef.id) {
            loadWork(targetWork);
          }
          void audio.ensureStarted(take.bpm);
          takeRecorder.startReplay(performance.now() * 0.001);
        } catch (err) {
          console.error('[TakeRecorder] Import error:', err);
        }
      },
      onToggleVideoCapture: async () => {
        if (videoExporter.isRecording()) {
          videoExporter.stop();
        } else {
          await audio.ensureStarted(clock.getBpm());
          videoExporter.start(stage.canvas, audio.getRecordingAudioStream());
        }
      },
      onToggleMute: () => {
        const nextMuted = !audio.isMuted();
        audio.setMuted(nextMuted);
        shell.setAudioMuted(nextMuted);
      },
      onToggleDirector: () => director?.toggle(),
      onOpenLooks: () => director?.openLooks(),
      onToggleQuantize: () => {
        const next = matrix.getTarget('eventQuantize') < 0.5;
        matrix.setMacroBase('eventQuantize', next ? 1 : 0);
        return next;
      },
      onTogglePerformanceMode: () => {
        const clean = shell.toggleCinemaMode();
        if (clean && director?.isEnabled()) director.setEnabled(false);
      },
    },
  );

  stage = new WebGPUStage(shell.viewportEl);
  await stage.init();

  inputRig = new KeyboardMouseRig(stage.canvas, matrix, {
    onPlayToggle: async () => {
      if (!ignited) {
        ignited = true;
        shell.dismissIgnition();
      }
      await audio.ensureStarted(clock.getBpm());
      clock.toggle(audio.getCurrentTime());
    },
    onToggleHud: () => {
      const clean = shell.toggleCinemaMode();
      if (clean && director?.isEnabled()) director.setEnabled(false);
    },
    onToggleQuantize: () => {
      const next = matrix.getTarget('eventQuantize') < 0.5;
      matrix.setMacroBase('eventQuantize', next ? 1 : 0);
      shell.setQuantizeState(next);
    },
    onCameraSelect: (mode) => {
      activeInstance?.setCameraMode?.(mode);
      inputRig?.setDroneMode(mode === 1 && workHasDrone(activeWorkDef.id));
      shell.setCameraActive(mode);
      takeRecorder.record(performance.now() * 0.001, { kind: 'camera', mode });
    },
    onSectionJump: (idx) => {
      const sec = activeWorkDef.sections[idx];
      if (sec) clock.seekBar(sec.startBar, audio.getCurrentTime());
    },
    onBpmNudge: (delta) => {
      clock.setBpm(clock.getBpm() + delta);
      audio.setBpm(clock.getBpm());
    },
    onToggleTakeRecord: () => {
      const nowSec = performance.now() * 0.001;
      if (takeRecorder.isRecording()) takeRecorder.stopRecording(nowSec);
      else
        takeRecorder.startRecording(
          activeWorkDef.id,
          clock.getBpm(),
          nowSec,
          true,
        );
    },
    onImpulse: (ev) => dispatchLiveImpulse(ev),
    onPunchChange: (id: PunchFxId, active: boolean) => {
      shell.setPunchActive(id, active);
      takeRecorder.record(performance.now() * 0.001, {
        kind: 'punch',
        punchId: id,
        active,
      });
    },
    onPointerStrain: (x, y, tension, active) => {
      activeInstance?.setPointerStrain?.(x, y, tension, active);
      takeRecorder.record(performance.now() * 0.001, {
        kind: 'strain',
        x,
        y,
        tension,
        active,
      });
    },
    onOrbit: (dx, dy) => activeInstance?.orbitCamera?.(dx, dy),
    onZoom: (delta) => activeInstance?.zoomCamera?.(delta),
  });

  director = new DirectorSystem({
    mount: document.body,
    canvas: stage.canvas,
    camera: stage.camera,
    clock,
    audio,
    matrix,
    setPostFx: applyVisualStyle,
    onEnabledChange: (enabled) => {
      if (enabled) shell.setPerformanceMode(false);
      inputRig?.setDirectorMode(enabled);
      activeInstance?.setDirectorEnabled?.(enabled);
      shell.setDirectorMode(enabled);
    },
  });

  void midiGamepad.initMidi(matrix, dispatchLiveImpulse);
  loadWork(activeWorkDef);

  // Main real-time audiovisual animation loop
  let prevFrameMs = performance.now();
  let smoothedFps = 60;

  const animate = (nowMs: number): void => {
    requestAnimationFrame(animate);

    const rawDt = Math.max(0.001, Math.min(0.1, (nowMs - prevFrameMs) * 0.001));
    prevFrameMs = nowMs;
    const instFps = 1 / rawDt;
    smoothedFps = smoothedFps * 0.92 + instFps * 0.08;
    const elapsedSec = nowMs * 0.001;

    // 1. Poll live sensors (MediaPipe 2-Hand Vision + Mic Exciter + Gamepad)
    mediaPipe.poll(
      matrix,
      shell.pipCanvas,
      dispatchLiveImpulse,
      (x, y, tension, active) => {
        activeInstance?.setPointerStrain?.(x, y, tension, active);
      },
    );
    mic.poll(rawDt, matrix, dispatchLiveImpulse);
    midiGamepad.pollGamepad(matrix, dispatchLiveImpulse);

    // 2. Poll Multi-Pass Recorded Take Replay / Overdub
    const replayedEvents = takeRecorder.pollReplay(elapsedSec, true);
    for (const rev of replayedEvents) {
      if (rev.kind === 'impulse') {
        dispatchLiveImpulse({ ...rev.impulse, audioTime: 0, origin: 'take' });
      } else if (rev.kind === 'punch') {
        matrix.setSource(`punch.${rev.punchId}`, rev.active ? 1 : 0);
        shell.setPunchActive(rev.punchId, rev.active);
      } else if (rev.kind === 'macro') {
        matrix.setMacroBase(rev.macroId, rev.value);
      } else if (rev.kind === 'strain') {
        activeInstance?.setPointerStrain?.(
          rev.x,
          rev.y,
          rev.tension,
          rev.active,
        );
      } else if (rev.kind === 'camera') {
        activeInstance?.setCameraMode?.(rev.mode);
        shell.setCameraActive(rev.mode);
      }
    }

    // 3. Step modulation matrix (Lorenz chaos + slewed gesture patch routes)
    matrix.step(rawDt);

    // 4. Tick sample-accurate transport + drain pre-strike anticipations & DAC-locked visual impulses
    const halftime = matrix.getSource('punch.halftime') > 0.5 ? 0.5 : 1.0;
    const ctx = getRuntimeCtx();
    const {
      state: transportState,
      dueEvents,
      dueAnticipations,
    } = clock.tick(
      audio.getCurrentTime(),
      rawDt,
      halftime,
      (step64, bar, audioTime) => {
        activeInstance?.scheduleStep?.(step64, bar, audioTime, ctx);
      },
    );

    for (const cue of dueAnticipations) {
      activeInstance?.triggerAnticipation?.(cue, ctx);
    }

    for (const ev of dueEvents) {
      lastImpulse = ev;
      impulseCount++;
      activeInstance?.triggerImpulse(ev, ctx);
      shell.flashImpulsePad(ev);
    }

    // 5. Step Sonobjet physics, then let Director Studio override camera/looks/pose.
    activeInstance?.update(rawDt, elapsedSec, transportState, ctx);
    director?.update(rawDt, transportState);
    stage.render();

    // 6. Update Studio HUD telemetry
    const metrics = activeInstance?.getMetrics() ?? {
      activeInstances: 0,
      structuralStress: 0,
      kineticEnergy: 0,
    };

    const sensorLabel = mediaPipe.isActive()
      ? mediaPipe.getStatus()
      : mic.isActive()
        ? 'MIC TRANSIENT ACTIVE'
        : 'MOUSE + KEYBOARD READY';

    const telemetry = {
      gpuBackend: stage.getBackendLabel(),
      fps: smoothedFps,
      activeInstances: metrics.activeInstances,
      structuralStress: metrics.structuralStress,
      kineticEnergy: metrics.kineticEnergy,
      behavioralState: metrics.behavioralState,
      activeShotBadge: metrics.activeShotBadge,
      lastImpulse,
      impulseCount,
    };
    if (director?.isEnabled()) {
      telemetry.activeShotBadge = director.getBadge();
    }

    shell.updateFrame(
      transportState,
      telemetry,
      matrix,
      audio.getWaveformSnapshot(),
      sensorLabel,
      {
        recording: takeRecorder.isRecording(),
        replaying: takeRecorder.isReplaying(),
        count: takeRecorder.getEventCount(),
      },
      videoExporter.isRecording(),
    );
  };

  requestAnimationFrame(animate);
}

void bootstrap();
