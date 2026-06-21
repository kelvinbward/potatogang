# 🌌 Cannon-es Physics Guidelines

This document contains physics-specific constraints and invariants for files in the `src/physics/` folder.

---

## 🚀 1. Physics Invariants
* **Gravity Vector**: World gravity must remain anchored at the Earth standard gravity setting of **`9.8 m/s²`** (e.g. `CANNON.Vec3(0, -9.8, 0)`). This value is locked to preserve game feel and must not be modified by AI agents without explicit human approval.
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

---

## 🏗️ 4. Layout & Orchestration Rules

These rules govern where level layout data and mesh code may live. Violations break the architectural separation enforced by this codebase.

### Jetpack Impulse Limits (Locked)
The following constants govern the grounded physics and vertical jetpack mobility model and are **locked** to preserve game feel:
* `CONFIG.player.jetpackThrust` — Upward force (N) applied per physics tick while jetpack is active.
* `CONFIG.player.maxBoostHeight` — Maximum relative height gain (m) before jetpack thrust is cut off.
* `CONFIG.player.jumpImpulse` — Impulse (N·s) applied on initial ground jump.
* `CONFIG.physics.gravity` — Must remain `9.8 m/s²`.

**AI agents must never modify these values without explicit human approval** (see AGENTS.md §4 — Human-in-the-Loop Decision Protocol).

### Layout Coordinate Prohibition
> **AI agents must never insert hardcoded layout vectors or mesh code blocks inside `main.js`.**
> All level layout configurations (positions, sizes, types) belong exclusively in `src/level/KitchenLevel.js`.
> All environment mesh factories belong in `src/render/models/`.
> Inline primitive construction (`new THREE.BoxGeometry(...)`, `new THREE.MeshStandardMaterial(...)`) inside orchestration files (`main.js`, `NpcEngine.js`) is prohibited.

### Module Layer Contract
| Layer | File Location | Responsibility |
| :--- | :--- | :--- |
| Layout Data | `src/level/KitchenLevel.js` | Static position/size/type data only |
| Level Engine | `src/level/LevelManager.js` | Iterates data, calls factories, tracks meshes/bodies |
| Model Factories | `src/render/models/*.js` | Creates and returns `THREE.Group` or `THREE.Mesh` |
| Orchestration | `src/main.js` | Calls `LevelManager.loadLevel()` and `NpcEngine` only |

> References:
> - Physics-driven character controllers: Cannon-es documentation
> - Spring-damper model for stable hover: Standard control theory (PD controller)
> - Module-layer separation: [addyosmani.com — JavaScript Module Patterns](https://addyosmani.com)
