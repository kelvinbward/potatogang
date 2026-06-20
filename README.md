# 🥔 Potato Gang: Anti-Gravity Spud

Welcome to **Potato Gang: Anti-Gravity Spud**, a high-octane 3D First-Person Shooter (FPS) prototype set in a surreal low-gravity supermarket/kitchen dimension. You play as a high-tech spud drifting through space, defending your turf from the rival green and orange veggie syndicates.

---

## 🎮 Gameplay & Premise

In this prototype, you are a floating potato armed with a **Spud Launcher**. You must navigate floating kitchen counters, giant cereal boxes, and soda cans in an anti-gravity environment while combating incoming waves of hostile vegetables:
*   **The Broccoli Boys**: A rowdy green faction that charges aggressively and fires back at close range.
*   **The Carrot Cartel**: A tactical orange faction of snipers that hover at a distance to take precise shots at you.

Defeat all enemies in a wave to trigger the next, more challenging wave. Avoid getting mash-processed into french fries!

---

## 🛠️ Tech Stack & Key Libraries

*   **Build Tool**: [Vite](./vite.config.js) - Blazing fast modern development server and bundler.
*   **3D Renderer**: **Three.js** - Powers the visual environment, meshes, custom-built weapons, particle splatters, and cyberpunk lighting.
*   **Physics Engine**: **Cannon-es** - Handles low-gravity rigid body simulation, box and sphere colliders, friction/restitution, and collision filtering.
*   **HUD & Styling**: **Vanilla HTML & CSS** - Features a responsive glassmorphic neon overlay HUD with animated health bars, dynamic ammunition indicators, and crosshair color feedback.

---

## 🕹️ Controls Guide

| Input | Action | Effect |
| :--- | :--- | :--- |
| **Mouse Move** | Look Around | Rotates camera (yaw/pitch look rig) |
| **Left Click** | Shoot Spud | Launches high-speed potato wedge projectiles |
| **W / A / S / D** | Thrust / Drift | Applies drift forces to float horizontally |
| **Spacebar** | Thruster Up | Applies upward force (gravity compensation) |
| **Left Shift** | Thruster Down | Applies downward force |

*Click anywhere on the start screen to lock your mouse pointer via the **PointerLock API** and enter the float zone. Press **ESC** at any time to release lock.*

---

## 📂 Project Structure & Architecture

Here is a breakdown of the key files in the repository:

```
├── .github/                # GitHub workflows / configuration
├── Dockerfile.dev          # Development Dockerfile based on Node 20-Alpine
├── docker-compose.yml      # Docker Compose setup for volume mounts & hot-reload
├── index.html              # Core HTML file containing game layouts, HUD, & overlays
├── package.json            # Scripts and package dependencies (three, cannon-es, vite)
├── vite.config.js          # Vite configurations (port 5173, hot-reload, polling)
└── src/
    ├── main.js             # Game lifecycle, controls setup, projectile logic, & rendering loop
    ├── style.css           # Custom stylesheets (glassmorphism UI & fonts)
    ├── npc/
    │   └── NpcEngine.js    # Faction details (Broccoli & Carrot classes), AI FSM, & behavior
    └── physics/
        └── PhysicsWorld.js # Physics world initialization, body builders, & mesh syncing
```

### Module Descriptions

1.  **[index.html](./index.html)**: Sets up the full screen WebGL container, HUD HUD overlays, pointer lock instruction cards, and the Game Over panel.
2.  **[src/main.js](./src/main.js)**: Holds the orchestrating `Game` class. Manages scene setup, light rig, player input mapping, ammunition regeneration timer, particle pools, crosshair raycasting, and restart handlers.
3.  **[src/physics/PhysicsWorld.js](./src/physics/PhysicsWorld.js)**: Configures low gravity (`0.8 m/s²`), contact materials, and registers mesh-body pairings to sync their coordinates every frame. Utilizes strict collision filtering groups (`GROUP_PLAYER`, `GROUP_ENVIRONMENT`, `GROUP_NPC`, `GROUP_PROJECTILE`, `GROUP_NPC_PROJECTILE`).
4.  **[src/npc/NpcEngine.js](./src/npc/NpcEngine.js)**: Defines the Finite State Machine (FSM) behavior (`IDLE`, `CHASE`, `ATTACK`, `DEAD`). Constructs visual low-poly shapes (angry brows, leafy carrot tops, stalk crown broccoli), applies pushback impulses on hit, and instantiates splatters.
5.  **[src/style.css](./src/style.css)**: Dictates visual aesthetics using modern typography (Google Fonts *Outfit* & *Share Tech Mono*), futuristic glass-panels, neon glowing borders, and damage flash highlights.

---

## 🚀 Setup & Installation

### Option 1: Run Locally (Recommended)

Make sure you have [Node.js](https://nodejs.org) (v18+) installed.

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    ```
3.  Open your browser and navigate to `http://localhost:5173/potatogang/` to play the game.

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

*   **Low Gravity Momentum**: The physics world uses standard coordinate mapping from `cannon-es` synced onto `Three.js` meshes. Dampings are adjusted so that releasing WASD allows the player to coast dynamically.
*   **Raycast Reticle Feedback**: Every frame, a ray is cast from the center of the camera. If it intersects with an active enemy's group hierarchy, CSS variables are modified to light the crosshair ring neon orange.
*   **Low-Poly Geometry Generation**: Enemy models are constructed entirely programmatically out of primitives (`ConeGeometry`, `CylinderGeometry`, `BoxGeometry`, `SphereGeometry`) to avoid dependency on heavy external GLTF assets.
