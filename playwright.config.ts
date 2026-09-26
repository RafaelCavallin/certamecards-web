import { defineConfig, devices } from '@playwright/test';
import type { Project } from '@playwright/test';

const BASE_URL = 'https://certamecards.localhost';
const DEFAULT_WORKERS = '50%';
const CHROMIUM_ARGS = { launchOptions: { args: ['--ignore-certificate-errors'] } };
const workersFromEnv = process.env['E2E_WORKERS'];
const skipWebkit = process.env['E2E_SKIP_WEBKIT'] === '1';
const chromiumProjects: Project[] = [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], ...CHROMIUM_ARGS } },
  { name: 'chromium-pixel', use: { ...devices['Pixel 7'], ...CHROMIUM_ARGS } },
];
const webkitProjects: Project[] = skipWebkit ? [] : [{ name: 'webkit-iphone', use: { ...devices['iPhone 15'] } }];

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  workers: workersFromEnv === undefined ? DEFAULT_WORKERS : Number(workersFromEnv),
  retries: 0,
  timeout: 60_000,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [...chromiumProjects, ...webkitProjects],
});
