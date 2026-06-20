# 🤖 AI Agent Engineering & System Policies

This document establishes strict, invariant engineering rules for all current and future AI agents working on the **Potato Gang** codebase. Compliance with these rules is mandatory to maintain system integrity, physics consistency, and coordinate scaling synchronization.

---

## 🛠️ 1. System Stack Constraints
The project stack is locked to:
* **Bundler & Dev Server**: Vite (v8.0.16) running in standard ESM mode.
* **3D Renderer**: Vanilla Three.js (v0.184.0) with standard lighting and shadow map configuration.
* **Physics Engine**: Cannon-es (v0.20.0). No other external physics engine may be introduced.

---

## 🌌 2. Physics Invariants
* **Gravity Vector**: World gravity must remain strictly anchored at its default low-gravity setting of **`0.8 m/s²`** (e.g. `CANNON.Vec3(0, -0.8, 0)`). Lowering or raising this default environment gravity setting globally is strictly prohibited.
* **Force-Based Movement**: Player movement, jumping, and NPC behavior must be computed strictly via forces, impulses, or torque applied to their corresponding `CANNON.Body` instances (e.g. `body.applyForce()` or `body.applyImpulse()`). 
* **NO Positional Overrides**: Never directly modify a dynamic physics body's `position.x/y/z` or `velocity.x/y/z` during active gameplay updates, as this bypasses collision contacts and creates clipping/ghosting issues.

---

## 🛡️ 3. Strict Collision Boundaries
Collision groups and interaction filtering masks must be strictly implemented via binary bitmask rules as defined in [src/physics/PhysicsWorld.js](./src/physics/PhysicsWorld.js). Do not modify these values or add new categories without human developer review:

| Group Name | Bit Value | Description | Collision Mask (Collides With) |
| :--- | :--- | :--- | :--- |
| `GROUP_PLAYER` | `1` ($2^0$) | Player physical body volume | Environment, NPCs, NPC Projectiles |
| `GROUP_ENVIRONMENT` | `2` ($2^1$) | Ground deck, walls, static obstacles | Player, NPCs, Player/NPC Projectiles |
| `GROUP_NPC` | `4` ($2^2$) | Hostile Broccoli/Carrot AI bodies | Player, Environment, Player Projectiles |
| `GROUP_PROJECTILE` | `8` ($2^3$) | Player-launched spud weapons | Environment, NPCs |
| `GROUP_NPC_PROJECTILE`| `16` ($2^4$) | Hostile juice/seed bullet meshes | Player, Environment |

---

## 🚫 4. "Never" List
* **Never** bypass coordinate synchronization. All visible 3D mesh coordinates must be updated strictly by syncing with their corresponding Cannon-es physics body coordinates in the physics tick loop.
* **Never** write throwaway script structures. All gameplay configurations, physics thresholds, and UI hooks must be clean and modular.
* **Never** mutate meshes outside the physics engine boundaries. Any scale or geometry adjustments that affect collision bounds must be updated in Cannon-es simultaneously.
