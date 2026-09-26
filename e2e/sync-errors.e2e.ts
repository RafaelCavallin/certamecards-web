import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { Candidate } from './fixtures/api-client';
import { expect, test } from './fixtures/test';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { deleteOfficialCard, publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { loginAndReachHome } from './fixtures/session';
import { waitForServiceWorker } from './fixtures/service-worker';
import { expectOk, openApi } from './fixtures/api-session';
import { fetchChangesOfType, revokeSessions, seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';
import { OfficialEditorPage } from './pages/official-editor-page';
import { readLocalCardStateDue } from './fixtures/local-db';
import { allAccountRecords } from './fixtures/account-db';
import { rateAndAwaitLocalWrite } from './fixtures/study-flow';
import { StudySessionPage } from './pages/study-session-page';

const SYNC_TIMEOUT_MS = 10_000;
const RECONNECT_SYNC_TIMEOUT_MS = 45_000;
const DECK_CARDS = 5;
const CLOCK_TOLERANCE_MS = 5_000;
const DECK_CARD_LIMIT = 5_000;
const OVER_LIMIT_FRONT = 'Cartão além do limite';

test('E2E-38 — cartão oficial removido e sessão revogada são erros distintos', async ({ page, candidate, admin }) => {
  test.setTimeout(150_000);
  const officialDeck = await publishOfficialDeck(admin, { name: 'Deck para remoção', subjectName: 'Português', cardCount: DECK_CARDS });
  await subscribeByApi(candidate, officialDeck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  const removedCardId = officialDeck.cardIds[0] ?? '';
  await gotoOfflineWithRetry(page, `/decks/${officialDeck.deckId}`, deck.newCardButton);
  await deck.openCard('Pergunta 0');
  await deck.suspendCurrentCard();
  await expect(page.getByRole('button', { name: 'Reativar', exact: true })).toBeVisible();

  await deleteOfficialCard(admin, officialDeck.deckId, removedCardId);
  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: RECONNECT_SYNC_TIMEOUT_MS });
  await page.goto(`/decks/${officialDeck.deckId}`);
  await expect(deck.cardRow('Pergunta 0')).toHaveCount(0);
  await page.goto('/sincronizacao');
  await expect(page.getByRole('heading', { name: 'Alterações que não se aplicam mais' })).toBeVisible();
  await expect(page.getByText(/Suspender ou reativar cartão/)).toBeVisible();
  await expect(page.getByText(/a ação não se aplica mais. Seu histórico de estudo foi mantido./)).toBeVisible();

  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await page.goto(`/decks/${seed.deckId}`);
  await deck.openCard('Frente 0');
  await deck.frontField.fill('Editado antes de revogar');
  await deck.cardSubmitButton.click();
  await revokeSessions(candidate);
  await page.reload();
  await page.waitForURL((url) => url.pathname === '/entrar');

  await loginAndReachHome(page, candidate.email, candidate.password);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: RECONNECT_SYNC_TIMEOUT_MS });
  await page.goto(`/decks/${seed.deckId}`);
  await expect(deck.cardRow('Editado antes de revogar')).toBeVisible();
});

