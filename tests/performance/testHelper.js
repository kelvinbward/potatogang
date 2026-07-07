/**
 * Shared utility functions to assist in Three.js and Playwright WebGL testing.
 */

/**
 * Prepares the game environment for headless testing.
 * Bypasses PointerLock API restrictions by manually setting isLocked to true,
 * hiding the blocker DOM overlay, and unhiding the HUD.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object.
 */
export async function setupTestEnvironment(page) {
  // Navigate to base URL configured in playwright.config.js
  await page.goto('/potatogang/');
  
  // Wait for the game instance to be initialized
  await page.waitForFunction(() => window.gameInstance !== undefined, { timeout: 15000 });
  
  // Force lock states and hide screen overlay
  await page.evaluate(() => {
    const game = window.gameInstance;
    game.isLocked = true;
    if (game.blocker) game.blocker.classList.add('hidden');
    if (game.hud) game.hud.classList.remove('hidden');
  });
}

/**
 * Injects a frame timestamp recorder to measure actual rendering framerate.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object.
 */
export async function startFpsTracking(page) {
  await page.evaluate(() => {
    window.fpsFrames = [];
    window.fpsActive = true;
    
    function tick() {
      if (!window.fpsActive) return;
      window.fpsFrames.push(performance.now());
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Disables the frame timestamp recorder and returns the calculated average FPS.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object.
 * @returns {Promise<number>} The average FPS recorded.
 */
export async function stopFpsTracking(page) {
  return await page.evaluate(() => {
    window.fpsActive = false;
    const frames = window.fpsFrames;
    if (!frames || frames.length < 2) return 0;
    
    const durationMs = frames[frames.length - 1] - frames[0];
    if (durationMs <= 0) return 0;
    
    const durationSec = durationMs / 1000;
    return (frames.length - 1) / durationSec;
  });
}

/**
 * Dynamically updates CONFIG settings using the lil-gui controllers.
 * Avoids direct module modification restrictions by leveraging GUI state references.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object.
 * @param {Object} options - Dictionary of config variables and their target values.
 */
export async function configureGame(page, options) {
  await page.evaluate((opts) => {
    if (!window.gameInstance || !window.gameInstance.gui) return;
    
    // Aggregate unique configuration object references from all GUI controllers
    const configObjects = new Set();
    
    // Recurse through all gui folders and controllers
    const extractObjects = (guiInstance) => {
      for (const controller of guiInstance.controllers) {
        if (controller.object) {
          configObjects.add(controller.object);
        }
      }
      for (const folder of guiInstance.folders) {
        extractObjects(folder);
      }
    };
    
    extractObjects(window.gameInstance.gui);
    
    // Apply options to matching config keys
    for (const [key, value] of Object.entries(opts)) {
      for (const obj of configObjects) {
        if (key in obj) {
          obj[key] = value;
        }
      }
    }
  }, options);
}

/**
 * Detects if the browser is using a software renderer (SwiftShader/LLVMPipe)
 * instead of a hardware graphics processor.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object.
 * @returns {Promise<boolean>} True if running on CPU software renderer.
 */
export async function isSoftwareRenderer(page) {
  return await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return true;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return false;
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return /swiftshader|llvmpipe|software/i.test(renderer);
    } catch (e) {
      return true;
    }
  });
}
