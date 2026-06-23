import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPowerUpModel } from '../src/render/models/PowerUpModel.js';
import { POWERUP_SPAWNS } from '../src/level/KitchenLevel.js';
import { PowerUpManager } from '../src/level/PowerUpManager.js';
import { CONFIG } from '../src/config.js';

// Minimal mock visual Scene and Game instances
class MockScene {
  constructor() { this.objects = []; }
  add(obj) { this.objects.push(obj); }
  remove(obj) { this.objects = this.objects.filter(o => o !== obj); }
}

class MockGame {
  constructor() {
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 50;
    this.maxAmmo = 50;
    this.jetpackFuel = 100;
    this.maxJetpackFuel = 100;
  }
  updateAmmoUI() {}
  updateHUD() {}
  spawnImpactParticles() {}
}

describe('PowerUpModel factory', () => {
  it('should return a THREE.Group', () => {
    const group = createPowerUpModel('health', 0xff0055);
    expect(group).toBeInstanceOf(THREE.Group);
  });

  it('should contain the core, icon, rings, and light children', () => {
    const group = createPowerUpModel('health', 0xff0055);
    const core = group.getObjectByName('core');
    const icon = group.getObjectByName('icon');
    const rings = group.getObjectByName('rings');
    const light = group.getObjectByName('light');

    expect(core).toBeInstanceOf(THREE.Mesh);
    expect(icon).toBeInstanceOf(THREE.Group);
    expect(rings).toBeInstanceOf(THREE.Group);
    expect(light).toBeInstanceOf(THREE.PointLight);
  });

  it('should construct type-specific icons inside the icon group', () => {
    const healthGroup = createPowerUpModel('health', 0xff0055);
    const healthIcon = healthGroup.getObjectByName('icon');
    // Health cross should have horizontal and vertical mesh bars
    expect(healthIcon.children.length).toBe(2);

    const boostGroup = createPowerUpModel('boost', 0x00e5ff);
    const boostIcon = boostGroup.getObjectByName('icon');
    // Boost double chevron should have 4 slanted bars
    expect(boostIcon.children.length).toBe(4);

    const ammoGroup = createPowerUpModel('ammo', 0x39ff14);
    const ammoIcon = ammoGroup.getObjectByName('icon');
    // Ammo projectile icon should be 1 cylinder mesh
    expect(ammoIcon.children.length).toBe(1);
  });

  it('should set castShadow and receiveShadow on child meshes', () => {
    const group = createPowerUpModel('boost', 0x00e5ff);
    group.traverse((child) => {
      if (child.isMesh) {
        expect(child.castShadow).toBe(true);
        expect(child.receiveShadow).toBe(true);
      }
    });
  });
});

describe('Power-Up Layout Coordinates', () => {
  it('should export a POWERUP_SPAWNS array containing exactly 5 items', () => {
    expect(Array.isArray(POWERUP_SPAWNS)).toBe(true);
    expect(POWERUP_SPAWNS.length).toBe(5);
  });

  it('should have only valid powerup categories (health, ammo, boost)', () => {
    POWERUP_SPAWNS.forEach((spawn) => {
      expect(['health', 'ammo', 'boost']).toContain(spawn.type);
    });
  });

  it('should place powerups above the ground Y coordinate and inside deck bounds', () => {
    POWERUP_SPAWNS.forEach((spawn) => {
      expect(spawn.pos.y).toBeGreaterThan(CONFIG.world.GROUND_Y);
      // Arena bounds are within ±30 units
      expect(Math.abs(spawn.pos.x)).toBeLessThanOrEqual(30);
      expect(Math.abs(spawn.pos.z)).toBeLessThanOrEqual(30);
    });
  });

  it('should map green color exclusively to ammo power-ups', () => {
    const ammoSpawns = POWERUP_SPAWNS.filter(s => s.type === 'ammo');
    ammoSpawns.forEach((spawn) => {
      expect(spawn.color).toBe(0x39ff14); // Green
    });
  });
});

describe('Power-Up & Weapon Configuration Invariants', () => {
  it('should contain required CONFIG.powerups parameters', () => {
    expect(CONFIG.powerups).toBeDefined();
    expect(CONFIG.powerups.respawnEnabled).toBe(true);
    expect(CONFIG.powerups.respawnTime).toBe(10.0);
    expect(CONFIG.powerups.collectionRadius).toBe(1.6);
    expect(CONFIG.powerups.healthAmount).toBe(50.0);
    expect(CONFIG.powerups.ammoAmount).toBe(10.0);
    expect(CONFIG.powerups.boostAmount).toBe(60.0);
  });

  it('should set default max ammo to 10 and enable slower auto-recharge', () => {
    expect(CONFIG.weapon.maxAmmo).toBe(10);
    expect(CONFIG.weapon.ammoRegenEnabled).toBe(true);
    expect(CONFIG.weapon.ammoRegenInterval).toBe(1.2);
  });
});

