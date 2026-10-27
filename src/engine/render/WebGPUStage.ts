import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  Fn,
  abs,
  clamp,
  convertToTexture,
  dot,
  floor,
  float,
  fract,
  length,
  mix,
  pass,
  pow,
  rand,
  sin,
  smoothstep,
  step,
  sub,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type { PostFxState } from '../core/types';

const ENVIRONMENT_PALETTES = [
  { background: 0x030508, fog: 0x030508 }, // steel / cyan
  { background: 0x120709, fog: 0x0b0708 }, // Cornell red / cyan
  { background: 0x080414, fog: 0x06030e }, // ultraviolet / acid
  { background: 0x17130d, fog: 0x100d09 }, // ink / warm paper
  { background: 0x100b04, fog: 0x0b0805 }, // sodium / ice
] as const;

/**
 * WebGPU / WebGL2 stage with an authored optical pipeline. Every treatment is
 * independently controllable: the old glitch stack can be completely bypassed,
 * while palette, linocut, neon-edge, bloom, exposure and the physical light rig
 * remain available as timeline-able Director looks.
 */
export class WebGPUStage {
  public readonly canvas: HTMLCanvasElement;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer | null = null;
  private postProcessing: THREE.PostProcessing | null = null;
  private backendLabel: 'WebGPU' | 'WebGL2' | 'Headless' = 'Headless';
  private ready = false;
  private resizeObserver: ResizeObserver | null = null;
  private exposure = 1.18;
  private paletteIndex = 0;

