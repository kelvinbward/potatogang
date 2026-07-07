# 🥔 Potato Gang: Kitchen Arena

Welcome to **Potato Gang: Kitchen Arena**, a high-octane 3D First-Person Shooter (FPS) prototype set in a massive tactical kitchen dimension. You play as a high-tech spud navigating a stainless steel countertop battlefield, defending your turf from the rival green and orange veggie syndicates — using grounded running, jumping, and a vertical jetpack boost to outmaneuver them.

---

## 🎮 Gameplay & Premise

You are a grounded potato armed with a **Spud Launcher**. You navigate the arena using Earth-standard physics — walking, running, jumping — and a secondary jetpack boost for vertical mobility. The arena features programmatically scattered cereal boxes and soda cans as cover, all engulfed in atmospheric dark cyberpunk fog.

*   **The Broccoli Boys**: A rowdy green faction that charges aggressively and fires back at close range.
*   **The Carrot Cartel**: A tactical orange faction of snipers that hover at a distance to take precise shots at you.

Navigate, seek cover behind giant soda cans/cereal boxes (which can be dynamically toggled via the F3 or H debug panel), and defeat all enemies in a wave to trigger the next challenge.

---

## 🛠️ Tech Stack & Key Libraries

*   **Build Tool**: [Vite (v8.0.16)](./vite.config.js) - ESM bundler and hot-reloading development server.
*   **3D Renderer**: **Three.js (v0.185.1)** - Powers the environment, custom weapon model, particle splatters, exponential fog, and cyberpunk neon lighting.
*   **Physics Engine**: **Cannon-es (v0.20.0)** - Handles rigid body simulation with Earth-standard gravity (`9.8 m/s²`). All character movement is force-based through the physics engine.
*   **Testing Suite**: **Vitest (v4.1.9)** - Unit tests for config invariants, physics body creation, and spawn coordinate math. **Playwright (v1.61.1)** - Performance benchmarks (FPS baseline, spawner stress, memory leak detection) via Chrome DevTools Protocol.
*   **HUD & Styling**: **Vanilla HTML & CSS** - Features a responsive glassmorphic neon overlay HUD with animated health, stamina, jetpack boost, and ammunition bars.

---

## 🕹️ Controls Guide

| Input | Action | Effect |
| :--- | :--- | :--- |
| **Mouse Move** | Look Around | Rotates camera (yaw/pitch look rig) |
| **Left Click** | Shoot Spud | Launches high-speed potato wedge projectiles |
| **W / A / S / D** | Walk / Run (Grounded) | Directional movement on the countertop deck |
| **Left Shift (Hold)** | Sprint | Drains stamina for a high-speed sprint |
| **Spacebar (Grounded)** | Jump | Applies a physics jump impulse (`CONFIG.player.jumpImpulse`) |
| **Spacebar (Airborne, 2nd press)** | Jetpack Boost | Activates vertical thrust (`CONFIG.player.jetpackThrust` N upward force) until fuel depletes or max boost height is reached |
| **Key H or F3** | Toggle Dev Panel | Toggles the lil-gui developer admin debug panel |

*Click anywhere on the start screen to lock your mouse pointer via the **PointerLock API** and enter the arena. Press **ESC** at any time to release lock.*

---

## 📂 Project Structure & Architecture

