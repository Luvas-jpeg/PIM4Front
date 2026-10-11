import { defineConfig } from '@playwright/test';

const baseURL = process.env['PIM4_E2E_FRONTEND_URL'] ?? 'http://localhost:4200';
const target = new URL(baseURL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !['http:', 'https:'].includes(target.protocol) || target.pathname !== '/' ||
    target.username || target.password || target.search || target.hash) {
  throw new Error('Este teste de pagamento simulado aceita somente um frontend local.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: process.env['PIM4_E2E_BROWSER_CHANNEL'] ?? 'chrome',
    viewport: { width: 1280, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
});
