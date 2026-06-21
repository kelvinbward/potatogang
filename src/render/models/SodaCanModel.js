import * as THREE from 'three';

// ─── Module-level cached geometry & material ──────────────────────────────────
// Defined ONCE at module scope. All soda can mesh instances created by
// createSodaCanMesh() share these exact references to prevent memory churn
// during dense level generation.
// Standard scatter size: radius = size.x / 2, height = size.y

/** Cached standard-size soda can geometry (r=0.8, h=3.2, 8 segments). */
const STANDARD_CAN_GEO = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 8);

/** Cached soda can material — metallic neon-cyan aesthetic. */
const SODA_CAN_MAT = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.2,
  metalness: 0.9,
  emissive: 0x00e5ff,
  emissiveIntensity: 0.1
});

/** Cached neon wireframe line material for soda cans. */
const SODA_WIRE_MAT = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 });

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a soda can mesh for a given size vector.
 *
 * For the standard scatter size `{ x:1.6, y:3.2, z:1.6 }`, the cached
 * module-level geometry and material are reused directly. For non-standard
 * sizes (e.g. config-driven structures), a new geometry is created but the
 * shared material is still reused.
 *
 * Shadow casting and receiving are set on the returned mesh.
 *
 * @param {{ x: number, y: number, z: number }} size
 *   Bounding box dimensions of the soda can. x/z define the diameter, y the height.
 * @returns {THREE.Mesh} The configured soda can mesh (with neon wireframe child).
 */
export function createSodaCanMesh(size) {
  const isStandardSize = size.x === 1.6 && size.y === 3.2 && size.z === 1.6;

  let geo;
  if (isStandardSize) {
    // Reuse cached geometry for standard scatter cans
    geo = STANDARD_CAN_GEO;
  } else {
    // Non-standard config-driven size: create per-item geometry
    geo = new THREE.CylinderGeometry(size.x / 2, size.x / 2, size.y, 8);
  }

  // Material is always the cached singleton
  const mesh = new THREE.Mesh(geo, SODA_CAN_MAT);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Neon cyan wireframe overlay
  const edges = new THREE.EdgesGeometry(geo);
  const wireframe = new THREE.LineSegments(edges, SODA_WIRE_MAT);
  mesh.add(wireframe);

  return mesh;
}
