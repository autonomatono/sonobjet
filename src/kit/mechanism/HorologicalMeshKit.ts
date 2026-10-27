import * as THREE from 'three/webgpu';

export interface HorologicalMaterials {
  brass: THREE.MeshStandardNodeMaterial;
  paleBrass: THREE.MeshStandardNodeMaterial;
  gunmetal: THREE.MeshStandardNodeMaterial;
  bluedSteel: THREE.MeshStandardNodeMaterial;
  surgicalChrome: THREE.MeshStandardNodeMaterial;
  ceramic: THREE.MeshStandardNodeMaterial;
  jewel: THREE.MeshStandardNodeMaterial;
  glass: THREE.MeshStandardNodeMaterial;
  plasma: THREE.MeshBasicNodeMaterial;
  darkFloor: THREE.MeshStandardNodeMaterial;
  dispose(): void;
}

/** Rigid, CAD-like palette. No global vertex deformation: mechanisms stay rigid. */
export function createHorologicalMaterials(): HorologicalMaterials {
  const brass = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0xc59a53),
    metalness: 0.92,
    roughness: 0.24,
  });
  const paleBrass = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0xe1c27e),
    metalness: 0.88,
    roughness: 0.19,
  });
  const gunmetal = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x252c36),
    metalness: 0.86,
    roughness: 0.34,
  });
  const bluedSteel = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x36577a),
    metalness: 0.93,
    roughness: 0.2,
  });
  const surgicalChrome = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0xd6e2ee),
    metalness: 0.98,
    roughness: 0.08,
  });
  const ceramic = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0xe9f1f8),
    metalness: 0.12,
    roughness: 0.14,
    side: THREE.DoubleSide,
  });
  const jewel = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x6aa6d8),
    emissive: new THREE.Color(0x2d76b8),
    metalness: 0.15,
    roughness: 0.08,
  });
  const glass = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x9fd9ff),
    emissive: new THREE.Color(0x173a55),
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });
  const plasma = new THREE.MeshBasicNodeMaterial({
    color: new THREE.Color(0x9ee9ff),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const darkFloor = new THREE.MeshStandardNodeMaterial({
    color: new THREE.Color(0x11161d),
    metalness: 0.38,
    roughness: 0.66,
  });

  return {
    brass,
    paleBrass,
    gunmetal,
    bluedSteel,
    surgicalChrome,
    ceramic,
    jewel,
    glass,
    plasma,
    darkFloor,
    dispose() {
      brass.dispose();
      paleBrass.dispose();
      gunmetal.dispose();
      bluedSteel.dispose();
      surgicalChrome.dispose();
      ceramic.dispose();
      jewel.dispose();
      glass.dispose();
      plasma.dispose();
      darkFloor.dispose();
    },
  };
}

const geometryCache = new Map<string, THREE.BufferGeometry>();

const cacheKey = (prefix: string, values: Array<string | number>): string =>
  `${prefix}:${values.join(',')}`;

/** True toothed profile with hub bore and lightening cutouts; axis is local Z. */
export function createSpokedGearGeometry(
  teeth: number,
  boreRadius: number,
  outerRadius: number,
  thickness: number,
  spokes = 6,
): THREE.BufferGeometry {
  const key = cacheKey('gear', [teeth, boreRadius, outerRadius, thickness, spokes]);
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const rootRadius = outerRadius * 0.87;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: Array<[number, number]> = [
      [rootRadius, a + step * 0.02],
      [outerRadius, a + step * 0.2],
      [outerRadius, a + step * 0.48],
      [rootRadius, a + step * 0.68],
      [rootRadius, a + step * 0.94],
    ];
    for (const [r, angle] of pts) {
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0 && r === rootRadius && angle === a + step * 0.02) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
  }
  shape.closePath();

  const bore = new THREE.Path();
  bore.absarc(0, 0, Math.min(boreRadius, outerRadius * 0.42), 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const holeCount = Math.max(3, Math.min(10, spokes));
  const orbit = outerRadius * 0.56;
  const holeRadius = Math.min(outerRadius * 0.12, (outerRadius - orbit) * 0.42);
  for (let i = 0; i < holeCount; i++) {
    const a = (i / holeCount) * Math.PI * 2 + Math.PI / holeCount;
    const hole = new THREE.Path();
    hole.absarc(
      Math.cos(a) * orbit,
      Math.sin(a) * orbit,
      holeRadius,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: thickness * 0.1,
    bevelSize: outerRadius * 0.012,
    bevelOffset: 0,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

/** Chamfered clockmaker bridge plate with bearing bores. */
export function createSkeletonBridgeGeometry(
  length: number,
  width: number,
  thickness: number,
): THREE.BufferGeometry {
  const key = cacheKey('bridge', [length, width, thickness]);
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const halfL = length * 0.5;
  const halfW = width * 0.5;
  const c = Math.min(width * 0.22, length * 0.12);
  const shape = new THREE.Shape();
  shape.moveTo(-halfL + c, -halfW);
  shape.lineTo(halfL - c, -halfW);
  shape.quadraticCurveTo(halfL, -halfW, halfL, -halfW + c);
  shape.lineTo(halfL, halfW - c);
  shape.quadraticCurveTo(halfL, halfW, halfL - c, halfW);
  shape.lineTo(-halfL + c, halfW);
  shape.quadraticCurveTo(-halfL, halfW, -halfL, halfW - c);
  shape.lineTo(-halfL, -halfW + c);
  shape.quadraticCurveTo(-halfL, -halfW, -halfL + c, -halfW);

  const boreRadius = width * 0.14;
  for (const x of [-length * 0.31, 0, length * 0.31]) {
    const hole = new THREE.Path();
    hole.absarc(x, 0, boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.12,
    bevelSize: width * 0.015,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

/** Polar cam profile with a physical drive bore. */
export function createCamLobeGeometry(
  lobes: number,
  baseRadius: number,
  amplitude: number,
  thickness: number,
): THREE.BufferGeometry {
  const key = cacheKey('cam', [lobes, baseRadius, amplitude, thickness]);
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const shape = new THREE.Shape();
  const segments = 96;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const r = baseRadius + Math.cos(a * lobes) * amplitude;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, baseRadius * 0.22, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.08,
    bevelSize: baseRadius * 0.01,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

/** Rigid connecting rod with twin eyelet knuckles and pivot pins at both ends. */
export function createClevisRod(
  length: number,
  radius: number,
  material: THREE.Material,
  pinMaterial: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, length, 10),
    material,
  );
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = length * 0.5;
  group.add(shaft);

  for (const x of [0, length]) {
    const eye = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.52, 6, 14),
      material,
    );
    eye.position.x = x;
    group.add(eye);

    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, radius * 2.1, 8),
      pinMaterial,
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.x = x;
    group.add(pin);
  }
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

export interface TunedCombAssembly {
  group: THREE.Group;
  tines: THREE.Mesh[];
}

/** Graduated music-box tines on a shared, physically parented base block. */
export function createTunedComb(
  tineCount: number,
  spacing: number,
  baseLength: number,
  material: THREE.Material,
  baseMaterial: THREE.Material,
): TunedCombAssembly {
  const group = new THREE.Group();
  const width = spacing * tineCount + 0.12;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.13, 0.2),
    baseMaterial,
  );
  base.position.y = -0.075;
  group.add(base);

  const tines: THREE.Mesh[] = [];
  for (let i = 0; i < tineCount; i++) {
    const length = baseLength * (1 - (i / Math.max(1, tineCount - 1)) * 0.42);
    const tine = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, length, 0.06),
      material,
    );
    tine.position.set((i - (tineCount - 1) * 0.5) * spacing, length * 0.5, 0);
    tine.userData.baseLength = length;
    tine.userData.tineIndex = i;
    group.add(tine);
    tines.push(tine);
  }
  return { group, tines };
}

