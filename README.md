# 🥔 Potato Gang: Anti-Gravity Spud

Welcome to **Potato Gang: Anti-Gravity Spud**, a high-octane 3D First-Person Shooter (FPS) prototype set in a surreal "surreal kitchen dimension". You play as a high-tech spud navigating a massive stainless steel countertop, defending your turf from the rival green and orange veggie syndicates.

---

## 🎮 Gameplay & Premise

In this prototype, you are a grounded potato armed with a **Spud Launcher**. You must navigate a massive stainless steel countertop deck (`y = -6`) featuring programmatically scattered cereal boxes and soda cans that serve as cover, all engulfed in atmospheric dark cyberpunk fog (`0x0a0a12`).

*   **The Broccoli Boys**: A rowdy green faction that charges aggressively and fires back at close range.
*   **The Carrot Cartel**: A tactical orange faction of snipers that hover at a distance to take precise shots at you.

Navigate, seek cover behind giant soda cans/cereal boxes (which can be dynamically toggled via the F3 or H debug panel), and defeat all enemies in a wave to trigger the next challenge.

---

## 🛠️ Tech Stack & Key Libraries

*   **Build Tool**: [Vite (v8.0.16)](./vite.config.js) - ESM bundler and hot-reloading development server.
*   **3D Renderer**: **Three.js (v0.184.0)** - Powers the environment, custom weapon model, particle splatters, exponential fog, and cyberpunk neon lighting.
*   **Physics Engine**: **Cannon-es (v0.20.0)** - Handles rigid body simulation. While global environment gravity is set to a floaty low-gravity of `0.8 m/s²`, the player experiences simulated Earth gravity (`9.8 m/s²` via custom downward forces) to keep ground controls highly responsive.
*   **Testing Suite**: **Vitest (v4.1.9)** - Modern unit-testing framework for config invariants and physics body creation validations.
*   **HUD & Styling**: **Vanilla HTML & CSS** - Features a responsive glassmorphic neon overlay HUD with animated health, stamina, jetpack boost, and ammunition bars.

---

## 🕹️ Controls Guide

| Input | Action | Effect |
| :--- | :--- | :--- |
| **Mouse Move** | Look Around | Rotates camera (yaw/pitch look rig) |
| **Left Click** | Shoot Spud | Launches high-speed potato wedge projectiles |
| **W / A / S / D** | Walk / strafe | Standard movement on the ground countertop |
| **Left Shift (Hold)** | Run | Drains stamina for a high-speed sprint |
| **Spacebar (Grounded)** | Jump | Applies a physics jump impulse |
| **Spacebar (Airborne)** | Double-Jump / Jetpack | Second press activates the jetpack boost up to a max relative height limit (drains fuel) |
| **Key H or F3** | Toggle Dev Panel | Toggles the lil-gui developer admin debug panel |

*Click anywhere on the start screen to lock your mouse pointer via the **PointerLock API** and enter the arena. Press **ESC** at any time to release lock.*

---

## 📂 Project Structure & Architecture

Here is a breakdown of the key files in the repository:

```
├── .github/                # GitHub workflows / configuration
├── Dockerfile.dev          # Development Dockerfile based on Node 26-Alpine
├── docker-compose.yml      # Docker Compose setup for volume mounts & hot-reload
├── index.html              # Core HTML file containing game layouts, HUD, & overlays
├── package.json            # Scripts and package dependencies (three, cannon-es, vite, vitest)
├── vite.config.js          # Vite configurations (port 5173, hot-reload, polling)
├── AGENTS.md               # Strict AI Agent system engineering policies and physics rules
└── src/
    ├── main.js             # Game lifecycle, controls setup, projectile logic, & rendering loop
    ├── style.css           # Custom stylesheets (glassmorphism UI & fonts)
    ├── npc/
    │   └── NpcEngine.js    # Faction details (Broccoli & Carrot classes), AI FSM, & behavior
    └── physics/
        └── PhysicsWorld.js # Physics world initialization, body builders, & mesh syncing
```

---

## 🚀 Setup & Installation

### Option 1: Run Locally (Recommended)

Make sure you have [Node.js](https://nodejs.org) (v26+) installed.

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run automated tests**:
    ```bash
    npm run test
    ```
3.  **Start the development server**:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5173/potatogang/` to play.

---

### Option 2: Run via Docker Compose

Perfect for sandboxed environments or cross-platform hot-reload safety:

1.  **Build and launch the container**:
    ```bash
    docker compose up -d --build
    ```
2.  **Access the application**:
    Go to `http://localhost:5173/potatogang/` in your browser.
3.  **Stop the services**:
    ```bash
    docker compose down
    ```

---

## ⚡ Technical Implementations of Interest

*   **Earth Gravity Simulation**: Keeps world environment gravity at `0.8 m/s²` globally, while applying a custom `-9.0 * mass` downward force to the player body specifically, mimicking Earth physics for high-precision walking/running.
*   **Dynamic Friction/Damping**: To resolve floaty sliding, player damping is dynamically adjusted: `0.98` when stationary on ground (instant stop), `0.7` when walking/running, and `0.1` when in the air for drifting.
*   **Double-Jump Jetpack**: Activates on a secondary Space press in mid-air, applying vertical thrust forces and draining a custom fuel capacity. Clamped to a max relative boost height (default: `8m` above jump launch point).
*   **Collision Bitmasks**: Enforced at the physics step using strict bitmask filtering (`GROUP_PLAYER`, `GROUP_ENVIRONMENT`, etc.) to prevent projectiles from colliding with their launchers.
*   **Low-Poly Geometry Generation**: Enemy models are constructed entirely programmatically out of primitives (`ConeGeometry`, `CylinderGeometry`, `BoxGeometry`, `SphereGeometry`) to avoid dependency on heavy external GLTF assets.