  // Live TSL post-FX uniforms.
  private readonly uGlitch = uniform(0.0);
  private readonly uLensDistort = uniform(0.045);
  private readonly uAberration = uniform(0.08);
  private readonly uGrain = uniform(0.07);
  private readonly uBleachGrade = uniform(0.2);
  private readonly uStarkThreshold = uniform(0.0);
  private readonly uBloomBoost = uniform(0.88);
  private readonly uLinocut = uniform(0.0);
  private readonly uNeonGlow = uniform(0.08);
  private readonly uPalette = uniform(0.0);
  private readonly uShadowStrength = uniform(0.62);

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sonobjet-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(ENVIRONMENT_PALETTES[0].background);
    this.scene.fog = new THREE.FogExp2(ENVIRONMENT_PALETTES[0].fog, 0.015);

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.06, 220);
    this.camera.position.set(0, 1.4, 9.2);
  }

  setPostFx(fx: Partial<PostFxState>): void {
    if (fx.glitch !== undefined) this.uGlitch.value = fx.glitch;
    if (fx.lensDistort !== undefined) this.uLensDistort.value = fx.lensDistort;
    if (fx.aberration !== undefined) this.uAberration.value = fx.aberration;
    if (fx.grain !== undefined) this.uGrain.value = fx.grain;
    if (fx.bleachGrade !== undefined) this.uBleachGrade.value = fx.bleachGrade;
    if (fx.starkThreshold !== undefined) this.uStarkThreshold.value = fx.starkThreshold;
    if (fx.bloomStrength !== undefined) this.uBloomBoost.value = fx.bloomStrength;
    if (fx.linocut !== undefined) this.uLinocut.value = fx.linocut;
    if (fx.neonGlow !== undefined) this.uNeonGlow.value = fx.neonGlow;
    if (fx.shadowStrength !== undefined) this.uShadowStrength.value = fx.shadowStrength;
    if (fx.exposure !== undefined) {
      this.exposure = Math.max(0.45, Math.min(2.2, fx.exposure));
      if (this.renderer) this.renderer.toneMappingExposure = this.exposure;
    }
    if (fx.palette !== undefined) {
      this.uPalette.value = Math.max(0, Math.min(4, fx.palette));
      const next = Math.max(0, Math.min(4, Math.round(fx.palette)));
      if (next !== this.paletteIndex) {
        this.paletteIndex = next;
        this.applyEnvironmentPalette(next);
      }
    }
  }

  async init(): Promise<void> {
    try {
      const renderer = new THREE.WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = this.exposure;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      await renderer.init();
      this.renderer = renderer;

      const backend = (
        renderer as unknown as { backend?: { isWebGPUBackend?: boolean } }
      ).backend;
      this.backendLabel = backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2';

      try {
        const scenePass = pass(this.scene, this.camera);
        const sceneTex = scenePass.getTextureNode('output');
        const bloomPass = bloom(sceneTex, 0.46, 0.36, 0.72);
        const compositeTex = convertToTexture(
          sceneTex.add(bloomPass.mul(this.uBloomBoost)),
        );

        const stylizedOutput = Fn(() => {
          const baseUv = compositeTex.uvNode ? compositeTex.uvNode.xy : uv();
          const center = vec2(0.5, 0.5);
          const offset = sub(baseUv, center);
          const r2 = dot(offset, offset);
          const rDist = length(offset);

          // 1. Anamorphic barrel / pincushion optics. A value of zero is a
          // mathematically clean bypass rather than a merely subtle preset.
          const barrelFactor = float(1.0).add(this.uLensDistort.mul(r2).mul(1.35));
          const lensUv = center.add(offset.mul(barrelFactor));

          // 2. Digital scan-band displacement. Glitch zero disables both the
          // scan tear and its old scanline coupling.
          const tQuant = floor(time.mul(36.0));
          const coarseBand = floor(lensUv.y.mul(38.0));
          const fineBand = floor(lensUv.y.mul(180.0));
          const bandNoise = rand(vec2(coarseBand.mul(0.13), tQuant.mul(0.07)));
          const fineNoise = rand(vec2(fineBand.mul(0.29), tQuant.mul(0.19)));
          const tearMask = step(
            sub(float(0.96), clamp(this.uGlitch.mul(0.42), 0.0, 0.65)),
            bandNoise,
          );
          const tearShift = sub(fineNoise, float(0.5))
            .mul(0.11)
            .mul(this.uGlitch)
            .mul(tearMask);
          const warpedUv = clamp(
            vec2(lensUv.x.add(tearShift), lensUv.y),
            vec2(0.002, 0.002),
            vec2(0.998, 0.998),
          );

          // 3. Independently bypassable chromatic dispersion.
          const chromaAmt = this.uAberration
            .mul(0.012)
            .mul(rDist.add(tearMask.mul(0.65)));
          const chromaOffset = offset.mul(chromaAmt).add(
            vec2(tearShift.mul(0.35), float(0.0)),
          );
          const uvR = clamp(
            warpedUv.add(chromaOffset),
            vec2(0.002, 0.002),
            vec2(0.998, 0.998),
          );
          const uvB = clamp(
            sub(warpedUv, chromaOffset),
            vec2(0.002, 0.002),
            vec2(0.998, 0.998),
          );
          const colR = compositeTex.sample(uvR).r;
          const colG = compositeTex.sample(warpedUv).g;
          const colB = compositeTex.sample(uvB).b;
          const rawRgb = vec3(colR, colG, colB);
          const luma = dot(rawRgb, vec3(0.2126, 0.7152, 0.0722));

          // A tiny finite-difference edge field is shared by neon tubing and
          // carved linocut ridges. It works in both WebGPU and the WebGL2
          // fallback and avoids a second geometry pass.
          const sampleX = compositeTex.sample(
            clamp(
              warpedUv.add(vec2(0.0016, 0.0)),
              vec2(0.002, 0.002),
              vec2(0.998, 0.998),
            ),
          );
          const sampleY = compositeTex.sample(
            clamp(
              warpedUv.add(vec2(0.0, 0.0022)),
              vec2(0.002, 0.002),
              vec2(0.998, 0.998),
            ),
          );
          const lumaX = dot(sampleX.rgb, vec3(0.2126, 0.7152, 0.0722));
          const lumaY = dot(sampleY.rgb, vec3(0.2126, 0.7152, 0.0722));
          const edge = clamp(
            abs(lumaX.sub(luma)).add(abs(lumaY.sub(luma))).mul(7.5),
            0.0,
            1.0,
          );

          // 4. Base silver-halide grade.
          const sCurveLuma = smoothstep(float(0.02), float(0.98), luma);
          const coldShadow = vec3(0.02, 0.045, 0.085).mul(
            sub(float(1.0), clamp(luma.mul(2.0), 0.0, 1.0)),
          );
          const steel = mix(
            rawRgb,
            vec3(sCurveLuma).mul(vec3(0.92, 0.97, 1.05)),
            clamp(this.uBleachGrade, 0.0, 0.85),
          ).add(coldShadow);

          // 5. Five selectable palettes. Palette changes are intentional cuts;
          // all other parameters remain continuously keyframeable.
          const cornell = rawRgb
            .mul(vec3(1.12, 0.78, 0.82))
            .add(vec3(0.08, 0.018, 0.012).mul(sub(float(1.0), luma)))
            .add(vec3(0.0, 0.12, 0.2).mul(pow(luma, float(2.2))));
          const ultraviolet = mix(
            vec3(0.025, 0.006, 0.07),
            vec3(0.22, 1.2, 1.45),
            smoothstep(float(0.08), float(0.82), luma),
          ).add(rawRgb.mul(vec3(0.42, 0.12, 0.58)));
          const inkPalette = mix(
            vec3(0.018, 0.016, 0.013),
            vec3(0.92, 0.79, 0.58),
            smoothstep(float(0.12), float(0.88), luma),
          );
          const sodium = rawRgb
            .mul(vec3(1.18, 0.82, 0.42))
            .add(vec3(0.05, 0.14, 0.2).mul(pow(luma, float(2.4))));
          const palette01 = mix(steel, cornell, step(float(0.5), this.uPalette));
          const palette012 = mix(
            palette01,
            ultraviolet,
            step(float(1.5), this.uPalette),
          );
          const palette0123 = mix(
            palette012,
            inkPalette,
            step(float(2.5), this.uPalette),
          );
          const paletteRgb = mix(
            palette0123,
            sodium,
            step(float(3.5), this.uPalette),
          );

          // 6. Shadow-play contrast. This is paired with real spotlights and
          // Cornell-box receiving surfaces in ModalFlowMachine.
          const shadowCurve = mix(
            float(1.0),
            smoothstep(float(0.025), float(0.78), luma).mul(1.22),
            clamp(this.uShadowStrength.mul(0.55), 0.0, 0.78),
          );
          const shadowed = paletteRgb.mul(shadowCurve);

          // 7. Neon-light installation treatment: edge light, hot highlights
          // and palette-colored faux bounce. Bloom remains independently set.
          const neonA = mix(
            vec3(0.12, 0.75, 1.9),
            vec3(2.2, 0.12, 0.72),
            smoothstep(float(0.18), float(0.82), luma),
          );
          const neonB = mix(
            vec3(0.22, 2.1, 1.3),
            vec3(1.8, 0.42, 2.2),
            smoothstep(float(0.2), float(0.9), luma),
          );
          const neonTint = mix(neonA, neonB, step(float(1.5), this.uPalette));
          const neonSignal = edge
            .mul(2.8)
            .add(pow(clamp(luma, 0.0, 1.0), float(3.1)).mul(1.35));
          const neonRgb = rawRgb.mul(0.08).add(neonTint.mul(neonSignal));
          const neonMixed = mix(
            shadowed,
            neonRgb,
            clamp(this.uNeonGlow, 0.0, 1.0),
          );

          // 8. Stark threshold is still available, but no longer forced by the
          // default looks.
          const graphicStencil = vec3(
            smoothstep(float(0.16), float(0.38), luma).mul(1.35),
          ).mul(vec3(0.88, 0.95, 1.08));
          const stark = mix(
            neonMixed,
            graphicStencil,
            clamp(this.uStarkThreshold, 0.0, 0.88),
          );

          // 9. Linocut: warm stock, dense black relief, edge cuts and two
          // directional hatch frequencies. It can be mixed over any palette.
          const hatchA = sin(baseUv.x.mul(680.0).add(baseUv.y.mul(410.0)))
            .mul(0.5)
            .add(0.5);
          const hatchB = sin(baseUv.x.mul(-310.0).add(baseUv.y.mul(760.0)))
            .mul(0.5)
            .add(0.5);
          const midtone = smoothstep(float(0.08), float(0.62), luma).mul(
            sub(float(1.0), smoothstep(float(0.6), float(0.96), luma)),
          );
          const hatch = step(float(0.56), hatchA)
            .add(step(float(0.72), hatchB))
            .mul(0.15)
            .mul(midtone);
          const relief = clamp(
            smoothstep(float(0.2), float(0.7), luma)
              .sub(edge.mul(0.74))
              .sub(hatch),
            0.0,
            1.0,
          );
          const linoRgb = mix(
            vec3(0.012, 0.01, 0.008),
            vec3(0.92, 0.78, 0.55),
            relief,
          );
          const styled = mix(stark, linoRgb, clamp(this.uLinocut, 0.0, 1.0));

          // 10. Independent film grain, optical scanline and vignette.
          const grainSeed = fract(baseUv.mul(vec2(512.0, 512.0)).add(time.mul(17.3)));
          const grainVal = sub(rand(grainSeed), float(0.5)).mul(
            this.uGrain.mul(0.22),
          );
          const scanline = sin(baseUv.y.mul(920.0))
            .mul(0.024)
            .mul(this.uGrain.add(this.uGlitch.mul(0.5)));
          const vignette = clamp(
            sub(float(1.16), pow(rDist, float(1.85)).mul(1.32)),
            0.22,
            1.0,
          );
          const finalRgb = clamp(
            styled.add(grainVal).sub(scanline).mul(vignette),
            vec3(0.0, 0.0, 0.0),
            vec3(8.0, 8.0, 8.0),
          );
          return vec4(finalRgb, float(1.0));
        });

        const post = new THREE.PostProcessing(renderer);
        post.outputNode = stylizedOutput();
        this.postProcessing = post;
      } catch (postErr) {
        console.warn('[Sonobjet] PostProcessing fallback to direct render:', postErr);
        this.postProcessing = null;
      }

      this.ready = true;
      this.handleResize();

      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      if (this.canvas.parentElement) {
        this.resizeObserver.observe(this.canvas.parentElement);
      }
      window.addEventListener('resize', this.onWindowResize);
    } catch (err) {
      console.warn(
        '[Sonobjet] WebGPURenderer unavailable in this environment; running in headless telemetry mode.',
        err,
      );
      this.backendLabel = 'Headless';
      this.ready = false;
    }
  }

  getBackendLabel(): 'WebGPU' | 'WebGL2' | 'Headless' {
    return this.backendLabel;
  }

  isReady(): boolean {
    return this.ready;
  }

  render(): void {
    if (!this.ready || !this.renderer) return;
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private applyEnvironmentPalette(index: number): void {
    const palette = ENVIRONMENT_PALETTES[index] ?? ENVIRONMENT_PALETTES[0];
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(palette.background);
    } else {
      this.scene.background = new THREE.Color(palette.background);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(palette.fog);
    }
  }

  private onWindowResize = (): void => {
    this.handleResize();
  };

  handleResize(): void {
    const parent = this.canvas.parentElement;
    const width = Math.max(1, parent?.clientWidth || window.innerWidth);
    const height = Math.max(1, parent?.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height, false);
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.postProcessing?.dispose();
    this.renderer?.dispose();
  }
}
