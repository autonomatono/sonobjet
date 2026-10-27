import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
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
  // Architectural & Babbage Light-Organ Material Palette
  boneCarapace: THREE.MeshStandardNodeMaterial; // Punched Jacquard ivory cards & ceramic insulators
  forgedIron: THREE.MeshStandardNodeMaterial; // Drop-forge trip-hammers, locomotive chassis, anvils
  surgicalChrome: THREE.MeshStandardNodeMaterial; // Jacquard sensing needles, escapements, rails
  agedBrass: THREE.MeshStandardNodeMaterial; // Babbage cipher wheels, astrolabe rings, louvers
  visceralFilament: THREE.MeshStandardNodeMaterial; // Central prism lantern & furnace core
  lightOrganPipeInstanced: THREE.MeshStandardNodeMaterial; // 24 Chromatic Quartz Light-Organ Pipes (per-instance HDR color!)
  brassInstanced: THREE.MeshStandardNodeMaterial; // 48 Instanced Babbage Number-Wheels with engraved tick marks!
  sparkEmissive: THREE.MeshBasicNodeMaterial; // Ballistic forge & brake sparks

  // Compatibility materials for other works (e.g. LatticeWork)
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
  };
  dispose(): void;
}

/**
 * Custom Three Shading Language (TSL) Palette for the Babbage Light-Organ Factory.
 *
 * Combines engraved brass cipher-wheel shaders, chromatic quartz light-organ tubes
 * (per-instance HDR spectral emission), punched-ivory Jacquard plates, oiled cast-iron,
 * and mirror surgical chrome.
 */
