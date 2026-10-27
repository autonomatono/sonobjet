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
import { SurrealCyberVault } from '../../kit/environment/SurrealCyberVault';
import {
  evaluateGantzMontageCut,
  evaluateGantzStepBundle,
  GANTZ_SECTIONS,
  GANTZ_TOTAL_BARS,
} from './GantzScore';
import { HyperTectonMachine } from './HyperTectonMachine';

class GantzSceneInstance implements WorkSceneInstance {
  private materials: SonobjetMaterialRig | null = null;
  private vault: SurrealCyberVault | null = null;
  private machine: HyperTectonMachine | null = null;
  private readonly cinemaDirector = new CinemaDirector();
  private lastMontageKey = -1;

  init(ctx: WorkRuntimeContext): void {
    this.materials = createSonobjetMaterials();
    this.vault = new SurrealCyberVault(this.materials);
    this.machine = new HyperTectonMachine(this.materials);

    ctx.scene.add(this.vault.group);
    ctx.scene.add(this.machine.worldGroup);

    this.cinemaDirector.setMode(0);
    this.cinemaDirector.applyEditorialDirective({
      shot: 'macro-fault-seams',
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

    if (
      event.subsystem === 'sub-rupture' ||
      event.subsystem === 'spine-shear' ||
      event.subsystem === 'core-implode'
    ) {
      const traumaMacro = ctx.matrix.getTarget('cameraTrauma', 0.72);
      this.cinemaDirector.addShock(event.velocity * traumaMacro, event.locus);
    }

    // In Pure Live mode, morph state & camera smoothly track live performer energy!
    if (event.origin !== 'score' && !ctx.clock.isPlaying()) {
      if (event.subsystem === 'bellows-choir' || event.subsystem === 'glass-armonica') {
        this.machine.setMorphState('INVERTED_CATHEDRAL', 2.4);
        this.cinemaDirector.applyEditorialDirective({
          shot: 'interior-dive',
          transition: 'morph-follow',
        });
      } else if (event.subsystem === 'acid-squelch') {
        this.machine.setMorphState('NON_EUCLIDEAN_HELIX', 3.0);
        this.cinemaDirector.applyEditorialDirective({
          shot: 'helix-corkscrew',
          transition: 'morph-follow',
        });
      } else if (event.subsystem === 'glitch-chirp') {
        this.machine.setMorphState('QUANTIZED_SHATTER', 5.0);
        this.cinemaDirector.applyEditorialDirective({
          shot: 'macro-fault-seams',
          transition: 'hard',
        });
      } else if (event.subsystem === 'sub-rupture') {
        this.machine.setMorphState('CANTILEVER_STRIKER', 3.2);
        this.cinemaDirector.applyEditorialDirective({
          shot: 'cunningham-boom-track',
          transition: 'morph-follow',
        });
      } else if (event.subsystem === 'core-implode') {
        this.machine.setMorphState('SINGULARITY_CROWN', 3.8);
        this.cinemaDirector.applyEditorialDirective({
          shot: 'morph-orbit',
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
    if (!this.machine || !this.vault || !this.materials) return;

    const section = GANTZ_SECTIONS[transport.sectionIndex] ?? GANTZ_SECTIONS[0];
    ctx.matrix.setSource('score.intensity', section.intensity);

    const barMod = ((transport.bar % GANTZ_TOTAL_BARS) + GANTZ_TOTAL_BARS) % GANTZ_TOTAL_BARS;
    const barFraction = (((transport.beat % 4) + 4) % 4) / 4;

    // Evaluate Morph-Following Camera Choreography & Continuous Zolly/Pullback
    if (transport.playing) {
      const stepKey = barMod * 16 + transport.step16;

      if ((barMod >= 60 && barMod < 64) || barMod >= 88) {
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
    const macroExplode = ctx.matrix.getTarget('tectonicSpread', 0.12);
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const stutter = ctx.matrix.getSource('punch.stutter');

    const spontaneous = this.machine.update(dt, elapsed, {
      explodeAmount: Math.min(1.6, macroExplode + punchExplode * 0.95),
      hardLock,
      stutterFreeze: stutter > 0.5,
      sectionId: section.id,
      bar: barMod,
      step16: transport.step16,
    });

    if (spontaneous) {
      this.triggerImpulse(spontaneous, ctx);
    }

    const stress = this.machine.getStructuralStress();
    const strobe = this.machine.getStrobePulse();
    const spectral = this.machine.getSpectralGlow();
    const acid = this.machine.getAcidEnergy();
    const glitch = this.machine.getGlitchBurst();

    this.vault.update(
      dt,
      elapsed,
      this.machine.getMorphState(),
      stress,
      strobe,
      spectral,
      acid,
      this.machine.getSpectralHueNorm(),
      stutter > 0.5 || hardLock,
    );

    const traumaScale = ctx.matrix.getTarget('cameraTrauma', 0.72);
    this.cinemaDirector.update(
      ctx.camera,
      dt,
      elapsed,
      transport.beat,
      this.machine.getCameraAnchors(),
      traumaScale,
    );

    // Drive Stylized Cunningham / Gantz-Graf TSL Post-Processing Shader!
    const opticalFxMacro = ctx.matrix.getTarget('opticalStylize', 0.48);
    const isDeadStop =
      transport.playing &&
      section.id === 'flywheel-cadenza' &&
      barMod < 60 &&
      transport.step16 >= 12;

    ctx.setPostFx?.({
      glitch: Math.min(
        1.4,
        (glitch * 0.85 + stutter * 0.75) * (0.4 + opticalFxMacro * 1.15),
      ),
      lensDistort:
        0.06 +
        opticalFxMacro * 0.16 +
        strobe * 0.14 +
        (this.machine.getMorphState() === 'NON_EUCLIDEAN_HELIX' ? 0.12 : 0),
      aberration:
        0.18 +
        opticalFxMacro * 0.42 +
        this.machine.getArcFlash() * 0.45 +
        glitch * 0.4,
      grain: 0.12 + opticalFxMacro * 0.24,
      bleachGrade: 0.28 + opticalFxMacro * 0.26,
      starkThreshold: hardLock
        ? 0.65
        : isDeadStop
          ? 0.42
          : Math.max(0, glitch - 1.1) * 0.5,
      bloomStrength: 0.92 + spectral * 0.26 + acid * 0.18,
    });

    const combScream = ctx.matrix.getSource('punch.comb-scream');
    const pointerStrain = ctx.matrix.getSource('mouse.strain');
    const brutalDrive = ctx.matrix.getTarget('brutalDrive', 0.32);
    const metallic = ctx.matrix.getTarget('metallicTension', 0.48);

    ctx.audio.updateContinuous(
      {
        metallicTension: metallic,
        brutalDrive,
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: pointerStrain > 0.12 ? pointerStrain * 0.55 : 0,
      },
      {
        stutterGate: stutter,
        grainMs: 9 + (1 - ctx.matrix.getTarget('drillDensity', 0.56)) * 42,
        combMix: combScream * 0.75,
        combFreq: 174.61 + metallic * 523.25,
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
      activeInstances: (this.machine?.getActiveInstanceCount() ?? 0) + 256,
      structuralStress: this.machine?.getStructuralStress() ?? 0,
      kineticEnergy: this.machine?.getKineticEnergy() ?? 0,
      behavioralState: this.machine?.getBehavioralState(),
      activeShotBadge: this.cinemaDirector.getActiveShotBadge(),
    };
  }

  dispose(): void {
    if (this.vault) {
      this.vault.group.removeFromParent();
      this.vault.dispose();
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
  title: 'HYPER // TECTON',
  subtitle:
    'Non-Euclidean Metamorphic Megastructure // 96-Bar 6-Act Score',
  author: 'SONOBJET ENGINE // POC 01',
  bpm: 164,
  bars: GANTZ_TOTAL_BARS,
  sections: GANTZ_SECTIONS,
  macros: [
    {
      id: 'opticalStylize',
      label: 'OPTICAL GLITCH & GRADE',
      min: 0,
      max: 1,
      defaultValue: 0.48,
      description:
        'TSL scan-band glitch tears, anamorphic lens distortion, RGB dispersion, bleach-bypass & 35mm grain',
    },
    {
      id: 'fractureChaos',
      label: 'GLITCH / BREAK MUTATION',
      min: 0,
      max: 1,
      defaultValue: 0.38,
      description: 'Breakcore turnaround variation & S&H glitch-chirp probability',
    },
    {
      id: 'drillDensity',
      label: 'RATCHET DENSITY',
      min: 0,
      max: 1,
      defaultValue: 0.56,
      description: '64th micro-ratchet multiplier & stutter grain speed',
    },
    {
      id: 'metallicTension',
      label: 'ACID / RESONANCE Q',
      min: 0,
      max: 1,
      defaultValue: 0.48,
      description: '303 Acid diode Q, Glass-Armonica FM shimmer & formant resonance',
    },
    {
      id: 'tectonicSpread',
      label: 'NON-EUCLIDEAN DILATION',
      min: 0,
      max: 1.2,
      defaultValue: 0.12,
      description: 'Radial expansion & GPU vertex torsion across all 4,348 elements',
    },
    {
      id: 'brutalDrive',
      label: 'WAVEFOLD SATURATION',
      min: 0,
      max: 1,
      defaultValue: 0.32,
      description: 'AudioWorklet West-Coast wavefolder & sub-bass grit',
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
      id: 'mouse-strain-optical',
      source: 'mouse.strain',
      target: 'opticalStylize',
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
