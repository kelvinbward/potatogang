import { test, expect } from '@playwright/test';
import { attachPerformanceMonitor } from './cdpHelper.js';
import { setupTestEnvironment, startFpsTracking, stopFpsTracking, isSoftwareRenderer } from './testHelper.js';

test('Spawner Stress Test - 50 active NPCs', async ({ page }) => {
  // 1. Attach Chrome DevTools Protocol (CDP) performance monitoring session
  const session = await attachPerformanceMonitor(page);
  
  // 2. Load the page and bypass pointer lock restrictions
  await setupTestEnvironment(page);
  
  // 3. Start registering frame updates via requestAnimationFrame timestamps
  await startFpsTracking(page);
  
  // 4. Forcefully spawn exactly 50 enemies (25 Broccoli, 25 Carrots)
  await page.evaluate(async () => {
    const game = window.gameInstance;
    const engine = game.npcEngine;
    const GROUND_Y = game.config?.world?.GROUND_Y ?? -5;
    
    // Clear initial wave spawns to ensure exactly 50 enemies are tested
    engine.clearAll();
    
    const halfCount = 25;
    
    // Spawn Broccoli Boys (height offset: sphere radius 0.85m above GROUND_Y)
    for (let i = 0; i < halfCount; i++) {
      const angle = (i / halfCount) * Math.PI * 2;
      const dist = 10 + Math.random() * 8; // Randomize range to prevent overlaps
      engine.spawnBroccoli({
        x: Math.cos(angle) * dist,
        y: GROUND_Y + 0.85,
        z: Math.sin(angle) * dist
      });
    }
    
    // Spawn Carrot Snipers (height offset: cylinder half-height 1.25m above GROUND_Y)
    for (let i = 0; i < halfCount; i++) {
      const angle = (i / halfCount) * Math.PI * 2 + 0.1; // Slightly offset angle
      const dist = 12 + Math.random() * 8;
      engine.spawnCarrot({
        x: Math.cos(angle) * dist,
        y: GROUND_Y + 1.25,
        z: Math.sin(angle) * dist
      });
    }
    
    // Allow the game simulation to run with active FSM pathing updates
    await new Promise(resolve => setTimeout(resolve, 5000));
  });
  
  // 5. Extract calculated FPS under heavy FSM load
  const averageFps = await stopFpsTracking(page);
  console.log(`[Spawner Test] Average framerate under 50 NPC stress load: ${averageFps.toFixed(2)} FPS`);
  
  // 6. Detect if running on a software renderer and adjust the expected baseline target dynamically
  const isSoftware = await isSoftwareRenderer(page);
  const expectedBaseline = isSoftware ? 8 : 45;
  
  if (isSoftware) {
    console.warn(`[Spawner Test WARNING] Software Renderer (SwiftShader/LLVMPipe) detected. GPU acceleration is unavailable. Adjusting threshold: 45 FPS -> ${expectedBaseline} FPS.`);
  }
  
  // 7. Assert game performance remains above target baseline under heavy load
  expect(averageFps).toBeGreaterThanOrEqual(expectedBaseline);
});
