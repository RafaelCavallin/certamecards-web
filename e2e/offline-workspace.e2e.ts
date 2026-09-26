import { expect, test } from './fixtures/test';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { waitForServiceWorker } from './fixtures/service-worker';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';
import { StudySessionPage } from './pages/study-session-page';

const CARD_COUNT = 20;
const SYNC_TIMEOUT_MS = 10_000;

test('E2E-27 — workspace offline sobrevive a fechar e reabrir sem rede', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  await seedForCandidate(candidate, 'due_cards');
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  await gotoOfflineWithRetry(page, '/decks/novo', page.getByRole('heading', { name: 'Novo deck' }));
  const subject = page.getByLabel('Matéria');
  const firstSubject = await subject.locator('option').nth(1).textContent();
  await subject.selectOption({ label: firstSubject ?? '' });
  await page.getByLabel('Nome').fill('Workspace offline');
  await page.getByRole('button', { name: 'Criar deck' }).click();
  await page.waitForURL(/\/decks\/(?!novo$)[^/]+$/);

  const deck = new DeckPage(page);
  // A ficha permanece aberta entre criações (keepOnSave); só o primeiro cartão precisa abri-la, e
  // a lista de cartões por trás do <dialog> modal só fica visível depois de fechá-la no final.
  await deck.newCardButton.click();
  for (let index = 1; index <= CARD_COUNT; index += 1) {
    await deck.frontField.fill(`Pergunta offline ${index}`);
    await deck.backField.fill(`Resposta offline ${index}`);
    await deck.cardSubmitButton.click();
    await expect(deck.frontField).toHaveValue('');
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  // A lista usa scroll virtual (cdk-virtual-scroll-viewport): só os itens visíveis na viewport
  // entram no DOM. A busca filtra para 1 resultado, garantindo que o cartão fique renderizado.
  await page.getByLabel('Buscar cartões').fill('Pergunta offline 20');
  await expect(deck.cardRow('Pergunta offline 20')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workspace offline' })).toBeVisible();
  await page.getByLabel('Buscar cartões').fill('Pergunta offline 20');
  await expect(deck.cardRow('Pergunta offline 20')).toBeVisible();
  const session = new StudySessionPage(page);
  await gotoOfflineWithRetry(page, '/estudar', session.region);
  await expect(session.region).toBeVisible();
});

test('E2E-28 — edição e exclusão offline refletem em lista, busca e sessão', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards');
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.openCard('Frente 0');
  await deck.frontField.fill('Frente editada offline');
  await deck.cardSubmitButton.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByLabel('Buscar cartões').fill('Frente editada offline');
  await expect(deck.cardRow('Frente editada offline')).toBeVisible();
  const session = new StudySessionPage(page);
  await gotoOfflineWithRetry(page, '/estudar', session.region);
  await expect(session.region).toContainText('Frente editada offline');
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await page.getByLabel('Buscar cartões').fill('Frente editada offline');
  await deck.openCard('Frente editada offline');
  await deck.deleteCardButton.click();
  await deck.confirmDialog('Excluir cartão', 'Excluir');
  await expect(deck.cardRow('Frente editada offline')).toHaveCount(0);
  await page.getByLabel('Buscar cartões').fill('');
  // O único cartão do deck foi excluído acima; sem cartões vencidos, o painel mostra "Tudo em
  // dia" em vez de "Começar sessão" (ver offline-sync.e2e.ts).
  await gotoOfflineWithRetry(page, '/', dashboard.allCaughtUpButton);
  await expect(dashboard.allCaughtUpButton).toBeVisible();
});

test('E2E-29 — suspensão e zeragem offline mudam a próxima sessão', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 2 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
  await waitForServiceWorker(page);
  await page.context().setOffline(true);
  const deck = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${seed.deckId}`, deck.newCardButton);
  await deck.openCard('Frente 0');
  await deck.suspendCurrentCard();
  await expect(page.getByRole('button', { name: 'Reativar', exact: true })).toBeVisible();
  // Suspender não fecha a ficha do cartão (o usuário pode continuar editando); é preciso fechá-la
  // antes de interagir com um botão do deck por trás do <dialog> modal.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zerar progresso' }).click();
  await deck.confirmDialog('Zerar progresso', 'Zerar');
  await page.getByLabel('Filtrar por estado').selectOption({ label: 'Novos' });
  await expect(deck.cardRow('Frente 1')).toBeVisible();
});
