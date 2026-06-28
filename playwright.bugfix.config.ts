import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/server',
  testMatch: 'bug-fixes.spec.ts',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {},
  projects: [
    {
      name: 'chromium',
      use: {},
    },
  ],
});
