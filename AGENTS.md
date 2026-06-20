# 🤖 AI Agent Engineering & System Policies

This document establishes strict, invariant engineering rules for all current and future AI agents working on the **Potato Gang** codebase. Compliance with these rules is mandatory to maintain system integrity.

---

## 🛠️ 1. System Stack Constraints
The project stack is locked to:
* **Bundler & Dev Server**: Vite (v8.0.16) running in standard ESM mode.
* **3D Renderer**: Vanilla Three.js (v0.184.0) with standard lighting and shadow map configuration.
* **Physics Engine**: Cannon-es (v0.20.0). No other external physics engine may be introduced.

---

## 🚫 2. "Never" List
* **Never** bypass coordinate synchronization. All visible 3D mesh coordinates must be updated strictly by syncing with their corresponding Cannon-es physics body coordinates in the physics tick loop.
* **Never** write throwaway script structures. All gameplay configurations, physics thresholds, and UI hooks must be clean and modular.
* **Never** mutate meshes outside the physics engine boundaries. Any scale or geometry adjustments that affect collision bounds must be updated in Cannon-es simultaneously.

---

## 📂 3. Modular Folder Policies
To minimize context and maintain developer focus, folder-specific rules are decoupled into their respective directories:
* **Physics engine details**: Refer to [src/physics/AGENTS.md](./src/physics/AGENTS.md) for invariants, collision masks, and contact materials.
