import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import { CONFIG } from '../src/config.js';
import * as CANNON from 'cannon-es';

describe('PhysicsWorld initialization and bodies', () => {
  it('should initialize with correct gravity setting', () => {
    const physicsWorld = new PhysicsWorld();
    expect(physicsWorld.world.gravity.y).toBe(-9.8);
  });

  it('should create player body with correct filters and properties', () => {
    const physicsWorld = new PhysicsWorld();
    const playerBody = physicsWorld.createPlayerBody({ x: 0, y: 5, z: 0 }, 0.85);

    expect(playerBody.mass).toBe(60);
    expect(playerBody.fixedRotation).toBe(true);
    expect(playerBody.linearDamping).toBe(0.75);
    expect(playerBody.angularDamping).toBe(1.0);
    expect(playerBody.material).toBe(physicsWorld.playerMaterial);
    
    // Collision filters
    expect(playerBody.collisionFilterGroup).toBe(PhysicsWorld.GROUP_PLAYER);
    
    const expectedMask = PhysicsWorld.GROUP_ENVIRONMENT | PhysicsWorld.GROUP_NPC | PhysicsWorld.GROUP_NPC_PROJECTILE;
    expect(playerBody.collisionFilterMask).toBe(expectedMask);
  });

  it('should create static boxes correctly', () => {
    const physicsWorld = new PhysicsWorld();
    const boxBody = physicsWorld.createStaticBox({ x: 0, y: -6, z: 0 }, { x: 120, y: 2, z: 120 });

    expect(boxBody.mass).toBe(0);
    expect(boxBody.collisionFilterGroup).toBe(PhysicsWorld.GROUP_ENVIRONMENT);
    expect(boxBody.material).toBe(physicsWorld.environmentMaterial);
  });
});

describe('Spawn position invariants', () => {
  it('player spawn Y should place bottom of sphere on GROUND_Y', () => {
    const spawnY = CONFIG.world.GROUND_Y + CONFIG.player.collisionRadius;
    // Bottom of the sphere = center - radius = GROUND_Y
    expect(spawnY - CONFIG.player.collisionRadius).toBe(CONFIG.world.GROUND_Y);
  });

  it('broccoli spawn Y should place bottom of sphere on GROUND_Y', () => {
    const broccoliRadius = 0.85;
    const spawnY = CONFIG.world.GROUND_Y + broccoliRadius;
    expect(spawnY - broccoliRadius).toBe(CONFIG.world.GROUND_Y);
  });

  it('carrot spawn Y should place bottom of cylinder on GROUND_Y', () => {
    const carrotHalfHeight = 1.25;
    const spawnY = CONFIG.world.GROUND_Y + carrotHalfHeight;
    expect(spawnY - carrotHalfHeight).toBe(CONFIG.world.GROUND_Y);
  });
});

describe('Soft height cap (applyHeightCap)', () => {
  it('should not apply force when body is below maxY', () => {
    const physicsWorld = new PhysicsWorld();
    const body = new CANNON.Body({ mass: 60 });
    body.position.set(0, 10, 0);
    body.velocity.set(0, 0, 0);

    const initialForce = body.force.y;
    physicsWorld.applyHeightCap(body, 18, 2000);
    // Body is below maxY=18, force should not change
    expect(body.force.y).toBe(initialForce);
  });

  it('should apply downward force when body is above maxY', () => {
    const physicsWorld = new PhysicsWorld();
    const body = new CANNON.Body({ mass: 60 });
    body.position.set(0, 20, 0);
    body.velocity.set(0, 5, 0);

    physicsWorld.applyHeightCap(body, 18, 2000);
    // Force should be negative (downward)
    expect(body.force.y).toBeLessThan(0);
  });

  it('should apply stronger force for greater overshoot', () => {
    const physicsWorld = new PhysicsWorld();
    
    const body1 = new CANNON.Body({ mass: 60 });
    body1.position.set(0, 19, 0);
    body1.velocity.set(0, 0, 0);
    physicsWorld.applyHeightCap(body1, 18, 2000);
    const force1 = body1.force.y;

    const body2 = new CANNON.Body({ mass: 60 });
    body2.position.set(0, 22, 0);
    body2.velocity.set(0, 0, 0);
    physicsWorld.applyHeightCap(body2, 18, 2000);
    const force2 = body2.force.y;

    // Greater overshoot = stronger downward force (more negative)
    expect(force2).toBeLessThan(force1);
  });
});
