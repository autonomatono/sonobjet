import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  cos,
  floor,
  float,
  instanceColor,
  mix,
  normalLocal,
  positionLocal,
  pow,
  sin,
  uniform,
  vec3,
} from 'three/tsl';

export interface SonobjetMaterialRig {
  // Surreal Cunningham / Gantz-Graf Material Palette
  boneCarapace: THREE.MeshStandardNodeMaterial; // Glossy Cunningham synthetic white ceramic/polymer
  forgedIron: THREE.MeshStandardNodeMaterial; // Anodized obsidian/graphite precision alloy
  surgicalChrome: THREE.MeshStandardNodeMaterial; // Liquid-mirror chrome needles & robotic booms
  agedBrass: THREE.MeshStandardNodeMaterial; // Champagne phosphor-bronze gyro-rings
  visceralFilament: THREE.MeshStandardNodeMaterial; // Central singularity hyper-prism
  lightOrganPipeInstanced: THREE.MeshStandardNodeMaterial; // Spectral plasma & acid/glass conduits (HDR instanceColor)
  brassInstanced: THREE.MeshStandardNodeMaterial; // Nested fractal gyro-shards & chimes
  tectonicPlateInstanced: THREE.MeshStandardNodeMaterial; // 1,280+ GPU-deformed Gantz-Graf micro-plates & lamellae!
  sparkEmissive: THREE.MeshBasicNodeMaterial; // Quantized glitch-voxels & hyper-velocity sparks

  // Compatibility materials for secondary works (e.g. LatticeWork)
  gunmetalInstanced: THREE.MeshStandardNodeMaterial;
  titaniumFinInstanced: THREE.MeshStandardNodeMaterial;
  coreReactor: THREE.MeshStandardNodeMaterial;
  chamberConcrete: THREE.MeshStandardNodeMaterial;

  uniforms: {
    stress: { value: number };
    arcFlash: { value: number };
    larynxGlow: { value: number };
    anvilHeat: { value: number };
    time: { value: number };
    nonEuclideanTwist: { value: number };
    spatialGlitch: { value: number };
    acousticRipple: { value: number };
  };
  dispose(): void;
}

/**
 * Custom Three Shading Language (TSL) Material & Non-Euclidean GPU Vertex Deformation Rig.
 *
 * Breaks rigid Euclidean geometry directly on the GPU via `positionNode`:
 * - Helical torsion (`nonEuclideanTwist`) bends solid metal beams and micro-plates into spirals
 * - Quantized slice-shearing (`spatialGlitch`) displaces horizontal bands of 3D geometry on glitch bursts
 * - Standing-wave surface breathing (`acousticRipple`)
 */
