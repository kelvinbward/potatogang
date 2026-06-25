import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createBroccoliModel } from '../src/render/models/BroccoliModel.js';
import { createCarrotModel } from '../src/render/models/CarrotModel.js';
import { createSodaCanMesh } from '../src/render/models/SodaCanModel.js';
import { createCerealBoxMesh } from '../src/render/models/CerealBoxModel.js';
import { KITCHEN_LEVEL } from '../src/level/KitchenLevel.js';
import { LevelManager } from '../src/level/LevelManager.js';
import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import { CONFIG } from '../src/config.js';
import { createCounterDeck } from '../src/render/models/CounterDeckModel.js';

// ─── Mock minimal Three.js scene ──────────────────────────────────────────────
class MockScene {
  constructor() { this.objects = []; }
  add(obj) { this.objects.push(obj); }
  remove(obj) { this.objects = this.objects.filter(o => o !== obj); }
}

// ─── BroccoliModel factory ────────────────────────────────────────────────────
describe('BroccoliModel factory', () => {
  it('should return a THREE.Group', () => {
    const group = createBroccoliModel();
    expect(group).toBeInstanceOf(THREE.Group);
  });

  it('should contain at least 5 child meshes (stalk + 3 crown spheres + 2 eyes)', () => {
    const group = createBroccoliModel();
    const meshChildren = group.children.filter(c => c.isMesh);
    expect(meshChildren.length).toBeGreaterThanOrEqual(5);
  });

  it('should have castShadow=true on all child meshes', () => {
    const group = createBroccoliModel();
    group.traverse((child) => {
      if (child.isMesh) {
        expect(child.castShadow).toBe(true);
      }
    });
  });

  it('should have receiveShadow=true on all child meshes', () => {
    const group = createBroccoliModel();
    group.traverse((child) => {
      if (child.isMesh) {
        expect(child.receiveShadow).toBe(true);
      }
    });
  });
});

// ─── CarrotModel factory ──────────────────────────────────────────────────────
describe('CarrotModel factory', () => {
  it('should return a THREE.Group', () => {
    const group = createCarrotModel();
    expect(group).toBeInstanceOf(THREE.Group);
  });

  it('should contain at least 4 child meshes (body + 3 leaves)', () => {
    const group = createCarrotModel();
    const meshChildren = group.children.filter(c => c.isMesh);
    expect(meshChildren.length).toBeGreaterThanOrEqual(4);
  });

  it('should have castShadow=true on all child meshes', () => {
    const group = createCarrotModel();
    group.traverse((child) => {
      if (child.isMesh) {
        expect(child.castShadow).toBe(true);
      }
    });
  });
});

// ─── SodaCanModel material caching ───────────────────────────────────────────
describe('SodaCanModel material caching', () => {
  it('should reuse the same material reference for standard-size cans', () => {
    const mesh1 = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    const mesh2 = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    // Same module-level material singleton
    expect(mesh1.material).toBe(mesh2.material);
  });

  it('should reuse the same geometry reference for standard-size cans', () => {
    const mesh1 = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    const mesh2 = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    expect(mesh1.geometry).toBe(mesh2.geometry);
  });

  it('should return a mesh with castShadow=true', () => {
    const mesh = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    expect(mesh.castShadow).toBe(true);
  });

  it('should create a new geometry for non-standard sizes but still share material', () => {
    const stdMesh = createSodaCanMesh({ x: 1.6, y: 3.2, z: 1.6 });
    const customMesh = createSodaCanMesh({ x: 1.8, y: 3.0, z: 1.8 });
    // Material still shared
    expect(customMesh.material).toBe(stdMesh.material);
    // But geometry is unique
    expect(customMesh.geometry).not.toBe(stdMesh.geometry);
  });
});

