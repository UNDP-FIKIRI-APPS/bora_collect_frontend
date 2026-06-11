import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer:
    process.env.CI || process.env.PLAYWRIGHT_SKIP_WEBSERVER
      ? undefined
      : {
          command: 'npm run dev',
          port: 5173,
          reuseExistingServer: true,
        },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
