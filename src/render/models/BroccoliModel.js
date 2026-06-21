import * as THREE from 'three';

/**
 * Creates the low-poly Broccoli Boy character mesh.
 *
 * Shadow casting and receiving are applied to every child mesh via .traverse()
 * so callers do not need to configure shadows manually.
 *
 * @returns {THREE.Group} A fully configured group ready to add to a scene.
 */
export function createBroccoliModel() {
  const group = new THREE.Group();

  // --- Stalk ---
  const stalkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 5);
  const stalkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e }); // Brownish
  const stalk = new THREE.Mesh(stalkGeo, stalkMat);
  stalk.position.y = -0.3;
  group.add(stalk);

  // --- Crown: 3 overlapping spheres ---
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x166534 }); // Deep Green
  const crownGeo = new THREE.SphereGeometry(0.55, 6, 6);

  const sphere1 = new THREE.Mesh(crownGeo, crownMat);
  sphere1.position.set(0, 0.4, 0);
  group.add(sphere1);

  const sphere2 = new THREE.Mesh(crownGeo, crownMat);
  sphere2.position.set(-0.35, 0.25, 0.2);
  sphere2.scale.set(0.9, 0.9, 0.9);
  group.add(sphere2);

  const sphere3 = new THREE.Mesh(crownGeo, crownMat);
  sphere3.position.set(0.35, 0.25, -0.2);
  sphere3.scale.set(0.85, 0.85, 0.85);
  group.add(sphere3);

  // --- Angry eyes ---
  const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.25, 0.35, 0.45);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.25, 0.35, 0.45);
  group.add(rightEye);

  // Apply shadow properties to all child meshes
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}
