import { CONFIG } from '../config.js';

/**
 * KitchenLevel — Data-driven layout definition for the Kitchen Arena.
 *
 * This file is PURE DATA. It must never contain mesh construction, physics
 * body creation, or scene manipulation. Those responsibilities belong exclusively
 * in src/level/LevelManager.js and src/render/models/.
 *
 * Entry schema:
 *   {
 *     type:      'cereal' | 'soda' | 'counter',  // Determines which model factory to use
 *     pos:       { x, y, z },                     // World position (y derived from CONFIG.world.GROUND_Y)
 *     size:      { x, y, z },                     // Bounding box for geometry + physics body
 *     isScatter: boolean,                          // true = random XZ position, count drives quantity
 *     count?:    number,                           // Number of scatter instances (used when isScatter=true)
 *   }
 *
 * GUARDRAIL: Never hardcode position vectors that do not derive from
 * CONFIG.world.GROUND_Y for the Y component. See AGENTS.md §2.
 */

// Pre-compute common heights relative to CONFIG.world.GROUND_Y
// so Y values in this file are always expressed as named constants.
const GROUND_Y = CONFIG.world.GROUND_Y;

export const KITCHEN_LEVEL = [
  // ─── Configured Counter Structures (from CONFIG.environment.structures) ────

  // Counter shelves — large flat cover platforms
  {
    type: 'counter',
    pos: { x: -12, y: GROUND_Y + 1.5, z: -10 },  // center Y = GROUND_Y + halfHeight
    size: { x: 10, y: 3, z: 20 }
  },
  {
    type: 'counter',
    pos: { x: 12, y: GROUND_Y + 1.5, z: 10 },
    size: { x: 10, y: 3, z: 20 }
  },

  // Center cereal box (cover at arena midfield)
  {
    type: 'cereal',
    pos: { x: 0, y: GROUND_Y + 1.75, z: -10 },
    size: { x: 3, y: 3.5, z: 3 }
  },

  // Giant cereal boxes (grounded, flanking positions)
  {
    type: 'cereal',
    pos: { x: -8, y: GROUND_Y + 1.75, z: 16 },
    size: { x: 2.2, y: 3.5, z: 1.2 }
  },
  {
    type: 'cereal',
    pos: { x: 8, y: GROUND_Y + 1.75, z: -19 },
    size: { x: 2.2, y: 3.5, z: 1.2 }
  },

  // Giant soda cans (grounded, flanking positions)
  {
    type: 'soda',
    pos: { x: -18, y: GROUND_Y + 1.5, z: 6 },
    size: { x: 1.8, y: 3.0, z: 1.8 }
  },
  {
    type: 'soda',
    pos: { x: 18, y: GROUND_Y + 1.5, z: -6 },
    size: { x: 1.8, y: 3.0, z: 1.8 }
  },

  // ─── Scatter Definitions ─────────────────────────────────────────────────
  // isScatter=true entries are placed at runtime with random XZ positions
  // by LevelManager. count controls how many instances are spawned.
  {
    type: 'cereal',
    size: { x: 2.2, y: 4.5, z: 1.5 },
    isScatter: true,
    count: 6
  },
  {
    type: 'soda',
    size: { x: 1.6, y: 3.2, z: 1.6 },
    isScatter: true,
    count: 6
  }
];
