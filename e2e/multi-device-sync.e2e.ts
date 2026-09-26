import { expect, test } from './fixtures/test';
import { closeDevice, expectSameDueEverywhere, openOfflineDevice, reconnectAndAwaitSync } from './fixtures/two-devices';
import type { Device } from './fixtures/two-devices';
import { fetchCardStates, seedForCandidate } from './fixtures/test-support';
import { readLocalCardStateDue } from './fixtures/local-db';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { rateAndAwaitLocalWrite } from './fixtures/study-flow';
import { StudySessionPage } from './pages/study-session-page';

// Ver offline-sync.e2e.ts: sob carga, a navegação offline pelo service worker pode falhar na
// primeira tentativa mesmo com retentativas internas; retry no nível do teste absorve essa folga.
test.describe.configure({ retries: 2 });

async function reviewOnDevice(device: Device): Promise<void> {
  const session = new StudySessionPage(device.page);
  await gotoOfflineWithRetry(device.page, '/estudar', session.region);
  await expect(session.revealButton).toBeVisible();
  await session.reveal();
  await rateAndAwaitLocalWrite(device.page, 3);
  // O único cartão vencido foi avaliado acima; o painel mostra "Tudo em dia", não "Começar
  // sessão" (ver offline-sync.e2e.ts).
  await gotoOfflineWithRetry(device.page, '/', device.dashboard.allCaughtUpButton);
  await expect(device.dashboard.allCaughtUpButton).toBeVisible();
}

test('E2E-08 — dois dispositivos sem rede avaliam o mesmo cartão', async ({ browser, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  const cardId = seed.cardIds[0] ?? '';

  const deviceA = await openOfflineDevice(browser, candidate);
  const deviceB = await openOfflineDevice(browser, candidate);
  await reviewOnDevice(deviceA);
  await reviewOnDevice(deviceB);

  await reconnectAndAwaitSync(deviceA);
  await reconnectAndAwaitSync(deviceB);

  await expectSameDueEverywhere(
    [deviceA, deviceB],
    async () => (await fetchCardStates(candidate)).find((state) => state.cardId === cardId)?.due,
    (device) => readLocalCardStateDue(device.page, cardId),
  );

  await closeDevice(deviceA);
  await closeDevice(deviceB);
});
