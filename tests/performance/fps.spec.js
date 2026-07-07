import { test, expect } from '@playwright/test';
import { attachPerformanceMonitor } from './cdpHelper.js';
import { setupTestEnvironment, startFpsTracking, stopFpsTracking, isSoftwareRenderer } from './testHelper.js';

test('FPS baseline performance test', async ({ page }) => {
  // 1. Attach Chrome DevTools Protocol (CDP) performance monitoring session
  const session = await attachPerformanceMonitor(page);
  
  // 2. Load the page and bypass pointer lock restrictions
  await setupTestEnvironment(page);
  
  // 3. Start registering frame updates via requestAnimationFrame timestamps
  await startFpsTracking(page);
  
  // 4. Simulate active gameplay actions (moving forward and camera rotation)
  await page.evaluate(async () => {
    const game = window.gameInstance;
    
    // Set movement flags inside the game loop to trigger active physics/collision handling
    game.keys.w = true;
    
    const durationMs = 10000;
    const startTime = performance.now();
    
    // Update player rotation incrementally inside requestAnimationFrame
    function animateSimulation() {
      if (performance.now() - startTime > durationMs) {
        // Stop moving after simulation is complete
        game.keys.w = false;
        return;
      }
      
      // Update horizontal view rotation to spin camera
      game.yawObject.rotation.y += 0.01;
      
      requestAnimationFrame(animateSimulation);
    }
    
    requestAnimationFrame(animateSimulation);
    
    // Hold browser execution for the duration of the test
    await new Promise(resolve => setTimeout(resolve, durationMs));
  });
  
  // 5. Extract calculated FPS from tracked frame logs
  const averageFps = await stopFpsTracking(page);
  console.log(`[FPS Test] Average framerate over 10 seconds: ${averageFps.toFixed(2)} FPS`);
  
  // 6. Detect if running on a software renderer and adjust the expected baseline target dynamically
  const isSoftware = await isSoftwareRenderer(page);
  const expectedBaseline = isSoftware ? 12 : 55;
  
  if (isSoftware) {
    console.warn(`[FPS Test WARNING] Software Renderer (SwiftShader/LLVMPipe) detected. GPU acceleration is unavailable. Adjusting threshold: 55 FPS -> ${expectedBaseline} FPS.`);
  }
  
  // 7. Assert framerate maintains target baseline
  expect(averageFps).toBeGreaterThanOrEqual(expectedBaseline);
});
