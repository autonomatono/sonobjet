import type {
  AnticipationCue,
  ImpulseEvent,
  TransportState,
  WorkDefinition,
  WorkRuntimeContext,
  WorkSceneInstance,
} from '../../engine/core/types';
import {
  createSonobjetMaterials,
  type SonobjetMaterialRig,
} from '../../engine/render/TSLMaterials';
import { KineticCameraRig } from '../../kit/camera/KineticCameraRig';
import { BrutalistChamber } from '../../kit/environment/BrutalistChamber';
import { GantzAutomaton } from './GantzAutomaton';
import { evaluateGantzStepBundle, GANTZ_SECTIONS } from './GantzScore';

class GantzSceneInstance implements WorkSceneInstance {
  private materials: SonobjetMaterialRig | null = null;
  private chamber: BrutalistChamber | null = null;
  private automaton: GantzAutomaton | null = null;
  private readonly cameraRig = new KineticCameraRig();
  private lastSectionIdx = -1;

  init(ctx: WorkRuntimeContext): void {
    this.materials = createSonobjetMaterials();
    this.chamber = new BrutalistChamber(this.materials.chamberConcrete);
    this.automaton = new GantzAutomaton(this.materials);

    ctx.scene.add(this.chamber.group);
    ctx.scene.add(this.automaton.worldGroup);

    // Start in Autonomous Cut Director so camera framing responds cinematically to the 6 Acts
    this.cameraRig.setMode(5);
  }

  scheduleStep(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void {
    const chaos = ctx.matrix.getTarget('fractureChaos', 0.38);
    const drillDensity = ctx.matrix.getTarget('drillDensity', 0.56);
    const metallicTension = ctx.matrix.getTarget('metallicTension', 0.48);
    const brutalDrive = ctx.matrix.getTarget('brutalDrive', 0.34);
    const decayScale = ctx.matrix.getTarget('decayScale', 1.0);

    const forceRatchet = ctx.matrix.getSource('punch.ratchet') > 0.5;
    const forceReverse = ctx.matrix.getSource('punch.reverse-slice') > 0.5;
    const halftime = ctx.matrix.getSource('punch.halftime') > 0.5;

    const bundle = evaluateGantzStepBundle(step64, bar, audioTime, {
      chaos,
      drillDensity,
      forceRatchet,
      forceReverse,
      step64DurSec: ctx.clock.getStep64DurationSec(halftime ? 0.5 : 1.0),
    });

    const synthMacros = {
      metallicTension,
      brutalDrive,
      decayScale,
      strain: this.automaton?.core.getStructuralStress() ?? 0,
    };

    for (const cue of bundle.anticipations) {
      ctx.clock.queueAnticipationCue(cue);
    }

    for (const ev of bundle.events) {
      ctx.audio.triggerImpulse(ev, synthMacros);
      ctx.clock.queueVisualEvent(ev);
    }
  }

  triggerAnticipation(cue: AnticipationCue): void {
    this.automaton?.applyAnticipation(cue);
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    if (!this.automaton) return;
    this.automaton.applyImpulse(event);

    // Transfer heavy Siege-Anvil shock to camera mount
    if (
      event.subsystem === 'sub-rupture' ||
      event.subsystem === 'spine-shear' ||
      event.subsystem === 'core-implode'
    ) {
      const traumaMacro = ctx.matrix.getTarget('cameraTrauma', 0.75);
      this.cameraRig.addShock(event.velocity * traumaMacro, event.locus);
    }

    // Intentional Cinema Director Cuts on dramatic musical events
    if (event.origin === 'score') {
      if (event.subsystem === 'larynx-lead' && event.velocity > 0.9) {
        // Intimate portrait framing when the Larynx sings primary phrases
        this.cameraRig.triggerDirectorCut(1);
      } else if (event.subsystem === 'arc-discharge' && event.velocity > 0.9) {
        this.cameraRig.triggerDirectorCut(2);
      } else if (event.subsystem === 'sub-rupture' && event.velocity > 1.2) {
        this.cameraRig.triggerDirectorCut(0);
      }
    }

    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, {
        metallicTension: ctx.matrix.getTarget('metallicTension', 0.48),
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.34),
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: this.automaton.core.getStructuralStress(),
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    if (!this.automaton || !this.chamber || !this.materials) return;

    const section = GANTZ_SECTIONS[transport.sectionIndex] ?? GANTZ_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);
    if (transport.sectionIndex !== this.lastSectionIdx) {
      this.lastSectionIdx = transport.sectionIndex;
      this.cameraRig.triggerDirectorCut(transport.sectionIndex % 4);
    }

    // Track user cursor or MediaPipe hands with the creature's saccadic gaze!
    const mx = ctx.matrix.getSource('mouse.x');
    const my = ctx.matrix.getSource('mouse.y');
    this.automaton.setGazeTarget(mx, my);

    const punchExplode = ctx.matrix.getSource('punch.tectonic-explode');
    const macroExplode = ctx.matrix.getTarget('tectonicSpread', 0.06);
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const stutter = ctx.matrix.getSource('punch.stutter');

    const spontaneous = this.automaton.update(dt, elapsed, {
      explodeAmount: Math.min(1.5, macroExplode + punchExplode * 0.95),
      hardLock,
      stutterFreeze: stutter > 0.5,
      sectionId: section.id,
      materials: this.materials,
    });

    if (spontaneous) {
      this.triggerImpulse(spontaneous, ctx);
    }

    const stress = this.automaton.core.getStructuralStress();
    this.chamber.updateLighting(
      stress,
      this.automaton.getArcFlash(),
      this.automaton.getStrobePulse(),
      this.automaton.getHarmonyGlow(),
    );

    const traumaScale = ctx.matrix.getTarget('cameraTrauma', 0.75);
    this.cameraRig.update(ctx.camera, dt, elapsed, traumaScale);

    const combScream = ctx.matrix.getSource('punch.comb-scream');
    const brutalDrive = ctx.matrix.getTarget('brutalDrive', 0.34);
    const metallic = ctx.matrix.getTarget('metallicTension', 0.48);

    ctx.audio.updateContinuous(
      {
        metallicTension: metallic,
        brutalDrive,
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: Math.max(0, stress - 0.16),
      },
      {
        stutterGate: stutter,
        grainMs: 9 + (1 - ctx.matrix.getTarget('drillDensity', 0.56)) * 42,
        combMix: Math.min(0.82, combScream * 0.72 + stress * 0.2),
        combFreq: 174.61 + metallic * 523.25, // Tuned to F3..C5 harmonic series!
        combFeedback: 0.68 + combScream * 0.23,
        crush: brutalDrive * 0.4,
      },
    );
  }

