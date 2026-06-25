# 🤖 AI Agent Engineering & System Policies

This document establishes strict, invariant engineering rules for all current and future AI agents working on the **Potato Gang** codebase. Compliance is mandatory to maintain system integrity.

---

## 🛠️ 1. System Stack Constraints
The project stack is locked to:
* **Bundler & Dev Server**: Vite (v8.0.16) running in standard ESM mode.
* **3D Renderer**: Vanilla Three.js (v0.184.0) with standard lighting and shadow map configuration.
* **Physics Engine**: Cannon-es (v0.20.0). No other external physics engine may be introduced.

---

## 🚫 2. "Never" List
* **Never** bypass coordinate synchronization during active gameplay ticks. All visible 3D mesh coordinates must be updated strictly by syncing with their corresponding Cannon-es physics body coordinates in the physics tick loop.
  - **Lifecycle Exception**: Position/velocity resets during non-gameplay transitions (spawn, game reset, teleport) are permitted, as no physics contacts are active at that moment. These must be clearly commented with `// lifecycle transition — permitted`.
* **Never** write throwaway script structures. All gameplay configurations, physics thresholds, and UI hooks must be clean and modular.
* **Never** mutate meshes outside the physics engine boundaries. Any scale or geometry adjustments that affect collision bounds must be updated in Cannon-es simultaneously.
* **Never** hardcode spatial coordinates. All world positions (ground level, spawn points, height boundaries) must derive from centralized constants in `CONFIG.world` (e.g., `CONFIG.world.GROUND_Y`).

---

## 📝 3. Documentation-as-a-Deliverable Policy
Documentation is a first-class deliverable, not an afterthought. Agents must treat docs with the same rigor as source code.

### 3.1 Living Document Updates
During every session or task, agents **must** review and update the following files if the work performed makes the existing content stale, incomplete, or inaccurate:
* `README.md` — Project overview, setup instructions, feature descriptions.
* `AGENTS.md` (root + any module-level) — Agent rules, constraints, policies.
* `docs/` — Architecture, design decisions, and reference documentation.

If no updates are needed, no action is required — but the agent must consciously evaluate whether updates apply.

### 3.2 Reference-Backed Decisions
When introducing new patterns, architectural decisions, or engineering conventions, agents **must**:
1. Perform a web search to identify current best practices.
2. Cite the source in a `> References:` block within the relevant documentation file.
3. Prefer well-established patterns over novel inventions.

> References:
> - AGENTS.md as living document standard: [addyosmani.com](https://addyosmani.com)
> - Progressive disclosure in docs: Industry convention for modular folder-based structures

---

## 🔄 4. Human-in-the-Loop Decision Protocol
Agents must not make unilateral decisions on ambiguous or impactful changes. When uncertainty exists, agents must follow this protocol:

### 4.1 Options-Based Proposals
For any non-trivial design decision, the agent must:
1. **Present 2–3 options** with clear trade-offs (pros/cons, complexity, risk).
2. **Recommend** one option with reasoning.
3. **Wait for explicit human approval** before proceeding.

### 4.2 Clarification Triggers
A human-in-the-loop clarification cycle **must** be initiated when:
* A change affects gameplay feel or player experience.
* A change modifies physics constants or collision behavior.
* A change introduces a new dependency or architectural pattern.
* The agent is unsure whether existing documentation covers the case.
* Multiple valid implementation approaches exist with different trade-offs.

### 4.3 Feedback Loop
When a human rejects or modifies a proposal:
* The agent must document the decision rationale in the relevant doc file.
* If the rejection reveals a missing rule, the agent must propose an AGENTS.md update.

> References:
> - Human-in-the-loop decision gates for AI agents: [agno.com](https://agno.com), [marktechpost.com](https://marktechpost.com)
> - Options-based guidance vs. approval pattern: [medium.com](https://medium.com)

---

## 🧪 5. Testing Policy
Testing is mandatory and must be maintained alongside source code changes.

### 5.1 Automated Tests
* All code changes must include or update automated tests (`tests/` directory).
* Tests must validate physics invariants, config constants, and spawn coordinate formulas.
* Run `npm run test` to execute the full suite before considering a task complete.

### 5.2 Functional Testing Instructions for Humans
* When changes affect gameplay, include clear **manual verification steps** in the task walkthrough.
* Steps should be numbered, specific, and describe the expected visual/behavioral outcome.
* Example format:
  1. Start game → Player should be standing on the deck, not falling.
  2. Press H to open debug panel → Spawn Broccoli → NPC appears at ground level in front of player.

---

## 📂 6. Modular Folder Policies
To minimize context and maintain developer focus, folder-specific rules are decoupled into their respective directories:
* **Physics engine details**: Refer to [src/physics/AGENTS.md](./src/physics/AGENTS.md) for invariants, collision masks, contact materials, and the **layout & orchestration rules** (including the prohibition on hardcoded layout vectors in `main.js`).
* **NPC system details**: Refer to [src/npc/AGENTS.md](./src/npc/AGENTS.md) for spawn rules, hover mechanics, FSM invariants, and lifecycle rules.
* **Level layout data**: All obstacle and power-up spawn coordinates, colors, and types belong exclusively in `src/level/KitchenLevel.js`. The level engines (`src/level/LevelManager.js` and `src/level/PowerUpManager.js`) are the sole consumers.
* **Render model factories**: All mesh construction (for static obstacles, NPCs, and power-ups) belongs in `src/render/models/`. Each factory returns a fully configured `THREE.Group` or `THREE.Mesh`. Inline primitive construction in orchestration files (`main.js`, `NpcEngine.js`) is prohibited.

## 🚀 7. Performance & Optimization Rules
* **Zero GC Hot Paths**: Never instantiate objects (`new THREE.Vector3()`, `new CANNON.Vec3()`, etc.) inside `update()`, `render()`, or physics tick loops. This generates garbage collection stutter.
  - **Pattern**: Pre-allocate required vectors/quaternions as class properties in the constructor (e.g., `this._moveDirection = new THREE.Vector3()`) and mutate them in-place using `.set()`, `.copy()`, or `.applyAxisAngle()`.
  - Reference: See `docs/performance.md` for benchmarks and examples.
* **File Naming Best Practices**: When creating files (e.g. for benchmarks, tests, or scripts), give them meaningful, non-generic names (e.g. `performance_benchmark.js` instead of `benchmark2.js`) to avoid overlaps and improve clarity.
