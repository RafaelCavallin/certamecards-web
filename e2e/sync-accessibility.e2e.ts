import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { allAccountRecords, putAccountRecord } from './fixtures/account-db';
import { VIEWPORT_360, expectAccessibleInBothThemes, expectTouchTargets } from './fixtures/a11y';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { loginAndReachHome } from './fixtures/session';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { simulateStorageFull } from './fixtures/quota';
import { waitForServiceWorker } from './fixtures/service-worker';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';

const SYNC_TIMEOUT_MS = 10_000;
const CONNECTION_NOTICE = 'Isso precisa de conexão.';
interface SyncOperationRecord {
  readonly operationId: string;
  readonly kind: string;
  readonly payload: { readonly kind: string; readonly card?: { readonly front: string } };
}

test('E2E-40 — quota, conflito e expiração em 360px e teclado, sem violações de axe', async ({ page, candidate }) => {
  test.setTimeout(150_000);
  await page.setViewportSize(VIEWPORT_360);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);

  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await expect(dashboard.syncStatus).toHaveCount(0);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toHaveText('Sem conexão', { timeout: SYNC_TIMEOUT_MS });
  await expect(dashboard.syncStatus).toHaveAttribute('aria-live', 'polite');
  await expectTouchTargets([dashboard.syncStatus]);

  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await simulateStorageFull(page);
  await deck.newCardButton.click();
  await deck.frontField.fill('Texto que não pode sumir');
  await deck.backField.fill('Resposta que não pode sumir');
  await deck.cardSubmitButton.click();
  await expect(page.getByRole('alert')).toContainText('Não há espaço suficiente');
  await expect(deck.frontField).toHaveValue('Texto que não pode sumir');
  await expectAccessibleInBothThemes(page);

  await page.reload();
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.openCard('Frente 0');
  await deck.frontField.fill('Frente editada offline');
  await deck.cardSubmitButton.click();
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  // Offline, o rótulo é "Sem conexão"; o crachá de pendentes aparece junto (ver offline-sync.e2e.ts).
  await expect(dashboard.syncStatus).toContainText('Sem conexão1');

  await corruptPendingFront(page, 'Frente editada offline');
  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toContainText('Erro ao sincronizar', { timeout: 30_000 });
});

test('E2E-41 — sessão sem indicador e ações online-only avisadas sem enfileirar', async ({ page, browser, candidate, admin }) => {
  test.setTimeout(120_000);
  const officialDeck = await publishOfficialDeck(admin, { name: 'Deck com estudo', subjectName: 'Português', cardCount: 5 });
  await subscribeByApi(candidate, officialDeck.deckId);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.openCard('Frente 0');
  await deck.frontField.fill('Pendência para a sessão');
  await deck.cardSubmitButton.click();
  const pendingBefore = await allAccountRecords(page, 'syncOperations');

  await page.goto('/estudar');
  await expect(page.locator('app-sync-indicator')).toHaveCount(0);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toContainText('Sem conexão1');

  await page.goto('/biblioteca');
  // getByText casaria também com o app-offline-notice (mesmo texto) dentro da ficha de ajustes,
  // sempre presente no DOM ainda que fechada; escopar a "main" evita a violação de modo estrito.
  await expect(page.locator('main').getByText(CONNECTION_NOTICE)).toBeVisible();
  await page.goto(`/decks/${officialDeck.deckId}`);
  await expect(page.getByRole('button', { name: 'Duplicar como deck próprio' })).toBeDisabled();
  await expect(page.getByText('Isso precisa de conexão: duplicar')).toBeVisible();

  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const adminPage = await adminContext.newPage();
  await loginAndReachHome(adminPage, admin.email, admin.password);
  await waitForServiceWorker(adminPage);
  await adminContext.setOffline(true);
  await gotoOfflineWithRetry(adminPage, '/admin/decks-oficiais', adminPage.getByText(CONNECTION_NOTICE));
  await expect(adminPage.getByText(CONNECTION_NOTICE)).toBeVisible();
  await adminContext.close();

  const pendingAfter = await allAccountRecords(page, 'syncOperations');
  expect(pendingAfter.length).toBe(pendingBefore.length);
});

async function corruptPendingFront(page: Page, front: string): Promise<void> {
  const operations = await allAccountRecords<SyncOperationRecord>(page, 'syncOperations');
  const target = operations.find((operation) => operation.payload.card?.front === front);
  if (target === undefined) {
    throw new Error(`Operação pendente para "${front}" não encontrada`);
  }
  const corrupted = { ...target, payload: { ...target.payload, card: { ...target.payload.card, front: '' } } };
  await putAccountRecord(page, 'syncOperations', corrupted);
}
