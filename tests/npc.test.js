import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseNpc, NPC_STATES } from '../src/npc/NpcEngine.js';

class MockPhysicsWorld {
  constructor() {
    this.bodies = [];
  }
  deferRemoveBody(body) {
    this.bodies = this.bodies.filter(b => b !== body);
  }
}

class MockScene {
  constructor() {
    this.objects = [];
  }
  add(obj) {
    this.objects.push(obj);
  }
  remove(obj) {
    this.objects = this.objects.filter(o => o !== obj);
  }
}

describe('BaseNpc takeDamage', () => {
  it('should reduce health, flash red, and die when health reaches 0', () => {
    const scene = new MockScene();
    const physicsWorld = new MockPhysicsWorld();
    const pos = new THREE.Vector3(0, 0, 0);
    const npc = new BaseNpc(scene, physicsWorld, pos, 'Test');

    // Set up mock mesh with color
    npc.mesh = new THREE.Group();
    const childMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    npc.mesh.add(childMesh);
    scene.add(npc.mesh);

    // Set up mock body
    npc.body = new CANNON.Body({ mass: 1 });
    physicsWorld.bodies.push(npc.body);

    // Mock functions to avoid side effects and test calls
    npc.spawnSplatter = vi.fn();
    npc.spawnDeathExplosion = vi.fn();
    npc.flashRed = vi.fn(); // We'll just verify it's called
    npc.die = vi.fn(); // We'll just verify it's called

    // Set initial state
    npc.health = 100;

    // 1. Take partial damage
    npc.takeDamage(40, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));

    expect(npc.health).toBe(60);
    expect(npc.flashRed).toHaveBeenCalledTimes(1);
    expect(npc.state).toBe(NPC_STATES.IDLE); // Has not died
    expect(npc.die).not.toHaveBeenCalled();

    // 2. Take lethal damage
    npc.takeDamage(60, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));

    expect(npc.health).toBe(0);
    expect(npc.die).toHaveBeenCalledTimes(1);
    expect(npc.flashRed).toHaveBeenCalledTimes(2);

    // Set state to dead since we mocked `die`
    npc.state = NPC_STATES.DEAD;

    // 3. Take damage while dead (should do nothing)
    npc.takeDamage(10, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
    expect(npc.health).toBe(0);
    expect(npc.die).toHaveBeenCalledTimes(1); // not called again
  });
});
