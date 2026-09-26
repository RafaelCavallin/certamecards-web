import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { allAccountRecords, putAccountRecord } from './fixtures/account-db';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { seedForCandidate } from './fixtures/test-support';
import { closeDevice, openOfflineDevice, reconnectAndAwaitSync } from './fixtures/two-devices';
import type { Device } from './fixtures/two-devices';
import { DeckPage } from './pages/deck-page';

const EVIDENCE_DIR = resolve(__dirname, '../../tasks/prd-04-offline-sincronizacao/evidences');
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '1280', width: 1280, height: 800 },
];
interface SyncOperationRecord {
  readonly kind: string;
  readonly payload: { readonly card?: { readonly front: string } };
}

async function shot(page: Page, name: string, size: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}-${size}.png`, fullPage: true });
}

async function editFront(device: Device, deckId: string, edit: { readonly from: string; readonly to: string }): Promise<void> {
  const deck = new DeckPage(device.page);
  await gotoOfflineWithRetry(device.page, `/decks/${deckId}`, deck.newCardButton);
  await deck.openCard(edit.from);
  await deck.frontField.fill(edit.to);
  await deck.cardSubmitButton.click();
  await device.page.keyboard.press('Escape');
}

async function corruptPendingFront(page: Page, front: string): Promise<void> {
  const operations = await allAccountRecords<SyncOperationRecord>(page, 'syncOperations');
  const target = operations.find((operation) => operation.payload.card?.front === front);
  if (target !== undefined) {
    await putAccountRecord(page, 'syncOperations', { ...target, payload: { ...target.payload, card: { ...target.payload.card, front: '' } } });
  }
}

for (const viewport of VIEWPORTS) {
  test(`QA PRD 4 — capturas da sincronização em ${viewport.name}px`, async ({ browser, candidate }) => {
    test.setTimeout(180_000);
    const size = viewport.name;
    const seed = await seedForCandidate(candidate, 'due_cards', { count: 2 });
    const deviceA = await openOfflineDevice(browser, candidate);
    const deviceB = await openOfflineDevice(browser, candidate);
    const {page} = deviceA;
    await page.setViewportSize(viewport);
    await editFront(deviceA, seed.deckId, { from: 'Frente 0', to: 'Frente editada no aparelho A' });
    await editFront(deviceB, seed.deckId, { from: 'Frente 0', to: 'Frente editada no aparelho B' });
    await gotoOfflineWithRetry(page, '/', deviceA.dashboard.syncStatus);
    await shot(page, 'painel-sem-conexao-pendente', size);
    await gotoOfflineWithRetry(page, '/sincronizacao', page.getByRole('heading', { name: 'Sincronização' }));
    await shot(page, 'detalhes-sem-conexao', size);

    await reconnectAndAwaitSync(deviceA);
    await reconnectAndAwaitSync(deviceB);
    await deviceA.page.reload();
    await expect(deviceA.dashboard.syncStatus).toHaveText('Sincronizado', { timeout: 30_000 });
    await shot(page, 'painel-sincronizado', size);
    await page.goto('/sincronizacao');
    await expect(page.getByRole('heading', { name: 'Sincronização' })).toBeVisible();
    await shot(page, 'detalhes-sincronizado', size);
    await page.goto('/sincronizacao/conflitos');
    await expect(page.getByRole('button', { name: 'Comparar' })).toHaveCount(1);
    await shot(page, 'conflitos-lista', size);
    await page.getByRole('button', { name: 'Comparar' }).click();
    await expect(page.getByRole('region', { name: 'Comparação de versões' })).toBeVisible();
    await shot(page, 'conflitos-comparacao', size);
    await page.getByRole('button', { name: 'Restaurar versão guardada' }).click();
    await shot(page, 'conflitos-restaurar', size);
    await page.getByRole('button', { name: 'Restaurar localmente' }).click();
    await expect(page.getByRole('status')).toBeVisible();
    await shot(page, 'conflitos-restaurado', size);

    await page.context().setOffline(true);
    await editFront(deviceA, seed.deckId, { from: 'Frente 1', to: 'Frente que vai falhar' });
    await corruptPendingFront(page, 'Frente que vai falhar');
    await page.context().setOffline(false);
    await gotoOfflineWithRetry(page, '/', deviceA.dashboard.syncStatus);
    await expect(deviceA.dashboard.syncStatus).toContainText('Erro ao sincronizar', { timeout: 30_000 });
    await shot(page, 'painel-erro', size);
    await page.goto('/sincronizacao');
    await expect(page.getByRole('heading', { name: 'Alterações que precisam da sua atenção' })).toBeVisible();
    await shot(page, 'detalhes-erro', size);
    await closeDevice(deviceA);
    await closeDevice(deviceB);
  });
}
