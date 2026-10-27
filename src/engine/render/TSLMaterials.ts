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
  // Rich 5-material biomechanical & industrial palette
  boneCarapace: THREE.MeshStandardNodeMaterial;
  forgedIron: THREE.MeshStandardNodeMaterial;
  surgicalChrome: THREE.MeshStandardNodeMaterial;
  agedBrass: THREE.MeshStandardNodeMaterial;
  visceralFilament: THREE.MeshStandardNodeMaterial;
  sparkEmissive: THREE.MeshBasicNodeMaterial;

  // Instanced variants & compatibility materials
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
 * Custom Three Shading Language (TSL) Multi-Material Biomechanical Palette.
 *
 * Contrasts warm porcelain-bone carapace, dark oiled cast-iron, mirror surgical chrome,
 * oxidized brass mechanisms, and HDR-blooming tungsten larynx/bellows filaments.
 */
export function createSonobjetMaterials(): SonobjetMaterialRig {
  const uStress = uniform(0);
  const uArcFlash = uniform(0);
  const uLarynxGlow = uniform(0.15);
  const uAnvilHeat = uniform(0);
  const uTime = uniform(0);

  // 1. BONE-PORCELAIN CARAPACE (Skull, Mandibles, Scapula Armor, Rib Valves)
  const boneCarapace = new THREE.MeshStandardNodeMaterial({
    metalness: 0.12,
    roughness: 0.34,
  });
  const ceramicPores = sin(positionLocal.x.mul(95.0))
    .mul(sin(positionLocal.y.mul(95.0)))
    .mul(0.025);
  const bevelCrevice = pow(
    clamp(abs(normalLocal.y).add(abs(normalLocal.z).mul(0.5)), 0.0, 1.0),
    float(0.65),
  );
  boneCarapace.colorNode = mix(
    vec3(0.28, 0.25, 0.22),
    vec3(0.84, 0.80, 0.72),
    bevelCrevice,
  ).add(ceramicPores);
  boneCarapace.roughnessNode = clamp(
    float(0.29).add(ceramicPores.mul(2.0)),
    0.18,
    0.58,
  );
  // Subtle warm subsurface translucency bleed when inner bellows glow
  boneCarapace.emissiveNode = vec3(0.38, 0.12, 0.03).mul(
    uLarynxGlow.mul(0.18),
  );

  // 2. FORGED CAST-IRON (Spine Vertebrae, Siege-Hammer, Anvil Block, Brake Caliper)
  const forgedIron = new THREE.MeshStandardNodeMaterial({
    metalness: 0.84,
    roughness: 0.56,
  });
  const hammerGrain = sin(
    positionLocal.x.mul(62.0).add(positionLocal.z.mul(58.0)),
  ).mul(0.022);
  forgedIron.colorNode = vec3(0.11, 0.12, 0.14).add(hammerGrain);
  forgedIron.roughnessNode = clamp(float(0.52).add(hammerGrain.mul(2.5)), 0.32, 0.75);
  forgedIron.emissiveNode = vec3(1.4, 0.45, 0.08).mul(uAnvilHeat.mul(0.32));

  // 3. SURGICAL MIRROR CHROME (Hydraulic Rams, Mantis Raker Claws, Iris Blades)
  const surgicalChrome = new THREE.MeshStandardNodeMaterial({
    metalness: 0.98,
    roughness: 0.11,
  });
  const latheRings = sin(positionLocal.y.mul(260.0)).mul(0.03);
  surgicalChrome.colorNode = vec3(0.76, 0.81, 0.87).add(latheRings);
  surgicalChrome.roughnessNode = clamp(float(0.09).add(latheRings), 0.05, 0.22);

  // 4. AGED INDUSTRIAL BRASS / BRONZE (Flywheel Governor, Solenoids, Harp Frame)
  const agedBrass = new THREE.MeshStandardNodeMaterial({
    metalness: 0.91,
    roughness: 0.27,
  });
  const patina = sin(
    positionLocal.x.mul(80.0).sub(positionLocal.y.mul(70.0)),
  ).mul(0.04);
  agedBrass.colorNode = vec3(0.76, 0.54, 0.23).add(patina);
  agedBrass.roughnessNode = clamp(float(0.25).sub(patina), 0.14, 0.45);

  // 5. VISCERAL TUNGSTEN / PLASMA FILAMENT (Larynx Throat Reeds, Bellows Core, Optic Eye)
  const visceralFilament = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x2a0904),
    metalness: 0.25,
    roughness: 0.25,
  });
  const reedShimmer = sin(positionLocal.y.mul(36.0).sub(uTime.mul(28.0)))
    .mul(0.2)
    .add(0.85);
  const totalGlow = clamp(
    uLarynxGlow.add(uStress.mul(0.55)).add(uArcFlash.mul(0.75)),
    0.08,
    2.6,
  );
  visceralFilament.emissiveNode = mix(
    vec3(0.55, 0.09, 0.02),
    vec3(2.6, 1.25, 0.38),
    clamp(totalGlow.mul(reedShimmer).mul(0.55), 0.0, 1.0),
  );

  // 6. HDR WHITE-AMBER IMPACT SPARK MATERIAL (Instanced)
  const sparkEmissive = new THREE.MeshBasicNodeMaterial();
  sparkEmissive.colorNode = vec3(2.8, 1.65, 0.65).mul(instanceColor);

  // 7. Instanced Machined Metals (Harp Strings, Tendon Segments, Lattice Etude)
  const gunmetalInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.9,
    roughness: 0.28,
  });
  const cncStriation = sin(
    positionLocal.y.mul(145.0).add(positionLocal.x.mul(42.0)),
  )
    .mul(0.5)
    .add(0.5);
  const edgeRim = pow(
    clamp(float(1.0).sub(abs(normalLocal.z)), 0.0, 1.0),
    float(2.4),
  );
  gunmetalInstanced.colorNode = vec3(0.24, 0.27, 0.31)
    .add(cncStriation.mul(0.05))
    .mul(instanceColor);
  gunmetalInstanced.emissiveNode = vec3(1.1, 0.52, 0.18).mul(
    clamp(edgeRim.mul(uStress.mul(0.45)).add(uArcFlash.mul(0.3)), 0.0, 1.0),
  );

  const titaniumFinInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.96,
    roughness: 0.14,
  });
  titaniumFinInstanced.colorNode = vec3(0.62, 0.68, 0.75).mul(instanceColor);
  titaniumFinInstanced.emissiveNode = vec3(0.65, 0.85, 1.25).mul(
    uArcFlash.mul(0.38),
  );

  const coreReactor = visceralFilament;

  // 8. Dark Shuttered Brutalist Concrete Wall Material
  const chamberConcrete = new THREE.MeshStandardNodeMaterial({
    metalness: 0.14,
    roughness: 0.84,
  });
  const shutterBands = sin(positionLocal.y.mul(7.0))
    .mul(sin(positionLocal.x.mul(2.1)))
    .mul(0.016);
  chamberConcrete.colorNode = vec3(0.055, 0.062, 0.072).add(shutterBands);

  return {
    boneCarapace,
    forgedIron,
    surgicalChrome,
    agedBrass,
    visceralFilament,
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
      sparkEmissive.dispose();
      gunmetalInstanced.dispose();
      titaniumFinInstanced.dispose();
      chamberConcrete.dispose();
    },
  };
}
