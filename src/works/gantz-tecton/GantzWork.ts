import type {
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
import { GantzAgglomerate } from './GantzAgglomerate';
import { evaluateGantzStep, GANTZ_SECTIONS } from './GantzScore';

class GantzSceneInstance implements WorkSceneInstance {
  private materials: SonobjetMaterialRig | null = null;
  private chamber: BrutalistChamber | null = null;
  private construct: GantzAgglomerate | null = null;
  private readonly cameraRig = new KineticCameraRig();
  private lastSectionIdx = -1;

  init(ctx: WorkRuntimeContext): void {
    this.materials = createSonobjetMaterials();
    this.chamber = new BrutalistChamber(this.materials.chamberConcrete);
    this.construct = new GantzAgglomerate(this.materials);

    ctx.scene.add(this.chamber.group);
    ctx.scene.add(this.construct.root);

    // Default to Autonomous Cut Director so the music video cuts dynamically like Rutterford's film!
    this.cameraRig.setMode(5);
  }

  scheduleStep(
    step64: number,
    bar: number,
    audioTime: number,
    ctx: WorkRuntimeContext,
  ): void {
    const chaos = ctx.matrix.getTarget('fractureChaos', 0.45);
    const drillDensity = ctx.matrix.getTarget('drillDensity', 0.58);
    const metallicTension = ctx.matrix.getTarget('metallicTension', 0.52);
    const brutalDrive = ctx.matrix.getTarget('brutalDrive', 0.48);
    const decayScale = ctx.matrix.getTarget('decayScale', 1.0);

    const forceRatchet = ctx.matrix.getSource('punch.ratchet') > 0.5;
    const forceReverse = ctx.matrix.getSource('punch.reverse-slice') > 0.5;
    const halftime = ctx.matrix.getSource('punch.halftime') > 0.5;

    const events = evaluateGantzStep(step64, bar, audioTime, {
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
      strain: this.construct?.core.getStructuralStress() ?? 0,
    };

    for (const ev of events) {
      ctx.audio.triggerImpulse(ev, synthMacros);
      ctx.clock.queueVisualEvent(ev);
    }
  }

  triggerImpulse(event: ImpulseEvent, ctx: WorkRuntimeContext): void {
    if (!this.construct) return;
    this.construct.applyImpulse(event);

    // Transfer heavy seismic shock to camera mount
    if (
      event.subsystem === 'sub-rupture' ||
      event.subsystem === 'spine-shear' ||
      event.subsystem === 'core-implode'
    ) {
      const traumaMacro = ctx.matrix.getTarget('cameraTrauma', 0.75);
      this.cameraRig.addShock(event.velocity * traumaMacro, event.locus);
    }

    // Autonomous director cuts on major structural fractures
    if (
      event.origin === 'score' &&
      event.subsystem === 'arc-discharge' &&
      event.velocity > 0.85
    ) {
      const cutIdx = Math.floor(Math.abs(event.beat * 3)) % 4;
      this.cameraRig.triggerDirectorCut(cutIdx);
    }

    // If live impulse (audioTime === 0), fire sound immediately too!
    if (event.audioTime === 0) {
      ctx.audio.triggerImpulse(event, {
        metallicTension: ctx.matrix.getTarget('metallicTension', 0.52),
        brutalDrive: ctx.matrix.getTarget('brutalDrive', 0.48),
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: this.construct.core.getStructuralStress(),
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    transport: TransportState,
    ctx: WorkRuntimeContext,
  ): void {
    if (!this.construct || !this.chamber || !this.materials) return;

    const section = GANTZ_SECTIONS[transport.sectionIndex];
    if (section) {
      ctx.matrix.setSource('score.intensity', section.intensity);
      if (transport.sectionIndex !== this.lastSectionIdx) {
        this.lastSectionIdx = transport.sectionIndex;
        this.cameraRig.triggerDirectorCut(transport.sectionIndex % 4);
      }
    }

    const sectionExplode =
      transport.playing && section?.id === 'cad-disassembly' ? 0.58 : 0;
    const punchExplode = ctx.matrix.getSource('punch.tectonic-explode');
    const macroExplode = ctx.matrix.getTarget('tectonicSpread', 0.08);
    const hardLock = ctx.matrix.getSource('punch.hard-lock') > 0.5;
    const chaos = ctx.matrix.getTarget('fractureChaos', 0.45);

    const spontaneous = this.construct.update(dt, elapsed, {
      explodeAmount: Math.min(1.6, macroExplode + sectionExplode + punchExplode * 0.95),
      hardLock,
      geometryChaos: chaos,
      materials: this.materials,
    });

    if (spontaneous) {
      this.triggerImpulse(spontaneous, ctx);
    }

    const stress = this.construct.core.getStructuralStress();
    this.chamber.updateLighting(
      stress,
      this.construct.getArcFlash(),
      this.construct.getStrobePulse(),
    );

    const traumaScale = ctx.matrix.getTarget('cameraTrauma', 0.75);
    this.cameraRig.update(ctx.camera, dt, elapsed, traumaScale);

    // Update continuous audio strain & AudioWorklet fracture bus
    const stutter = ctx.matrix.getSource('punch.stutter');
    const combScream = ctx.matrix.getSource('punch.comb-scream');
    const brutalDrive = ctx.matrix.getTarget('brutalDrive', 0.48);
    const metallic = ctx.matrix.getTarget('metallicTension', 0.52);

    ctx.audio.updateContinuous(
      {
        metallicTension: metallic,
        brutalDrive,
        decayScale: ctx.matrix.getTarget('decayScale', 1.0),
        strain: Math.max(0, stress - 0.18),
      },
      {
        stutterGate: stutter,
        grainMs: 9 + (1 - ctx.matrix.getTarget('drillDensity', 0.58)) * 42,
        combMix: Math.min(0.82, combScream * 0.72 + stress * 0.22),
        combFreq: 110 + metallic * 580 + stress * 240,
        combFeedback: 0.68 + combScream * 0.23,
        crush: brutalDrive * 0.45,
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

  setPointerStrain(x: number, y: number, tension: number, active: boolean): void {
    this.construct?.setPointerStrain(x, y, tension, active);
  }

  getMetrics() {
    return {
      activeInstances: this.construct?.getActiveInstanceCount() ?? 0,
      structuralStress: this.construct?.core.getStructuralStress() ?? 0,
      kineticEnergy: this.construct?.core.getKineticEnergy() ?? 0,
    };
  }

  dispose(): void {
    if (this.chamber) {
      this.chamber.group.removeFromParent();
      this.chamber.dispose();
    }
    if (this.construct) {
      this.construct.root.removeFromParent();
      this.construct.dispose();
    }
    this.materials?.dispose();
  }
}

export const GantzWork: WorkDefinition = {
  id: 'gantz-tecton',
  title: 'GANTZ // TECTON',
  subtitle: '717-Part Hyper-Articulated IDM/Breakcore Visceral Construct',
  author: 'SONOBJET ENGINE // POC 01',
  bpm: 172,
  bars: 64,
  sections: GANTZ_SECTIONS,
  macros: [
    {
      id: 'fractureChaos',
      label: 'FRACTURE CHAOS',
      min: 0,
      max: 1,
      defaultValue: 0.46,
      description: 'Break-slice mutation probability & mechanical tremor',
    },
    {
      id: 'drillDensity',
      label: 'DRILL DENSITY',
      min: 0,
      max: 1,
      defaultValue: 0.58,
      description: '64th/128th bouncing-ball ratchet multiplier & stutter grain',
    },
    {
      id: 'metallicTension',
      label: 'ALLOY TENSION',
      min: 0,
      max: 1,
      defaultValue: 0.52,
      description: 'Modal plate tuning, comb resonator frequency & filter Q',
    },
    {
      id: 'tectonicSpread',
      label: 'TECTONIC SPREAD',
      min: 0,
      max: 1.2,
      defaultValue: 0.06,
      description: 'Exploded-CAD radial shell separation',
    },
    {
      id: 'brutalDrive',
      label: 'WAVEFOLD CRUSH',
      min: 0,
      max: 1,
      defaultValue: 0.36,
      description: 'AudioWorklet sine wavefolder & sample decimation grit',
    },
    {
      id: 'cameraTrauma',
      label: 'SEISMIC TRAUMA',
      min: 0,
      max: 1.4,
      defaultValue: 0.78,
      description: 'Anisotropic camera mount recoil on sub-ruptures',
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
      amount: 0.14,
      slew: 0.12,
      enabled: true,
    },
  ],
  createInstance: () => new GantzSceneInstance(),
};
