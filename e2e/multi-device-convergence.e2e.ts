import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { createConfirmedCandidate } from './fixtures/api-client';
import { allAccountRecords } from './fixtures/account-db';
import { closeDevice, expectSameDueEverywhere, openOfflineDevice, openOnlineDevice, reconnectAndAwaitSync } from './fixtures/two-devices';
import type { Device } from './fixtures/two-devices';
import { fetchCardReviewHistory, fetchCardStates, fetchServerSettings, seedForCandidate } from './fixtures/test-support';
import { readLocalCardStateDue } from './fixtures/local-db';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { DeckPage } from './pages/deck-page';
import { SettingsSheetPage } from './pages/settings-sheet-page';
import { rateAndAwaitLocalWrite } from './fixtures/study-flow';
import { StudySessionPage } from './pages/study-session-page';

const SYNC_TIMEOUT_MS = 10_000;
const CONVERGENCE_TIMEOUT_MS = 20_000;
const UNDO_DECK_CARDS = 2;
const CARD_STATE_NEW = 0;
interface SettingsRecord {
  readonly newPerDay: number;
  readonly theme: string;
}
interface ProfileRecord {
  readonly displayName: string;
}

async function localSettings(device: Device): Promise<SettingsRecord | undefined> {
  const [settings] = await allAccountRecords<SettingsRecord>(device.page, 'settings');
  return settings === undefined ? undefined : { newPerDay: settings.newPerDay, theme: settings.theme };
}

test('E2E-30 — ajustes de dois dispositivos convergem em qualquer ordem', async ({ browser, candidate }) => {
  test.setTimeout(120_000);
  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOnlineDevice(browser, candidate);

  const settingsA = new SettingsSheetPage(deviceA.page);
  await settingsA.open(deviceA.dashboard.settingsButton);
  await settingsA.setNewPerDay(30);
  await settingsA.save();

  const settingsB = new SettingsSheetPage(deviceB.page);
  await settingsB.open(deviceB.dashboard.settingsButton);
  await settingsB.setTheme('dia');
  await settingsB.save();
  await expect.poll(async () => (await fetchServerSettings(candidate)).theme, { timeout: SYNC_TIMEOUT_MS }).toBe('dia');

  await reconnectAndAwaitSync(deviceA);
  await expect.poll(async () => (await fetchServerSettings(candidate)).newPerDay, { timeout: SYNC_TIMEOUT_MS }).toBe(30);
  for (const device of [deviceA, deviceB]) {
    await expect.poll(() => localSettings(device), { timeout: CONVERGENCE_TIMEOUT_MS }).toEqual({ newPerDay: 30, theme: 'dia' });
    const [profile] = await allAccountRecords<ProfileRecord>(device.page, 'profile');
    expect(profile?.displayName).toBe(candidate.displayName);
  }

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});

