# Physics World: Architectural Design

This document details the architectural design of the Cannon-es rigid body system, collision groups, zero-friction character controller slide materials, and contact-based grounding logic.

---

## 🛠️ 1. Rigid Body Specifications

All physical entities in the simulation are represented by Cannon-es `CANNON.Body` instances:

| Entity | Physics Shape | Mass (kg) | Damping | Rotation |
| :--- | :--- | :--- | :--- | :--- |
| **Player** | `CANNON.Sphere(0.85)` | `60` | `0.98` (standing), `0.7` (moving), `0.1` (airborne) | `fixedRotation: true` |
| **Broccoli** | `CANNON.Sphere(0.85)` | `15` | `0.6` linear, `0.8` angular | `fixedRotation: true` |
| **Carrot** | `CANNON.Cylinder(0.1, 0.5, 2.5, 8)` | `15` | `0.6` linear, `0.8` angular | `fixedRotation: true` |
| **Soda Can** | `CANNON.Box(0.8, 1.6, 0.8)` (static) | `0` | N/A | Static |
| **Cereal Box** | `CANNON.Box(1.1, 2.25, 0.75)` (static) | `0` | N/A | Static |
| **Projectile** | `CANNON.Sphere(0.2)` or `0.18` | `1` | `0.05` linear (retains speed) | Free |

---

## 🛡️ 2. Collision Filtering Bitmasks

To prevent friendly fire (projectiles colliding with their own launchers) and optimize broadphase collision checks, we enforce binary bitmask groups:

```
Entity Group:
  GROUP_PLAYER           = 1  (00001)
  GROUP_ENVIRONMENT      = 2  (00010)
  GROUP_NPC              = 4  (00100)
  GROUP_PROJECTILE       = 8  (01000)
  GROUP_NPC_PROJECTILE   = 16 (10000)
```

### Mask Matrix Table
| Group Name | Bit Value | Collision Mask (Collides With) |
| :--- | :--- | :--- |
| `GROUP_PLAYER` | `1` | `GROUP_ENVIRONMENT` \| `GROUP_NPC` \| `GROUP_NPC_PROJECTILE` |
| `GROUP_ENVIRONMENT` | `2` | `GROUP_PLAYER` \| `GROUP_NPC` \| `GROUP_PROJECTILE` \| `GROUP_NPC_PROJECTILE` |
| `GROUP_NPC` | `4` | `GROUP_PLAYER` \| `GROUP_ENVIRONMENT` \| `GROUP_PROJECTILE` |
| `GROUP_PROJECTILE` | `8` | `GROUP_NPC` \| `GROUP_ENVIRONMENT` |
| `GROUP_NPC_PROJECTILE`| `16` | `GROUP_PLAYER` \| `GROUP_ENVIRONMENT` |

---

## ⛸️ 3. Zero-Friction Slide Contact Materials

To resolve character controller sticking (where a player gets stuck flat against walls or floor boundaries when trying to walk), we use custom materials:

```
               [ Player Body ]
             ( playerMaterial )
                     │
                     │  Zero Friction (0.0)
                     ▼
             [ Static Countertop ]
           ( environmentMaterial )
```

*   **`playerMaterial`**: Assigned specifically to the player body sphere.
*   **`environmentMaterial`**: Assigned to the stainless steel floor deck and all static box structures (cereal boxes, counters, soda cans).
*   **`CANNON.ContactMaterial`**: Registered in the physics world with `friction: 0.0` and `restitution: 0.0`. This causes the player body to slide smoothly over all static surfaces without losing forward momentum or getting stuck due to normal force penetration.

---

## 🦶 4. Contact-Based Grounding Logic

Instead of checking hardcoded vertical coordinates (which fail when standing on top of boxes or counters), we inspect active collision contact equations after each step:

```
                 /---------\
                /           \
               | Player Body |
                \           /
                 \---------/
                      ▲ ni (Normal points UPWARDS)
                      │
            ========= Contact Point =========
                      │
               [ Ground Deck / Box ]
```

### Normal Check Algorithm
For each contact equation in `this.world.contacts`:
1.  Check if `contact.bi === playerBody` or `contact.bj === playerBody`.
2.  Obtain the normal vector $n_i$ (which points from body $i$ to body $j$).
3.  Calculate the relative normal vector $y$-component pointing towards the player:
    $$\text{normalY} = (\text{contact.bi} === \text{playerBody}) ? -n_i.y : n_i.y$$
4.  If $\text{normalY} > 0.5$, it means the contact surface is flat or sloped upwards underneath the player's bottom quadrant. The player is marked as `grounded`.

---

## 🧪 5. Testing Guidelines

### Vitest Unit Tests
Execute the Vitest suite (`npm run test`) to verify:
*   `PhysicsWorld` initializes with default gravity (`-9.8`).
*   Player body creation sets correct mass (`60`), fixed rotation, linear/angular dampings, and collision groups/masks.
*   Materials `playerMaterial` and `environmentMaterial` are properly assigned on creation.

### Manual Verification
*   Open the browser and stand against the side of a cereal box cover. Move W/A/S/D and verify the camera glides smoothly along the face of the box without hitching.
*   Jump onto a cereal box structure. Confirm the player lands on top, the HUD shows they are grounded (stamina/jetpack refuels), and walking on top works without issues.
