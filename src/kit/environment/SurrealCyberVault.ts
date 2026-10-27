import * as THREE from 'three/webgpu';
import type { SonobjetMaterialRig } from '../../engine/render/TSLMaterials';

export type VaultMorphMode =
  | 'FOLDED_MONOLITH'
  | 'CANTILEVER_STRIKER'
  | 'INVERTED_CATHEDRAL'
  | 'NON_EUCLIDEAN_HELIX'
  | 'QUANTIZED_SHATTER'
  | 'SINGULARITY_CROWN';

/**
 * Surreal Cunningham / Gantz-Graf Metamorphic Megastructure Vault.
 *
 * Instead of static walls, 256 floating monolithic aperture blades, 12 razor
 * volumetric laser/xenon curtains, and an obsidian-mercury mirror horizon
 * dynamically dilate, twist, fracture, and invert alongside the machine!
 */
export class SurrealCyberVault {
  public readonly group = new THREE.Group();

  private readonly ribMesh: THREE.InstancedMesh;
  private readonly laserPivots: THREE.Group[] = [];
  private readonly laserMats: THREE.MeshBasicMaterial[] = [];

  private readonly keySpot: THREE.SpotLight;
  private readonly coldRimSpot: THREE.SpotLight;
  private readonly corePulseLight: THREE.PointLight;
  private readonly acidAccentLight: THREE.PointLight;

  private currentRadius = 9.5;
  private currentTwist = 0.0;
  private currentScatter = 0.0;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly localMaterials: THREE.Material[] = [];
  private readonly dummy = new THREE.Object3D();

