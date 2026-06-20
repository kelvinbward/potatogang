# 🌌 Cannon-es Physics Guidelines

This document contains physics-specific constraints and invariants for files in the `src/physics/` folder.

---

## 🚀 1. Physics Invariants
* **Gravity Vector**: World gravity must remain anchored at the Earth standard gravity setting of **`9.8 m/s²`** (e.g. `CANNON.Vec3(0, -9.8, 0)`). 
* **Force-Based Movement**: Player movement, jumping, and NPC behavior must be computed strictly via forces, impulses, or torque applied to their corresponding `CANNON.Body` instances (e.g. `body.applyForce()` or `body.applyImpulse()`). 
* **NO Positional Overrides**: Never directly modify a dynamic physics body's `position.x/y/z` or `velocity.x/y/z` during active gameplay updates, as this bypasses collision contacts and creates clipping/ghosting issues.
* **Zero Friction Slide**: The player character body is configured with a zero-friction material (`playerMaterial`) colliding with static obstacles/ground (`environmentMaterial`) to prevent clipping and sticking.

---

## 🛡️ 2. Collision boundaries
Collision groups and interaction filtering masks must be strictly implemented via binary bitmask rules:

| Group Name | Bit Value | Description | Collision Mask (Collides With) |
| :--- | :--- | :--- | :--- |
| `GROUP_PLAYER` | `1` | Player physical body volume | Environment, NPCs, NPC Projectiles |
| `GROUP_ENVIRONMENT` | `2` | Ground deck, walls, static obstacles | Player, NPCs, Player/NPC Projectiles |
| `GROUP_NPC` | `4` | Hostile Broccoli/Carrot AI bodies | Player, Environment, Player Projectiles |
| `GROUP_PROJECTILE` | `8` | Player-launched spud weapons | Environment, NPCs |
| `GROUP_NPC_PROJECTILE`| `16` | Hostile juice/seed bullet meshes | Player, Environment |
