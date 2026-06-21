import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { KITCHEN_LEVEL } from './KitchenLevel.js';
import { createCounterDeck } from '../render/models/CounterDeckModel.js';
import { createCerealBoxMesh } from '../render/models/CerealBoxModel.js';
import { createSodaCanMesh } from '../render/models/SodaCanModel.js';

/**
 * LevelManager — Data-driven level loader for the Kitchen Arena.
 *
 * Responsibilities:
 *  1. Iterates the level layout data from KitchenLevel.js.
 *  2. Instantiates the correct model mesh via the appropriate factory.
 *  3. Creates a matching Cannon-es static rigid body in the physics world.
 *  4. Tracks all created meshes and bodies for teardown via unloadLevel().
 *
 * GUARDRAIL: This class must never contain inline geometry or material
 * construction. All mesh logic belongs in src/render/models/. All layout
 * coordinate data belongs in src/level/KitchenLevel.js.
 */
export class LevelManager {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../physics/PhysicsWorld.js').PhysicsWorld} physicsWorld
   */
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    /** @type {THREE.Mesh[]} Tracked visual meshes for this level. */
    this.envMeshes = [];
    /** @type {import('cannon-es').Body[]} Tracked physics bodies for this level. */
    this.envBodies = [];
  }

  /**
   * Loads the Kitchen Level into the scene and physics world.
   *
   * Builds the structural counter deck first (always present), then iterates
   * KITCHEN_LEVEL to instantiate all configured and scatter obstacles.
   * Safe to call multiple times — calls unloadLevel() first on subsequent loads.
   */
  loadLevel() {
    this.unloadLevel();
    this.scatterObstacles = [];

    console.log('[LevelManager] Beginning level load...');

    // 1. Build the structural counter deck (permanent base platform)
    createCounterDeck(this.scene, this.physicsWorld);
    // Note: deck is not tracked in envMeshes/envBodies because it is a
    // permanent structural element and should never be unloaded mid-session.
    console.log('[LevelManager] Structural counter deck created.');

    // 2. Iterate layout data and spawn each entry
    let fixedCount = 0;
    KITCHEN_LEVEL.forEach(entry => {
      if (entry.isScatter) {
        this._spawnScatter(entry);
      } else {
        this._spawnFixed(entry);
        fixedCount++;
      }
    });

    console.log(`[LevelManager] Level load complete. Spawned ${fixedCount} fixed obstacles and ${this.scatterObstacles.length} scatter items.`);
  }

  /**
   * Removes all tracked environment meshes and physics bodies from the scene.
   * Disposes geometry and materials to free GPU memory.
   *
   * Note: Does NOT remove the counter deck (permanent structural base).
   */
  unloadLevel() {
    this.envMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      // Dispose top-level geometry and material
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        }
        // Cached module-level materials are shared — do not dispose them
      }
    });
    this.envMeshes = [];

    this.envBodies.forEach(body => {
      this.physicsWorld.removeBody(body);
    });
    this.envBodies = [];
  }

  /**
   * Spawns a fixed-position level entry (counter, cereal, soda).
   * @param {{ type: string, pos: {x,y,z}, size: {x,y,z} }} entry
   * @private
   */
  _spawnFixed(entry) {
    const mesh = this._createMesh(entry.type, entry.size);
    if (!mesh) return;

    mesh.position.set(entry.pos.x, entry.pos.y, entry.pos.z);
    this.scene.add(mesh);
    this.envMeshes.push(mesh);

    const body = this.physicsWorld.createStaticBox(entry.pos, entry.size);
    this.envBodies.push(body);

    console.log(`[LevelManager] Spawned fixed '${entry.type}' at {x: ${entry.pos.x.toFixed(2)}, y: ${entry.pos.y.toFixed(2)}, z: ${entry.pos.z.toFixed(2)}}`);
  }

  /**
   * Spawns scatter instances at random XZ positions derived from GROUND_Y.
   * Clears a spawn-safe zone within ±8 units of center to avoid blocking
   * the player start area.
   *
   * @param {{ type: string, size: {x,y,z}, count: number }} entry
   * @private
   */
  _spawnScatter(entry) {
    const halfHeight = entry.size.y / 2;
    const margin = Math.max(entry.size.x, entry.size.z) / 2 + 1.5;
    // Build exclusion rectangles from fixed obstacles + player spawn zone
    const exclusionZones = this._buildExclusionZones(entry);

    for (let i = 0; i < entry.count; i++) {
      let pos;
      let attempts = 0;

      // Retry up to 50 times to find a non-overlapping XZ position
      do {
        pos = {
          x: (Math.random() - 0.5) * 60,
          y: CONFIG.world.GROUND_Y + halfHeight,
          z: (Math.random() - 0.5) * 60
        };
        attempts++;
      } while (attempts < 50 && this._overlapsAnyZone(pos, exclusionZones));

      // If still overlapping after max retries, skip spawning to avoid embedding in other geometry
      if (this._overlapsAnyZone(pos, exclusionZones)) {
        console.warn(`[LevelManager] Skipping scatter item '${entry.type}' (${i+1}/${entry.count}) due to lack of space after 50 attempts.`);
        continue;
      }

      const mesh = this._createMesh(entry.type, entry.size);
      if (!mesh) continue;

      mesh.position.set(pos.x, pos.y, pos.z);
      this.scene.add(mesh);
      this.envMeshes.push(mesh);

      const body = this.physicsWorld.createStaticBox(pos, entry.size);
      this.envBodies.push(body);

      console.log(`[LevelManager] Spawned scatter '${entry.type}' at {x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}} after ${attempts} attempts`);

      // Track globally for cross-type scatter avoidance
      this.scatterObstacles.push({ pos, size: entry.size });

      // Add this new scatter item to the exclusion zones so subsequent items don't overlap it
      exclusionZones.push({
        xMin: pos.x - entry.size.x / 2 - margin,
        xMax: pos.x + entry.size.x / 2 + margin,
        zMin: pos.z - entry.size.z / 2 - margin,
        zMax: pos.z + entry.size.z / 2 + margin
      });
    }
  }

  /**
   * Builds a list of XZ exclusion rectangles that scatter items must avoid.
   * Includes the player-safe center zone and the footprint of every fixed
   * obstacle in KITCHEN_LEVEL, padded by the scatter item's half-extent + 1.5u.
   *
   * @param {{ size: {x,y,z} }} scatterEntry
   * @returns {{ xMin:number, xMax:number, zMin:number, zMax:number }[]}
   * @private
   */
  _buildExclusionZones(scatterEntry) {
    // Padding = scatter item half-width + visual clearance gap
    const margin = Math.max(scatterEntry.size.x, scatterEntry.size.z) / 2 + 1.5;

    const zones = [
      // Player spawn-safe centre zone
      { xMin: -8, xMax: 8, zMin: -8, zMax: 8 }
    ];

    // Add an exclusion zone for every fixed (non-scatter) level entry
    KITCHEN_LEVEL.filter(e => !e.isScatter).forEach(entry => {
      zones.push({
        xMin: entry.pos.x - entry.size.x / 2 - margin,
        xMax: entry.pos.x + entry.size.x / 2 + margin,
        zMin: entry.pos.z - entry.size.z / 2 - margin,
        zMax: entry.pos.z + entry.size.z / 2 + margin
      });
    });

    // Add exclusion zones for any scatter items we've already spawned in previous loops
    if (this.scatterObstacles) {
      this.scatterObstacles.forEach(obs => {
        zones.push({
          xMin: obs.pos.x - obs.size.x / 2 - margin,
          xMax: obs.pos.x + obs.size.x / 2 + margin,
          zMin: obs.pos.z - obs.size.z / 2 - margin,
          zMax: obs.pos.z + obs.size.z / 2 + margin
        });
      });
    }

    return zones;
  }

  /**
   * Returns true if the XZ position falls inside any of the given exclusion zones.
   *
   * @param {{ x:number, z:number }} pos
   * @param {{ xMin:number, xMax:number, zMin:number, zMax:number }[]} zones
   * @returns {boolean}
   * @private
   */
  _overlapsAnyZone(pos, zones) {
    return zones.some(zone =>
      pos.x >= zone.xMin && pos.x <= zone.xMax &&
      pos.z >= zone.zMin && pos.z <= zone.zMax
    );
  }

  /**
   * Delegates mesh construction to the correct model factory based on type.
   *
   * @param {'cereal' | 'soda' | 'counter'} type
   * @param {{ x: number, y: number, z: number }} size
   * @returns {THREE.Mesh | null}
   * @private
   */
  _createMesh(type, size) {
    switch (type) {
      case 'cereal':
        return createCerealBoxMesh(size);
      case 'soda':
        return createSodaCanMesh(size);
      case 'counter': {
        // Counter shelves use the same visual as a cereal-box-style shelf
        const shelfMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.6,
          metalness: 0.2
        });
        const shelfGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(shelfGeo, shelfMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }
      default:
        console.warn(`[LevelManager] Unknown obstacle type: "${type}"`);
        return null;
    }
  }
}
