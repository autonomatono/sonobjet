import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { clamp, float, length, pass, screenUV, sub, vec2 } from 'three/tsl';

export class WebGPUStage {
  public readonly canvas: HTMLCanvasElement;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer | null = null;
  private postProcessing: THREE.PostProcessing | null = null;
  private backendLabel: 'WebGPU' | 'WebGL2' | 'Headless' = 'Headless';
  private ready = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sonobjet-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.052);

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    this.camera.position.set(0, 0.55, 6.2);
  }

  async init(): Promise<void> {
    try {
      const renderer = new THREE.WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.24;
      renderer.shadowMap.enabled = true;

      await renderer.init();
      this.renderer = renderer;

      const backend = (
        renderer as unknown as { backend?: { isWebGPUBackend?: boolean } }
      ).backend;
      this.backendLabel = backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2';

      // Build TSL HDR Bloom + Chiaroscuro Cinema Vignette Post-Processing
      try {
        const scenePass = pass(this.scene, this.camera);
        const sceneColor = scenePass.getTextureNode('output');
        const bloomPass = bloom(sceneColor, 0.42, 0.38, 0.82);

        const centeredUv = sub(screenUV, vec2(0.5, 0.5));
        const dist = length(centeredUv);
        const vignette = clamp(
          sub(float(1.12), dist.mul(dist).mul(1.05)),
          0.38,
          1.0,
        );

        const post = new THREE.PostProcessing(renderer);
        post.outputNode = sceneColor.add(bloomPass).mul(vignette);
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