/** Zig-zag lathed accordion bellows; axis is local X. */
export function createPleatedBellowsGeometry(
  pleats: number,
  radius: number,
  length: number,
): THREE.BufferGeometry {
  const key = cacheKey('bellows', [pleats, radius, length]);
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const points: THREE.Vector2[] = [];
  const steps = pleats * 2;
  for (let i = 0; i <= steps; i++) {
    const y = -length * 0.5 + (i / steps) * length;
    const r = radius * (i % 2 === 0 ? 1 : 0.64);
    points.push(new THREE.Vector2(r, y));
  }
  const geometry = new THREE.LatheGeometry(points, 32);
  geometry.rotateZ(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

export interface IrisAssembly {
  group: THREE.Group;
  blades: THREE.Mesh[];
  ring: THREE.Mesh;
}

/** Mechanical iris with individually articulable overlapping blades. */
export function createIrisValve(
  bladeCount: number,
  radius: number,
  bladeMaterial: THREE.Material,
  ringMaterial: THREE.Material,
): IrisAssembly {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.07, 8, 32),
    ringMaterial,
  );
  group.add(ring);
  const blades: THREE.Mesh[] = [];
  for (let i = 0; i < bladeCount; i++) {
    const a = (i / bladeCount) * Math.PI * 2;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.84, radius * 0.22, radius * 0.025),
      bladeMaterial,
    );
    blade.position.set(Math.cos(a) * radius * 0.36, Math.sin(a) * radius * 0.36, 0);
    blade.rotation.z = a + Math.PI * 0.25;
    blade.userData.angle = a;
    group.add(blade);
    blades.push(blade);
  }
  return { group, blades, ring };
}

/** Curved ceramic carapace shell with a real hinge-side straight edge. */
export function createCeramicShellGeometry(
  width: number,
  height: number,
  thickness: number,
): THREE.BufferGeometry {
  const key = cacheKey('shell', [width, height, thickness]);
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const shape = new THREE.Shape();
  shape.moveTo(0, -height * 0.5);
  shape.lineTo(width, -height * 0.5 + height * 0.06);
  shape.quadraticCurveTo(width * 1.12, 0, width, height * 0.5 - height * 0.06);
  shape.lineTo(0, height * 0.5);
  shape.quadraticCurveTo(-width * 0.12, 0, 0, -height * 0.5);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: width * 0.018,
    bevelThickness: thickness * 0.24,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.computeVertexNormals();
  geometryCache.set(key, geometry);
  return geometry;
}

/** Unit-height cylinder for plasma torque axles stretched by MagneticSlipRail. */
export function createTorqueBeamGeometry(radius = 0.025): THREE.BufferGeometry {
  const key = cacheKey('beam', [radius]);
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 10, 1, true);
  geometryCache.set(key, geometry);
  return geometry;
}

export function disposeGeometryCache(): void {
  for (const geometry of geometryCache.values()) geometry.dispose();
  geometryCache.clear();
}

/** Utility to add a rigid mesh to a joint without detaching it from the rig. */
export function attachMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(position);
  mesh.rotation.fromArray(rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
