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
import { CinemaDirector } from '../../kit/camera/CinemaDirector';
import { PiranesiFoundry } from '../../kit/environment/PiranesiFoundry';
import { BabbageLightOrgan } from './BabbageLightOrgan';
import {
  evaluateGantzMontageCut,
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
} from './GantzScore';

class GantzSceneInstance implements WorkSceneInstance {
  private materials: SonobjetMaterialRig | null = null;
  private foundry: PiranesiFoundry | null = null;
  private machine: BabbageLightOrgan | null = null;
  private readonly cinemaDirector = new CinemaDirector();
  private lastMontageKey = -1;

  init(ctx: WorkRuntimeContext): void {
    this.materials = createSonobjetMaterials();
    this.foundry = new PiranesiFoundry(this.materials.chamberConcrete);
    this.machine = new BabbageLightOrgan(this.materials);

    ctx.scene.add(this.foundry.group);
    ctx.scene.add(this.machine.worldGroup);

    // Start in Mode 0: EPIC AUTO-EDIT DIRECTOR (music-synced multi-scale montage!)
    this.cinemaDirector.setMode(0);
    this.cinemaDirector.applyEditorialDirective({
      shot: 'macro-babbage',
      transition: 'hard',
    });
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
      strain: this.machine?.getStructuralStress() ?? 0,
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
    this.machine?.applyAnticipation(cue);
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    if (!this.machine) return;
    this.machine.applyImpulse(event);

    // Transfer heavy Drop-Forge & Furnace shock to camera mount
    if (
      event.subsystem === 'sub-rupture' ||
      event.subsystem === 'spine-shear' ||
      event.subsystem === 'core-implode'
    ) {
      const traumaMacro = ctx.matrix.getTarget('cameraTrauma', 0.76);
      this.cinemaDirector.addShock(event.velocity * traumaMacro, event.locus);
    }

    // In Pure Live mode (or paused transport), live pad hits trigger responsive smash-cuts!
    if (event.origin !== 'score' && !ctx.clock.isPlaying()) {
      if (event.subsystem === 'sub-rupture') {
        this.cinemaDirector.applyEditorialDirective({
          shot: 'forge-hammers-low',
          transition: 'hard',
        });
      } else if (event.subsystem === 'modal-clang') {
        this.cinemaDirector.applyEditorialDirective({
          shot: 'macro-babbage',
          transition: 'hard',
        });
      } else if (event.subsystem === 'break-shred') {
        this.cinemaDirector.applyEditorialDirective({
          shot: 'carriage-snorricam',
          transition: 'hard',
        });
      } else if (
        event.subsystem === 'larynx-lead' ||
        event.subsystem === 'bellows-choir'
      ) {
        this.cinemaDirector.applyEditorialDirective({
          shot: 'light-organ-crown',
          transition: 'whip',
        });
      } else if (event.subsystem === 'core-implode') {
        this.cinemaDirector.applyEditorialDirective({
          shot: 'cathedral-wide',
          transition: 'hard',
        });
      }
    }

    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, {
        metallicTension: ctx.matrix.getTarget('metallicTension', 0.48),
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.34),
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: this.machine.getStructuralStress(),
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    if (!this.machine || !this.foundry || !this.materials) return;

    const section = GANTZ_SECTIONS[transport.sectionIndex] ?? GANTZ_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);

    // Music-Synced Epic Montage & Continuous Zolly/Pullback Evaluation
    if (transport.playing) {
      const barMod = ((transport.bar % 80) + 80) % 80;
      const barFraction = ((transport.beat % 4) + 4) % 4 / 4;
      const stepKey = barMod * 16 + transport.step16;

      // Continuous per-frame evaluation during Hitchcock Vertigo Zolly (56..59) & Epic Pull-Back (74..79)
      if ((barMod >= 56 && barMod < 60) || barMod >= 74) {
        const contDirective = evaluateGantzMontageCut(
          barMod,
          transport.step16,
          barFraction,
        );
        if (contDirective) {
          this.cinemaDirector.applyEditorialDirective(contDirective);
        }
      }

      if (stepKey !== this.lastMontageKey) {
        this.lastMontageKey = stepKey;
        const cut = evaluateGantzMontageCut(
          barMod,
          transport.step16,
          barFraction,
        );
        if (cut) {
          this.cinemaDirector.applyEditorialDirective(cut);
        }
      }
    }