export function createSonobjetMaterials(): SonobjetMaterialRig {
  const uStress = uniform(0);
  const uArcFlash = uniform(0);
  const uLarynxGlow = uniform(0.18);
  const uAnvilHeat = uniform(0);
  const uTime = uniform(0);

  // 1. JACQUARD IVORY / CERAMIC INSULATOR PLATE
  const boneCarapace = new THREE.MeshStandardNodeMaterial({
    metalness: 0.1,
    roughness: 0.36,
  });
  const cardPunchPattern = sin(positionLocal.x.mul(120.0))
    .mul(sin(positionLocal.y.mul(120.0)))
    .mul(0.03);
  const bevelCrevice = pow(
    clamp(abs(normalLocal.y).add(abs(normalLocal.z).mul(0.5)), 0.0, 1.0),
    float(0.65),
  );
  boneCarapace.colorNode = mix(
    vec3(0.26, 0.23, 0.19),
    vec3(0.86, 0.82, 0.73),
    bevelCrevice,
  ).add(cardPunchPattern);
  boneCarapace.roughnessNode = clamp(
    float(0.3).add(cardPunchPattern.mul(2.0)),
    0.18,
    0.58,
  );

  // 2. OILED CAST-IRON (Locomotive Chassis, Trip-Hammers, Anvils, Gantry)
  const forgedIron = new THREE.MeshStandardNodeMaterial({
    metalness: 0.85,
    roughness: 0.54,
  });
  const hammerGrain = sin(
    positionLocal.x.mul(58.0).add(positionLocal.z.mul(54.0)),
  ).mul(0.022);
  forgedIron.colorNode = vec3(0.1, 0.11, 0.13).add(hammerGrain);
  forgedIron.roughnessNode = clamp(
    float(0.5).add(hammerGrain.mul(2.5)),
    0.3,
    0.76,
  );
  forgedIron.emissiveNode = vec3(1.5, 0.48, 0.09).mul(uAnvilHeat.mul(0.34));

  // 3. SURGICAL MIRROR CHROME (Jacquard Needles, Escapement Rods, Pistons)
  const surgicalChrome = new THREE.MeshStandardNodeMaterial({
    metalness: 0.98,
    roughness: 0.1,
  });
  const latheRings = sin(positionLocal.y.mul(240.0)).mul(0.028);
  surgicalChrome.colorNode = vec3(0.78, 0.83, 0.89).add(latheRings);
  surgicalChrome.roughnessNode = clamp(float(0.08).add(latheRings), 0.04, 0.2);

  // 4. AGED ENGRAVED BRASS (Astrolabe Rings, Organ Louvers, Cam Barrels)
  const agedBrass = new THREE.MeshStandardNodeMaterial({
    metalness: 0.92,
    roughness: 0.25,
  });
  const patina = sin(
    positionLocal.x.mul(85.0).sub(positionLocal.y.mul(75.0)),
  ).mul(0.04);
  agedBrass.colorNode = vec3(0.79, 0.57, 0.24).add(patina);
  agedBrass.roughnessNode = clamp(float(0.24).sub(patina), 0.12, 0.42);

  // 5. INSTANCED ENGRAVED BRASS BABBAGE CIPHER WHEELS (with radial digit graduations!)
  const brassInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.92,
    roughness: 0.23,
  });
  const gearTeeth = sin(
    positionLocal.x.mul(90.0).add(positionLocal.z.mul(90.0)),
  ).mul(0.07);
  brassInstanced.colorNode = vec3(0.78, 0.56, 0.23)
    .add(gearTeeth)
    .mul(instanceColor);
  brassInstanced.roughnessNode = clamp(
    float(0.22).sub(gearTeeth),
    0.1,
    0.45,
  );
  brassInstanced.emissiveNode = vec3(0.95, 0.55, 0.18).mul(
    clamp(uArcFlash.mul(0.25), 0.0, 0.8),
  );

  // 6. CHROMATIC QUARTZ LIGHT-ORGAN PIPES (Per-Instance Spectral HDR Emission!)
  const lightOrganPipeInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.18,
    roughness: 0.12,
  });
  const plasmaWave = sin(positionLocal.y.mul(22.0).sub(uTime.mul(18.0)))
    .mul(0.18)
    .add(0.88);
  const fresnelGlass = pow(
    clamp(float(1.0).sub(abs(normalLocal.z)), 0.0, 1.0),
    float(1.8),
  );
  // Smoked quartz glass body + HDR spectral plasma column driven by instanceColor!
  lightOrganPipeInstanced.colorNode = vec3(0.16, 0.2, 0.25).add(
    fresnelGlass.mul(0.22),
  );
  lightOrganPipeInstanced.emissiveNode = instanceColor.mul(plasmaWave);

  // 7. CENTRAL DICHROIC PRISM LANTERN & FURNACE CORE
  const visceralFilament = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x240b05),
    metalness: 0.3,
    roughness: 0.18,
  });
  const prismShimmer = sin(positionLocal.y.mul(32.0).sub(uTime.mul(24.0)))
    .mul(0.22)
    .add(0.86);
  const totalGlow = clamp(
    uLarynxGlow.add(uStress.mul(0.55)).add(uArcFlash.mul(0.85)),
    0.12,
    2.8,
  );
  visceralFilament.emissiveNode = mix(
    vec3(0.55, 0.14, 0.04),
    vec3(2.7, 1.45, 0.52),
    clamp(totalGlow.mul(prismShimmer).mul(0.55), 0.0, 1.0),
  );

  // 8. HDR SPARK STREAKS
  const sparkEmissive = new THREE.MeshBasicNodeMaterial();
  sparkEmissive.colorNode = vec3(2.9, 1.75, 0.72).mul(instanceColor);

  // 9. INSTANCED STRUCTURAL CABLES & CHROME RODS
  const gunmetalInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.9,
    roughness: 0.28,
  });
  gunmetalInstanced.colorNode = vec3(0.25, 0.28, 0.33).mul(instanceColor);

  const titaniumFinInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.97,
    roughness: 0.12,
  });
  titaniumFinInstanced.colorNode = vec3(0.68, 0.74, 0.82).mul(instanceColor);
  titaniumFinInstanced.emissiveNode = vec3(0.7, 0.95, 1.35).mul(
    uArcFlash.mul(0.35),
  );

  const coreReactor = visceralFilament;

  // 10. PIRANESIAN FOUNDRY CONCRETE
  const chamberConcrete = new THREE.MeshStandardNodeMaterial({
    metalness: 0.16,
    roughness: 0.82,
  });
  const cofferGrid = sin(positionLocal.y.mul(3.2))
    .mul(sin(positionLocal.z.mul(1.6)))
    .mul(0.02);
  chamberConcrete.colorNode = vec3(0.052, 0.058, 0.068).add(cofferGrid);

  return {
    boneCarapace,
    forgedIron,
    surgicalChrome,
    agedBrass,
    visceralFilament,
    lightOrganPipeInstanced,
    brassInstanced,
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
    },
    dispose() {
      boneCarapace.dispose();
      forgedIron.dispose();
      surgicalChrome.dispose();
      agedBrass.dispose();
      visceralFilament.dispose();
      lightOrganPipeInstanced.dispose();
      brassInstanced.dispose();
      sparkEmissive.dispose();
      gunmetalInstanced.dispose();
      titaniumFinInstanced.dispose();
      chamberConcrete.dispose();
    },
  };
}
