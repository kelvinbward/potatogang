# 🥦🥕 NPC System Guidelines

This document contains NPC-specific constraints and invariants for files in the `src/npc/` folder.

---

## 🎯 1. Spawn Height Rules
* All NPC spawn Y coordinates **must** derive from `CONFIG.world.GROUND_Y` plus the entity's collision shape offset:
  - **Broccoli Boys** (sphere r=0.85): `CONFIG.world.GROUND_Y + 0.85`
  - **Carrot Cartel** (cylinder h=2.5): `CONFIG.world.GROUND_Y + 1.25`
* **Never** hardcode spawn Y values. If a new NPC type is added, document its offset formula here.
* Sandbox debug spawners must place NPCs at ground level in front of the player's current position using `getSpawnInFrontOfPlayer()`.

---

## 🛸 2. Hover Mechanics
NPCs use earth-gravity physics with **spring-force height maintenance** to stay grounded:
* **`_applyHoverForce()`**: A PD (proportional-derivative) spring that:
  1. Counteracts full gravity (`gravity × mass`).
  2. Applies a corrective force proportional to height deviation from `targetHoverY`.
  3. Damps vertical velocity to prevent oscillation.
* **`targetHoverY`**: Set at spawn time to the NPC's initial Y position (ground level).
* **Do not** use constant gravity multipliers (e.g., `gravityForce * 1.04`) as these cause cumulative drift.
* **Do not** apply vertical chase forces. Horizontal movement only on XZ plane; vertical is handled by the hover spring.

---

## 🤖 3. FSM State Invariants
NPCs use a simple finite state machine: `IDLE → CHASE → ATTACK → DEAD`.

| Transition | Condition | Notes |
| :--- | :--- | :--- |
| IDLE → CHASE | `distanceToPlayer < chaseRange` | |
| CHASE → IDLE | `distanceToPlayer > chaseRange + 4` | Hysteresis band prevents flickering |
| CHASE → ATTACK | `distanceToPlayer < attackRange` | |
| ATTACK → CHASE | `distanceToPlayer > attackRange + 2` | Hysteresis band |
| Any → DEAD | `health <= 0` | Triggers `die()` |

### State-Specific Physics
* **IDLE**: Hover spring + drift toward spawn point.
* **CHASE**: Hover spring + horizontal force toward player. `linearDamping = 0.6`.
* **ATTACK**: Hover spring only. `linearDamping = 0.92` (high, to stop drifting while shooting).
* Damping changes happen once on state transition, not every frame.

---

## 💀 4. Death & Cleanup Lifecycle
* `die(silent)` accepts a boolean parameter:
  - `silent = false` (default): Plays death explosion particles, awards score/kills.
  - `silent = true`: Skips all effects. Used by `clearAll()` debug command and wave resets.
* Dead NPCs are removed from the `npcs[]` array during the next `update()` tick.
* `clearAll()` must always call `die(true)` to avoid unearned score.
* **Post-clear respawn**: `CONFIG.sandbox.clearAllNPCs` triggers a silent `clearAll()` and then schedules `spawnEnemies()` after 1.5 seconds **if `CONFIG.npc.spawnEnabled` is true**. Agents must not add additional respawn calls after `clearAll()` — the config sandbox handler owns this lifecycle.

---

## 🔫 5. Projectile Tuning
* NPC fire direction includes a configurable upward bias: `CONFIG.npc.projectileYBias`.
* This compensates for projectile gravity drop over distance.
* The bias value is tunable from the debug panel — do not hardcode it.