export function createSonobjetMaterials(): SonobjetMaterialRig {
  const uStress = uniform(0);
  const uArcFlash = uniform(0);
  const uLarynxGlow = uniform(0.18);
  const uAnvilHeat = uniform(0);
  const uTime = uniform(0);
  const uTwist = uniform(0);
  const uSpatialGlitch = uniform(0);
  const uRipple = uniform(0);

  // Shared GPU Non-Euclidean Vertex Deformation Node!
  const buildSurrealVertexNode = (twistScale: number, glitchScale: number) => {
    const p = positionLocal;
    const angle = p.y.mul(uTwist.mul(twistScale));
    const ca = cos(angle);
    const sa = sin(angle);
    const rx = p.x.mul(ca).sub(p.z.mul(sa));
    const rz = p.x.mul(sa).add(p.z.mul(ca));

    // Quantized Gantz-Graf horizontal slice tear in 3D object space!
    const band = floor(p.y.mul(16.0).add(uTime.mul(28.0)));
    const sliceHash = sin(band.mul(91.7)).mul(sin(band.mul(37.3)));
    const glitchShiftX = sliceHash.mul(uSpatialGlitch.mul(glitchScale));

    // High-frequency acoustic standing wave along surface normals
    const wave = sin(p.y.mul(26.0).sub(uTime.mul(32.0))).mul(
      uRipple.mul(0.035),
    );

    return vec3(rx.add(glitchShiftX), p.y, rz).add(normalLocal.mul(wave));
  };

  // 1. CUNNINGHAM GLOSSY WHITE SYNTHETIC CERAMIC / POLYMER (`All Is Full of Love` sheen!)
  const boneCarapace = new THREE.MeshStandardNodeMaterial({
    metalness: 0.14,
    roughness: 0.16,
  });
  const rimCurve = pow(
    clamp(float(1.0).sub(abs(normalLocal.z).mul(0.65)), 0.0, 1.0),
    float(1.6),
  );
  boneCarapace.colorNode = mix(
    vec3(0.76, 0.8, 0.86),
    vec3(0.96, 0.98, 1.0),
    rimCurve,
  );
  boneCarapace.roughnessNode = clamp(
    float(0.12).add(rimCurve.mul(0.12)),
    0.06,
    0.28,
  );
  boneCarapace.emissiveNode = vec3(0.16, 0.28, 0.45).mul(
    rimCurve.mul(uStress.mul(0.45)),
  );
  boneCarapace.positionNode = buildSurrealVertexNode(0.45, 0.12);

  // 2. ANODIZED GANTZ-GRAF OBSIDIAN / GRAPHITE ALLOY
  const forgedIron = new THREE.MeshStandardNodeMaterial({
    metalness: 0.88,
    roughness: 0.36,
  });
  const milledLines = sin(
    positionLocal.x.mul(95.0).add(positionLocal.z.mul(95.0)),
  ).mul(0.018);
  forgedIron.colorNode = vec3(0.065, 0.075, 0.095).add(milledLines);
  forgedIron.roughnessNode = clamp(
    float(0.34).add(milledLines.mul(2.0)),
    0.16,
    0.58,
  );
  forgedIron.emissiveNode = vec3(1.6, 0.45, 0.12).mul(uAnvilHeat.mul(0.32));
  forgedIron.positionNode = buildSurrealVertexNode(0.65, 0.18);

  // 3. LIQUID MIRROR SURGICAL CHROME (Telescoping Spines & Striker Linkages)
  const surgicalChrome = new THREE.MeshStandardNodeMaterial({
    metalness: 0.99,
    roughness: 0.07,
  });
  const microTurn = sin(positionLocal.y.mul(260.0)).mul(0.02);
  surgicalChrome.colorNode = vec3(0.84, 0.89, 0.95).add(microTurn);
  surgicalChrome.roughnessNode = clamp(float(0.06).add(microTurn), 0.02, 0.16);
  surgicalChrome.positionNode = buildSurrealVertexNode(0.85, 0.22);

  // 4. PRECISION CHAMPAGNE PHOSPHOR-BRONZE
  const agedBrass = new THREE.MeshStandardNodeMaterial({
    metalness: 0.94,
    roughness: 0.18,
  });
  const radialEtch = sin(
    positionLocal.x.mul(110.0).sub(positionLocal.y.mul(110.0)),
  ).mul(0.03);
  agedBrass.colorNode = vec3(0.82, 0.64, 0.34).add(radialEtch);
  agedBrass.roughnessNode = clamp(float(0.18).sub(radialEtch), 0.08, 0.34);
  agedBrass.positionNode = buildSurrealVertexNode(0.55, 0.15);

  // 5. INSTANCED TECTONIC MICRO-PLATES & LAMELLAE (1,280+ Gantz-Graf Shards!)
  const tectonicPlateInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.86,
    roughness: 0.22,
  });
  const bevelEdge = pow(
    clamp(abs(normalLocal.x).add(abs(normalLocal.y)).mul(0.65), 0.0, 1.0),
    float(1.4),
  );
  const milledGroove = sin(positionLocal.z.mul(140.0)).mul(0.035);
  tectonicPlateInstanced.colorNode = instanceColor.add(milledGroove);
  tectonicPlateInstanced.roughnessNode = clamp(
    float(0.2).sub(milledGroove),
    0.07,
    0.42,
  );
  tectonicPlateInstanced.emissiveNode = instanceColor
    .mul(bevelEdge)
    .mul(clamp(uStress.mul(0.32).add(uArcFlash.mul(0.45)), 0.0, 1.4));
  tectonicPlateInstanced.positionNode = buildSurrealVertexNode(0.95, 0.28);

  // 6. INSTANCED FRACTAL GYRO-ARCS & CHIME BLADES
  const brassInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.94,
    roughness: 0.16,
  });
  const gearTicks = sin(
    positionLocal.x.mul(120.0).add(positionLocal.z.mul(120.0)),
  ).mul(0.05);
  brassInstanced.colorNode = vec3(0.84, 0.68, 0.42)
    .add(gearTicks)
    .mul(instanceColor);
  brassInstanced.emissiveNode = instanceColor.mul(
    clamp(uArcFlash.mul(0.38), 0.0, 1.1),
  );
  brassInstanced.positionNode = buildSurrealVertexNode(0.75, 0.2);

  // 7. SPECTRAL PLASMA, ACID & CRYSTALLINE LIGHT CONDUITS (HDR Bloom Filaments!)
  const lightOrganPipeInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.2,
    roughness: 0.08,
  });
  const plasmaPulse = sin(positionLocal.y.mul(28.0).sub(uTime.mul(24.0)))
    .mul(0.22)
    .add(0.92);
  const glassRim = pow(
    clamp(float(1.0).sub(abs(normalLocal.z)), 0.0, 1.0),
    float(1.8),
  );
  lightOrganPipeInstanced.colorNode = vec3(0.14, 0.18, 0.24).add(
    glassRim.mul(0.28),
  );
  lightOrganPipeInstanced.emissiveNode = instanceColor.mul(plasmaPulse);
  lightOrganPipeInstanced.positionNode = buildSurrealVertexNode(1.05, 0.24);

  // 8. CENTRAL HYPER-SINGULARITY PRISM CORE
  const visceralFilament = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x0b1018),
    metalness: 0.45,
    roughness: 0.12,
  });
  const coreShimmer = sin(positionLocal.y.mul(36.0).sub(uTime.mul(28.0)))
    .mul(0.25)
    .add(0.9);
  const coreEnergy = clamp(
    uLarynxGlow.add(uStress.mul(0.65)).add(uArcFlash.mul(0.95)),
    0.15,
    3.2,
  );
  visceralFilament.emissiveNode = mix(
    vec3(0.18, 0.42, 0.78),
    vec3(2.9, 1.65, 0.72),
    clamp(coreEnergy.mul(coreShimmer).mul(0.5), 0.0, 1.0),
  );
  visceralFilament.positionNode = buildSurrealVertexNode(1.35, 0.32);

  // 9. QUANTIZED GLITCH-VOXELS & HYPER-VELOCITY VECTORS
  const sparkEmissive = new THREE.MeshBasicNodeMaterial();
  sparkEmissive.colorNode = vec3(2.8, 2.2, 1.5).mul(instanceColor);

  // 10. COMPATIBILITY MATERIALS (LatticeWork & Vault Monoliths)
  const gunmetalInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.9,
    roughness: 0.26,
  });
  gunmetalInstanced.colorNode = vec3(0.22, 0.26, 0.32).mul(instanceColor);

  const titaniumFinInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.97,
    roughness: 0.1,
  });
  titaniumFinInstanced.colorNode = vec3(0.7, 0.78, 0.88).mul(instanceColor);
  titaniumFinInstanced.emissiveNode = vec3(0.65, 0.95, 1.45).mul(
    uArcFlash.mul(0.35),
  );

  const coreReactor = visceralFilament;

  const chamberConcrete = new THREE.MeshStandardNodeMaterial({
    metalness: 0.32,
    roughness: 0.68,
  });
  const vaultGrid = sin(positionLocal.y.mul(4.5))
    .mul(sin(positionLocal.z.mul(2.2)))
    .mul(0.018);
  chamberConcrete.colorNode = vec3(0.036, 0.042, 0.054).add(vaultGrid);

  return {
    boneCarapace,
    forgedIron,
    surgicalChrome,
    agedBrass,
    visceralFilament,
    lightOrganPipeInstanced,
    brassInstanced,
    tectonicPlateInstanced,
    sparkEmissive,
    gunmetalInstanced,
    titaniumFinInstanced,
    coreReactor,
    chamberConcrete,
    uniforms: {
      stress: uStress,
      arcFlash: uArcFlash,
      larynxGlow: uLarynxGlow,
      anvilHeat: uAnvilHeat,
      time: uTime,
      nonEuclideanTwist: uTwist,
      spatialGlitch: uSpatialGlitch,
      acousticRipple: uRipple,
    },
    dispose() {
      boneCarapace.dispose();
      forgedIron.dispose();
      surgicalChrome.dispose();
      agedBrass.dispose();
      visceralFilament.dispose();
      lightOrganPipeInstanced.dispose();
      brassInstanced.dispose();
      tectonicPlateInstanced.dispose();
      sparkEmissive.dispose();
      gunmetalInstanced.dispose();
      titaniumFinInstanced.dispose();
      chamberConcrete.dispose();
    },
  };
}
