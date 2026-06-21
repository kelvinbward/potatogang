import * as THREE from 'three';
import { CONFIG } from '../../config.js';

/**
 * Creates and injects the main stainless-steel kitchen counter deck into the
 * scene and physics world.
 *
 * This is the structural base platform of the Kitchen Arena — a large static
 * slab that the player and NPCs walk on.
 *
 * @param {THREE.Scene} scene - The Three.js scene to add the deck mesh to.
 * @param {import('../../physics/PhysicsWorld.js').PhysicsWorld} physicsWorld
 *   - The physics world to register the static collision body in.
 * @returns {{ mesh: THREE.Mesh, body: import('cannon-es').Body }}
 *   References to the created visual mesh and physics body.
 */
export function createCounterDeck(scene, physicsWorld) {
  const deckThickness = 2;
  const deckCenterY = CONFIG.world.GROUND_Y - deckThickness / 2;

  const deckGeo = new THREE.BoxGeometry(120, deckThickness, 120);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x8e9bb0,
    metalness: 0.9,
    roughness: 0.15
  });

  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.set(0, deckCenterY, 0);
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  scene.add(deckMesh);

  // Corresponding Cannon-es static body
  const deckBody = physicsWorld.createStaticBox(
    { x: 0, y: deckCenterY, z: 0 },
    { x: 120, y: deckThickness, z: 120 }
  );

  return { mesh: deckMesh, body: deckBody };
}
