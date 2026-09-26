import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { allAccountRecords, putAccountRecord } from './fixtures/account-db';
import { VIEWPORT_360, expectAccessibleInBothThemes, expectNoHorizontalScroll, expectTouchTargets } from './fixtures/a11y';
import { expectFocusReturnedTo, tabTo } from './fixtures/keyboard';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { seedForCandidate } from './fixtures/test-support';
import { closeDevice, openOfflineDevice, reconnectAndAwaitSync } from './fixtures/two-devices';
import type { Device } from './fixtures/two-devices';
import { DeckPage } from './pages/deck-page';

const SYNC_TIMEOUT_MS = 10_000;
interface ConflictRecord {
  readonly id: string;
  readonly expiresAt: string;
  readonly restoredAt?: string | null;
}

async function editBothCardsOffline(device: Device, deckId: string, suffix: string): Promise<void> {
  const deck = new DeckPage(device.page);
  await gotoOfflineWithRetry(device.page, `/decks/${deckId}`, deck.newCardButton);
  for (const index of [0, 1]) {
    await deck.openCard(`Frente ${index}`);
    await deck.frontField.fill(`Versão do aparelho ${suffix} ${index}`);
    await deck.cardSubmitButton.click();
    await expect(device.page.locator('dialog[open]')).toHaveCount(0);
  }
}

async function openConflictsByKeyboard(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT_360);
  await page.goto('/sincronizacao');
  await expect(page.getByText('Última sincronização concluída:')).toBeVisible();
  const conflictsLink = page.getByRole('link', { name: /Conflitos resolvidos \(2\)/ });
  await expect(conflictsLink).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
  await tabTo(page, conflictsLink);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Conflitos resolvidos' })).toBeVisible();
  await expect(page.getByText(/Pode ser restaurada até \d{2}\/\d{2}\/\d{4}/).first()).toBeVisible();
}

async function expectExpiredConflictLocked(page: Page): Promise<void> {
  const conflict = (await allAccountRecords<ConflictRecord>(page, 'conflicts')).find((record) => record.restoredAt === undefined || record.restoredAt === null);
  await putAccountRecord(page, 'conflicts', { ...conflict, expiresAt: '2020-01-01T12:00:00.000Z' });
  await page.reload();
  await expect(page.getByText(/Prazo encerrado em 01\/01\/2020/)).toBeVisible();
  await expect(page.getByText('Esta versão não pode mais ser restaurada.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comparar' })).toHaveCount(0);
  await expect(page.getByText(/Restaurada em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
}

test('E2E-40 — Conflitos resolvidos só com teclado em 360px: comparar, restaurar, foco e prazo expirado', async ({ browser, candidate }) => {
  test.setTimeout(150_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 2 });
  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);
  await editBothCardsOffline(deviceA, seed.deckId, 'A');
  await editBothCardsOffline(deviceB, seed.deckId, 'B');
  await reconnectAndAwaitSync(deviceA);
  await reconnectAndAwaitSync(deviceB);
  await closeDevice(deviceB);
  const { page } = deviceA;
  await openConflictsByKeyboard(page);

  const compare = page.getByRole('button', { name: 'Comparar' }).first();
  await tabTo(page, compare);
  await page.keyboard.press('Enter');
  const comparison = page.getByRole('region', { name: 'Comparação de versões' });
  await expect(comparison.getByRole('heading', { name: 'Versão atual' })).toBeVisible();
  await expect(comparison.getByRole('heading', { name: 'Versão guardada' })).toBeVisible();
  await expect(comparison).toContainText(/Versão do aparelho A \d/);
  await expect(comparison).toContainText(/Versão do aparelho B \d/);
  await expect(comparison).not.toContainText('parentBaseVersion');
  const close = page.getByRole('button', { name: 'Fechar comparação' });
  const restore = page.getByRole('button', { name: 'Restaurar versão guardada' });
  await expectNoHorizontalScroll(page);
  await expectTouchTargets([close, restore]);
  await expectAccessibleInBothThemes(page);

  await tabTo(page, close);
  await page.keyboard.press('Enter');
  await expectFocusReturnedTo(page, compare);
  await page.keyboard.press('Enter');
  await tabTo(page, restore);
  await page.keyboard.press('Enter');
  const confirmRestore = page.getByRole('button', { name: 'Restaurar localmente' });
  await tabTo(page, confirmRestore);
  await page.keyboard.press('Enter');
  const status = page.getByRole('status');
  await expect(status).toContainText('salva neste dispositivo');
  await expect(status).toBeFocused();
  await expect(status).toHaveText('Versão restaurada e sincronizada.', { timeout: 30_000 });
  await expect(page.getByText(/Restaurada em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comparar' })).toHaveCount(1);

  await expectExpiredConflictLocked(page);
  await closeDevice(deviceA);
});