describe('PowerUpManager lifecycle', () => {
  it('should initialize powerups list successfully', () => {
    const scene = new MockScene();
    const game = new MockGame();
    const manager = new PowerUpManager(scene, game);

    expect(manager.powerups.length).toBe(5);
    manager.powerups.forEach((pu) => {
      expect(pu.active).toBe(true);
      expect(pu.respawnTimer).toBe(0.0);
      expect(pu.group.scale.x).toBe(1);
    });
  });

  it('collect() should disable powerup, set timer, and scale visual group to 0', () => {
    const scene = new MockScene();
    const game = new MockGame();
    const manager = new PowerUpManager(scene, game);
    const powerup = manager.powerups[0];

    manager.collect(powerup);

    expect(powerup.active).toBe(false);
    expect(powerup.respawnTimer).toBe(CONFIG.powerups.respawnTime);
    expect(powerup.group.scale.x).toBe(0);
  });

  it('reset() should reactivate all powerups and restore their scale/lights', () => {
    const scene = new MockScene();
    const game = new MockGame();
    const manager = new PowerUpManager(scene, game);
    
    // Collect some powerups
    manager.collect(manager.powerups[0]);
    manager.collect(manager.powerups[1]);

    manager.reset();

    manager.powerups.forEach((pu) => {
      expect(pu.active).toBe(true);
      expect(pu.respawnTimer).toBe(0.0);
      expect(pu.group.scale.x).toBe(1);
    });
  });

  it('clearAll() should empty lists and remove groups from scene', () => {
    const scene = new MockScene();
    const game = new MockGame();
    const manager = new PowerUpManager(scene, game);

    manager.clearAll();

    expect(manager.powerups.length).toBe(0);
    expect(scene.objects.length).toBe(0);
  });

  it('spawnLoot() should spawn exactly 1 temporary powerup matching player greatest deficit', () => {
    const scene = new MockScene();
    const game = new MockGame();
    const manager = new PowerUpManager(scene, game);

    // Initial length is 5 static power-ups
    expect(manager.powerups.length).toBe(5);

    // Test 1: HP is lowest deficit (e.g. HP=50%, Ammo=100%, Fuel=100%)
    game.health = 50;
    game.maxHealth = 100;
    game.ammo = 50;
    game.maxAmmo = 50;
    game.jetpackFuel = 100;
    game.maxJetpackFuel = 100;

    const deathPos = new THREE.Vector3(5, 2, 5);
    manager.spawnLoot(deathPos);

    expect(manager.powerups.length).toBe(6);
    let tempItems = manager.powerups.filter(p => p.isTemporary);
    expect(tempItems.length).toBe(1);
    expect(tempItems[0].type).toBe('health');

    // Clean up to keep test clean
    manager.collect(tempItems[0]);
    expect(manager.powerups.length).toBe(5);

    // Test 2: Ammo is lowest deficit (HP=100%, Ammo=10%, Fuel=100%)
    game.health = 100;
    game.ammo = 5;
    game.maxAmmo = 50;
    game.jetpackFuel = 100;

    manager.spawnLoot(deathPos);
    tempItems = manager.powerups.filter(p => p.isTemporary);
    expect(tempItems.length).toBe(1);
    expect(tempItems[0].type).toBe('ammo');

    // Clean up
    manager.collect(tempItems[0]);

    // Test 3: Fuel is lowest deficit (HP=100%, Ammo=100%, Fuel=10%)
    game.ammo = 50;
    game.jetpackFuel = 10;
    game.maxJetpackFuel = 100;

    manager.spawnLoot(deathPos);
    tempItems = manager.powerups.filter(p => p.isTemporary);
    expect(tempItems.length).toBe(1);
    expect(tempItems[0].type).toBe('boost');

    // Test that collecting a temporary power-up removes it from the array and scene
    const sampleTemp = tempItems[0];
    manager.collect(sampleTemp);
    expect(manager.powerups.length).toBe(5);
    expect(manager.powerups.includes(sampleTemp)).toBe(false);
  });
});