// ─── CerealBoxModel material caching ─────────────────────────────────────────
describe('CerealBoxModel material caching', () => {
  it('should reuse the same material reference for standard-size boxes', () => {
    const mesh1 = createCerealBoxMesh({ x: 2.2, y: 4.5, z: 1.5 });
    const mesh2 = createCerealBoxMesh({ x: 2.2, y: 4.5, z: 1.5 });
    expect(mesh1.material).toBe(mesh2.material);
  });

  it('should reuse the same geometry reference for standard-size boxes', () => {
    const mesh1 = createCerealBoxMesh({ x: 2.2, y: 4.5, z: 1.5 });
    const mesh2 = createCerealBoxMesh({ x: 2.2, y: 4.5, z: 1.5 });
    expect(mesh1.geometry).toBe(mesh2.geometry);
  });

  it('should return a mesh with castShadow=true', () => {
    const mesh = createCerealBoxMesh({ x: 2.2, y: 4.5, z: 1.5 });
    expect(mesh.castShadow).toBe(true);
  });
});

// ─── KitchenLevel data integrity ─────────────────────────────────────────────
describe('KitchenLevel data integrity', () => {
  it('should export a non-empty array', () => {
    expect(Array.isArray(KITCHEN_LEVEL)).toBe(true);
    expect(KITCHEN_LEVEL.length).toBeGreaterThan(0);
  });

  it('should contain at least one scatter cereal entry', () => {
    const scatter = KITCHEN_LEVEL.filter(e => e.isScatter && e.type === 'cereal');
    expect(scatter.length).toBeGreaterThan(0);
  });

  it('should contain at least one scatter soda entry', () => {
    const scatter = KITCHEN_LEVEL.filter(e => e.isScatter && e.type === 'soda');
    expect(scatter.length).toBeGreaterThan(0);
  });

  it('should have all fixed entries derive Y from CONFIG.world.GROUND_Y', () => {
    const fixed = KITCHEN_LEVEL.filter(e => !e.isScatter);
    fixed.forEach(entry => {
      // Y must be at or above GROUND_Y (center = GROUND_Y + halfHeight)
      expect(entry.pos.y).toBeGreaterThanOrEqual(CONFIG.world.GROUND_Y);
    });
  });

  it('each scatter entry should have a count > 0', () => {
    const scatterEntries = KITCHEN_LEVEL.filter(e => e.isScatter);
    scatterEntries.forEach(entry => {
      expect(entry.count).toBeGreaterThan(0);
    });
  });
});

// ─── LevelManager load/unload ─────────────────────────────────────────────────
describe('LevelManager', () => {
  it('should populate envMeshes and envBodies after loadLevel()', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    manager.loadLevel();

    expect(manager.envMeshes.length).toBeGreaterThan(0);
    expect(manager.envBodies.length).toBeGreaterThan(0);
  });

  it('envMeshes and envBodies counts should match', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    manager.loadLevel();

    expect(manager.envMeshes.length).toBe(manager.envBodies.length);
  });

  it('should clear envMeshes and envBodies after unloadLevel()', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    manager.loadLevel();
    manager.unloadLevel();

    expect(manager.envMeshes.length).toBe(0);
    expect(manager.envBodies.length).toBe(0);
  });

  it('should spawn scatter cereal instances equal to their count', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    // Count expected scatter items
    const expectedScatterCount = KITCHEN_LEVEL
      .filter(e => e.isScatter)
      .reduce((sum, e) => sum + e.count, 0);

    const fixedCount = KITCHEN_LEVEL.filter(e => !e.isScatter).length;

    manager.loadLevel();

    expect(manager.envMeshes.length).toBe(expectedScatterCount + fixedCount);
  });

  it('should handle unknown obstacle types gracefully', async () => {
    // Reset module registry so our doMock takes effect for LevelManager
    vi.resetModules();

    // Create a malformed array mimicking KITCHEN_LEVEL
    const malformedLevel = [
      {
        type: 'invalid_type_123',
        pos: { x: 0, y: 0, z: 0 },
        size: { x: 1, y: 1, z: 1 }
      }
    ];

    // Mock the static import
    vi.doMock('../src/level/KitchenLevel.js', () => ({
      KITCHEN_LEVEL: malformedLevel
    }));

    // Dynamically import LevelManager AFTER the mock is in place
    const { LevelManager: MockedLevelManager } = await import('../src/level/LevelManager.js');

    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new MockedLevelManager(scene, physicsWorld);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      manager.loadLevel();
      expect(warnSpy).toHaveBeenCalledWith('[LevelManager] Unknown obstacle type: "invalid_type_123"');
    } finally {
      warnSpy.mockRestore();
      // Clean up module mocks for subsequent tests
      vi.doUnmock('../src/level/KitchenLevel.js');
      vi.resetModules();
    }
  });
});

