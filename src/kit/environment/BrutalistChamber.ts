import * as THREE from 'three/webgpu';

/**
 * Stark Brutalist Architectural Test-Cell Environment inspired by Alex Rutterford's
 * cold industrial containment room in Gantz Graf (ribbed concrete walls, recessed
 * xenon ceiling slits, structural steel columns, harsh directional key & rim lighting).
 */
export class BrutalistChamber {
  public readonly group = new THREE.Group();
  private readonly keyLight: THREE.DirectionalLight;
  private readonly rimLightLeft: THREE.SpotLight;
  private readonly rimLightRight: THREE.SpotLight;
  private readonly coreBounceLight: THREE.PointLight;
  private readonly slitMaterials: THREE.MeshBasicMaterial[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(concreteMaterial: THREE.Material) {
    // Containment shell box (inverted back-side walls)
    const roomGeo = new THREE.BoxGeometry(19, 11.5, 19);
    this.geometries.push(roomGeo);

    const wallMat = concreteMaterial.clone();
    wallMat.side = THREE.BackSide;
    this.materials.push(wallMat);

    const roomMesh = new THREE.Mesh(roomGeo, wallMat);
    roomMesh.position.set(0, 1.6, -1.2);
    roomMesh.receiveShadow = true;
    this.group.add(roomMesh);

    // Architectural concrete ribs along left, right, and back walls for stark perspective scale
    const ribGeo = new THREE.BoxGeometry(0.32, 11.4, 0.55);
    this.geometries.push(ribGeo);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x16191f,
      roughness: 0.78,
      metalness: 0.25,
    });
    this.materials.push(ribMat);

    for (let i = -4; i <= 4; i++) {
      const backRib = new THREE.Mesh(ribGeo, ribMat);
      backRib.position.set(i * 2.1, 1.6, -10.4);
      backRib.receiveShadow = true;
      this.group.add(backRib);

      if (i >= -3 && i <= 3) {
        const leftRib = new THREE.Mesh(ribGeo, ribMat);
        leftRib.position.set(-9.3, 1.6, i * 2.5 - 1.2);
        leftRib.rotation.y = Math.PI * 0.5;
        this.group.add(leftRib);

        const rightRib = new THREE.Mesh(ribGeo, ribMat);
        rightRib.position.set(9.3, 1.6, i * 2.5 - 1.2);
        rightRib.rotation.y = Math.PI * 0.5;
        this.group.add(rightRib);
      }
    }

    // Recessed industrial overhead xenon light slits
    const slitGeo = new THREE.PlaneGeometry(11.5, 0.26);
    this.geometries.push(slitGeo);
    for (let i = -1; i <= 1; i++) {
      const slitMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xc8dcff),
      });
      this.slitMaterials.push(slitMat);
      this.materials.push(slitMat);

      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.rotation.x = Math.PI * 0.5;
      slit.position.set(0, 7.25, i * 3.1 - 0.8);
      this.group.add(slit);
    }

    // Subtle machined test-plinth / floor inspection ring beneath the suspended Sonobjet
    const ringGeo = new THREE.RingGeometry(1.75, 1.86, 48);
    this.geometries.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2c3542,
      side: THREE.DoubleSide,
    });
    this.materials.push(ringMat);
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI * 0.5;
    floorRing.position.set(0, -4.12, 0);
    this.group.add(floorRing);

    // Stark industrial lighting rig
    const hemi = new THREE.HemisphereLight(0x6f84a6, 0x101318, 0.65);
    this.group.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xdce8ff, 3.1);
    this.keyLight.position.set(3.8, 7.2, 4.4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 22;
    const d = 4.2;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.group.add(this.keyLight);

    this.rimLightLeft = new THREE.SpotLight(0x7cb2ff, 22, 22, 0.62, 0.45, 1.3);
    this.rimLightLeft.position.set(-6.2, 3.6, -3.5);
    this.group.add(this.rimLightLeft);

    this.rimLightRight = new THREE.SpotLight(0xffb478, 16, 22, 0.58, 0.5, 1.3);
    this.rimLightRight.position.set(6.4, -1.8, -2.6);
    this.group.add(this.rimLightRight);

    this.coreBounceLight = new THREE.PointLight(0xff7728, 0, 8, 1.6);
    this.coreBounceLight.position.set(0, 0.1, 0);
    this.group.add(this.coreBounceLight);
  }

  updateLighting(stress: number, arcFlash: number, strobePulse: number): void {
    const xenon = 2.8 + strobePulse * 3.8 + arcFlash * 2.2;
    this.keyLight.intensity = xenon;
    this.coreBounceLight.intensity = Math.max(0, stress * 4.5 + arcFlash * 9.0);

    this.slitMaterials.forEach((mat, i) => {
      const b = 0.65 + strobePulse * (i === 1 ? 1.4 : 0.7) + arcFlash * 0.9;
      mat.color.setRGB(
        Math.min(1, 0.68 * b),
        Math.min(1, 0.78 * b),
        Math.min(1, 0.95 * b),
      );
    });
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
