import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { POWERUP_SPAWNS } from './KitchenLevel.js';
import { createPowerUpModel } from '../render/models/PowerUpModel.js';

/**
 * PowerUpManager — Dynamic lifecycle manager for arena collectibles.
 * Loads layout data, handles floating/spinning animations, tracks player proximity,
 * applies stat benefits, triggers visual impact effects, and controls respawning.
 */
export class PowerUpManager {
  /**
   * @param {THREE.Scene} scene - The WebGL scene context.
   * @param {any} gameInstance - The main Game orchestrator instance.
   */
  constructor(scene, gameInstance) {
    this.scene = scene;
    this.game = gameInstance;
    this.powerups = [];
    this.totalElapsed = 0;

    this.init();
  }

  /**
   * Initialize power-ups based on KitchenLevel layout data.
   */
  init() {
    this.clearAll();

    POWERUP_SPAWNS.forEach((spawn, index) => {
      const group = createPowerUpModel(spawn.type, spawn.color);
      group.position.set(spawn.pos.x, spawn.pos.y, spawn.pos.z);
      this.scene.add(group);

      // Extract components for easy manipulation
      const light = group.getObjectByName('light');
      const core = group.getObjectByName('core');
      const icon = group.getObjectByName('icon');
      const rings = group.getObjectByName('rings');

      // Set initial point light intensity to standard active value
      if (light) {
        light.intensity = 10.0;
      }

      this.powerups.push({
        id: `powerup_${index}`,
        type: spawn.type,
        color: spawn.color,
        basePos: new THREE.Vector3(spawn.pos.x, spawn.pos.y, spawn.pos.z),
        group: group,
        light: light,
        core: core,
        icon: icon,
        rings: rings,
        active: true,
        respawnTimer: 0.0,
        timeOffset: Math.random() * 100.0
      });

      console.log(`[PowerUpManager] Spawned '${spawn.type}' power-up at {x: ${spawn.pos.x}, y: ${spawn.pos.y}, z: ${spawn.pos.z}}`);
    });
  }

  /**
   * Update loops for bobbing animations, rotation, proximity checking, and respawning.
   * @param {number} deltaTime - Time elapsed since last frame.
   * @param {THREE.Vector3} playerPosition - Current position of the player camera/body.
   */
  update(deltaTime, playerPosition) {
    this.totalElapsed += deltaTime;

    for (let i = 0; i < this.powerups.length; i++) {
      const powerup = this.powerups[i];
      if (powerup.active) {
        // 1. Bobbing Vertical Floating Motion
        const bob = Math.sin(this.totalElapsed * CONFIG.powerups.floatSpeed + powerup.timeOffset) * CONFIG.powerups.floatRange;
        powerup.group.position.y = powerup.basePos.y + bob;

        // 2. Rotational Motion
        if (powerup.rings) {
          powerup.rings.rotation.y += CONFIG.powerups.rotateSpeed * deltaTime;
          powerup.rings.rotation.x += CONFIG.powerups.rotateSpeed * 0.4 * deltaTime;
        }
        if (powerup.icon) {
          powerup.icon.rotation.y += CONFIG.powerups.rotateSpeed * 0.7 * deltaTime;
        }

        // Keep light active
        if (powerup.light) {
          powerup.light.intensity = 10.0;
        }

        // 3. Distance Check for collection
        const distance = powerup.group.position.distanceTo(playerPosition);
        if (distance < CONFIG.powerups.collectionRadius) {
          this.collect(powerup);
        }
      } else {
        // Handle inactive respawning lifecycle
        powerup.respawnTimer -= deltaTime;
        
        // Dim the light to 0
        if (powerup.light) {
          powerup.light.intensity = THREE.MathUtils.lerp(powerup.light.intensity, 0, 8 * deltaTime);
        }

        if (CONFIG.powerups.respawnEnabled && powerup.respawnTimer <= 0.0) {
          this.respawn(powerup);
        }
      }
    }
  }

  /**
   * Collection trigger when the player contacts a power-up.
   * @param {any} powerup - The targeted powerup object.
   */
  collect(powerup) {
    powerup.active = false;
    powerup.respawnTimer = CONFIG.powerups.respawnTime;
    
    // Scale group to 0 to hide visual model
    powerup.group.scale.set(0, 0, 0);

    // Apply specific gameplay benefits
    let message = '';
    if (powerup.type === 'health') {
      const prevHealth = this.game.health;
      this.game.health = Math.min(this.game.maxHealth, this.game.health + CONFIG.powerups.healthAmount);
      const gained = Math.round(this.game.health - prevHealth);
      message = `HP RESTORED +${gained}!`;
    } else if (powerup.type === 'ammo') {
      const prevAmmo = this.game.ammo;
      this.game.ammo = Math.min(this.game.maxAmmo, this.game.ammo + CONFIG.powerups.ammoAmount);
      const gained = this.game.ammo - prevAmmo;
      this.game.updateAmmoUI();
      message = `SPUDS LOADED +${gained}!`;
    } else if (powerup.type === 'boost') {
      const prevFuel = this.game.jetpackFuel;
      this.game.jetpackFuel = Math.min(this.game.maxJetpackFuel, this.game.jetpackFuel + CONFIG.powerups.boostAmount);
      const gained = Math.round(this.game.jetpackFuel - prevFuel);
      message = `JETPACK FUEL CHARGED +${gained}%!`;
    }

    // Trigger visual HUD message flash
    if (typeof document !== 'undefined') {
      const msgElement = document.getElementById('hud-message');
      if (msgElement) {
        msgElement.innerText = message;
        // Reset back to status message after 2.5 seconds
        if (this.hudTimeout) clearTimeout(this.hudTimeout);
        this.hudTimeout = setTimeout(() => {
          msgElement.innerText = "TACTICAL KITCHEN ARENA — STAY GROUNDED";
        }, 2500);
      }
    }

    // Trigger color-coded splash/impact particles at collection position
    if (this.game.spawnImpactParticles) {
      this.game.spawnImpactParticles(powerup.group.position, powerup.color);
    }

    // Trigger visual screen flash UI of matching color
    if (typeof document !== 'undefined') {
      const hexString = '#' + powerup.color.toString(16).padStart(6, '0');
      const prevBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = hexString;
      setTimeout(() => {
        document.body.style.backgroundColor = prevBg || '#050608';
      }, 80);
    }

    console.log(`[PowerUpManager] Collected ${powerup.type} power-up.`);

    // If temporary loot, remove from scene and memory completely
    if (powerup.isTemporary) {
      this.scene.remove(powerup.group);
      powerup.group.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.powerups = this.powerups.filter((p) => p !== powerup);
    }
  }