// ─── AABB Exclusion Zone helpers ─────────────────────────────────────────────
describe('LevelManager AABB exclusion zones', () => {
  it('_buildExclusionZones should return 1 player zone + N fixed entry zones', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    const scatterEntry = { size: { x: 2.2, y: 4.5, z: 1.5 } };
    const zones = manager._buildExclusionZones(scatterEntry);

    const fixedCount = KITCHEN_LEVEL.filter(e => !e.isScatter).length;
    // 1 player safe zone + one zone per fixed entry
    expect(zones.length).toBe(1 + fixedCount);
  });

  it('_overlapsAnyZone returns true for a point inside a zone', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    const zones = [{ xMin: -5, xMax: 5, zMin: -5, zMax: 5 }];
    expect(manager._overlapsAnyZone({ x: 0, z: 0 }, zones)).toBe(true);
    expect(manager._overlapsAnyZone({ x: 4.9, z: 4.9 }, zones)).toBe(true);
  });

  it('_overlapsAnyZone returns false for a point outside all zones', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    const zones = [{ xMin: -5, xMax: 5, zMin: -5, zMax: 5 }];
    expect(manager._overlapsAnyZone({ x: 10, z: 10 }, zones)).toBe(false);
    expect(manager._overlapsAnyZone({ x: -20, z: 3 }, zones)).toBe(false);
  });

  it('scatter items should not land inside the player centre safe zone (0,0)', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    const scatterEntry = { size: { x: 2.2, y: 4.5, z: 1.5 } };
    // Origin is always in the player safe zone
    const zones = manager._buildExclusionZones(scatterEntry);
    expect(manager._overlapsAnyZone({ x: 0, z: 0 }, zones)).toBe(true);
  });

  it('scatter items should not overlap any fixed obstacle footprint', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const manager = new LevelManager(scene, physicsWorld);

    const scatterEntry = { size: { x: 2.2, y: 4.5, z: 1.5 } };
    const zones = manager._buildExclusionZones(scatterEntry);

    // Each fixed entry's exact centre should be flagged as overlapping
    KITCHEN_LEVEL.filter(e => !e.isScatter).forEach(entry => {
      expect(manager._overlapsAnyZone({ x: entry.pos.x, z: entry.pos.z }, zones)).toBe(true);
    });
  });
});


// ─── CounterDeckModel factory ────────────────────────────────────────────────
describe('CounterDeckModel factory', () => {
  it('should return a THREE.Group with correct structure', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const group = createCounterDeck(scene, physicsWorld);

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe('CounterDeck');
    expect(group.children.length).toBeGreaterThan(0);

    const deckMesh = group.children[0];
    expect(deckMesh).toBeInstanceOf(THREE.Mesh);
    expect(deckMesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
  });

  it('should add the group to the scene', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const group = createCounterDeck(scene, physicsWorld);

    expect(scene.objects).toContain(group);
  });

  it('should have castShadow and receiveShadow on the child mesh', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const group = createCounterDeck(scene, physicsWorld);

    const deckMesh = group.children[0];
    expect(deckMesh.castShadow).toBe(true);
    expect(deckMesh.receiveShadow).toBe(true);
  });

  it('should use the correct position based on CONFIG.world.GROUND_Y', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const group = createCounterDeck(scene, physicsWorld);

    const deckThickness = 2;
    const expectedY = CONFIG.world.GROUND_Y - deckThickness / 2;

    const deckMesh = group.children[0];
    expect(deckMesh.position.y).toBe(expectedY);
  });

  it('should create a body with mass 0 (static) and attach to userData', () => {
    const scene = new MockScene();
    const physicsWorld = new PhysicsWorld();
    const group = createCounterDeck(scene, physicsWorld);

    expect(group.userData.body).toBeDefined();
    expect(group.userData.body.mass).toBe(0);
  });
});
