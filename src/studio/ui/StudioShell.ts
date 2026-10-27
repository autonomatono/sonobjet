import type { ModulationMatrix } from '../../engine/core/ModulationMatrix';
import type {
  ImpulseEvent,
  PunchFxId,
  SubsystemId,
  TelemetrySnapshot,
  TransportState,
  WorkDefinition,
} from '../../engine/core/types';
import { KEY_IMPULSE_PADS, KEY_PUNCH_FX } from '../input/KeyboardMouseRig';

export interface StudioActions {
  onStartExperience(mode: 'hybrid' | 'live-only'): void;
  onTogglePlay(): void;
  onSelectWork(workId: string): void;
  onModeChange(mode: 'hybrid' | 'live-only'): void;
  onBpmChange(bpm: number): void;
  onSeekNormalized(norm: number): void;
  onSectionSelect(sectionIndex: number): void;
  onMacroInput(macroId: string, val: number): void;
  onTogglePatchRoute(routeId: string, enabled: boolean): void;
  onToggleMediaPipe(): Promise<boolean>;
  onToggleMic(): Promise<boolean>;
  onSelectCamera(mode: number): void;
  onTriggerPad(subsystem: SubsystemId): void;
  onSetPunch(id: PunchFxId, active: boolean): void;
  onToggleTakeRec(): void;
  onToggleTakeReplay(): void;
  onClearTake(): void;
  onExportTake(): void;
  onImportTake(json: string): void;
  onToggleVideoCapture(): void;
  onToggleMute(): void;
}

/**
 * Industrial Performance & Composition Studio HUD Shell.
 */
export class StudioShell {
  public readonly viewportEl: HTMLDivElement;
  public readonly pipCanvas: HTMLCanvasElement;

  private readonly hudLayer: HTMLDivElement;
  private readonly ignitionOverlay: HTMLDivElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly modeBtn: HTMLButtonElement;
  private readonly bpmLabel: HTMLSpanElement;
  private readonly clockReadout: HTMLDivElement;
  private readonly gpuBadge: HTMLSpanElement;
  private readonly bodyBadge: HTMLSpanElement;
  private readonly muteBtn: HTMLButtonElement;

  private readonly timelineStrip: HTMLDivElement;
  private readonly playheadEl: HTMLDivElement;
  private sectionEls: HTMLDivElement[] = [];

  private readonly scopeCanvas: HTMLCanvasElement;
  private readonly scopeCtx: CanvasRenderingContext2D | null;
  private readonly stressFill: HTMLDivElement;
  private readonly kineticFill: HTMLDivElement;
  private readonly macroContainer: HTMLDivElement;
  private readonly patchContainer: HTMLDivElement;
  private macroValueLabels = new Map<string, HTMLSpanElement>();
  private macroSliders = new Map<string, HTMLInputElement>();

  private readonly mpBtn: HTMLButtonElement;
  private readonly mpStatus: HTMLSpanElement;
  private readonly pipWrap: HTMLDivElement;
  private readonly micBtn: HTMLButtonElement;

  private readonly camButtonMap = new Map<number, HTMLButtonElement>();
  private readonly shotBadgeEl: HTMLDivElement;
  private readonly takeRecBtn: HTMLButtonElement;
  private readonly takePlayBtn: HTMLButtonElement;
  private readonly takeCountLabel: HTMLSpanElement;
  private readonly videoRecBtn: HTMLButtonElement;

  private readonly padButtons = new Map<SubsystemId, HTMLButtonElement>();
  private readonly punchButtons = new Map<PunchFxId, HTMLButtonElement>();
  private padFlashTimers = new Map<SubsystemId, number>();

  private cinemaHidden = false;
  private readonly actions: StudioActions;

