import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import type { Candidate } from './api-client';
import { loginAndReachHome } from './session';
import { waitForServiceWorker } from './service-worker';
import { DashboardPage } from '../pages/dashboard-page';

const SYNC_TIMEOUT_MS = 45_000;
const CONVERGENCE_TIMEOUT_MS = 60_000;
export interface Device {
  readonly page: Page;
  readonly dashboard: DashboardPage;
}
export async function openOnlineDevice(browser: Browser, candidate: Candidate): Promise<Device> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  return { page, dashboard };
}
export async function openOfflineDevice(browser: Browser, candidate: Candidate): Promise<Device> {
  const device = await openOnlineDevice(browser, candidate);
  await device.page.context().setOffline(true);
  return device;
}
export async function reconnectAndAwaitSync(device: Device): Promise<void> {
  await device.page.context().setOffline(false);
  await awaitSyncedOnDashboard(device);
}
export async function awaitSyncedOnDashboard(device: Device): Promise<void> {
  await device.page.goto('/');
  await expect(device.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
}
export async function closeDevice(device: Device): Promise<void> {
  await device.page.context().close();
}
export async function expectSameDueEverywhere(
  devices: readonly Device[],
  serverDue: () => Promise<string | undefined>,
  readDue: (device: Device) => Promise<string | undefined>,
): Promise<void> {
  await expect(async () => {
    const localDues: (string | undefined)[] = [];
    for (const device of devices) {
      await awaitSyncedOnDashboard(device);
      localDues.push(await readDue(device));
    }
    const expected = await serverDue();
    expect(expected).toBeDefined();
    expect(localDues).toEqual(devices.map(() => expected));
  }).toPass({ timeout: CONVERGENCE_TIMEOUT_MS });
}
