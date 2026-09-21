import type { Browser, Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { fetchCardStates, seedForCandidate } from './fixtures/test-support';
import { loginAndReachHome } from './fixtures/session';
import { readLocalCardStateDue } from './fixtures/local-db';
import { waitForServiceWorker } from './fixtures/service-worker';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

const SYNC_TIMEOUT_MS = 10_000;
// Ver offline-sync.e2e.ts: sob carga, a navegação offline pelo service worker pode falhar na
// primeira tentativa mesmo com retentativas internas; retry no nível do teste absorve essa folga.
test.describe.configure({ retries: 2 });

async function openOfflineDeviceAndReview(
  browser: Browser,
  candidate: Candidate,
  reviewedAt: string,
): Promise<{ page: Page; dashboard: DashboardPage }> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await loginAndReachHome(page, candidate.email, candidate.password);
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.clock.install({ time: new Date(reviewedAt) });

  const session = new StudySessionPage(page);
  await gotoOfflineWithRetry(page, '/estudar', session.region);
  await session.reveal();
  await session.rate(3);
  const dashboard = new DashboardPage(page);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  // O único cartão vencido foi avaliado acima; o painel mostra "Tudo em dia", não "Começar
  // sessão" (ver offline-sync.e2e.ts).
  await expect(dashboard.allCaughtUpButton).toBeVisible();
  return { page, dashboard };
}

async function reconnectAndAwaitSync(page: Page, dashboard: DashboardPage): Promise<void> {
  await page.context().setOffline(false);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
}

test('E2E-08 — dois dispositivos sem rede avaliam o mesmo cartão', async ({ browser, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const cardId = seed.cardIds[0] ?? '';

  const deviceA = await openOfflineDeviceAndReview(browser, candidate, '2026-09-18T10:00:00Z');
  const deviceB = await openOfflineDeviceAndReview(browser, candidate, '2026-09-18T11:00:00Z');

  await reconnectAndAwaitSync(deviceA.page, deviceA.dashboard);
  await reconnectAndAwaitSync(deviceB.page, deviceB.dashboard);

  await deviceA.page.reload();
  await expect(deviceA.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });

  const dueOnA = await readLocalCardStateDue(deviceA.page, cardId);
  const dueOnB = await readLocalCardStateDue(deviceB.page, cardId);
  const serverStates = await fetchCardStates(candidate);
  const serverDue = serverStates.find((state) => state.cardId === cardId)?.due;

  expect(dueOnA).toBeDefined();
  expect(dueOnA).toBe(dueOnB);
  expect(dueOnA).toBe(serverDue);

  await deviceA.page.context().close();
  await deviceB.page.context().close();
});
