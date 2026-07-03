import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'], serviceWorkers: 'block' });

test('single-file shell smoke test', async ({ page }) => {
  // --- Collect evidence of problems ---
  const consoleErrors: string[] = [];
  const pageErrors: Error[] = [];
  const externalRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err);
  });

  // Block any request not to localhost, file:, data:, or blob:
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const allowed = [
      url.startsWith('http://localhost'),
      url.startsWith('file:/'),
      url.startsWith('data:'),
      url.startsWith('blob:'),
    ];
    if (allowed.some(Boolean)) {
      await route.continue();
    } else {
      externalRequests.push(url);
      await route.abort();
    }
  });

  // --- Load the single-file build ---
  await page.goto('http://localhost:8098/dist/index.html', { waitUntil: 'load' });

  // --- Screenshot for visual evidence ---
  await page.screenshot({ path: 'milestone0-smoke.png', fullPage: true });

  // --- Click Start button ---
  const startButton = page.getByRole('button', { name: /start/i });
  await startButton.click();

  // --- Brief settle ---
  await page.waitForTimeout(500);

  // --- Assertions ---
  const canvasCount = await page.locator('canvas').count();
  expect(canvasCount).toBeGreaterThan(0);

  expect(consoleErrors).toHaveLength(0);
  expect(pageErrors).toHaveLength(0);
  expect(externalRequests).toHaveLength(0);
});
