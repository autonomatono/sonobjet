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
  gunmetalInstanced: THREE.MeshStandardNodeMaterial;
  titaniumFinInstanced: THREE.MeshStandardNodeMaterial;
  coreReactor: THREE.MeshStandardNodeMaterial;
  chamberConcrete: THREE.MeshStandardNodeMaterial;
  uniforms: {
    stress: { value: number };
    arcFlash: { value: number };
    time: { value: number };
  };
  dispose(): void;
}

/**
 * Custom Three Shading Language (TSL) Node Materials.
 *
 * Compiles natively to WGSL on WebGPU and GLSL on WebGL2 fallback.
 * Computes procedural CNC micro-striations, edge-bevel sheen, and
 * stress-coupled incandescent emission directly on the GPU.
 */
export function createSonobjetMaterials(): SonobjetMaterialRig {
  const uStress = uniform(0);
  const uArcFlash = uniform(0);
  const uTime = uniform(0);

  // 1. Machined Anodized Gunmetal (for Tectonic Plates, Pistons & Shards)
  const gunmetalInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.91,
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

  // Instance color encodes local mechanical excitation [baseSlate + flash]
  const baseAlloy = vec3(0.17, 0.19, 0.22).add(cncStriation.mul(0.045));
  gunmetalInstanced.colorNode = baseAlloy.mul(instanceColor);
  gunmetalInstanced.roughnessNode = clamp(
    float(0.19).add(cncStriation.mul(0.15)).sub(uStress.mul(0.06)),
    0.1,
    0.65,
  );
  gunmetalInstanced.emissiveNode = mix(
    vec3(0.0, 0.0, 0.0),
    vec3(0.85, 0.42, 0.14),
    clamp(edgeRim.mul(uStress.mul(0.55)).add(uArcFlash.mul(0.35)), 0.0, 1.0),
  );

  // 2. Brushed Titanium / Steel Cooling Fins & Gimbal Struts
  const titaniumFinInstanced = new THREE.MeshStandardNodeMaterial({
    metalness: 0.95,
    roughness: 0.21,
  });

  const finGrooves = sin(positionLocal.x.mul(220.0)).mul(0.5).add(0.5);
  const titaniumBase = vec3(0.34, 0.37, 0.41).add(finGrooves.mul(0.06));
  titaniumFinInstanced.colorNode = titaniumBase.mul(instanceColor);
  titaniumFinInstanced.roughnessNode = clamp(
    float(0.14).add(finGrooves.mul(0.14)),
    0.08,
    0.5,
  );
  titaniumFinInstanced.emissiveNode = vec3(0.55, 0.72, 0.95).mul(
    uArcFlash.mul(0.45),
  );

  // 3. Visceral Inner Core Spine (dark carbon-steel + stress-coupled molten seam)
  const coreReactor = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x14171c),
    metalness: 0.85,
    roughness: 0.32,
  });

  const corePulse = sin(positionLocal.y.mul(18.0).sub(uTime.mul(16.0)))
    .mul(0.5)
    .add(0.5);
  const seamHeat = clamp(
    uStress.mul(0.85).add(uArcFlash.mul(0.9)).mul(corePulse.add(0.35)),
    0.0,
    2.2,
  );
  coreReactor.emissiveNode = mix(
    vec3(0.02, 0.03, 0.04),
    vec3(1.35, 0.58, 0.18),
    clamp(seamHeat, 0.0, 1.0),
  );

  // 4. Brutalist Architectural Concrete Chamber Material
  const chamberConcrete = new THREE.MeshStandardNodeMaterial({
    metalness: 0.12,
    roughness: 0.86,
  });
  const shutterBands = sin(positionLocal.y.mul(6.5))
    .mul(sin(positionLocal.x.mul(1.8)))
    .mul(0.018);
  chamberConcrete.colorNode = vec3(0.095, 0.105, 0.118).add(shutterBands);

  return {
    gunmetalInstanced,
    titaniumFinInstanced,
    coreReactor,
    chamberConcrete,
    uniforms: {
      stress: uStress,
      arcFlash: uArcFlash,
      time: uTime,
    },
    dispose() {
      gunmetalInstanced.dispose();
      titaniumFinInstanced.dispose();
      coreReactor.dispose();
      chamberConcrete.dispose();
    },
  };
}