  constructor(
    mount: HTMLElement,
    works: WorkDefinition[],
    initialWork: WorkDefinition,
    actions: StudioActions,
  ) {
    this.actions = actions;

    const root = document.createElement('div');
    root.className = 'sonobjet-root';
    mount.appendChild(root);

    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'sonobjet-viewport';
    root.appendChild(this.viewportEl);

    this.hudLayer = document.createElement('div');
    this.hudLayer.className = 'hud-layer';
    root.appendChild(this.hudLayer);

    // --- TOP HEADER BAR ---
    const topWrap = document.createElement('div');
    const topbar = document.createElement('div');
    topbar.className = 'hud-topbar';

    const brandCluster = document.createElement('div');
    brandCluster.className = 'brand-cluster';
    const brand = document.createElement('span');
    brand.className = 'brand-mark';
    brand.textContent = 'SONOBJET';

    const workSelect = document.createElement('select');
    workSelect.className = 'work-select';
    workSelect.setAttribute('aria-label', 'Select Work');
    for (const w of works) {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.title}`;
      if (w.id === initialWork.id) opt.selected = true;
      workSelect.appendChild(opt);
    }
    workSelect.onchange = () => actions.onSelectWork(workSelect.value);
    brandCluster.append(brand, workSelect);

    const transportCluster = document.createElement('div');
    transportCluster.className = 'transport-cluster';

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn';
    this.playBtn.textContent = 'PLAY [SPACE]';
    this.playBtn.onclick = () => actions.onTogglePlay();

    this.modeBtn = document.createElement('button');
    this.modeBtn.className = 'btn active';
    this.modeBtn.textContent = 'SCORE + LIVE';
    this.modeBtn.onclick = () => {
      const next =
        this.modeBtn.dataset.mode === 'live-only' ? 'hybrid' : 'live-only';
      actions.onModeChange(next);
    };

    const bpmMinus = document.createElement('button');
    bpmMinus.className = 'btn';
    bpmMinus.textContent = '-';
    this.bpmLabel = document.createElement('span');
    this.bpmLabel.className = 'badge';
    this.bpmLabel.textContent = `${initialWork.bpm} BPM`;
    const bpmPlus = document.createElement('button');
    bpmPlus.className = 'btn';
    bpmPlus.textContent = '+';
    bpmMinus.onclick = () => actions.onBpmChange(-4);
    bpmPlus.onclick = () => actions.onBpmChange(4);

    this.clockReadout = document.createElement('div');
    this.clockReadout.className = 'clock-readout';
    this.clockReadout.textContent = 'BAR 001.1.01';

    transportCluster.append(
      this.playBtn,
      this.modeBtn,
      bpmMinus,
      this.bpmLabel,
      bpmPlus,
      this.clockReadout,
    );

    const metaCluster = document.createElement('div');
    metaCluster.className = 'meta-cluster';
    this.gpuBadge = document.createElement('span');
    this.gpuBadge.className = 'badge gpu';
    this.gpuBadge.textContent = 'INIT GPU';

    this.bodyBadge = document.createElement('span');
    this.bodyBadge.className = 'badge';
    this.bodyBadge.textContent = '717 BODIES';

    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'btn';
    this.muteBtn.textContent = 'AUDIO ON';
    this.muteBtn.onclick = () => actions.onToggleMute();

    const cinemaBtn = document.createElement('button');
    cinemaBtn.className = 'btn';
    cinemaBtn.textContent = 'CINEMA [TAB]';
    cinemaBtn.onclick = () => this.toggleCinemaMode();

    metaCluster.append(this.gpuBadge, this.bodyBadge, this.muteBtn, cinemaBtn);
    topbar.append(brandCluster, transportCluster, metaCluster);

    // --- MOVEMENT TIMELINE ---
    this.timelineStrip = document.createElement('div');
    this.timelineStrip.className = 'timeline-strip hud-collapsible';
    this.playheadEl = document.createElement('div');
    this.playheadEl.className = 'timeline-playhead';
    this.timelineStrip.onclick = (e) => {
      const rect = this.timelineStrip.getBoundingClientRect();
      const norm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      actions.onSeekNormalized(norm);
    };

    topWrap.append(topbar, this.timelineStrip);
    this.hudLayer.appendChild(topWrap);

    // --- MIDDLE LEFT & RIGHT PANELS ---
    const mid = document.createElement('div');
    mid.className = 'hud-mid hud-collapsible';

    // LEFT PANEL: Telemetry + Macros + Sensors + Patchbay
    const leftPanel = document.createElement('div');
    leftPanel.className = 'side-panel';

    const scopeBlock = document.createElement('div');
    scopeBlock.innerHTML = `<div class="panel-section-title"><span>BIOMECHANICAL STATE</span><span id="behavior-state-lbl" style="color:var(--accent-amber)">DORMANT_BREATH</span></div>`;
    this.scopeCanvas = document.createElement('canvas');
    this.scopeCanvas.className = 'scope-canvas';
    this.scopeCanvas.width = 246;
    this.scopeCanvas.height = 52;
    this.scopeCtx = this.scopeCanvas.getContext('2d');
    scopeBlock.appendChild(this.scopeCanvas);

    const stressRow = document.createElement('div');
    stressRow.className = 'meter-row';
    stressRow.style.marginTop = '5px';
    stressRow.innerHTML = `<span style="width:56px">STRESS</span><div class="meter-track"><div class="meter-fill"></div></div>`;
    this.stressFill = stressRow.querySelector('.meter-fill') as HTMLDivElement;

    const kinRow = document.createElement('div');
    kinRow.className = 'meter-row';
    kinRow.style.marginTop = '3px';
    kinRow.innerHTML = `<span style="width:56px">KINETIC</span><div class="meter-track"><div class="meter-fill"></div></div>`;
    this.kineticFill = kinRow.querySelector('.meter-fill') as HTMLDivElement;
    scopeBlock.append(stressRow, kinRow);

    const macroBlock = document.createElement('div');
    macroBlock.innerHTML = `<div class="panel-section-title"><span>EXPRESSION MACROS</span><span>MODULATED</span></div>`;
    this.macroContainer = document.createElement('div');
    macroBlock.appendChild(this.macroContainer);

    const sensorBlock = document.createElement('div');
    sensorBlock.innerHTML = `<div class="panel-section-title"><span>LIVE SENSING</span><span id="mp-status-span">OFFLINE</span></div>`;
    this.mpStatus = sensorBlock.querySelector('#mp-status-span') as HTMLSpanElement;

    const sensorBtns = document.createElement('div');
    sensorBtns.className = 'rec-controls';
    this.mpBtn = document.createElement('button');
    this.mpBtn.className = 'btn';
    this.mpBtn.textContent = 'MEDIAPIPE HANDS';
    this.mpBtn.onclick = async () => {
      const on = await actions.onToggleMediaPipe();
      this.mpBtn.classList.toggle('active', on);
      this.pipWrap.classList.toggle('visible', on);
    };

    this.micBtn = document.createElement('button');
    this.micBtn.className = 'btn';
    this.micBtn.textContent = 'MIC EXCITER';
    this.micBtn.onclick = async () => {
      const on = await actions.onToggleMic();
      this.micBtn.classList.toggle('active', on);
    };
    sensorBtns.append(this.mpBtn, this.micBtn);

    this.pipWrap = document.createElement('div');
    this.pipWrap.className = 'pip-wrap';
    this.pipWrap.style.marginTop = '6px';
    this.pipCanvas = document.createElement('canvas');
    this.pipCanvas.className = 'pip-canvas';
    this.pipCanvas.width = 240;
    this.pipCanvas.height = 135;
    const pipHint = document.createElement('div');
    pipHint.style.fontSize = '9px';
    pipHint.style.color = 'var(--text-dim)';
    pipHint.textContent = '2-HAND SPAN = CAD SPREAD // PINCH SNAP = STRIKE';
    this.pipWrap.append(this.pipCanvas, pipHint);
    sensorBlock.append(sensorBtns, this.pipWrap);

    const patchBlock = document.createElement('div');
    patchBlock.innerHTML = `<div class="panel-section-title"><span>MODULATION MATRIX</span><span>ROUTES</span></div>`;
    this.patchContainer = document.createElement('div');
    this.patchContainer.className = 'patch-list';
    patchBlock.appendChild(this.patchContainer);

    leftPanel.append(scopeBlock, macroBlock, sensorBlock, patchBlock);

    // RIGHT PANEL: Camera Director + Multi-Pass Take Recorder + Video Export
    const rightPanel = document.createElement('div');
    rightPanel.className = 'side-panel';

    const camBlock = document.createElement('div');
    camBlock.innerHTML = `<div class="panel-section-title"><span>MORPH-FOLLOW CAMERA</span><span>KEYS 0, 1–8</span></div>`;

    this.shotBadgeEl = document.createElement('div');
    this.shotBadgeEl.style.fontSize = '9.5px';
    this.shotBadgeEl.style.color = 'var(--accent-xenon)';
    this.shotBadgeEl.style.padding = '5px 7px';
    this.shotBadgeEl.style.marginBottom = '6px';
    this.shotBadgeEl.style.background = 'rgba(120, 190, 255, 0.08)';
    this.shotBadgeEl.style.border = '1px solid rgba(120, 190, 255, 0.24)';
    this.shotBadgeEl.style.letterSpacing = '0.04em';
    this.shotBadgeEl.textContent = 'AUTO-MORPH // MACRO: TECTONIC LAMELLAE [85mm]';
    camBlock.appendChild(this.shotBadgeEl);

    const camGrid = document.createElement('div');
    camGrid.style.display = 'grid';
    camGrid.style.gridTemplateColumns = '1fr 1fr';
    camGrid.style.gap = '4px';

    const autoBtn = document.createElement('button');
    autoBtn.className = 'btn active';
    autoBtn.style.gridColumn = 'span 2';
    autoBtn.style.textAlign = 'center';
    autoBtn.textContent = '[0] MORPH-FOLLOW AUTO-DIRECTOR';
    autoBtn.onclick = () => actions.onSelectCamera(0);
    this.camButtonMap.set(0, autoBtn);
    camGrid.appendChild(autoBtn);

    const camSpecs: Array<[number, string]> = [
      [1, '1 // MORPH ORBIT'],
      [2, '2 // SHELL FLIGHT'],
      [3, '3 // FAULT MACRO'],
      [4, '4 // CORKSCREW'],
      [5, '5 // BOOM TRACK'],
      [6, '6 // MERCURY LOW'],
      [7, '7 // WRIST POV'],
      [8, '8 // POLAR MANDALA'],
    ];
    for (const [modeNum, label] of camSpecs) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.textAlign = 'left';
      b.style.fontSize = '9.5px';
      b.style.padding = '5px 6px';
      b.textContent = label;
      b.onclick = () => actions.onSelectCamera(modeNum);
      this.camButtonMap.set(modeNum, b);
      camGrid.appendChild(b);
    }
    camBlock.appendChild(camGrid);

    const recBlock = document.createElement('div');
    recBlock.innerHTML = `<div class="panel-section-title"><span>PERFORMANCE TAKE</span><span id="take-ev-count">0 EVENTS</span></div>`;
    this.takeCountLabel = recBlock.querySelector('#take-ev-count') as HTMLSpanElement;

    const recGrid = document.createElement('div');
    recGrid.className = 'rec-controls';

    this.takeRecBtn = document.createElement('button');
    this.takeRecBtn.className = 'btn rec';
    this.takeRecBtn.textContent = 'OVERDUB REC';
    this.takeRecBtn.onclick = () => actions.onToggleTakeRec();

    this.takePlayBtn = document.createElement('button');
    this.takePlayBtn.className = 'btn';
    this.takePlayBtn.textContent = 'REPLAY TAKE';
    this.takePlayBtn.onclick = () => actions.onToggleTakeReplay();

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn';
    exportBtn.textContent = 'EXPORT .JSON';
    exportBtn.onclick = () => actions.onExportTake();

    const importBtn = document.createElement('button');
    importBtn.className = 'btn';
    importBtn.textContent = 'IMPORT .JSON';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      actions.onImportTake(text);
      fileInput.value = '';
    };
    importBtn.onclick = () => fileInput.click();

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn';
    clearBtn.style.gridColumn = 'span 2';
    clearBtn.textContent = 'CLEAR RECORDED PASSES';
    clearBtn.onclick = () => actions.onClearTake();

    recGrid.append(
      this.takeRecBtn,
      this.takePlayBtn,
      exportBtn,
      importBtn,
      clearBtn,
      fileInput,
    );
    recBlock.appendChild(recGrid);

    const vidBlock = document.createElement('div');
    vidBlock.innerHTML = `<div class="panel-section-title"><span>MASTER RENDER</span><span>60FPS + OPUS</span></div>`;
    this.videoRecBtn = document.createElement('button');
    this.videoRecBtn.className = 'btn rec';
    this.videoRecBtn.style.width = '100%';
    this.videoRecBtn.textContent = 'CAPTURE .WEBM MUSIC VIDEO';
    this.videoRecBtn.onclick = () => actions.onToggleVideoCapture();
    vidBlock.appendChild(this.videoRecBtn);

    const helpBlock = document.createElement('div');
    helpBlock.style.fontSize = '9.5px';
    helpBlock.style.lineHeight = '1.55';
    helpBlock.style.color = 'var(--text-dim)';
    helpBlock.innerHTML = `
      <div class="panel-section-title"><span>DIRECT MANIPULATION</span></div>
      <div><b>L-DRAG</b> TWIST &amp; DILATE GEOMETRY (RELEASE = SLAM)</div>
      <div><b>R-DRAG / SHIFT</b> ORBIT // <b>WHEEL</b> ZOOM // <b>0, 1–8</b> CAMS</div>
      <div><b>Z..M , . /</b> 10 SYNTH/GLITCH PADS // <b>A..K</b> BUS FX</div>
      <div><b>Q W E R T Y</b> CUE ACTS I–VI // <b>TAB</b> CINEMA</div>
      <div class="footer-meta">
        <span>BRANCH: ${__BUILD_BRANCH__}</span>
        <span>SHA: ${__BUILD_SHA__.slice(0, 7)}</span>
      </div>
    `;

    rightPanel.append(camBlock, recBlock, vidBlock, helpBlock);
    mid.append(leftPanel, rightPanel);
    this.hudLayer.appendChild(mid);

    // --- BOTTOM LIVE PAD & PUNCH STRIP ---
    const bottom = document.createElement('div');
    bottom.className = 'hud-bottom hud-collapsible';

    const padBank = document.createElement('div');
    padBank.className = 'pad-bank';
    for (const p of KEY_IMPULSE_PADS) {
      const btn = document.createElement('button');
      btn.className = 'btn impulse-pad';
      btn.innerHTML = `<span class="pad-key">[${p.label}]</span><span class="pad-name">${p.shortName}</span>`;
      btn.onpointerdown = () => actions.onTriggerPad(p.subsystem);
      this.padButtons.set(p.subsystem, btn);
      padBank.appendChild(btn);
    }

    const punchBank = document.createElement('div');
    punchBank.className = 'punch-bank';
    for (const fx of KEY_PUNCH_FX) {
      const btn = document.createElement('button');
      btn.className = 'btn amber';
      btn.textContent = `[${fx.key.toUpperCase()}] ${fx.label}`;
      btn.onpointerdown = () => actions.onSetPunch(fx.id, true);
      btn.onpointerup = () => actions.onSetPunch(fx.id, false);
      btn.onpointerleave = () => actions.onSetPunch(fx.id, false);
      this.punchButtons.set(fx.id, btn);
      punchBank.appendChild(btn);
    }

    bottom.append(padBank, punchBank);
    this.hudLayer.appendChild(bottom);

    // --- IGNITION OVERLAY ---
    this.ignitionOverlay = document.createElement('div');
    this.ignitionOverlay.className = 'ignition-overlay';
    this.ignitionOverlay.innerHTML = `
      <div class="ignition-card">
        <div class="ignition-kicker">SONOBJET ENGINE // WEBGPU NON-EUCLIDEAN MORPHOLOGY + 14-VOICE SYNTH</div>
        <h1 class="ignition-title">HYPER // TECTON</h1>
        <p class="ignition-desc">
          A surreal 4,348-element metamorphic sound megastructure governed by coupled state machines, GPU non-Euclidean vertex torsion, and Cunningham robotic striker booms.
          Through-composed across 96 Bars (F Phrygian, 164 BPM) with 303 Acid, Glass-Armonica &amp; Glitch-Chirp voices, morph-following camera flights, and TSL optical glitch/bleach-bypass post-FX.
        </p>
        <div class="ignition-shortcuts">
          <b>SPACE</b> Play / Pause 96-Bar Film &amp; Score &nbsp;|&nbsp;
          <b>0, 1–8</b> Morph-Follow Camera / 8 Perspectives &nbsp;|&nbsp;
          <b>Z–M , . /</b> Play 10 Voices (Acid / Glass / Glitch / Chime)<br/>
          <b>A S D F G J K</b> Glitch Stutter / 64th Drill / Shatter Lock &nbsp;|&nbsp;
          <b>Q W E R T Y</b> Cue Acts I–VI
        </div>
        <div class="ignition-actions">
          <button class="btn btn-primary" id="ignite-score-btn">INITIATE 96-BAR FILM &amp; SCORE [SPACE]</button>
          <button class="btn" id="ignite-live-btn" style="padding:11px 14px">PURE LIVE INSTRUMENT</button>
        </div>
      </div>
    `;
    root.appendChild(this.ignitionOverlay);

    const startScoreBtn = this.ignitionOverlay.querySelector(
      '#ignite-score-btn',
    ) as HTMLButtonElement;
    const startLiveBtn = this.ignitionOverlay.querySelector(
      '#ignite-live-btn',
    ) as HTMLButtonElement;

    startScoreBtn.onclick = () => {
      this.dismissIgnition();
      actions.onStartExperience('hybrid');
    };
    startLiveBtn.onclick = () => {
      this.dismissIgnition();
      actions.onStartExperience('live-only');
    };

    this.bindWorkSchema(initialWork, null);
  }

  dismissIgnition(): void {
    this.ignitionOverlay.classList.add('dismissed');
  }

  toggleCinemaMode(): void {
    this.cinemaHidden = !this.cinemaHidden;
    this.hudLayer.classList.toggle('cinema-hidden', this.cinemaHidden);
  }

  bindWorkSchema(work: WorkDefinition, matrix: ModulationMatrix | null): void {
    // Rebuild section segments
    this.timelineStrip.innerHTML = '';
    this.sectionEls = [];
    const keyHints = ['Q', 'W', 'E', 'R', 'T', 'Y'];
    work.sections.forEach((sec, idx) => {
      const seg = document.createElement('div');
      seg.className = 'timeline-sec';
      const spanBars = Math.max(1, sec.endBar - sec.startBar);
      seg.style.flex = String(spanBars);
      seg.textContent = `[${keyHints[idx] ?? idx + 1}] ${sec.name}`;
      seg.title = sec.description;
      seg.onclick = (e) => {
        e.stopPropagation();
        this.actions.onSectionSelect(idx);
      };
      this.sectionEls.push(seg);
      this.timelineStrip.appendChild(seg);
    });
    this.timelineStrip.appendChild(this.playheadEl);

    // Rebuild macro sliders
    this.macroContainer.innerHTML = '';
    this.macroValueLabels.clear();
    this.macroSliders.clear();

    for (const m of work.macros) {
      const wrap = document.createElement('div');
      wrap.className = 'macro-item';
      const head = document.createElement('div');
      head.className = 'macro-header';
      const lbl = document.createElement('span');
      lbl.textContent = m.label;
      const valSpan = document.createElement('span');
      valSpan.style.color = 'var(--accent-xenon)';
      valSpan.textContent = m.defaultValue.toFixed(2);
      head.append(lbl, valSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'macro-slider';
      slider.min = String(m.min);
      slider.max = String(m.max);
      slider.step = '0.01';
      slider.value = String(m.defaultValue);
      slider.title = m.description;
      slider.oninput = () => {
        this.actions.onMacroInput(m.id, Number(slider.value));
      };

      this.macroValueLabels.set(m.id, valSpan);
      this.macroSliders.set(m.id, slider);
      wrap.append(head, slider);
      this.macroContainer.appendChild(wrap);
    }

    // Rebuild patch routes
    this.patchContainer.innerHTML = '';
    const routes = matrix ? matrix.getRoutes() : work.defaultPatches;
    for (const r of routes) {
      const row = document.createElement('div');
      row.className = 'patch-row';
      const label = document.createElement('span');
      label.textContent = `${r.source} -> ${r.target} (${r.amount > 0 ? '+' : ''}${r.amount.toFixed(2)})`;
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = r.enabled;
      chk.onchange = () => this.actions.onTogglePatchRoute(r.id, chk.checked);
      row.append(label, chk);
      this.patchContainer.appendChild(row);
    }
  }

  flashImpulsePad(event: ImpulseEvent): void {
    const btn = this.padButtons.get(event.subsystem);
    if (!btn) return;
    btn.classList.add('firing');
    const prev = this.padFlashTimers.get(event.subsystem);
    if (prev) window.clearTimeout(prev);
    const timer = window.setTimeout(() => {
      btn.classList.remove('firing');
    }, 85);
    this.padFlashTimers.set(event.subsystem, timer);
  }

  setPunchActive(id: PunchFxId, active: boolean): void {
    this.punchButtons.get(id)?.classList.toggle('active', active);
  }

  setCameraActive(mode: number): void {
    const normalized = mode === 9 ? 0 : mode;
    for (const [m, b] of this.camButtonMap.entries()) {
      b.classList.toggle('active', m === normalized);
    }
  }

  setAudioMuted(muted: boolean): void {
    this.muteBtn.textContent = muted ? 'MUTED' : 'AUDIO ON';
    this.muteBtn.classList.toggle('rec', muted);
    this.muteBtn.classList.toggle('active', muted);
  }

  updateFrame(
    transport: TransportState,
    telemetry: TelemetrySnapshot,
    matrix: ModulationMatrix,
    waveform: Float32Array,
    sensorStatus: string,
    takeStatus: { recording: boolean; replaying: boolean; count: number },
    videoRecording: boolean,
  ): void {
    this.playBtn.textContent = transport.playing ? 'PAUSE [SPACE]' : 'PLAY [SPACE]';
    this.playBtn.classList.toggle('active', transport.playing);

    this.modeBtn.dataset.mode = transport.mode;
    this.modeBtn.textContent =
      transport.mode === 'hybrid' ? 'SCORE + LIVE' : 'PURE LIVE';
    this.modeBtn.classList.toggle('active', transport.mode === 'hybrid');

    this.bpmLabel.textContent = `${Math.round(transport.bpm)} BPM`;

    const barStr = String(transport.bar + 1).padStart(3, '0');
    const beatInBar = Math.floor(transport.beat % 4) + 1;
    const sub16 = (transport.step16 % 4) + 1;
    this.clockReadout.textContent = `BAR ${barStr}.${beatInBar}.${sub16}`;

    this.gpuBadge.textContent = `${telemetry.gpuBackend} // ${Math.round(telemetry.fps)} FPS`;
    this.bodyBadge.textContent = `${telemetry.activeInstances} ELEMENTS`;
    if (telemetry.activeShotBadge) {
      this.shotBadgeEl.textContent = telemetry.activeShotBadge;
    }

    const behEl = document.getElementById('behavior-state-lbl');
    if (behEl && telemetry.behavioralState) {
      behEl.textContent = telemetry.behavioralState;
    }

    const pct =
      transport.duration > 0
        ? Math.min(100, (transport.currentTime / transport.duration) * 100)
        : 0;
    this.playheadEl.style.left = `${pct}%`;

    this.sectionEls.forEach((el, idx) => {
      el.classList.toggle('active', idx === transport.sectionIndex);
    });

    this.stressFill.style.width = `${Math.min(100, telemetry.structuralStress * 85)}%`;
    this.kineticFill.style.width = `${Math.min(100, telemetry.kineticEnergy * 65)}%`;

    for (const [id, span] of this.macroValueLabels.entries()) {
      span.textContent = matrix.getTarget(id).toFixed(2);
    }

    this.mpStatus.textContent = sensorStatus;

    this.takeRecBtn.classList.toggle('active', takeStatus.recording);
    this.takeRecBtn.textContent = takeStatus.recording
      ? 'STOP OVERDUB'
      : 'OVERDUB REC';
    this.takePlayBtn.classList.toggle('active', takeStatus.replaying);
    this.takeCountLabel.textContent = `${takeStatus.count} EVENTS`;

    this.videoRecBtn.classList.toggle('active', videoRecording);
    this.videoRecBtn.textContent = videoRecording
      ? 'STOP & SAVE .WEBM'
      : 'CAPTURE .WEBM MUSIC VIDEO';

    this.drawScope(waveform, telemetry.structuralStress);
  }

  private drawScope(waveform: Float32Array, stress: number): void {
    const ctx = this.scopeCtx;
    if (!ctx) return;
    const w = this.scopeCanvas.width;
    const h = this.scopeCanvas.height;

    ctx.fillStyle = 'rgba(5, 7, 11, 0.55)';
    ctx.fillRect(0, 0, w, h);

    // Center crosshair line
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    ctx.strokeStyle = stress > 0.55 ? '#ff9447' : '#8cc8ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const len = waveform.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = (0.5 - waveform[i] * 0.44) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
