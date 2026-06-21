import * as THREE from 'three';

// ─── Module-level cached geometry & materials ─────────────────────────────────
// Defined ONCE at module scope. All cereal box mesh instances created by
// createCerealBoxMesh() share these exact material references to prevent memory
// churn during dense level generation.
// Standard scatter size: { x:2.2, y:4.5, z:1.5 }

/** Cached standard-size cereal box geometry (2.2 × 4.5 × 1.5). */
const STANDARD_BOX_GEO = new THREE.BoxGeometry(2.2, 4.5, 1.5);

/** Cached cereal box body material — dark neon-red emissive aesthetic. */
const CEREAL_BOX_MAT = new THREE.MeshStandardMaterial({
  color: 0x1f2937,
  roughness: 0.5,
  metalness: 0.1,
  emissive: 0xff0055,
  emissiveIntensity: 0.15
});

/** Cached yellow label material applied as a sub-mesh. */
const CEREAL_LABEL_MAT = new THREE.MeshBasicMaterial({ color: 0xeab308 });

/** Cached neon wireframe line material for cereal boxes. */
const CEREAL_WIRE_MAT = new THREE.LineBasicMaterial({ color: 0xff0055, linewidth: 2 });

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a cereal box mesh for a given size vector.
 *
 * For the standard scatter size `{ x:2.2, y:4.5, z:1.5 }`, the cached
 * module-level geometry and materials are reused directly. For non-standard
 * sizes (e.g. config-driven structures), a new geometry is created but the
 * shared materials are still reused.
 *
 * Shadow casting and receiving are set on the returned mesh.
 *
 * @param {{ x: number, y: number, z: number }} size
 *   Bounding box dimensions of the cereal box.
 * @returns {THREE.Mesh} The configured cereal box mesh (with label and wireframe children).
 */
export function createCerealBoxMesh(size) {
  const isStandardSize = size.x === 2.2 && size.y === 4.5 && size.z === 1.5;

  let geo;
  if (isStandardSize) {
    // Reuse cached geometry for standard scatter boxes
    geo = STANDARD_BOX_GEO;
  } else {
    // Non-standard config-driven size: create per-item geometry
    geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  }

  // Body material is always the cached singleton
  const mesh = new THREE.Mesh(geo, CEREAL_BOX_MAT);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Yellow product label sub-mesh (reuses cached label material)
  const labelGeo = new THREE.BoxGeometry(size.x + 0.02, 1.2, size.z + 0.02);
  const label = new THREE.Mesh(labelGeo, CEREAL_LABEL_MAT);
  label.position.y = 0.4;
  mesh.add(label);

  // Neon pink wireframe overlay (reuses cached wire material)
  const edges = new THREE.EdgesGeometry(geo);
  const wireframe = new THREE.LineSegments(edges, CEREAL_WIRE_MAT);
  mesh.add(wireframe);

  return mesh;
}
