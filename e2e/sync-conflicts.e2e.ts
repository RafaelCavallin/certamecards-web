import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { closeDevice, openOfflineDevice, reconnectAndAwaitSync } from './fixtures/two-devices';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { seedForCandidate } from './fixtures/test-support';
import { DeckPage } from './pages/deck-page';

async function openConflictsPage(page: Page): Promise<void> {
  await page.goto('/sincronizacao/conflitos');
}
function comparisonRegion(page: Page): Locator {
  return page.getByRole('region', { name: 'Comparação de versões' });
}
async function compareFirstConflict(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Comparar' }).first().click();
  await expect(page.getByRole('region', { name: 'Comparação de versões' })).toBeVisible();
}
async function restoreCurrentConflict(page: Page, targetDeckName?: string): Promise<void> {
  await page.getByRole('button', { name: 'Restaurar versão guardada' }).click();
  if (targetDeckName !== undefined) {
    await page.getByLabel('Deck de destino').selectOption({ label: targetDeckName });
  }
  await page.getByRole('button', { name: 'Restaurar localmente' }).click();
  await expect(page.getByRole('status')).toBeVisible();
}

test('E2E-36 — edição concorrente resolve por LWW e a versão guardada é restaurável', async ({ browser, candidate }) => {
  test.setTimeout(150_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);

  for (const [device, suffix] of [
    [deviceA, 'A'],
    [deviceB, 'B'],
  ] as const) {
    const deck = new DeckPage(device.page);
    await gotoOfflineWithRetry(device.page, `/decks/${seed.deckId}`, deck.newCardButton);
    await deck.openCard('Frente 0');
    await deck.frontField.fill(`Editado por ${suffix}`);
    await deck.cardSubmitButton.click();
    await deck.newCardButton.click();
    await deck.frontField.fill(`Card novo ${suffix}`);
    await deck.backField.fill(`Verso ${suffix}`);
    await deck.cardSubmitButton.click();
    await expect(deck.cardRow(`Card novo ${suffix}`)).toBeVisible();
  }

  await reconnectAndAwaitSync(deviceA);
  await reconnectAndAwaitSync(deviceB);
  const deckA = new DeckPage(deviceA.page);
  await deviceA.page.goto(`/decks/${seed.deckId}`);
  await expect(deckA.cardRow('Editado por B')).toBeVisible();
  await expect(deckA.cardRow('Card novo A')).toBeVisible();
  await expect(deckA.cardRow('Card novo B')).toBeVisible();

  await openConflictsPage(deviceA.page);
  await expect(deviceA.page.getByRole('button', { name: 'Comparar' })).toHaveCount(1);
  await compareFirstConflict(deviceA.page);
  await expect(comparisonRegion(deviceA.page).getByText('Editado por A')).toBeVisible();
  await expect(comparisonRegion(deviceA.page).getByText('Editado por B')).toBeVisible();
  await restoreCurrentConflict(deviceA.page);

  await reconnectAndAwaitSync(deviceA);
  await deviceA.page.goto(`/decks/${seed.deckId}`);
  await expect(deckA.cardRow('Editado por A')).toBeVisible();
  await openConflictsPage(deviceA.page);
  await expect(deviceA.page.getByText(/Restaurada em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
  await expect(deviceA.page.getByRole('button', { name: 'Comparar' })).toHaveCount(0);

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});

test('E2E-37 — exclusão vence edição e o conteúdo fica recuperável em outro deck', async ({ browser, candidate }) => {
  test.setTimeout(150_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const rescueDeck = await seedForCandidate(candidate, 'large_deck', { count: 1 });
  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);

  const deckA = new DeckPage(deviceA.page);
  await gotoOfflineWithRetry(deviceA.page, `/decks/${seed.deckId}`, deckA.newCardButton);
  await deckA.openCard('Frente 0');
  await deckA.deleteCardButton.click();
  await deckA.confirmDialog('Excluir cartão', 'Excluir');

  const deckB = new DeckPage(deviceB.page);
  await gotoOfflineWithRetry(deviceB.page, `/decks/${seed.deckId}`, deckB.newCardButton);
  await deckB.openCard('Frente 0');
  await deckB.frontField.fill('Editado concorrente');
  await deckB.cardSubmitButton.click();

  await reconnectAndAwaitSync(deviceA);
  await reconnectAndAwaitSync(deviceB);
  await deviceA.page.goto(`/decks/${seed.deckId}`);
  await expect(deckA.cardRow('Editado concorrente')).toHaveCount(0);
  await deviceB.page.goto(`/decks/${seed.deckId}`);
  await expect(deckB.cardRow('Editado concorrente')).toHaveCount(0);

  await openConflictsPage(deviceA.page);
  await compareFirstConflict(deviceA.page);
  await expect(comparisonRegion(deviceA.page).getByText('Editado concorrente')).toBeVisible();
  const rescueDeckName = 'Seed large_deck';
  await restoreCurrentConflict(deviceA.page, rescueDeckName);

  await reconnectAndAwaitSync(deviceA);
  await deviceA.page.goto(`/decks/${rescueDeck.deckId}`);
  await expect(deckA.cardRow('Editado concorrente')).toBeVisible();

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});