  setCameraMode(mode: number): void {
    this.cameraRig.setMode(mode);
  }

  getCameraMode(): number {
    return this.cameraRig.getMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.cameraRig.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cameraRig.zoom(delta);
  }

  setPointerStrain(
    x: number,
    y: number,
    tension: number,
    active: boolean,
  ): void {
    this.automaton?.setPointerStrain(x, y, tension, active);
  }

  getMetrics() {
    return {
      activeInstances: this.automaton?.getActiveInstanceCount() ?? 0,
      structuralStress: this.automaton?.core.getStructuralStress() ?? 0,
      kineticEnergy: this.automaton?.core.getKineticEnergy() ?? 0,
      behavioralState: this.automaton?.getBehavioralState(),
    };
  }

  dispose(): void {
    if (this.chamber) {
      this.chamber.group.removeFromParent();
      this.chamber.dispose();
    }
    if (this.automaton) {
      this.automaton.worldGroup.removeFromParent();
      this.automaton.dispose();
    }
    this.materials?.dispose();
  }
}

export const GantzWork: WorkDefinition = {
  id: 'gantz-tecton',
  title: 'GANTZ // AUTOMATON',
  subtitle: '7-Organ Biomechanical Sound-Creature // 6-Act F-Phrygian Score',
  author: 'SONOBJET ENGINE // POC 01',
  bpm: 164,
  bars: 80,
  sections: GANTZ_SECTIONS,
  macros: [
    {
      id: 'fractureChaos',
      label: 'BREAK MUTATION',
      min: 0,
      max: 1,
      defaultValue: 0.36,
      description: 'Breakcore turnaround variation & micro-slice probability',
    },
    {
      id: 'drillDensity',
      label: 'RAKER DENSITY',
      min: 0,
      max: 1,
      defaultValue: 0.56,
      description: 'Mantis-claw ratchet multiplier & stutter grain speed',
    },
    {
      id: 'metallicTension',
      label: 'LARYNX / HARP TENSION',
      min: 0,
      max: 1,
      defaultValue: 0.48,
      description: 'Formant Q, steel harp upper partials & F-series comb resonance',
    },
    {
      id: 'tectonicSpread',
      label: 'RIB-BELLOWS FLARE',
      min: 0,
      max: 1.2,
      defaultValue: 0.06,
      description: 'Porcelain rib-cage valve expansion & limb abduction',
    },
    {
      id: 'brutalDrive',
      label: 'WAVEFOLD GRIT',
      min: 0,
      max: 1,
      defaultValue: 0.3,
      description: 'AudioWorklet West-Coast wavefolder & bass saturation',
    },
    {
      id: 'cameraTrauma',
      label: 'ANVIL RECOIL',
      min: 0,
      max: 1.4,
      defaultValue: 0.76,
      description: 'Seismic camera mount shock when Siege-Hammer strikes Anvil',
    },
  ],
  defaultPatches: [
    {
      id: 'mp-span-spread',
      source: 'mediapipe.handSpan',
      target: 'tectonicSpread',
      amount: 0.95,
      slew: 0.04,
      enabled: true,
    },
    {
      id: 'mp-lpinch-drill',
      source: 'mediapipe.leftPinch',
      target: 'drillDensity',
      amount: 0.65,
      slew: 0.03,
      enabled: true,
    },
    {
      id: 'mp-rpinch-alloy',
      source: 'mediapipe.rightPinch',
      target: 'metallicTension',
      amount: 0.7,
      slew: 0.03,
      enabled: true,
    },
    {
      id: 'mouse-strain-drive',
      source: 'mouse.strain',
      target: 'brutalDrive',
      amount: 0.55,
      slew: 0.03,
      enabled: true,
    },
    {
      id: 'mic-energy-chaos',
      source: 'mic.energy',
      target: 'fractureChaos',
      amount: 0.75,
      slew: 0.04,
      enabled: true,
    },
    {
      id: 'chaos-subtle-alloy',
      source: 'chaos.x',
      target: 'metallicTension',
      amount: 0.12,
      slew: 0.14,
      enabled: true,
    },
  ],
  createInstance: () => new GantzSceneInstance(),
};
