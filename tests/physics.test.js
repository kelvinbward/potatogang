import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import * as CANNON from 'cannon-es';

describe('PhysicsWorld initialization and bodies', () => {
  it('should initialize with correct gravity setting', () => {
    const physicsWorld = new PhysicsWorld();
    expect(physicsWorld.world.gravity.y).toBe(-0.8);
  });

  it('should create player body with correct filters and properties', () => {
    const physicsWorld = new PhysicsWorld();
    const playerBody = physicsWorld.createPlayerBody({ x: 0, y: 5, z: 0 }, 0.85);

    expect(playerBody.mass).toBe(60);
    expect(playerBody.fixedRotation).toBe(true);
    expect(playerBody.linearDamping).toBe(0.75);
    expect(playerBody.angularDamping).toBe(1.0);
    
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
  });
});
