import * as THREE from 'three/webgpu';

/**
 * Monumental Piranesian Acoustic Foundry & Light-Organ Cathedral (`46m x 32m x 56m`).
 *
 * Built for dramatic multi-scale cinematography:
 * - 9 colossal receding concrete/steel portal arches & buttress piers creating deep parallax
 * - Two-tier mezzanine catwalk galleries & overhead gantry crane bridges for monumental scale
 * - Heavy locomotive steel rail tracks & specular wet oil-reflection channels on the nave floor
 * - 8 Articulated Chromatic Light-Organ Projection Beams that sweep the cathedral vault in sync with chords & melodies!
 */
export class PiranesiFoundry {
  public readonly group = new THREE.Group();
  private readonly keyLight: THREE.SpotLight;
  private readonly rimLightCyan: THREE.SpotLight;
  private readonly forgeBounceLight: THREE.PointLight;
  private readonly organPlenumLight: THREE.PointLight;

  private readonly beamPivots: THREE.Group[] = [];
  private readonly beamMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly skylightMaterials: THREE.MeshBasicMaterial[] = [];

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(concreteMaterial: THREE.Material) {
    // 1. Vast Cathedral Containment Hall (46m wide x 32m tall x 56m deep)
    const hallGeo = new THREE.BoxGeometry(46, 32, 56);
    this.geometries.push(hallGeo);
    const hallMat = concreteMaterial.clone();
    hallMat.side = THREE.BackSide;
    this.materials.push(hallMat);

    const hallMesh = new THREE.Mesh(hallGeo, hallMat);
    hallMesh.position.set(0, 13.5, -4);
    hallMesh.receiveShadow = true;
    this.group.add(hallMesh);

    // 2. Colossal Receding Portal Arches & Buttress Piers along Z (-24m .. +18m)
    const pierGeo = new THREE.BoxGeometry(1.35, 29, 1.6);
    const lintelGeo = new THREE.BoxGeometry(26, 1.2, 1.4);
    const catwalkGeo = new THREE.BoxGeometry(2.2, 0.24, 52);
    const railPostGeo = new THREE.BoxGeometry(0.12, 1.1, 52);
    this.geometries.push(pierGeo, lintelGeo, catwalkGeo, railPostGeo);

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x10141b,
      roughness: 0.58,
      metalness: 0.72,
    });
    const concretePierMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.82,
      metalness: 0.2,
    });
    this.materials.push(darkSteelMat, concretePierMat);

    for (let i = -4; i <= 3; i++) {
      const z = i * 5.8 - 1.5;

      const leftPier = new THREE.Mesh(pierGeo, concretePierMat);
      leftPier.position.set(-11.8, 12.0, z);
      leftPier.receiveShadow = true;
      this.group.add(leftPier);

      const rightPier = new THREE.Mesh(pierGeo, concretePierMat);
      rightPier.position.set(11.8, 12.0, z);
      rightPier.receiveShadow = true;
      this.group.add(rightPier);

      const topArch = new THREE.Mesh(lintelGeo, darkSteelMat);
      topArch.position.set(0, 16.5, z);
      this.group.add(topArch);
    }

    // Mezzanine Catwalk Galleries at y = +2.6m and y = +8.4m (gives huge architectural scale!)
    for (const yLevel of [2.6, 8.4]) {
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(catwalkGeo, darkSteelMat);
        walk.position.set(side * 10.2, yLevel, -4);
        this.group.add(walk);

        const guardrail = new THREE.Mesh(railPostGeo, darkSteelMat);
        guardrail.position.set(side * 9.15, yLevel + 0.55, -4);
        this.group.add(guardrail);
      }
    }

    // Overhead Suspension Gantry Trusses at y = +9.2m
    const gantryBeamGeo = new THREE.BoxGeometry(22, 0.48, 0.52);
    this.geometries.push(gantryBeamGeo);
    for (const zGantry of [-2.4, 0.0, 2.4]) {
      const gBeam = new THREE.Mesh(gantryBeamGeo, darkSteelMat);
      gBeam.position.set(0, 9.2, zGantry);
      this.group.add(gBeam);
    }

    // 3. Foundry Nave Floor, Wet Specular Mirror Channel & Locomotive Steel Rails (y = -2.45m)
    const floorMirrorGeo = new THREE.PlaneGeometry(18, 52);
    const railTrackGeo = new THREE.BoxGeometry(0.16, 0.18, 52);
    const sleeperGeo = new THREE.BoxGeometry(5.6, 0.08, 0.36);
    this.geometries.push(floorMirrorGeo, railTrackGeo, sleeperGeo);

    const wetSlateMat = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.11,
      metalness: 0.84,
    });
    const chromeRailMat = new THREE.MeshStandardMaterial({
      color: 0x8d99a8,
      roughness: 0.18,
      metalness: 0.96,
    });
    this.materials.push(wetSlateMat, chromeRailMat);

    const floorMirror = new THREE.Mesh(floorMirrorGeo, wetSlateMat);
    floorMirror.rotation.x = -Math.PI * 0.5;
    floorMirror.position.set(0, -2.45, -4);
    floorMirror.receiveShadow = true;
    this.group.add(floorMirror);

    for (const xRail of [-2.1, 2.1]) {
      const rail = new THREE.Mesh(railTrackGeo, chromeRailMat);
      rail.position.set(xRail, -2.36, -4);
      this.group.add(rail);
    }
    for (let s = -18; s <= 14; s++) {
      const tie = new THREE.Mesh(sleeperGeo, darkSteelMat);
      tie.position.set(0, -2.41, s * 1.4);
      this.group.add(tie);
    }

    // 4. Overhead Skylight Slits + 8 Articulated Chromatic Light-Organ Projection Cones!
    const slitGeo = new THREE.PlaneGeometry(14, 0.34);
    const beamConeGeo = new THREE.ConeGeometry(3.6, 19.5, 28, 1, true);
    // Shift cone geometry so apex is at origin (0,0,0) and beam projects outward along +Y!
    beamConeGeo.translate(0, 9.75, 0);
    this.geometries.push(slitGeo, beamConeGeo);

    for (let i = -2; i <= 2; i++) {
      const slitMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xd0e6ff),
      });
      this.skylightMaterials.push(slitMat);
      this.materials.push(slitMat);

      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.rotation.x = Math.PI * 0.5;
      slit.position.set(0, 16.4, i * 5.8 - 1.5);
      this.group.add(slit);
    }

    // 8 Light-Organ Projection Shafts shooting UPWARD and OUTWARD from the Light-Organ Crown!
    const initialHues = [
      0xff8a30, 0x4db8ff, 0xffd27d, 0x3ce8b5,
      0xff5238, 0x7aa2ff, 0xffb84d, 0x62d6ff,
    ];
    for (let b = 0; b < 8; b++) {
      const pivot = new THREE.Group();
      const side = b % 2 === 0 ? -1 : 1;
      const rank = Math.floor(b / 2);
      pivot.position.set(side * (1.1 + rank * 0.45), 3.6, (rank - 1.5) * 0.85);

      const bMat = new THREE.MeshBasicMaterial({
        color: initialHues[b],
        transparent: true,
        opacity: 0.025,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.beamMaterials.push(bMat);
      this.materials.push(bMat);

      const cone = new THREE.Mesh(beamConeGeo, bMat);
      pivot.add(cone);
      this.beamPivots.push(pivot);
      this.group.add(pivot);
    }

    // 5. Monumental Chiaroscuro Cinema Lighting
    const hemi = new THREE.HemisphereLight(0x526d94, 0x090b10, 0.48);
    this.group.add(hemi);

    this.keyLight = new THREE.SpotLight(0xeef5ff, 95, 42, 0.62, 0.5, 1.25);
    this.keyLight.position.set(5.5, 13.5, 8.5);
    this.keyLight.target.position.set(0, 1.2, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 34;
    this.group.add(this.keyLight, this.keyLight.target);

    this.rimLightCyan = new THREE.SpotLight(0x4cb4ff, 75, 38, 0.72, 0.5, 1.25);
    this.rimLightCyan.position.set(-8.5, 7.5, -9.5);
    this.group.add(this.rimLightCyan);

    this.forgeBounceLight = new THREE.PointLight(0xff7724, 4.5, 16, 1.35);
    this.forgeBounceLight.position.set(0, -1.5, 1.2);
    this.group.add(this.forgeBounceLight);

    this.organPlenumLight = new THREE.PointLight(0xffaa44, 3.5, 20, 1.35);
    this.organPlenumLight.position.set(0, 3.8, 0.2);
    this.group.add(this.organPlenumLight);
  }

  /**
   * Animates sweeping Light-Organ projection beams, cathedral skylights, and forge bounce!
   */
  updateLighting(
    elapsed: number,
    stress: number,
    arcFlash: number,
    strobePulse: number,
    organGlow: number,
    spectralHueNorm = 0.1,
  ): void {
    this.keyLight.intensity = 82 + strobePulse * 65 + arcFlash * 35;
    this.forgeBounceLight.intensity = 3.5 + strobePulse * 24 + stress * 9.0;
    this.organPlenumLight.intensity =
      2.5 + organGlow * 22.0 + stress * 6.0 + arcFlash * 10.0;

    // Tint the central plenum light subtly toward the active Scriabin harmonic color!
    this.organPlenumLight.color.setHSL(
      (0.06 + spectralHueNorm * 0.55) % 1.0,
      0.82,
      0.58,
    );

    this.skylightMaterials.forEach((mat, i) => {
      const b = 0.75 + strobePulse * (i === 2 ? 1.9 : 0.9) + organGlow * 0.55;
      mat.color.setRGB(
        Math.min(2.2, 0.75 * b),
        Math.min(2.2, 0.86 * b),
        Math.min(2.5, 1.05 * b),
      );
    });

    // Sweep the 8 Chromatic Light-Organ Projection Shafts across the Piranesian cathedral arches!
    for (let b = 0; b < this.beamPivots.length; b++) {
      const side = b % 2 === 0 ? -1 : 1;
      const pivot = this.beamPivots[b];
      const sweepZ =
        side * (0.28 + Math.sin(elapsed * 0.55 + b * 0.9) * 0.34) +
        side * organGlow * 0.18;
      const sweepX = Math.cos(elapsed * 0.42 + b * 1.1) * 0.28;
      pivot.rotation.set(sweepX, 0, sweepZ);

      const mat = this.beamMaterials[b];
      const activeBoost =
        organGlow * 0.062 + strobePulse * 0.038 + arcFlash * 0.03;
      mat.opacity = Math.min(0.135, 0.014 + activeBoost);
      mat.color.setHSL(
        (spectralHueNorm + b * 0.085) % 1.0,
        0.85,
        0.58,
      );
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
