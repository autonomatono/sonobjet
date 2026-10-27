import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  Fn,
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

/**
 * WebGPU / WebGL2 Stage with Stylized Cunningham / Gantz-Graf TSL Post-Processing:
 * - Anamorphic Barrel/Pincushion Lens Distortion
 * - Quantized Scan-Band & Block Glitch Displacement
 * - Radial RGB Chromatic Aberration
 * - Thresholded HDR Bloom
 * - Silver-Halide Bleach-Bypass Color Grading & Stark Graphic Thresholding
 * - 35mm Film Noise, Micro-Scanline Artifacts & Optical Vignette
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

  // Live TSL Post-FX Uniforms
  private readonly uGlitch = uniform(0.0);
  private readonly uLensDistort = uniform(0.08);
  private readonly uAberration = uniform(0.24);
  private readonly uGrain = uniform(0.16);
  private readonly uBleachGrade = uniform(0.32);
  private readonly uStarkThreshold = uniform(0.0);
  private readonly uBloomBoost = uniform(1.0);

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sonobjet-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030508);
    this.scene.fog = new THREE.FogExp2(0x030508, 0.015);

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
    if (fx.starkThreshold !== undefined) {
      this.uStarkThreshold.value = fx.starkThreshold;
    }
    if (fx.bloomStrength !== undefined) {
      this.uBloomBoost.value = fx.bloomStrength;
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
      renderer.toneMappingExposure = 1.22;
      renderer.shadowMap.enabled = true;

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

          // 1. Anamorphic Barrel / Pincushion Optical Lens Distortion
          const barrelFactor = float(1.0).add(this.uLensDistort.mul(r2).mul(1.35));
          const lensUv = center.add(offset.mul(barrelFactor));

          // 2. Digital Scan-Band & Block Glitch Displacement
          const tQuant = floor(time.mul(36.0));
          const coarseBand = floor(lensUv.y.mul(38.0));
          const fineBand = floor(lensUv.y.mul(180.0));
          const bandNoise = rand(vec2(coarseBand.mul(0.13), tQuant.mul(0.07)));
          const fineNoise = rand(vec2(fineBand.mul(0.29), tQuant.mul(0.19)));

          // Trigger horizontal tear only on active high-hash scan bands!
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

          // 3. Radial & Glitch-Coupled RGB Chromatic Dispersion
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

          // 4. Cunningham Bleach-Bypass & Cold-Cobalt / Warm-Xenon Split Grade
          const luma = dot(rawRgb, vec3(0.2126, 0.7152, 0.0722));
          const sCurveLuma = smoothstep(float(0.02), float(0.98), luma);
          const coldShadow = vec3(0.02, 0.045, 0.085).mul(
            sub(float(1.0), clamp(luma.mul(2.0), 0.0, 1.0)),
          );
          const silverDesat = mix(
            rawRgb,
            vec3(sCurveLuma).mul(vec3(0.92, 0.97, 1.05)),
            clamp(this.uBleachGrade, 0.0, 0.85),
          ).add(coldShadow);

          // 5. Stark Gantz-Graf High-Contrast Graphic Threshold Flash (on dead-locks / spikes)
          const graphicStencil = vec3(
            smoothstep(float(0.16), float(0.38), luma).mul(1.35),
          ).mul(vec3(0.88, 0.95, 1.08));
          const graded = mix(
            silverDesat,
            graphicStencil,
            clamp(this.uStarkThreshold, 0.0, 0.88),
          );

          // 6. 35mm Silver-Halide Film Grain + Subtle Optical Scanlines + Deep Lens Vignette
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
            graded.add(grainVal).sub(scanline).mul(vignette),
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
