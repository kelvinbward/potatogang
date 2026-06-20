import * as CANNON from 'cannon-es';
import { CONFIG } from '../config.js';

export class PhysicsWorld {
  // Collision groups for filtering interactions
  static GROUP_PLAYER = 1;
  static GROUP_ENVIRONMENT = 2;
  static GROUP_NPC = 4;
  static GROUP_PROJECTILE = 8;
  static GROUP_NPC_PROJECTILE = 16;

  constructor() {
    // Set up the physics world with low gravity for a floaty anti-gravity effect
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -CONFIG.physics.gravity, 0)
    });

    // Use GSSolver for stable collisions
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.001;

    // Default contact material settings
    this.world.defaultContactMaterial.contactEquationStiffness = 1e6;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.2; // Slight bounce

    // Store references to sync meshes
    this.bodiesToSync = [];
  }

  updateGravity(gravityValue) {
    this.world.gravity.set(0, -gravityValue, 0);
  }

  step(deltaTime) {
    // Clamp delta time to avoid physics explosions at low frame rates
    const timeStep = Math.min(deltaTime, 0.1);
    this.world.step(timeStep);

    // Sync visual meshes with their physics bodies
    for (let i = this.bodiesToSync.length - 1; i >= 0; i--) {
      const binding = this.bodiesToSync[i];
      
      // If mesh was disposed, clean it up from sync list
      if (!binding.mesh || binding.mesh.parent === null) {
        this.bodiesToSync.splice(i, 1);
        continue;
      }

      binding.mesh.position.copy(binding.body.position);
      binding.mesh.quaternion.copy(binding.body.quaternion);
    }
  }

  registerSync(mesh, body) {
    this.bodiesToSync.push({ mesh, body });
  }

  // Create a sphere body for the player
  createPlayerBody(position = { x: 0, y: 2, z: 0 }, radius = 0.8) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 60, // Human-ish mass (in kg)
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.75, // Drift momentum: slows down gradually
      angularDamping: 1.0,  // Stop rotation (no tumbling camera)
      fixedRotation: true  // Keep player standing upright
    });

    // Set collision filters
    body.collisionFilterGroup = PhysicsWorld.GROUP_PLAYER;
    body.collisionFilterMask = PhysicsWorld.GROUP_ENVIRONMENT | PhysicsWorld.GROUP_NPC | PhysicsWorld.GROUP_NPC_PROJECTILE;

    this.world.addBody(body);
    return body;
  }

  // Create static objects (floors, floating kitchen counters, cereal boxes)
  createStaticBox(position, size, rotation = { x: 0, y: 0, z: 0 }) {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const body = new CANNON.Body({
      mass: 0, // Static bodies have mass 0
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });

    if (rotation.x || rotation.y || rotation.z) {
      body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }

    body.collisionFilterGroup = PhysicsWorld.GROUP_ENVIRONMENT;
    body.collisionFilterMask = PhysicsWorld.GROUP_PLAYER | PhysicsWorld.GROUP_NPC | PhysicsWorld.GROUP_PROJECTILE | PhysicsWorld.GROUP_NPC_PROJECTILE;

    this.world.addBody(body);
    return body;
  }

  // Create dynamic project projectiles launched by spud launcher
  createProjectileBody(position, velocity, radius = 0.25, isNpcProjectile = false) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 1,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.05, // Retain speed
      angularDamping: 0.1
    });

    // Apply initial velocity
    body.velocity.copy(velocity);

    if (isNpcProjectile) {
      body.collisionFilterGroup = PhysicsWorld.GROUP_NPC_PROJECTILE;
      body.collisionFilterMask = PhysicsWorld.GROUP_PLAYER | PhysicsWorld.GROUP_ENVIRONMENT;
    } else {
      body.collisionFilterGroup = PhysicsWorld.GROUP_PROJECTILE;
      body.collisionFilterMask = PhysicsWorld.GROUP_NPC | PhysicsWorld.GROUP_ENVIRONMENT;
    }

    this.world.addBody(body);
    return body;
  }

  // Create physical body for Broccoli Boys and Carrot Cartel
  createNpcBody(position, size = { radius: 0.8 }, isCarrot = false) {
    let shape;
    if (isCarrot) {
      // Carrots are elongated cones/cylinders, use a cylinder shape
      shape = new CANNON.Cylinder(0.1, size.radius, 2.5, 8);
    } else {
      // Broccoli is spherical crown-based
      shape = new CANNON.Sphere(size.radius);
    }

    const body = new CANNON.Body({
      mass: 15,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.6, // NPC drifts towards player
      angularDamping: 0.8,
      fixedRotation: true
    });

    body.collisionFilterGroup = PhysicsWorld.GROUP_NPC;
    body.collisionFilterMask = PhysicsWorld.GROUP_PLAYER | PhysicsWorld.GROUP_ENVIRONMENT | PhysicsWorld.GROUP_PROJECTILE;

    this.world.addBody(body);
    return body;
  }

  removeBody(body) {
    this.world.removeBody(body);
    // Also clean up sync bindings
    this.bodiesToSync = this.bodiesToSync.filter(binding => binding.body !== body);
  }
}