    const punchExplode = ctx.matrix.getSource('punch.tectonic-explode');
    const macroExplode = ctx.matrix.getTarget('tectonicSpread', 0.06);
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const stutter = ctx.matrix.getSource('punch.stutter');

    const spontaneous = this.machine.update(dt, elapsed, {
      explodeAmount: Math.min(1.5, macroExplode + punchExplode * 0.95),
      hardLock,
      stutterFreeze: stutter > 0.5,
      sectionId: section.id,
    });

    if (spontaneous) {
      this.triggerImpulse(spontaneous, ctx);
    }

    const stress = this.machine.getStructuralStress();
    this.foundry.updateLighting(
      elapsed,
      stress,
      this.machine.getArcFlash(),
      this.machine.getStrobePulse(),
      this.machine.getOrganGlow(),
      this.machine.getSpectralHueNorm(),
    );

    const traumaScale = ctx.matrix.getTarget('cameraTrauma', 0.76);
    this.cinemaDirector.update(
      ctx.camera,
      dt,
      elapsed,
      transport.beat,
      this.machine.getCameraAnchors(),
      traumaScale,
    );

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
    this.cinemaDirector.setMode(mode);
  }

  getCameraMode(): number {
    return this.cinemaDirector.getMode();
  }

  orbitCamera(dx: number, dy: number): void {
    this.cinemaDirector.orbit(dx, dy);
  }

  zoomCamera(delta: number): void {
    this.cinemaDirector.zoom(delta);
  }

  setPointerStrain(
    x: number,
    y: number,
    tension: number,
    active: boolean,
  ): void {
    this.machine?.setPointerStrain(x, y, tension, active);
  }

  getMetrics() {
    return {
      activeInstances: this.machine?.getActiveInstanceCount() ?? 0,
      structuralStress: this.machine?.getStructuralStress() ?? 0,
      kineticEnergy: this.machine?.getKineticEnergy() ?? 0,
      behavioralState: this.machine?.getBehavioralState(),
      activeShotBadge: this.cinemaDirector.getActiveShotBadge(),
    };
  }

  dispose(): void {
    if (this.foundry) {
      this.foundry.group.removeFromParent();
      this.foundry.dispose();
    }
    if (this.machine) {
      this.machine.worldGroup.removeFromParent();
      this.machine.dispose();
    }
    this.materials?.dispose();
  }
}

export const GantzWork: WorkDefinition = {
  id: 'gantz-tecton',
  title: 'BABBAGE // CLAVILUX',
  subtitle:
    'Moving-Castle Acoustic Factory & 24-Pipe Light Organ // 6-Act Score',
  author: 'SONOBJET ENGINE // POC 01',
  bpm: 164,
  bars: 80,
  sections: GANTZ_SECTIONS,
  macros: [
    {
      id: 'fractureChaos',
      label: 'LOOM MUTATION',
      min: 0,
      max: 1,
      defaultValue: 0.36,
      description: 'Jacquard breakcore turnaround variation & slice probability',
    },
    {
      id: 'drillDensity',
      label: 'CIPHER RATCHET',
      min: 0,
      max: 1,
      defaultValue: 0.56,
      description: 'Babbage carry-lever ratchet multiplier & stutter grain speed',
    },
    {
      id: 'metallicTension',
      label: 'PIPE / CHIME Q',
      min: 0,
      max: 1,
      defaultValue: 0.48,
      description: 'Clavilux reed formant Q, Babbage chime partials & comb resonance',
    },
    {
      id: 'tectonicSpread',
      label: 'TOWER & BELLOWS SPREAD',
      min: 0,
      max: 1.2,
      defaultValue: 0.06,
      description: 'Babbage cipher-tower gallery spread & lateral bellows inflation',
    },
    {
      id: 'brutalDrive',
      label: 'FURNACE GRIT',
      min: 0,
      max: 1,
      defaultValue: 0.3,
      description: 'AudioWorklet West-Coast wavefolder & sub-anvil saturation',
    },
    {
      id: 'cameraTrauma',
      label: 'FORGE RECOIL',
      min: 0,
      max: 1.4,
      defaultValue: 0.76,
      description: 'Seismic camera shock when Drop-Forge Trip-Hammers strike anvils',
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
