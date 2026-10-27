import * as THREE from 'three/webgpu';

export class WebGPUStage {
  public readonly canvas: HTMLCanvasElement;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer | null = null;
  private backendLabel: 'WebGPU' | 'WebGL2' | 'Headless' = 'Headless';
  private ready = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sonobjet-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b0e);
    this.scene.fog = new THREE.FogExp2(0x090b0e, 0.048);

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 120);
    this.camera.position.set(0, 0.65, 6.4);
  }

  async init(): Promise<void> {
    try {
      const renderer = new THREE.WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = true;

      await renderer.init();
      this.renderer = renderer;

      const backend = (
        renderer as unknown as { backend?: { isWebGPUBackend?: boolean } }
      ).backend;
      this.backendLabel = backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
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
    this.renderer.render(this.scene, this.camera);
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
    this.renderer?.dispose();
  }
}
