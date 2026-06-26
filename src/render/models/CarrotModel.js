import * as THREE from 'three';

/**
 * Creates the low-poly Carrot Cartel character mesh.
 *
 * Shadow casting and receiving are applied to every child mesh via .traverse()
 * so callers do not need to configure shadows manually.
 *
 * @returns {THREE.Group} A fully configured group ready to add to a scene.
 */
export function createCarrotModel() {
  const group = new THREE.Group();

  // --- Body: Elongated cone pointing downward ---
  const bodyGeo = new THREE.ConeGeometry(0.4, 1.8, 6);
  // Rotate cone so the sharp end points down
  bodyGeo.rotateX(Math.PI);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xea580c }); // Rich Orange
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0;
  group.add(body);

  // --- Leafy top crown ---
  const leafGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 4);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Bright green

  const leaf1 = new THREE.Mesh(leafGeo, leafMat);
  leaf1.position.set(0, 1.1, 0);
  leaf1.rotation.z = 0.2;
  group.add(leaf1);

  const leaf2 = new THREE.Mesh(leafGeo, leafMat);
  leaf2.position.set(-0.15, 1.05, 0.1);
  leaf2.rotation.z = -0.35;
  leaf2.rotation.x = 0.25;
  group.add(leaf2);

  const leaf3 = new THREE.Mesh(leafGeo, leafMat);
  leaf3.position.set(0.15, 1.05, -0.1);
  leaf3.rotation.z = 0.35;
  leaf3.rotation.x = -0.25;
  group.add(leaf3);

  // --- Angry eyes ---
  const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.08);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.18, 0.4, 0.25);
  group.add(leftEye);

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.18, 0.4, 0.29);
  group.add(leftPupil);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.18, 0.4, 0.25);
  group.add(rightEye);

  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.18, 0.4, 0.29);
  group.add(rightPupil);

  // --- Slanted brow for anger ---
  const browGeo = new THREE.BoxGeometry(0.5, 0.05, 0.05);
  const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const brow = new THREE.Mesh(browGeo, browMat);
  brow.position.set(0, 0.49, 0.27);
  brow.rotation.z = 0.05;
  group.add(brow);

  // Apply shadow properties and cache original color for all child meshes
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material && child.material.color) {
        child.userData.origColor = child.material.color.getHex();
      }
    }
  });

  return group;
}
