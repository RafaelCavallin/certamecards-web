import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { allAccountRecords, putAccountRecord } from './fixtures/account-db';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { dropFirstResponseAfterServerCommit } from './fixtures/network-control';
import { loginAndReachHome } from './fixtures/session';
import { waitForServiceWorker } from './fixtures/service-worker';
import { fetchChangesOfType, seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';

const SYNC_TIMEOUT_MS = 10_000;
const RECONNECT_START_TIMEOUT_MS = 10_000;
const PENDING_CARD_COUNT = 50;

interface DeckChange {
  readonly id: string;
  readonly name: string;
}
interface CardChange {
  readonly id: string;
  readonly deckId: string;
  readonly front: string;
}
interface SyncOperationRecord {
  readonly operationId: string;
  readonly kind: string;
  readonly payload: { readonly kind: string; readonly card?: { readonly front: string } };
}

test('E2E-31 — retomada de conexão inicia o envio em até 10 s', async ({ page, candidate }) => {
  test.setTimeout(180_000);
  const seed = await seedForCandidate(candidate, 'large_deck', { count: PENDING_CARD_COUNT });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  const search = page.getByLabel('Buscar cartões');
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  // A lista usa scroll virtual (cdk-virtual-scroll-viewport): com 50 cartões, a maioria não fica
  // renderizada sem filtrar a busca para 1 resultado por vez.
  for (let index = 0; index < PENDING_CARD_COUNT; index += 1) {
    // "Frente {n} Verso {n}" (conteúdo completo do cartão original) evita ambiguidade com
    // prefixos de dois dígitos (ex.: "Frente 1" também casaria com "Frente 10").
    await search.fill(`Frente ${index} Verso ${index}`);
    await deck.openCard(`Frente ${index} Verso ${index}`);
    await deck.frontField.fill(`Frente ${index} editada`);
    await deck.cardSubmitButton.click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await search.fill(`Frente ${index} editada`);
    await expect(deck.cardRow(`Frente ${index} editada`)).toBeVisible();
  }
  await search.fill('');
  await page.reload();
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  // Offline, o rótulo é "Sem conexão", mas o crachá de pendentes aparece junto (ver
  // offline-sync.e2e.ts); "50 pendentes" só aparece como rótulo quando online novamente.
  await expect(dashboard.syncStatus).toContainText('50');

  const start = Date.now();
  await page.context().setOffline(false);
  await expect(dashboard.syncStatus).toContainText('Sincronizando', { timeout: RECONNECT_START_TIMEOUT_MS });
  expect(Date.now() - start).toBeLessThanOrEqual(RECONNECT_START_TIMEOUT_MS);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: 60_000 });

  const cards = await fetchChangesOfType<CardChange>(candidate, 'card');
  const editedCount = cards.filter((card) => card.deckId === seed.deckId && card.front.endsWith(' editada')).length;
  expect(editedCount).toBe(PENDING_CARD_COUNT);
});

test('E2E-31 — com o app fechado durante a retomada, o envio começa em até 10 s depois de reabrir', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  const context = page.context();
  await context.setOffline(true);
  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.openCard('Frente 0');
  await deck.frontField.fill('Editada com o app fechado');
  await deck.cardSubmitButton.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.close();
  await context.setOffline(false);
  const reopened = await context.newPage();
  const start = Date.now();
  await reopened.goto('/');
  const reopenedDashboard = new DashboardPage(reopened);
  await expect(reopenedDashboard.syncStatus).toHaveText('Sincronizado', { timeout: RECONNECT_START_TIMEOUT_MS });
  expect(Date.now() - start).toBeLessThanOrEqual(RECONNECT_START_TIMEOUT_MS);
  const cards = await fetchChangesOfType<CardChange>(candidate, 'card');
  expect(cards.filter((card) => card.front === 'Editada com o app fechado')).toHaveLength(1);
});

test('E2E-32 — envio interrompido não duplica e erro de validação para a repetição', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);

  await gotoOfflineWithRetry(page, '/decks/novo', page.getByRole('heading', { name: 'Novo deck' }));
  const subject = page.getByLabel('Matéria');
  const firstSubject = await subject.locator('option').nth(1).textContent();
  await subject.selectOption({ label: firstSubject ?? '' });
  await page.getByLabel('Nome').fill('Fila interrompida');
  await page.getByRole('button', { name: 'Criar deck' }).click();
  await page.waitForURL(/\/decks\/(?!novo$)[^/]+$/);
  const deckId = new URL(page.url()).pathname.split('/').at(-1) ?? '';

  const deck = new DeckPage(page);
  const cardFronts = ['Card A', 'Card B', 'Card C'];
  await createCardsKeepingSheetOpen(page, deck, cardFronts);

  await corruptOneCardPayload(page, cardFronts[0] ?? '');
  await dropFirstResponseAfterServerCommit(page, '**/api/sync/mutations');
  await page.context().setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  await expect(dashboard.syncStatus).toContainText('Erro ao sincronizar', { timeout: 30_000 });

  const decks = await fetchChangesOfType<DeckChange>(candidate, 'deck');
  expect(decks.filter((entry) => entry.name === 'Fila interrompida')).toHaveLength(1);
  const cards = await fetchChangesOfType<CardChange>(candidate, 'card');
  expect(cards.filter((entry) => entry.deckId === deckId)).toHaveLength(2);

  await page.goto('/sincronizacao');
  await expect(page.getByRole('alert')).toContainText('Os dados desta alteração foram recusados.');
  await page.goto(`/decks/${deckId}`);
  await expect(deck.cardRow(cardFronts[0] ?? '')).toBeVisible();
});

async function createCardsKeepingSheetOpen(page: Page, deck: DeckPage, fronts: readonly string[]): Promise<void> {
  // A ficha permanece aberta entre criações (keepOnSave); só o primeiro cartão precisa abri-la.
  await deck.newCardButton.click();
  for (const front of fronts) {
    await deck.frontField.fill(front);
    await deck.backField.fill(`Verso de ${front}`);
    await deck.cardSubmitButton.click();
    await expect(deck.frontField).toHaveValue('');
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  const search = page.getByLabel('Buscar cartões');
  for (const front of fronts) {
    await search.fill(front);
    await expect(deck.cardRow(front)).toBeVisible();
  }
  await search.fill('');
}

async function corruptOneCardPayload(page: Page, front: string): Promise<void> {
  const operations = await allAccountRecords<SyncOperationRecord>(page, 'syncOperations');
  const target = operations.find(
    (operation) => operation.kind === 'card_create' && operation.payload.card?.front === front,
  );
  if (target === undefined) {
    throw new Error(`Operação de criação para "${front}" não encontrada na fila local`);
  }
  const corrupted = { ...target, payload: { ...target.payload, card: { ...target.payload.card, front: '' } } };
  await putAccountRecord(page, 'syncOperations', corrupted);
}
