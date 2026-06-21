# Configuration System & Developer Admin Panel

This document outlines the architecture and workflows for configuring settings, toggling features, and running sandbox tests in *Potato Gang: Kitchen Arena*.

---

## ⚙️ Centralized Settings (`src/config.js`)
All parameters driving physics, weapon kinetics, player movement, and NPC behaviors have been decoupled from raw source files and consolidated into `src/config.js`.

### Configuration Structure
The global `CONFIG` object is divided into logical folders:
* **`world`**: Ground-level constant (`GROUND_Y`). All spawn positions and obstacle Y coordinates must derive from this.
* **`player`**: Controls thrust forces (`walkThrust`, `runThrust`, `jumpImpulse`, `jetpackThrust`), fuel capacities, stamina, speed ceilings, God Mode, and Infinite Ammo toggles.
* **`physics`**: Sets gravity magnitude (`9.8 m/s²`, locked) and height-cap repulsion force.
* **`weapon`**: Manages ammo capacity, regeneration rate, projectile speed, recoil decay, and spud damage.
* **`npc`**: Drives active wave spawning states, FSM freeze triggers, and AI projectile kinetics.
* **`environment`**: Toggle flag (`loadObstacles`) and the structured obstacle definitions array (counters, cereal, soda). Consumed by `LevelManager`.
* **`sandbox`**: Exposes action buttons (wrapped as functions) to spawn specific NPCs or reset the scene.

---

## 🛠️ The Dev Admin Panel (`lil-gui`)
An interactive control panel powered by `lil-gui` is integrated to allow designers and developers to adjust `CONFIG` values in real-time inside the browser without reloading the game.

### Accessing the Panel
* **Key Bindings**: Press the **`H` key** or **`F3`** key.
* **Focus Behavior**: When the panel is toggled open, pointer lock is automatically released, allowing your mouse cursor to leave the game window and interact with the UI sliders.

### Binding New Settings to the GUI
To add a new setting to the admin panel:
1. Define the setting under the appropriate section in `src/config.js`.
2. Reference the setting in your component (e.g. `CONFIG.category.mySetting`).
3. Add the setting to the GUI folder inside `setupDebugPanel()` in `src/main.js`:
   ```javascript
   folder.add(CONFIG.category, 'mySetting', minValue, maxValue, stepValue).name('Display Name');
   ```

---

## 🏝️ Asset Isolation Workflow (Sandbox Mode)
To isolate models or environments for fast visual adjustments:
1. Press `H` or `F3` to open the admin panel.
2. In the **NPC / Enemies** folder, uncheck **Wave Spawning** to pause enemy spawning.
3. In the **Sandbox** folder, click **Spawn Broccoli (Front)** or **Spawn Carrot (Front)**.
4. Go to the **NPC / Enemies** folder and check **Freeze AI** to prevent the model from drifting or firing.
5. You can now tweak the character geometry in `src/render/models/BroccoliModel.js` or `src/render/models/CarrotModel.js`, and Vite hot-reload will refresh the isolated asset instantly.

---

## 🗑️ Clear All Enemies Behavior
The **Clear All Enemies** sandbox button (`CONFIG.sandbox.clearAllNPCs`) performs a **silent kill** — NPCs are removed without awarding score or incrementing the kill counter. This preserves scoring integrity for debug/testing sessions.

**Post-clear respawn**: If **Wave Spawning** is enabled, a fresh wave automatically spawns 1.5 seconds after the clear, matching the natural wave-transition timing. To inspect an empty arena without respawning, disable **Wave Spawning** first.