| Category | Component / Path | Description |
| :--- | :--- | :--- |
| **Core Application** | `src/main.js` | Main game loop, player controls, state management. |
| | `src/config.js` | Central configuration values (physics, entities, sandbox). |
| | `src/style.css` | UI styling using CSS variables and glassmorphism. |
| | `index.html` | Core UI structure, HUD, overlays. |
| **Level Generation** | `src/level/LevelManager.js` | Spawns procedural geometry based on configuration layout. |
| | `src/level/KitchenLevel.js` | Layout declarations and environmental data constraints. |
| | `src/level/PowerUpManager.js` | Dynamic floating collectibles. |
| **Physics** | `src/physics/PhysicsWorld.js` | Cannon-es world setup, collisions, physics ticking. |
| | `src/physics/AGENTS.md` | Physics-specific agent rules (gravity, collisions, boundaries). |
| **NPC / AI** | `src/npc/NpcEngine.js` | AI state machines (Broccoli, Carrot), faction behaviors. |
| | `src/npc/AGENTS.md` | NPC-specific agent rules (spawn, hover, FSM, lifecycle). |
| **Rendering** | `src/render/models/` | Procedural 3D Three.js mesh generation (No external GLTF assets). |
| **Testing** | `tests/` | Vitest suites spanning physics, loading, components. |
| | `tests/performance/` | Playwright performance benchmarks (FPS, spawner stress, memory). |
| | `playwright.config.js` | Playwright configuration (Chromium, GPU flags, timeouts). |
| **Documentation** | `docs/design/performance.md` | In-depth technical review of GC optimization methods. |
| | `docs/testing_strategy.md` | Testing strategy matrix (Logic, E2E, Performance tiers). |
| | `AGENTS.md` | Human-in-the-loop and coding conventions for autonomous agents. |
| **Build & Deploy** | `vite.config.js` | Development and bundle tooling. |
| | `.github/workflows/deploy.yml` | CI/CD pipeline (tests gate deployment to GitHub Pages). |
| | `Dockerfile.dev`, `docker-compose.yml` | Sandboxed execution environments. |

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

*   **Earth Gravity Simulation**: World gravity is locked to `9.8 m/s²`. NPCs maintain ground-level positioning using a spring-damper hover force (PD controller) that counteracts gravity and corrects vertical drift.
*   **Grounded Movement Loop**: Player walking and running apply horizontal force vectors (`CONFIG.player.walkThrust` / `CONFIG.player.runThrust` N) to the Cannon-es player body per physics tick. Sprint (Left Shift) drains `CONFIG.player.staminaDrainRate` per second; `linearDamping` is dynamically adjusted: `0.98` when stationary (instant stop), `0.7` when walking/running, `0.1` when airborne.
*   **Jump & Jetpack Boost**: A single `Spacebar` press on the ground applies a `CONFIG.player.jumpImpulse` N·s impulse. A second press mid-air activates the jetpack, applying `CONFIG.player.jetpackThrust` N upward force each tick while `jetpackFuel > 0` and `heightGained < CONFIG.player.maxBoostHeight`. Fuel recharges at `CONFIG.player.jetpackRechargeRate` units/s when grounded.
*   **Module-Layer Asset Caching**: `SodaCanModel.js` and `CerealBoxModel.js` define their geometry and material as module-level constants (`const STANDARD_CAN_GEO`, `const SODA_CAN_MAT`, etc.) created exactly once at import time. All mesh instances for standard-size scatter items share these exact references — preventing redundant GPU uploads and GC pressure during dense map generation.
*   **Data-Driven Level Pipeline**: `KitchenLevel.js` is pure layout data (types, positions, sizes). `LevelManager.js` iterates this data, calls the correct model factory, and pairs each mesh with a Cannon-es static body — cleanly separating data, rendering, and physics concerns.
*   **Double-Jump Jetpack**: Activates on a secondary Space press in mid-air, applying vertical thrust forces and draining a custom fuel capacity. Clamped to a soft max height via force-based repulsion (default: `8m` relative gain).
*   **Collision Bitmasks**: Enforced at the physics step using strict bitmask filtering (`GROUP_PLAYER`, `GROUP_ENVIRONMENT`, etc.) to prevent projectiles from colliding with their launchers.
*   **Low-Poly Programmatic Models**: Enemy and obstacle models are constructed entirely programmatically out of Three.js primitives to avoid dependency on heavy external GLTF assets. Character models live in `src/render/models/` as isolated, reusable factory functions.
*   **AABB Scatter Exclusion Zones**: `LevelManager._spawnScatter()` generates XZ exclusion rectangles from every fixed obstacle footprint (padded by scatter item half-width + 1.5u), all previously spawned scatter items across different types, and the player safe zone. Scatter items retry position generation up to 50×. If a safe spot still cannot be found, the item skips spawning instead of forcing placement — completely eliminating overlaps and ensuring cereal boxes and soda cans never spawn inside counter slabs or each other.
*   **Live Remaining Enemies Counter**: The HUD top-right panel displays a real-time `REMAINING: N` counter updated every `updateHUD()` tick via `npcEngine.npcs.filter(state !== 'DEAD').length`. Players can see exactly how many enemies stand between them and the next wave.
*   **Debug Clear + Auto-Respawn**: The "Clear All Enemies" sandbox button silently kills all NPCs (no score awarded) then triggers `spawnEnemies()` after 1.5 seconds when Wave Spawning is enabled — matching the natural wave-transition feel.
*   **Global High Score System**: A Supabase integration handles high score tracking. On the "Game Over" screen, players can submit their name to a global leaderboard alongside their score and kill count. The system fetches and dynamically displays the Top 10 entries.

