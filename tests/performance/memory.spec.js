import { test, expect } from '@playwright/test';
import { attachPerformanceMonitor } from './cdpHelper.js';
import { setupTestEnvironment, configureGame } from './testHelper.js';

/**
 * Triggers multiple manual garbage collection cycles via CDP and returns JSHeapUsedSize.
 * Running GC multiple times ensures V8 has fully compacted the heap and resolved JIT variables.
 *
 * @param {import('@playwright/test').CDPSession} session - The active CDP session.
 * @returns {Promise<number>} The garbage-collected JS Heap Used Size in bytes.
 */
async function getGcHeapSize(session) {
  await session.send('HeapProfiler.enable');
  // Trigger GC 10 times with small delays to ensure complete heap compaction and page releasing
  for (let i = 0; i < 10; i++) {
    await session.send('HeapProfiler.collectGarbage');
  }
  await session.send('HeapProfiler.disable');
  
  // Query Performance domain metrics
  const { metrics } = await session.send('Performance.getMetrics');
  const heapMetric = metrics.find(m => m.name === 'JSHeapUsedSize');
  return heapMetric ? heapMetric.value : 0;
}

test('Object Pool / Projectile Disposal Memory Leak Test', async ({ page }) => {
  // 1. Attach Chrome DevTools Protocol (CDP) performance monitoring session
  const session = await attachPerformanceMonitor(page);
  
  // 2. Load the page and bypass pointer lock restrictions
  await setupTestEnvironment(page);
  
  // 3. Configure game settings using GUI controller refs:
  // - infiniteAmmo: true -> allows shooting without reloading
  // - projectileLife: 0.2 -> ensures rapid expiration and disposal
  // - aiFrozen: true -> freezes NPC movement/firing to isolate spud launcher allocations
  await configureGame(page, {
    infiniteAmmo: true,
    projectileLife: 0.2,
    aiFrozen: true
  });
  
  // 4. JIT & Heap Warmup Phase: Fire 1,000 projectiles first.
  // This triggers JIT compiler optimization/compilation and expands V8 heap pages to their steady-state
  // BEFORE we take the initial memory snapshot, eliminating false positive growth.
  await page.evaluate(async () => {
    const game = window.gameInstance;
    
    // Fire 50 projectiles every 50ms (total 1,000 projectiles in 1 second)
    await new Promise((resolve) => {
      let shotsFired = 0;
      const interval = setInterval(() => {
        for (let i = 0; i < 50; i++) {
          game.fireProjectile();
          shotsFired++;
          
          if (shotsFired >= 1000) {
            clearInterval(interval);
            resolve();
            break;
          }
        }
      }, 50);
    });
  });
  
  // Wait 4.5 seconds for warmup projectiles and their collision particles to fully expire and clean up
  await page.waitForTimeout(4500);
  
  // 5. Measure baseline heap size after forced garbage collection
  const initialHeap = await getGcHeapSize(session);
  console.log(`[Memory Test] Initial GC Heap Size: ${(initialHeap / 1024 / 1024).toFixed(2)} MB`);
  
  // 6. Rapidly fire the Spud Launcher 1,000 times (staggered to prevent blocking)
  await page.evaluate(async () => {
    const game = window.gameInstance;
    
    // Fire 50 projectiles every 50ms (total 1,000 projectiles in 1 second)
    await new Promise((resolve) => {
      let shotsFired = 0;
      const interval = setInterval(() => {
        for (let i = 0; i < 50; i++) {
          game.fireProjectile();
          shotsFired++;
          
          if (shotsFired >= 1000) {
            clearInterval(interval);
            resolve();
            break;
          }
        }
      }, 50);
    });
  });
  
  // 7. Wait for 4.5 seconds to let all 1,000 projectiles and their splat particles expire
  await page.waitForTimeout(4500);
  
  // 8. Measure final heap size after forced garbage collection
  const finalHeap = await getGcHeapSize(session);
  console.log(`[Memory Test] Final GC Heap Size: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
  
  const growthPercent = ((finalHeap - initialHeap) / initialHeap) * 100;
  console.log(`[Memory Test] JS Heap Growth (with 1000-shot Warmup): ${growthPercent.toFixed(2)}%`);
  
  // 9. Assert that the final heap size is within a 10% threshold of the initial heap size
  expect(finalHeap).toBeLessThanOrEqual(initialHeap * 1.10);
});
