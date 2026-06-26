export const CONFIG = {
  world: {
    // The Y coordinate of the ground deck surface (top face of the floor slab).
    // All spawn heights and obstacle placements must derive from this value.
    GROUND_Y: -5,
  },
  player: {
    maxHealth: 100,
    walkThrust: 550,
    runThrust: 1100,
    jumpImpulse: 250,
    jetpackThrust: 800,
    jetpackFuelCapacity: 100,
    jetpackConsumptionRate: 60,
    jetpackRechargeRate: 120,
    staminaCapacity: 100,
    staminaDrainRate: 35,
    staminaRechargeRate: 20,
    speedCeiling: 18,
    maxBoostHeight: 8,
    godMode: false,
    infiniteAmmo: false,
    // Sphere collision radius for the player body
    collisionRadius: 0.85,
  },
  physics: {
    // Acceleration due to gravity in meters per second squared (m/s²).
    gravity: 9.8,
    // Force magnitude for soft height-cap repulsion (Newtons).
    heightCapForce: 2000,
  },
  weapon: {
    maxAmmo: 10,
    ammoRegenEnabled: true,
    ammoRegenInterval: 1.2, // seconds per ammo point regenerated
    projectileSpeed: 28,
    projectileLife: 3.5, // seconds
    projectileDamage: 20,
    recoilOffset: 0.18,
    recoilRotation: 0.08,
    recoilDecay: 8,
  },
  npc: {
    spawnEnabled: true,
    aiFrozen: false,
    projectileSpeed: 13.5,
    projectileLife: 4.0,
    projectileDamage: 15,
    // Upward bias added to NPC fire direction to compensate for projectile gravity drop.
    // Tunable from the debug panel.
    projectileYBias: 0.08,
    // Scaling multipliers applied to enemies per wave
    waveProgression: {
      healthMultiplier: 1.2,
      fireRateReduction: 0.1, // subtracts from base fire delay
      speedMultiplier: 1.05
    }
  },
  environment: {
    loadObstacles: false, // Retain obstacles in code, but do not load by default
    structures: [
      // Floor counter left
      { pos: { x: -12, y: -3.5, z: -10 }, size: { x: 10, y: 3, z: 20 }, type: 'counter' },
      // Floor counter right
      { pos: { x: 12, y: -3.5, z: 10 }, size: { x: 10, y: 3, z: 20 }, type: 'counter' },
      
      // Grounded center cereal box (replaces the high center shelf)
      { pos: { x: 0, y: -3.25, z: -10 }, size: { x: 3, y: 3.5, z: 3 }, type: 'cereal' },
      
      // Giant cereal boxes (grounded)
      { pos: { x: -8, y: -3.25, z: -16 }, size: { x: 2.2, y: 3.5, z: 1.2 }, type: 'cereal' },
      { pos: { x: 8, y: -3.25, z: -19 }, size: { x: 2.2, y: 3.5, z: 1.2 }, type: 'cereal' },
      
      // Giant Soda Cans (grounded)
      { pos: { x: -18, y: -3.5, z: 6 }, size: { x: 1.8, y: 3.0, z: 1.8 }, type: 'soda' },
      { pos: { x: 18, y: -3.5, z: -6 }, size: { x: 1.8, y: 3.0, z: 1.8 }, type: 'soda' }
    ]
  },
  powerups: {
    respawnEnabled: true,
    respawnTime: 10.0,
    collectionRadius: 1.6,
    healthAmount: 50.0,
    ammoAmount: 10.0,
    boostAmount: 60.0,
    floatSpeed: 2.2,
    floatRange: 0.18,
    rotateSpeed: 1.8
  },
  sandbox: {
    debugLogging: false,
    spawnBroccoli: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        const pos = window.gameInstance.getSpawnInFrontOfPlayer(0.85);
        window.gameInstance.npcEngine.spawnBroccoli(pos);
      }
    },
    spawnCarrot: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        const pos = window.gameInstance.getSpawnInFrontOfPlayer(1.25);
        window.gameInstance.npcEngine.spawnCarrot(pos);
      }
    },
    clearAllNPCs: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        window.gameInstance.npcEngine.clearAll();
        // Re-spawn a fresh wave after clearing so the player isn't left with
        // an empty arena. Silent clear preserves score integrity.
        if (CONFIG.npc.spawnEnabled) {
          setTimeout(() => {
            window.gameInstance.spawnEnemies();
          }, 1500);
        }
      }
    }
  }
};

export function logDebug(...args) {
  if (CONFIG.sandbox.debugLogging) {
    console.log(...args);
  }
}
