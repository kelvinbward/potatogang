# 🔋 Power-Up & Collectible Resource System

This document outlines the architecture, layout, and configuration parameters of the collectible resource power-up system in the Potato Gang arena.

---

## 🎨 Design & Visual Aesthetics

Power-ups replace static, non-interactive point light meshes with dynamic, glowing collectibles that dynamically affect gameplay. Each power-up features:
*   **Emissive Core**: A solid central sphere (`THREE.SphereGeometry`) emitting high-intensity light matching its gameplay type.
*   **Rotating Shell**: Translucent outer rings (`THREE.TorusGeometry`) rotating on multiple axes to establish premium orbital animations.
*   **Internal Icons**:
    *   **Health**: A 3D white cross bar.
    *   **Ammo**: A 3D bullet/projectile shell casing.
    *   **Boost**: A 3D upward-facing double chevron.
*   **Dynamic Lighting**: A child `THREE.PointLight` linked to the group. When collected, the light smoothly dims to zero, dynamically darkening that sector of the arena, and illuminating it again upon respawn.

### Color Mapping
| Power-Up Type | Stat Restored | Hex Color | Base Height |
| :--- | :--- | :--- | :--- |
| **Health** | Player HP (+25) | `0xff0055` (Red/Magenta) | $Y = 4$ |
| **Ammo** | Spuds Loaded (+5) | `0x39ff14` (Neon Green) | $Y = 6$ |
| **Boost** | Jetpack Fuel (+40%) | `0x00e5ff` (Neon Cyan) | $Y = 4$ or $6$ |

---

## 🏗️ Architecture & Orchestration

The system follows the project's strict separation of layers:
1.  **Layout Data (`src/level/KitchenLevel.js`)**: All spawn coordinates, type classifications, and visual colors are defined inside the `POWERUP_SPAWNS` array.
2.  **Visual Factory (`src/render/models/PowerUpModel.js`)**: Receives category configuration and returns the fully configured `THREE.Group` (meshes, icons, and point light).
3.  **Engine (`src/level/PowerUpManager.js`)**:
    *   Loads entities on game initialization.
    *   Applies floating animations via sinusoidal vertical bobbing:
        $$Y_{pos} = Y_{base} + \sin(t \times \text{floatSpeed} + \phi) \times \text{floatRange}$$
    *   Applies rotational yaw/pitch to outer shells.
    *   Performs distance proximity checks with the player's current camera position.
    *   Manages the collection effects: apply stat boosts, trigger color-matching screen flashes, hide models, dim lights, launch impact particles, and initialize cooldown respawn timers.
4.  **Integrations (`src/main.js`)**: Binds the manager updates to the loop tick and updates the HUD bars/dots.

---

## ⚙️ Configuration Properties

The system is tunable in real-time via the Developer Admin Panel (`Lil-GUI` under 'Power-Ups' and 'Player & Weapon' folders):

```javascript
// src/config.js
weapon: {
  maxAmmo: 50,
  ammoRegenEnabled: true,  // Slow automatic over-time spud reloading
  ammoRegenInterval: 1.2   // Seconds per spud recharged (half the original speed)
},
powerups: {
  respawnEnabled: true,     // Toggle whether static orbs respawn after collection
  respawnTime: 10.0,        // Seconds before respawning
  collectionRadius: 1.6,    // Distance check threshold (meters)
  healthAmount: 25.0,       // HP restored on Red pickup
  ammoAmount: 5.0,          // Projectiles restored on Green pickup
  boostAmount: 40.0,         // Fuel percentage added on Blue pickup
  floatSpeed: 2.2,          // Sine wave speed
  floatRange: 0.18,         // Sine wave amplitude
  rotateSpeed: 1.8          // Ring spinning speed
}
```

---

## 💀 Defeated NPC Loot Drops

To reward combat achievements and optimize performance, when an enemy (Broccoli Boy or Carrot Cartel) is defeated and triggers a death explosion:
1.  **1 Dynamic Loot Power-Up** is spawned directly at the coordinates of the defeated NPC.
2.  **Need-Based Deficit Selection**: The manager determines which of the player's three resource bars (HP, Ammo, Fuel) is currently at the lowest percentage of its maximum capacity and spawns the corresponding drop (Red, Green, or Blue). If all stats are full, it rolls a random type.
3.  **Restoration Quantities**:
    *   **Health (Red)**: Restores **50 HP** (up from 25 HP) to make the single drop highly impactful.
    *   **Ammo (Green)**: Restores **10 Spuds** (a full reload clip).
    *   **Boost (Blue)**: Restores **60% Fuel** (up from 40%).
4.  **Temporary Flag**: These spawned items are flagged with `isTemporary = true`. Once collected, they are deleted from scene memory and the manager array, bypassing the static respawn loop.
5.  **Reset Safety**: In-flight loot powerups are automatically destroyed upon game restart (`reset()`) or session termination to ensure state cleanliness.

---

> References:
> - Dynamic lighting systems in real-time game engines: [learnopengl.com](https://learnopengl.com)
> - Game design pattern for collectibles and item spawning: [gameprogrammingpatterns.com](https://gameprogrammingpatterns.com/service-locator.html)
> - Real-time visual feedback (screen flashes / visual juice): [gamasutra.com / gamedeveloper.com](https://gamedeveloper.com)