test('E2E-34 — avaliações, reset e desfazer convergem entre dois dispositivos', async ({ browser, candidate }) => {
  test.setTimeout(150_000);
  const resetSeed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const resetCardId = resetSeed.cardIds[0] ?? '';

  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);

  await reviewCardInDeck(deviceA, resetSeed.deckId, 3);
  const deckA = new DeckPage(deviceA.page);
  await gotoOfflineWithRetry(deviceA.page, `/decks/${resetSeed.deckId}`, deckA.newCardButton);
  await deviceA.page.getByRole('button', { name: 'Zerar progresso' }).click();
  await deckA.confirmDialog('Zerar progresso', 'Zerar');
  await reviewCardInDeck(deviceB, resetSeed.deckId, 4);

  await reconnectAndAwaitSync(deviceB);
  await reconnectAndAwaitSync(deviceA);
  await expectSameDueEverywhere(
    [deviceA, deviceB],
    async () => (await fetchCardStates(candidate)).find((state) => state.cardId === resetCardId)?.due,
    (device) => readLocalCardStateDue(device.page, resetCardId),
  );
  const resetHistory = await fetchCardReviewHistory(candidate, resetCardId);
  expect(resetHistory.reviewLogs.map((log) => log.kind).slice(-3)).toEqual(['review', 'reset', 'review']);
  const resetState = (await fetchCardStates(candidate)).find((state) => state.cardId === resetCardId);
  expect(resetState?.state).not.toBe(CARD_STATE_NEW);

  const undoCandidate = await createConfirmedCandidate();
  const undoSeed = await seedForCandidate(undoCandidate, 'due_cards', { count: UNDO_DECK_CARDS });
  const undoDevice = await openOnlineDevice(browser, undoCandidate);
  const undoCardId = await undoAcceptedReview(undoDevice, undoCandidate, undoSeed.cardIds);
  await expect
    .poll(async () => {
      const history = await fetchCardReviewHistory(undoCandidate, undoCardId);
      return { atLeastTwoLogs: history.reviewLogs.length >= 2, voids: history.reviewVoids.length };
    }, { timeout: CONVERGENCE_TIMEOUT_MS })
    .toEqual({ atLeastTwoLogs: true, voids: 1 });
  await closeDevice(undoDevice);

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});

test('E2E-35 — avaliação offline e exclusão concorrente preservam fato e tombstone', async ({ browser, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const cardId = seed.cardIds[0] ?? '';

  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);

  await reviewCardInDeck(deviceA, seed.deckId, 3);
  const deckB = new DeckPage(deviceB.page);
  await gotoOfflineWithRetry(deviceB.page, `/decks/${seed.deckId}`, deckB.newCardButton);
  await deckB.openCard('Frente 0');
  await deckB.deleteCardButton.click();
  await deckB.confirmDialog('Excluir cartão', 'Excluir');

  await reconnectAndAwaitSync(deviceA);
  await reconnectAndAwaitSync(deviceB);

  const history = await fetchCardReviewHistory(candidate, cardId);
  expect(history.reviewLogs.length).toBeGreaterThanOrEqual(1);

  await deviceA.page.reload();
  await expect(deviceA.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  const deckA = new DeckPage(deviceA.page);
  await deviceA.page.goto(`/decks/${seed.deckId}`);
  await expect(deckA.cardRow('Frente 0')).toHaveCount(0);
  await deviceB.page.goto(`/decks/${seed.deckId}`);
  await expect(deckB.cardRow('Frente 0')).toHaveCount(0);
  await deviceA.page.goto('/estudar');
  await deviceA.page.goto('/');
  await expect(deviceA.dashboard.syncStatus).toBeVisible();

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});

async function reviewCardInDeck(device: Device, deckId: string, rating: 1 | 2 | 3 | 4): Promise<void> {
  const session = new StudySessionPage(device.page);
  await gotoOfflineWithRetry(device.page, '/estudar', session.region);
  await expect(session.revealButton).toBeVisible();
  await session.reveal();
  await rateAndAwaitLocalWrite(device.page, rating);
  await gotoOfflineWithRetry(device.page, `/decks/${deckId}`, new DeckPage(device.page).newCardButton);
}

async function undoAcceptedReview(device: Device, candidate: Candidate, cardIds: readonly string[]): Promise<string> {
  const session = new StudySessionPage(device.page);
  await device.page.goto('/estudar');
  const progress = device.page.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuemax', String(UNDO_DECK_CARDS));
  await session.reveal();
  await session.rate(3);
  let ratedCardId = '';
  await expect
    .poll(async () => {
      const histories = await Promise.all(cardIds.map(async (id) => ({ id, logs: (await fetchCardReviewHistory(candidate, id)).reviewLogs.length })));
      ratedCardId = histories.find((history) => history.logs === 1)?.id ?? '';
      return ratedCardId;
    })
    .not.toBe('');
  await session.undo();
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(session.rateButton(4)).toBeVisible();
  await rateAndAwaitLocalWrite(device.page, 4);
  return ratedCardId;
}
