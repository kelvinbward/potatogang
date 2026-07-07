# 🧪 Potato Gang: Kitchen Arena — Testing Strategy

This document outlines the testing manifesto and automated verification standards for the **Potato Gang: Kitchen Arena** application.

---

## 📊 The General Testing Strategy Matrix

| Tier | Focus / Scope | Tooling | Execution Trigger | Key Invariants |
| :--- | :--- | :--- | :--- | :--- |
| **Logic & Math** | Pure functions, FSM transitions, config constants, and weapon damage/physics equations. | **Vitest** | Every local save (Pre-commit / dev watcher) | Deterministic math, valid state transitions, config consistency. |
| **Functional E2E** | Player movement mechanics, collision interactions, and Canvas/UI rendering. | **Playwright** | Every Pull Request (PR checks) | Canvas renders without crash, input actions translate to correct in-game position/state. |
| **Performance** | Framerate stability (60fps target), GPU memory usage, and leak detection. | **Playwright + CDP** (Chrome DevTools Protocol) | Pre-deployment to `main` branch | Stable 60fps, zero memory leaks (baseline heap stability), no un-disposed WebGL resources. |

---

## 🔍 Detailed Tier Definitions

### 1. Logic & Math Tier (Vitest)
This tier isolates game logic and math functions from the DOM and renderer, allowing fast, headless execution.
*   **Target Areas**:
    *   State machine transitions (e.g., player states, NPC AI behaviors).
    *   Weapon math (damage calculations, falloff formulas).
    *   Config validation (e.g., verifying `CONFIG.world.GROUND_Y` and movement speeds fall within range).
*   **Execution**: Fast feedback loop. Run automatically via local file watcher on save or as a pre-commit hook.

### 2. Functional E2E Tier (Playwright)
End-to-End browser tests ensure that the entire stack—from Cannon-es physics calculations to Three.js canvas rendering—behaves as expected under realistic user inputs.
*   **Target Areas**:
    *   Movement verification: Simulating WASD key presses and verifying coordinates change accordingly.
    *   Collision verification: Confirming players interact correctly with obstacles and NPCs without slipping through bounds.
    *   Canvas rendering verification: Detecting visual regressions or initialization crashes.
*   **Execution**: Run as a blocker in CI during Pull Request validation.

### 3. Performance Tier (Playwright + CDP)
Validating visual excellence requires objective performance measurements on hardware-accelerated Chromium instances.
*   **Target Areas**:
    *   **60 FPS Guarantee**: Capture performance tracing data programmatically via CDP during gameplay loops. Verify that frame time remains below the budget limit (16.67ms per frame).
    *   **Memory Leak Detection**: Programmatically capture heap snapshots at baseline, perform active gameplay cycles, force garbage collection, and compare snapshots using CDP heap profiling tools.
    *   **WebGL Resource Disposal**: Confirm that Three.js materials, textures, and geometries are explicitly disposed of when models (NPCs, power-ups) are removed.
*   **Execution**: Executed in a specialized workflow prior to merging staging to `main`.

---

> References:
> - Automated WebGL E2E and visual regression testing with Playwright: [playwright.dev](https://playwright.dev)
> - Measuring WebGL Performance and Memory Leak patterns: [threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
> - Profiling JS Heap snapshots programmatically with Chrome DevTools Protocol: [chromedevtools.github.io/devtools-protocol/tot/HeapProfiler](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler)