  /**
   * Respawns a collected power-up.
   * @param {any} powerup - The targeted powerup object.
   */
  respawn(powerup) {
    powerup.active = true;
    powerup.respawnTimer = 0.0;
    
    // Scale group back to original with a scale animation in update
    powerup.group.scale.set(1, 1, 1);
    powerup.group.position.copy(powerup.basePos);
    
    if (powerup.light) {
      powerup.light.intensity = 10.0;
    }

    // Spawn subtle respawn particles
    if (this.game.spawnImpactParticles) {
      this.game.spawnImpactParticles(powerup.basePos, powerup.color);
    }

    console.log(`[PowerUpManager] Respawned ${powerup.type} power-up.`);
  }

  /**
   * Spawn exactly 1 power-up type (Health, Ammo, or Boost) based on the player's greatest deficit percentage.
   * This is marked as temporary and does not respawn on pickup.
   * @param {THREE.Vector3} position - The world coordinate of the enemy death.
   */
  spawnLoot(position) {
    // 1. Calculate player resource status percentages
    const hpPercent = this.game.health / this.game.maxHealth;
    const ammoPercent = this.game.ammo / this.game.maxAmmo;
    const fuelPercent = this.game.jetpackFuel / this.game.maxJetpackFuel;

    // 2. Select the type with the lowest current percentage
    let type = 'ammo'; // Default fallback
    let minVal = ammoPercent;

    if (hpPercent < minVal) {
      minVal = hpPercent;
      type = 'health';
    }
    if (fuelPercent < minVal) {
      minVal = fuelPercent;
      type = 'boost';
    }

    // If stats are equal or all full, choose randomly
    if (hpPercent >= 1.0 && ammoPercent >= 1.0 && fuelPercent >= 1.0) {
      const types = ['health', 'ammo', 'boost'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    const colors = {
      health: 0xff0055,
      ammo: 0x39ff14,
      boost: 0x00e5ff
    };

    const color = colors[type];
    const spawnPos = position.clone();
    
    // Ensure it spawns at or above GROUND_Y + half height of the item
    spawnPos.y = Math.max(spawnPos.y, CONFIG.world.GROUND_Y + 0.5);

    const group = createPowerUpModel(type, color);
    group.position.copy(spawnPos);
    this.scene.add(group);

    const light = group.getObjectByName('light');
    const core = group.getObjectByName('core');
    const icon = group.getObjectByName('icon');
    const rings = group.getObjectByName('rings');

    if (light) {
      light.intensity = 10.0;
    }

    this.powerups.push({
      id: `temp_${crypto.randomUUID()}`,
      type: type,
      color: color,
      basePos: spawnPos.clone(),
      group: group,
      light: light,
      core: core,
      icon: icon,
      rings: rings,
      active: true,
      respawnTimer: 0.0,
      timeOffset: Math.random() * 100.0,
      isTemporary: true
    });

    console.log(`[PowerUpManager] Spawned dynamic loot '${type}' power-up (deficit selection) at {x: ${spawnPos.x.toFixed(2)}, y: ${spawnPos.y.toFixed(2)}, z: ${spawnPos.z.toFixed(2)}}`);
  }

  /**
   * Reset all power-ups to initial active state (useful for game restarts).
   */
  reset() {
    // 1. Remove all temporary power-ups from the scene and dispose them
    const tempPowerUps = this.powerups.filter(p => p.isTemporary);
    tempPowerUps.forEach((pu) => {
      this.scene.remove(pu.group);
      pu.group.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });

    // Keep only non-temporary (static) power-ups
    this.powerups = this.powerups.filter(p => !p.isTemporary);

    // 2. Reset static power-ups
    this.powerups.forEach((powerup) => {
      powerup.active = true;
      powerup.respawnTimer = 0.0;
      powerup.group.scale.set(1, 1, 1);
      powerup.group.position.copy(powerup.basePos);
      if (powerup.light) {
        powerup.light.intensity = 10.0;
      }
    });
  }

  /**
   * Clean up all loaded power-up models from the scene.
   */
  clearAll() {
    this.powerups.forEach((powerup) => {
      this.scene.remove(powerup.group);
      
      // Deep dispose geometry & materials
      powerup.group.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.powerups = [];
    if (this.hudTimeout) clearTimeout(this.hudTimeout);
  }
}
