import * as THREE from 'three/webgpu';

/**
 * High-Contrast Chiaroscuro Containment Chamber with Overhead Gantry Crane,
 * Volumetric Xenon Light Cones, Wet Specular Inspection Plinth, and Forge Bounce.
 */
export class BrutalistChamber {
  public readonly group = new THREE.Group();
  private readonly keyLight: THREE.SpotLight;
  private readonly rimLightCyan: THREE.SpotLight;
  private readonly forgeBounceLight: THREE.PointLight;
  private readonly larynxLight: THREE.PointLight;
  private readonly slitMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly godRayMaterials: THREE.MeshBasicMaterial[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(concreteMaterial: THREE.Material) {
    // 1. Dark Shuttered Containment Shell
    const roomGeo = new THREE.BoxGeometry(20, 12.5, 20);
    this.geometries.push(roomGeo);

    const wallMat = concreteMaterial.clone();
    wallMat.side = THREE.BackSide;
    this.materials.push(wallMat);

    const roomMesh = new THREE.Mesh(roomGeo, wallMat);
    roomMesh.position.set(0, 2.2, -1.2);
    roomMesh.receiveShadow = true;
    this.group.add(roomMesh);

    // 2. Architectural Concrete Buttresses & Overhead Gantry I-Beams
    const ribGeo = new THREE.BoxGeometry(0.36, 12.4, 0.72);
    const beamGeo = new THREE.BoxGeometry(18.5, 0.28, 0.34);
    this.geometries.push(ribGeo, beamGeo);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x12161c,
      roughness: 0.62,
      metalness: 0.68,
    });
    this.materials.push(steelMat);

    for (let i = -4; i <= 4; i++) {
      const backRib = new THREE.Mesh(ribGeo, steelMat);
      backRib.position.set(i * 2.2, 2.2, -10.8);
      backRib.receiveShadow = true;
      this.group.add(backRib);
    }

    // Overhead Gantry Beams from which the automaton's tendons hang (y = 3.85)
    for (const zOff of [-0.9, 0.9]) {
      const gantry = new THREE.Mesh(beamGeo, steelMat);
      gantry.position.set(0, 3.85, zOff);
      gantry.castShadow = true;
      this.group.add(gantry);
    }

    // 3. Wet Specular Slate Inspection Plinth on Chamber Floor (y = -2.35)
    const plinthGeo = new THREE.CylinderGeometry(3.4, 3.65, 0.18, 48);
    const innerRingGeo = new THREE.RingGeometry(2.15, 2.22, 64);
    this.geometries.push(plinthGeo, innerRingGeo);

    const wetSlateMat = new THREE.MeshStandardMaterial({
      color: 0x0b0e13,
      roughness: 0.14,
      metalness: 0.78,
    });
    const brassInlayMat = new THREE.MeshStandardMaterial({
      color: 0x9b7234,
      roughness: 0.28,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    this.materials.push(wetSlateMat, brassInlayMat);

    const plinth = new THREE.Mesh(plinthGeo, wetSlateMat);
    plinth.position.set(0, -2.44, 0);
    plinth.receiveShadow = true;
    this.group.add(plinth);

    const brassRing = new THREE.Mesh(innerRingGeo, brassInlayMat);
    brassRing.rotation.x = -Math.PI * 0.5;
    brassRing.position.set(0, -2.345, 0);
    this.group.add(brassRing);

    // 4. Overhead Xenon Light Slits + Diagonal Volumetric Light Cones
    const slitGeo = new THREE.PlaneGeometry(8.5, 0.18);
    const coneGeo = new THREE.ConeGeometry(2.9, 8.8, 32, 1, true);
    this.geometries.push(slitGeo, coneGeo);

    for (let i = -1; i <= 1; i++) {
      const slitMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xd8ecff),
      });
      this.slitMaterials.push(slitMat);
      this.materials.push(slitMat);

      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.rotation.x = Math.PI * 0.5;
      slit.position.set(i * 0.4, 6.2, i * 2.2 - 0.4);
      this.group.add(slit);

      const rayMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x9bc8ff : 0x6ea4e8,
        transparent: true,
        opacity: i === 0 ? 0.038 : 0.02,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.godRayMaterials.push(rayMat);
      this.materials.push(rayMat);

      const cone = new THREE.Mesh(coneGeo, rayMat);
      cone.position.set(i * 1.15, 1.9, i * 0.7 - 0.3);
      cone.rotation.z = -i * 0.14;
      this.group.add(cone);
    }

    // 5. Dramatic Chiaroscuro Cinema Lighting Rig
    const hemi = new THREE.HemisphereLight(0x4a6285, 0x090b0f, 0.42);
    this.group.add(hemi);

    // Focused overhead surgical spotlight
    this.keyLight = new THREE.SpotLight(0xeaf2ff, 48, 22, 0.58, 0.55, 1.35);
    this.keyLight.position.set(2.4, 6.5, 3.8);
    this.keyLight.target.position.set(0, -0.2, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1.2;
    this.keyLight.shadow.camera.far = 16;
    this.group.add(this.keyLight, this.keyLight.target);

    // Deep cold cyan-steel back-left silhouette rim
    this.rimLightCyan = new THREE.SpotLight(0x4cb0ff, 34, 20, 0.65, 0.5, 1.3);
    this.rimLightCyan.position.set(-5.4, 2.8, -4.2);
    this.group.add(this.rimLightCyan);

    // Warm sodium/forge bounce under the right-hand Siege Anvil
    this.forgeBounceLight = new THREE.PointLight(0xff7724, 2.5, 9, 1.5);
    this.forgeBounceLight.position.set(1.35, -1.65, 0.6);
    this.group.add(this.forgeBounceLight);

    // Internal crimson/amber Larynx & Bellows glow light
    this.larynxLight = new THREE.PointLight(0xff591c, 1.8, 6.5, 1.6);
    this.larynxLight.position.set(0, 0.55, 0.45);
    this.group.add(this.larynxLight);
  }

  updateLighting(
    stress: number,
    arcFlash: number,
    strobePulse: number,
    harmonyGlow = 0,
  ): void {
    this.keyLight.intensity = 42 + strobePulse * 38 + arcFlash * 18;
    this.forgeBounceLight.intensity = 2.2 + strobePulse * 14 + stress * 5.5;
    this.larynxLight.intensity = 1.4 + harmonyGlow * 8.5 + stress * 4.0 + arcFlash * 6.0;

    this.slitMaterials.forEach((mat, i) => {
      const b = 0.8 + strobePulse * (i === 1 ? 1.8 : 0.9) + harmonyGlow * 0.6;
      mat.color.setRGB(
        Math.min(2.2, 0.78 * b),
        Math.min(2.2, 0.88 * b),
        Math.min(2.4, 1.05 * b),
      );
    });

    this.godRayMaterials.forEach((mat, i) => {
      const base = i === 1 ? 0.036 : 0.018;
      mat.opacity = Math.min(
        0.11,
        base + harmonyGlow * 0.038 + strobePulse * 0.032,
      );
    });
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