  constructor(rig: SonobjetMaterialRig) {
    // 1. Deep Outer Void Containment Sphere (r = 95m)
    const skyGeo = new THREE.SphereGeometry(95, 24, 16);
    this.geometries.push(skyGeo);
    const skyMat = rig.chamberConcrete.clone();
    skyMat.side = THREE.BackSide;
    this.localMaterials.push(skyMat);
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(skyMesh);

    // 2. 256 Floating Metamorphic Aperture Blades (16 rings x 16 radial monoliths!)
    const ribGeo = new THREE.BoxGeometry(0.42, 4.8, 0.95);
    this.geometries.push(ribGeo);
    this.ribMesh = new THREE.InstancedMesh(ribGeo, rig.gunmetalInstanced, 256);
    this.ribMesh.receiveShadow = true;

    const c = new THREE.Color();
    for (let i = 0; i < 256; i++) {
      const shade = i % 5 === 0 ? 1.45 : 0.65 + ((i * 13) % 7) * 0.08;
      c.setRGB(shade * 0.9, shade * 0.96, shade * 1.08);
      this.ribMesh.setColorAt(i, c);
    }
    this.group.add(this.ribMesh);

    // 3. Surreal Liquid-Mercury / Obsidian Specular Horizon Plane (y = -4.2m)
    const floorGeo = new THREE.PlaneGeometry(140, 140);
    this.geometries.push(floorGeo);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x04060a,
      roughness: 0.07,
      metalness: 0.92,
    });
    this.localMaterials.push(floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = -4.2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // 4. 12 Articulated Volumetric Laser / Xenon Light Curtains
    const bladeBeamGeo = new THREE.ConeGeometry(2.8, 28, 20, 1, true);
    bladeBeamGeo.translate(0, 14, 0);
    bladeBeamGeo.scale(1.0, 1.0, 0.14); // Razor-thin Cunningham light sheet!
    this.geometries.push(bladeBeamGeo);

    for (let i = 0; i < 12; i++) {
      const pivot = new THREE.Group();
      const angle = (i / 12) * Math.PI * 2;
      pivot.position.set(
        Math.cos(angle) * 5.2,
        -3.9,
        Math.sin(angle) * 5.2,
      );

      const bMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xaad8ff : 0xff9248,
        transparent: true,
        opacity: 0.022,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.laserMats.push(bMat);
      this.localMaterials.push(bMat);

      const sheet = new THREE.Mesh(bladeBeamGeo, bMat);
      pivot.add(sheet);
      this.laserPivots.push(pivot);
      this.group.add(pivot);
    }

    // 5. High-Contrast Cunningham Surgical Chiaroscuro Lighting
    const hemi = new THREE.HemisphereLight(0x4b6b94, 0x040609, 0.42);
    this.group.add(hemi);

    // Stark overhead surgical xenon keylight
    this.keySpot = new THREE.SpotLight(0xf2f7ff, 125, 58, 0.58, 0.45, 1.2);
    this.keySpot.position.set(6.5, 15.5, 9.5);
    this.keySpot.castShadow = true;
    this.keySpot.shadow.mapSize.set(1024, 1024);
    this.keySpot.shadow.camera.near = 2;
    this.keySpot.shadow.camera.far = 46;
    this.group.add(this.keySpot, this.keySpot.target);

    // Ice-cobalt silhouette rim light
    this.coldRimSpot = new THREE.SpotLight(0x3ba8ff, 95, 52, 0.72, 0.5, 1.2);
    this.coldRimSpot.position.set(-10.5, 8.5, -11.5);
    this.group.add(this.coldRimSpot);

    // Central singularity pulse light
    this.corePulseLight = new THREE.PointLight(0xff8c3b, 6.0, 26, 1.3);
    this.corePulseLight.position.set(0, 0.5, 0);
    this.group.add(this.corePulseLight);

    // Acid / Crystalline secondary color light
    this.acidAccentLight = new THREE.PointLight(0x28ffd0, 3.5, 24, 1.3);
    this.acidAccentLight.position.set(0, 3.2, 2.0);
    this.group.add(this.acidAccentLight);
  }

  update(
    dt: number,
    elapsed: number,
    mode: VaultMorphMode,
    stress: number,
    strobePulse: number,
    spectralGlow: number,
    acidEnergy: number,
    spectralHueNorm: number,
    stutterFreeze: boolean,
  ): void {
    const h = stutterFreeze ? 0.0005 : Math.min(0.033, Math.max(0.001, dt));

    // Morph target architecture dimensions based on active state machine!
    let targetRadius = 9.5;
    let targetTwist = 0.06;
    let targetScatter = 0.0;

    switch (mode) {
      case 'FOLDED_MONOLITH':
        targetRadius = 8.2;
        targetTwist = 0.04;
        targetScatter = 0.05;
        break;
      case 'CANTILEVER_STRIKER':
        targetRadius = 14.5;
        targetTwist = 0.14;
        targetScatter = 0.25;
        break;
      case 'INVERTED_CATHEDRAL':
        targetRadius = 23.5;
        targetTwist = 0.22;
        targetScatter = 0.45;
        break;
      case 'NON_EUCLIDEAN_HELIX':
        targetRadius = 12.8;
        targetTwist = 0.68;
        targetScatter = 0.35;
        break;
      case 'QUANTIZED_SHATTER':
        targetRadius = 16.5;
        targetTwist = 0.38;
        targetScatter = 1.0;
        break;
      case 'SINGULARITY_CROWN':
        targetRadius = 25.0;
        targetTwist = 0.48;
        targetScatter = 0.65;
        break;
    }

    const slew = 1 - Math.exp(-3.2 * h);
    this.currentRadius += (targetRadius - this.currentRadius) * slew;
    this.currentTwist += (targetTwist - this.currentTwist) * slew;
    this.currentScatter += (targetScatter - this.currentScatter) * slew;

    // Update all 256 Floating Architectural Monolith Ribs!
    let idx = 0;
    for (let ring = 0; ring < 16; ring++) {
      const zNorm = ring / 15 - 0.5; // -0.5 .. +0.5
      const zPos = zNorm * 64.0;
      const ringRadius =
        this.currentRadius *
        (1.0 + Math.sin(zNorm * Math.PI * 2 + elapsed * 0.4) * 0.18);
      const ringSpin =
        elapsed * (ring % 2 === 0 ? 0.08 : -0.06) +
        zNorm * this.currentTwist * 7.5;

      for (let seg = 0; seg < 16; seg++) {
        const theta = (seg / 16) * Math.PI * 2 + ringSpin;
        const quantPush =
          this.currentScatter *
          (((ring * 7 + seg * 3) % 5) - 2) *
          1.45;
        const r = ringRadius + quantPush + strobePulse * (seg % 2 === 0 ? 0.6 : -0.3);

        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r * 0.78 + 2.2;

        this.dummy.position.set(px, py, zPos);
        this.dummy.rotation.set(
          this.currentTwist * 0.6,
          this.currentScatter * ((seg % 3) - 1) * 0.5,
          theta + Math.PI * 0.5,
        );

        // Non-uniform surreal architectural stretching!
        const scaleY =
          0.65 +
          ((ring + seg) % 4) * 0.35 +
          stress * 0.7 +
          this.currentScatter * 0.8;
        const scaleX = 1.0 - this.currentScatter * 0.45;
        this.dummy.scale.set(scaleX, scaleY, 1.0 + spectralGlow * 0.4);
        this.dummy.updateMatrix();
        this.ribMesh.setMatrixAt(idx++, this.dummy.matrix);
      }
    }
    this.ribMesh.instanceMatrix.needsUpdate = true;

    // Update Lights & 12 Articulated Laser Light Curtains
    this.keySpot.intensity = 105 + strobePulse * 85;
    this.corePulseLight.intensity = 4.5 + spectralGlow * 28 + strobePulse * 18;
    this.corePulseLight.color.setHSL(
      (0.06 + spectralHueNorm * 0.65) % 1.0,
      0.85,
      0.58,
    );

    this.acidAccentLight.intensity = 2.0 + acidEnergy * 34.0;
    this.acidAccentLight.color.setHex(acidEnergy > 0.35 ? 0x22ffd5 : 0x5599ff);

    for (let i = 0; i < this.laserPivots.length; i++) {
      const p = this.laserPivots[i];
      const baseAngle = (i / 12) * Math.PI * 2 + elapsed * 0.14;
      const rad = this.currentRadius * 0.52;
      p.position.set(Math.cos(baseAngle) * rad, -3.9, Math.sin(baseAngle) * rad);

      const tiltInward =
        0.24 + Math.sin(elapsed * 0.65 + i * 0.8) * 0.32 + spectralGlow * 0.18;
      p.rotation.set(
        Math.sin(baseAngle) * tiltInward,
        baseAngle,
        -Math.cos(baseAngle) * tiltInward,
      );

      const mat = this.laserMats[i];
      mat.opacity = Math.min(
        0.14,
        0.014 + spectralGlow * 0.055 + acidEnergy * 0.05 + strobePulse * 0.035,
      );
      if (acidEnergy > 0.28 && i % 3 === 0) {
        mat.color.setHex(0x28ffd8);
      } else {
        mat.color.setHSL((spectralHueNorm + i * 0.07) % 1.0, 0.82, 0.62);
      }
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.localMaterials) m.dispose();
  }
}
