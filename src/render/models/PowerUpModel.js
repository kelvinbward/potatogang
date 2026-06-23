import * as THREE from 'three';

/**
 * Factory to create a highly aesthetic 3D model for a Power-Up collectible.
 * Includes a glowing core, type-specific internal icons, rotating outer rings,
 * and an attached PointLight for dynamic environment illumination.
 *
 * @param {'health' | 'ammo' | 'boost'} type - The gameplay category of the power-up.
 * @param {number} color - Hexadecimal color representation.
 * @returns {THREE.Group} A fully configured 3D group representation.
 */
export function createPowerUpModel(type, color) {
  const group = new THREE.Group();

  // 1. Glowing Core (Emissive Sphere)
  const coreGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.9
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'core';
  group.add(core);

  // 2. Type-Specific Internal Icons
  const iconGroup = new THREE.Group();
  iconGroup.name = 'icon';
  
  const iconMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8
  });

  if (type === 'health') {
    // 3D Cross (Horizontal and Vertical bars)
    const crossBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), iconMat);
    const crossBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), iconMat);
    iconGroup.add(crossBar1);
    iconGroup.add(crossBar2);
  } else if (type === 'boost') {
    // Chevron arrow pointing up (using simple wedge representation or two small boxes rotated)
    const arrowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), iconMat);
    arrowLeft.position.set(-0.04, 0.02, 0);
    arrowLeft.rotation.z = Math.PI / 4;
    
    const arrowRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), iconMat);
    arrowRight.position.set(0.04, 0.02, 0);
    arrowRight.rotation.z = -Math.PI / 4;

    const chevron2Left = arrowLeft.clone();
    chevron2Left.position.y -= 0.06;
    const chevron2Right = arrowRight.clone();
    chevron2Right.position.y -= 0.06;

    iconGroup.add(arrowLeft);
    iconGroup.add(arrowRight);
    iconGroup.add(chevron2Left);
    iconGroup.add(chevron2Right);
  } else if (type === 'ammo') {
    // Cylinder representing bullet/ammo casing
    const bulletGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8);
    const bullet = new THREE.Mesh(bulletGeo, iconMat);
    bullet.rotation.x = Math.PI / 4; // slight tilt
    iconGroup.add(bullet);
  }

  group.add(iconGroup);

  // 3. Rotating Outer Rings (Translucent shields)
  const shellMat = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide
  });

  const ringGroup = new THREE.Group();
  ringGroup.name = 'rings';

  if (type === 'boost') {
    // Gyroscopic double rings for boost
    const ringGeo1 = new THREE.TorusGeometry(0.32, 0.018, 8, 32);
    const ring1 = new THREE.Mesh(ringGeo1, shellMat);
    ring1.name = 'ring1';
    ringGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.28, 0.015, 8, 32);
    const ring2 = new THREE.Mesh(ringGeo2, shellMat);
    ring2.name = 'ring2';
    ring2.rotation.x = Math.PI / 2;
    ringGroup.add(ring2);
  } else {
    // Single orbit ring for health and ammo
    const ringGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 32);
    const ring = new THREE.Mesh(ringGeo, shellMat);
    ring.name = 'ring';
    ringGroup.add(ring);
  }

  group.add(ringGroup);

  // 4. Attached Dynamic PointLight
  // We set intensity to 0 by default, or active intensity.
  // The manager will control active/inactive state light intensities.
  const light = new THREE.PointLight(color, 0, 15);
  light.name = 'light';
  light.castShadow = false;
  light.shadow.bias = -0.002;
  group.add(light);

  // Enable shadow casting/receiving automatically
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}
