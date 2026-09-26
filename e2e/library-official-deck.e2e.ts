import { expect, test } from './fixtures/test';
import { fetchCardReviewHistory } from './fixtures/test-support';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { waitForServiceWorker } from './fixtures/service-worker';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { queueSize, rateAllCards } from './fixtures/study-flow';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';
import { DuplicateDialogPage } from './pages/duplicate-dialog-page';
import { StudySessionPage } from './pages/study-session-page';

const DECK_CARDS = 5;
const OFFLINE_DECK_CARDS = 10;
const SYNC_TIMEOUT_MS = 10_000;

test('E2E-20 — duplicar levando o progresso e do zero', async ({ page, candidate, admin }) => {
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck duplicável'), subjectName: 'Português', cardCount: DECK_CARDS });
  await subscribeByApi(candidate, deck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await dashboard.startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.revealButton).toBeVisible();
  await session.reveal();
  await session.rate(4);
  await session.end();
  await page.getByRole('button', { name: 'Voltar ao painel' }).click();
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  const chartBefore = await dashboard.last14DaysTotalText();
  const dialog = new DuplicateDialogPage(page);
  for (const [mode, reviewing, fresh] of [['carry', 1, DECK_CARDS - 1], ['fresh', 0, DECK_CARDS]] as const) {
    await dialog.openFromDeck(deck.deckId);
    await dialog.confirm(mode);
    await expect(page.getByText(`Baseado em ${deck.name}`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    await expect(page.getByRole('group', { name: `Em revisão: ${reviewing}` })).toBeVisible();
    await expect(page.getByRole('group', { name: `Novos: ${fresh}` })).toBeVisible();
    await dashboard.goto();
    await expect.poll(() => dashboard.last14DaysTotalText()).toBe(chartBefore);
  }
});

test.describe('sem rede', () => {
  test.describe.configure({ retries: 2 });

  test('E2E-26 — deck oficial sem rede', async ({ page, context, candidate, admin }) => {
    test.setTimeout(120_000);
    const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck offline'), subjectName: 'Português', cardCount: OFFLINE_DECK_CARDS });
    await subscribeByApi(candidate, deck.deckId);
    await loginAndReachHome(page, candidate.email, candidate.password);
    await waitForServiceWorker(page);
    await context.setOffline(true);
    const session = new StudySessionPage(page);
    await gotoOfflineWithRetry(page, '/estudar', session.region);
    expect(await queueSize(page)).toBe(OFFLINE_DECK_CARDS);
    await rateAllCards(page, OFFLINE_DECK_CARDS);
    const reset = page.getByRole('button', { name: 'Zerar progresso' });
    await gotoOfflineWithRetry(page, `/decks/${deck.deckId}`, reset);
    await expect(reset).toBeEnabled();
    await expect(page.getByText('Isso precisa de conexão: duplicar, cancelar a inscrição.')).toBeVisible();
    await new DeckPage(page).openCard('Pergunta 0');
    await expect(page.getByRole('button', { name: 'Suspender' })).toBeEnabled();
    await expect(page.locator('dialog[open]').getByText('Isso precisa de conexão.')).toHaveCount(0);
    await context.setOffline(false);
    const dashboard = new DashboardPage(page);
    await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
    await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
    for (const cardId of deck.cardIds) {
      expect((await fetchCardReviewHistory(candidate, cardId)).reviewLogs).toHaveLength(1);
    }
  });
});