test('E2E-39 — correção comum não reagenda, `content_update` reagenda', async ({ browser, page, candidate, admin }) => {
  test.setTimeout(180_000);
  const officialDeck = await publishOfficialDeck(admin, { name: 'Deck de correções', subjectName: 'Português', cardCount: DECK_CARDS });
  await subscribeByApi(candidate, officialDeck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const { cardId: reviewedCardId, front: reviewedFront } = await rateFirstCard(page);
  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: RECONNECT_SYNC_TIMEOUT_MS });
  const dueBeforeEdits = await readLocalCardStateDue(page, reviewedCardId);
  expect(dueBeforeEdits).toBeDefined();

  const { context: adminContext, editor } = await openAdminEditor(browser, admin);
  await editor.gotoDeck(officialDeck.deckId);
  await editor.openCard(reviewedFront);
  await editor.editBack('Correção', 'Resposta com typo corrigido');
  await editor.saveCard();
  await expect(async () => {
    await page.goto(`/decks/${officialDeck.deckId}`);
    await expect(page.getByText('Resposta com typo corrigido')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  expect(await readLocalCardStateDue(page, reviewedCardId)).toBe(dueBeforeEdits);

  const beforeContentUpdate = Date.now();
  await editor.gotoDeck(officialDeck.deckId);
  await editor.openCard(reviewedFront);
  await editor.editBack('Alteração de conteúdo', 'Resposta totalmente reescrita');
  await editor.saveCard();
  await editor.cardSheet.getByLabel('O que mudou').fill('Correção legal relevante');
  await editor.saveCard();
  await expect(async () => {
    await page.goto('/');
    const due = await readLocalCardStateDue(page, reviewedCardId);
    expect(due).not.toBe(dueBeforeEdits);
    expect(Date.parse(due ?? '')).toBeGreaterThanOrEqual(beforeContentUpdate - CLOCK_TOLERANCE_MS);
    expect(Date.parse(due ?? '')).toBeLessThanOrEqual(Date.now() + CLOCK_TOLERANCE_MS);
  }).toPass({ timeout: 30_000 });
  await adminContext.close();
});

async function rateFirstCard(page: Page): Promise<{ readonly cardId: string; readonly front: string }> {
  const session = new StudySessionPage(page);
  await gotoOfflineWithRetry(page, '/estudar', session.revealButton);
  await session.reveal();
  await rateAndAwaitLocalWrite(page, 3);
  const [reviewLog] = await allAccountRecords<{ readonly cardId: string }>(page, 'reviewLogs');
  const cardId = reviewLog?.cardId ?? '';
  const cards = await allAccountRecords<{ readonly id: string; readonly front: string }>(page, 'cards');
  return { cardId, front: cards.find((card) => card.id === cardId)?.front ?? '' };
}

async function openAdminEditor(
  browser: Browser,
  admin: Candidate,
): Promise<{ readonly context: BrowserContext; readonly editor: OfficialEditorPage }> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const adminPage = await context.newPage();
  await loginAndReachHome(adminPage, admin.email, admin.password);
  return { context, editor: new OfficialEditorPage(adminPage) };
}

test('E2E-38 — limite descoberto na sincronização preserva o texto e permite tentar de novo', async ({ page, candidate }) => {
  test.setTimeout(240_000);
  const seed = await seedForCandidate(candidate, 'large_deck', { count: DECK_CARD_LIMIT - 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: 90_000 });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.newCardButton.click();
  await deck.frontField.fill(OVER_LIMIT_FRONT);
  await deck.backField.fill('Texto que não pode sumir');
  await deck.cardSubmitButton.click();
  await expect(deck.frontField).toHaveValue('');
  const api = await openApi(candidate);
  const otherDeviceCardId = crypto.randomUUID();
  const created = await api.post(`/api/decks/${seed.deckId}/cards`, { data: { id: otherDeviceCardId, front: 'Criado em outro aparelho', back: 'Verso' } });
  await expectOk(created, 'criar cartão no servidor');
  const { version } = (await created.json()) as { readonly version: number };

  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toContainText('Erro ao sincronizar', { timeout: RECONNECT_SYNC_TIMEOUT_MS });
  await page.goto('/sincronizacao');
  const item = page.getByRole('listitem').filter({ hasText: `Criar cartão: ${OVER_LIMIT_FRONT}` });
  await expect(item).toContainText('O limite de cartões deste deck foi atingido.');
  await expect(item).toContainText(/Limite: 5\.000 cartões por deck\. Neste dispositivo: 5\.00\d cartões\./);
  await expect(item.getByRole('button', { name: 'Copiar texto' })).toBeVisible();
  await item.getByText('Ver texto da alteração').click();
  await expect(item).toContainText('Texto que não pode sumir');

  await expectOk(await api.delete(`/api/cards/${otherDeviceCardId}`, { headers: { 'If-Match': String(version) } }), 'liberar espaço no deck');
  await api.dispose();
  await item.getByRole('button', { name: 'Tentar novamente' }).click();
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: RECONNECT_SYNC_TIMEOUT_MS });
  const cards = await fetchChangesOfType<{ readonly front: string }>(candidate, 'card');
  expect(cards.filter((card) => card.front === OVER_LIMIT_FRONT)).toHaveLength(1);
});