---

## 🔑 Environment Variables
This project requires environment variables to enable the global leaderboard. Add a `.env` file to the root of the project with the following keys from your Supabase project:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
If these are missing, the global leaderboard will gracefully disable itself with a warning in the console.

---

## 🧪 Testing

### Automated Tests
Run the full suite with:
```bash
npm run test
```

Tests cover:
- Config invariants (gravity, spawn heights, world constants)
- Physics body creation and collision filters
- Spawn position math (player, broccoli, carrot all touch GROUND_Y)
- Soft height cap force behavior
- LevelManager load/unload mesh and body tracking
- Model factory output validation (group children, shadow properties)
- Material singleton caching (SodaCanModel, CerealBoxModel)
- AABB exclusion zone logic (`_buildExclusionZones`, `_overlapsAnyZone`)
- Scatter items cannot land inside fixed obstacle or player safe-zone footprints

### Performance Tests
Run the Playwright performance benchmarks:
```bash
npm run test:perf
```

These tests require Chromium and use the Chrome DevTools Protocol (CDP):
- **FPS Baseline**: Measures average framerate over 10 seconds of camera rotation and player movement. Asserts ≥55 FPS (GPU) or ≥12 FPS (software renderer).
- **Spawner Stress**: Spawns 50 simultaneous NPCs and measures framerate under heavy FSM load. Asserts ≥45 FPS (GPU) or ≥8 FPS (software renderer).
- **Memory Leak Detection**: Fires 1,000 projectiles after a JIT warmup phase, forces GC, and asserts heap growth stays within 10%.

See [docs/testing_strategy.md](./docs/testing_strategy.md) for the full testing strategy matrix.

### Manual Functional Tests
1. **Start game** → Player should be standing on the deck, not falling.
2. **Landing screen** → Title shows "Kitchen Arena", WASD shows "Walk / Run (Grounded)", Space shows "Jump / Hold for Jetpack Boost".
3. **WASD movement** → Player moves directionally on the ground countertop.
4. **Hold Shift while moving** → Sprint activates; STAMINA bar drains.
5. **Press Space (grounded)** → Player jumps off the deck.
6. **Press Space again mid-air** → Jetpack activates; BOOST bar drains while held.
7. **Die and restart** → Player resets to deck level without dropping.
8. **Press H → Spawn Broccoli** → NPC appears at ground level in front of the player.
9. **Press H → Spawn Carrot** → NPC appears at ground level in front of the player.
10. **Watch NPCs for 30+ seconds** → No vertical drift upward or downward.
11. **Kill all NPCs** → REMAINING counter reaches 0, new wave spawns at ground level after 1.5s.
12. **HUD top-right** → SCORE, DEFEATED, and REMAINING counters all update correctly during combat.
13. **Press H → Clear All Enemies** → No score or kills awarded; new wave spawns 1.5s later if Wave Spawning is enabled.
14. **Reach height cap (~18m)** → Smooth pushback, not a hard clip.

---

## 📝 Documentation Policy

This project follows a **Documentation-as-a-Deliverable** policy. See [AGENTS.md](./AGENTS.md) for full details. In summary:
- README, docs, and AGENTS files are updated every session when relevant.
- Design decisions are backed by web-searched best practices with cited references.
- AI agents must present options with trade-offs for ambiguous decisions (human-in-the-loop).

## ⚡ Technical Implementations of Interest (Continued)

*   **Zero GC Hot Paths**: To maintain a buttery smooth 60+ FPS, all `THREE.Vector3` and `CANNON.Vec3` instances required for per-frame physics or render calculations are pre-allocated in class constructors. Instead of creating new objects every frame (which triggers costly Garbage Collection pauses), these vectors are reset and mutated in place using `.set()`. This eliminates GC stutter in the critical game loop and improves raw calculation speed by ~23%.
