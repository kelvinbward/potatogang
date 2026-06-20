export const CONFIG = {
  player: {
    maxHealth: 100,
    thrustStrength: 550,
    upThrustStrength: 850,
    downThrustStrength: 500,
    speedCeiling: 18,
    godMode: false,
    infiniteAmmo: false,
  },
  physics: {
    // Acceleration due to gravity in meters per second squared (m/s²).
    // Earth standard is ~9.8. Lower values simulate floaty kitchen space gravity.
    gravity: 0.8,
  },
  weapon: {
    maxAmmo: 10,
    ammoRegenInterval: 0.6, // seconds per ammo point regenerated
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
  },
  sandbox: {
    spawnBroccoli: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        window.gameInstance.npcEngine.spawnBroccoli({ x: 0, y: 2, z: -5 });
      }
    },
    spawnCarrot: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        window.gameInstance.npcEngine.spawnCarrot({ x: 0, y: 2, z: -5 });
      }
    },
    clearAllNPCs: () => {
      if (window.gameInstance && window.gameInstance.npcEngine) {
        window.gameInstance.npcEngine.clearAll();
      }
    }
  }
};
