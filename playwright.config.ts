import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'https://certamecards.localhost';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: 0,
  timeout: 60_000,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--ignore-certificate-errors'] } },
    },
    {
      name: 'chromium-pixel',
      use: { ...devices['Pixel 7'], launchOptions: { args: ['--ignore-certificate-errors'] } },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
