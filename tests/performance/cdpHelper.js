/**
 * Establishes a Chrome DevTools Protocol (CDP) session on the page,
 * enables the Performance domain, and returns the session object.
 *
 * @param {import('@playwright/test').Page} page - The Playwright Page object.
 * @returns {Promise<import('@playwright/test').CDPSession>} The established CDPSession.
 */
export async function attachPerformanceMonitor(page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  return session;
}
