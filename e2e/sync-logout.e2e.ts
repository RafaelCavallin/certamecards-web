import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { loginAndReachHome } from './fixtures/session';
import { waitForServiceWorker } from './fixtures/service-worker';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';

const SYNC_TIMEOUT_MS = 10_000;
const MUTATIONS_URL = '**/api/sync/mutations';
interface Scenario {
  readonly page: Page;
  readonly candidate: Candidate;
  readonly dashboard: DashboardPage;
  readonly deck: DeckPage;
}

test('E2E-33 — saída com pendências oferece sincronizar, permanecer ou descartar', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const scenario: Scenario = { page, candidate, dashboard: new DashboardPage(page), deck: new DeckPage(page) };
  await expect(scenario.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);

  await createPendingEditOffline(scenario, seed.deckId, { from: 'Frente 0', to: 'Frente pendente de sincronizar' });
  await gotoOfflineWithRetry(page, '/', scenario.dashboard.syncStatus);
  await exerciseStayAndDiscardChoice(scenario);
  await syncAndSignOutSuccessfully(scenario);

  await loginAndReachHome(page, candidate.email, candidate.password);
  await expect(scenario.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, scenario.deck.newCardButton);
  await expect(scenario.deck.cardRow('Frente pendente de sincronizar')).toBeVisible();

  await discardPendingChangeOnLogout(scenario, seed.deckId);
});

async function createPendingEditOffline(scenario: Scenario, deckId: string, edit: { from: string; to: string }): Promise<void> {
  const { page, deck } = scenario;
  await page.context().setOffline(true);
  await gotoOfflineWithRetry(page, `/decks/${deckId}`, deck.newCardButton);
  await deck.openCard(edit.from);
  await deck.frontField.fill(edit.to);
  await deck.cardSubmitButton.click();
  await expect(deck.cardRow(edit.to)).toBeVisible();
}

async function exerciseStayAndDiscardChoice(scenario: Scenario): Promise<void> {
  const { page, dashboard } = scenario;
  await dashboard.signOutButton.click();
  // dialog[open] (não só "dialog") porque a ficha de ajustes também é um <dialog> sempre presente
  // no DOM, só que fechado.
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading', { name: 'Há alterações que ainda não foram sincronizadas' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sincronizar e sair' })).toBeDisabled();

  await dialog.getByRole('button', { name: 'Sair sem sincronizar' }).click();
  await expect(dialog.getByRole('heading', { name: 'Descartar alterações não sincronizadas?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Voltar' }).click();
  await expect(dialog.getByRole('heading', { name: 'Há alterações que ainda não foram sincronizadas' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Permanecer na conta' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(dashboard.newDeckButton).toBeVisible();
}

async function syncAndSignOutSuccessfully(scenario: Scenario): Promise<void> {
  const { page, dashboard } = scenario;
  await page.context().setOffline(false);
  await dashboard.signOutButton.click();
  const syncAndSignOut = page.locator('dialog[open]').getByRole('button', { name: 'Sincronizar e sair' });
  await expect(syncAndSignOut).toBeEnabled();
  await syncAndSignOut.click();
  await page.waitForURL((url) => url.pathname === '/entrar');
}

async function discardPendingChangeOnLogout(scenario: Scenario, deckId: string): Promise<void> {
  const { page, candidate, dashboard, deck } = scenario;
  await createPendingEditOffline(scenario, deckId, { from: 'Frente pendente de sincronizar', to: 'Frente descartada no logout' });
  // "Sair sem sincronizar" ainda chama o logout do servidor para revogar a sessão, então a conexão
  // volta antes de confirmar; o envio de mutações fica bloqueado para a edição continuar pendente.
  await page.context().route(MUTATIONS_URL, (route) => route.abort('failed'));
  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await dashboard.signOutButton.click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: 'Sair sem sincronizar' }).click();
  await dialog.getByRole('button', { name: 'Descartar e sair' }).click();
  await page.waitForURL((url) => url.pathname === '/entrar');
  await page.context().unroute(MUTATIONS_URL);

  await loginAndReachHome(page, candidate.email, candidate.password);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await page.goto(`/decks/${deckId}`);
  await expect(deck.cardRow('Frente descartada no logout')).toHaveCount(0);
}
