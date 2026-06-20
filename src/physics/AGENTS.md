# 🌌 Cannon-es Physics Guidelines

This document contains physics-specific constraints and invariants for files in the `src/physics/` folder.

---

## 🚀 1. Physics Invariants
* **Gravity Vector**: World gravity must remain anchored at the Earth standard gravity setting of **`9.8 m/s²`** (e.g. `CANNON.Vec3(0, -9.8, 0)`). 
* **Force-Based Movement**: Player movement, jumping, and NPC behavior must be computed strictly via forces, impulses, or torque applied to their corresponding `CANNON.Body` instances (e.g. `body.applyForce()` or `body.applyImpulse()`). 
* **NO Positional Overrides During Gameplay**: Never directly modify a dynamic physics body's `position.x/y/z` or `velocity.x/y/z` during active physics tick updates, as this bypasses collision contacts and creates clipping/ghosting issues.
  - **Lifecycle Exception**: Direct position/velocity writes are permitted during non-gameplay transitions: initial spawn, game reset, or teleport. These operations occur outside the active physics loop and must be annotated with a comment (e.g., `// lifecycle transition — permitted`).
* **Zero Friction Slide**: The player character body is configured with a zero-friction material (`playerMaterial`) colliding with static obstacles/ground (`environmentMaterial`) to prevent clipping and sticking.
* **Soft Boundaries Only**: Height caps and world boundaries must use force-based repulsion (`applyHeightCap`) rather than hard position clipping.

---

## 🛡️ 2. Collision Boundaries
Collision groups and interaction filtering masks must be strictly implemented via binary bitmask rules:

| Group Name | Bit Value | Description | Collision Mask (Collides With) |
| :--- | :--- | :--- | :--- |
| `GROUP_PLAYER` | `1` | Player physical body volume | Environment, NPCs, NPC Projectiles |
| `GROUP_ENVIRONMENT` | `2` | Ground deck, walls, static obstacles | Player, NPCs, Player/NPC Projectiles |
| `GROUP_NPC` | `4` | Hostile Broccoli/Carrot AI bodies | Player, Environment, Player Projectiles |
| `GROUP_PROJECTILE` | `8` | Player-launched spud weapons | Environment, NPCs |
| `GROUP_NPC_PROJECTILE`| `16` | Hostile juice/seed bullet meshes | Player, Environment |

---

## 🎯 3. NPC Gravity Compensation
NPC bodies are dynamic (non-zero mass) and subject to world gravity. To maintain stable positioning:
* **Spring-force hover**: NPCs must use a spring-damper model to maintain their target height (`targetHoverY`), not a constant gravity-counter force. See `_applyHoverForce()` in `src/npc/NpcEngine.js`.
* **No direct velocity damping**: Do not directly set `body.velocity` to slow NPCs. Instead, adjust `body.linearDamping` on state transitions (e.g., raise damping when entering attack stance).
* **Horizontal-only chase forces**: Chase movement forces should only apply on the XZ plane. Vertical stability is handled by the hover spring.

> References:
> - Physics-driven character controllers: Cannon-es documentation
> - Spring-damper model for stable hover: Standard control theory (PD controller)
