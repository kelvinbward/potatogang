import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BroccoliBoy, CarrotCartel, BaseNpc } from '../src/npc/NpcEngine.js';

// Mock the model factories
vi.mock('../src/render/models/BroccoliModel.js', () => ({
  createBroccoliModel: vi.fn(() => {
    const mesh = new THREE.Mesh();
    return mesh;
  })
}));

vi.mock('../src/render/models/CarrotModel.js', () => ({
  createCarrotModel: vi.fn(() => {
    const mesh = new THREE.Mesh();
    return mesh;
  })
}));

import { createBroccoliModel } from '../src/render/models/BroccoliModel.js';
import { createCarrotModel } from '../src/render/models/CarrotModel.js';

describe('NPC Subclasses', () => {
  let mockScene;
  let mockPhysicsWorld;
  let mockPosition;

  beforeEach(() => {
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };

    mockPhysicsWorld = {
      createNpcBody: vi.fn(() => ({
        position: new THREE.Vector3(),
        mass: 10
      })),
      registerSync: vi.fn()
    };

    mockPosition = new THREE.Vector3(1, 2, 3);

    // Clear mocks before each test
    vi.clearAllMocks();
  });

  describe('BroccoliBoy', () => {
    it('should properly extend BaseNpc', () => {
      const npc = new BroccoliBoy(mockScene, mockPhysicsWorld, mockPosition);
      expect(npc).toBeInstanceOf(BaseNpc);
    });

    it('should initialize with correct properties', () => {
      const npc = new BroccoliBoy(mockScene, mockPhysicsWorld, mockPosition);

      expect(npc.faction).toBe('Broccoli');
      expect(npc.health).toBe(40);
      expect(npc.maxHealth).toBe(40);
      expect(npc.speed).toBe(4.5);
      expect(npc.color).toBe(0x22c55e); // Neon Green
      expect(npc.fireRate).toBe(2.0);
    });

    it('should invoke createVisuals and add mesh to scene', () => {
      const npc = new BroccoliBoy(mockScene, mockPhysicsWorld, mockPosition);

      expect(createBroccoliModel).toHaveBeenCalledOnce();
      expect(npc.mesh).toBeDefined();
      expect(npc.mesh.position.x).toBe(mockPosition.x);
      expect(npc.mesh.position.y).toBe(mockPosition.y);
      expect(npc.mesh.position.z).toBe(mockPosition.z);
      expect(mockScene.add).toHaveBeenCalledWith(npc.mesh);
    });

    it('should invoke createPhysics with correct parameters', () => {
      const npc = new BroccoliBoy(mockScene, mockPhysicsWorld, mockPosition);

      expect(mockPhysicsWorld.createNpcBody).toHaveBeenCalledWith(
        mockPosition,
        { radius: 0.85 },
        false
      );
      expect(mockPhysicsWorld.registerSync).toHaveBeenCalledWith(npc.mesh, npc.body);
      expect(npc.body.npcInstance).toBe(npc);
    });
  });

  describe('CarrotCartel', () => {
    it('should properly extend BaseNpc', () => {
      const npc = new CarrotCartel(mockScene, mockPhysicsWorld, mockPosition);
      expect(npc).toBeInstanceOf(BaseNpc);
    });

    it('should initialize with correct properties', () => {
      const npc = new CarrotCartel(mockScene, mockPhysicsWorld, mockPosition);

      expect(npc.faction).toBe('Carrot');
      expect(npc.health).toBe(50);
      expect(npc.maxHealth).toBe(50);
      expect(npc.speed).toBe(5.5);
      expect(npc.color).toBe(0xf97316); // Neon Orange
      expect(npc.fireRate).toBe(1.4);
      expect(npc.attackRange).toBe(16);
    });

    it('should invoke createVisuals and add mesh to scene', () => {
      const npc = new CarrotCartel(mockScene, mockPhysicsWorld, mockPosition);

      expect(createCarrotModel).toHaveBeenCalledOnce();
      expect(npc.mesh).toBeDefined();
      expect(npc.mesh.position.x).toBe(mockPosition.x);
      expect(npc.mesh.position.y).toBe(mockPosition.y);
      expect(npc.mesh.position.z).toBe(mockPosition.z);
      expect(mockScene.add).toHaveBeenCalledWith(npc.mesh);
    });

    it('should invoke createPhysics with correct parameters', () => {
      const npc = new CarrotCartel(mockScene, mockPhysicsWorld, mockPosition);

      expect(mockPhysicsWorld.createNpcBody).toHaveBeenCalledWith(
        mockPosition,
        { radius: 0.5 },
        true
      );
      expect(mockPhysicsWorld.registerSync).toHaveBeenCalledWith(npc.mesh, npc.body);
      expect(npc.body.npcInstance).toBe(npc);
    });
  });
});
