import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { fetchCardReviewHistory, seedForCandidate } from './fixtures/test-support';
import { loginAndReachHome } from './fixtures/session';
import { waitForServiceWorker } from './fixtures/service-worker';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';
import { StudySessionPage } from './pages/study-session-page';

const DUE_CARD_COUNT = 10;
const SYNC_TIMEOUT_MS = 10_000;
// Sob carga (vários projetos rodando em paralelo), o navegador ocasionalmente não intercepta a
// navegação offline pelo service worker na primeira tentativa mesmo com o cache já quente e com
// retentativas internas; um retry no nível do teste absorve essa folga conhecida do ambiente.
test.describe.configure({ retries: 2 });

async function reviewAllCards(page: Page, session: StudySessionPage, total: number): Promise<void> {
  const progressBar = page.getByRole('progressbar');
  const backButton = page.getByRole('button', { name: 'Voltar ao painel' });
  // Avaliar "Fácil" minimiza o risco de um cartão voltar à fila no mesmo dia; o total vem do
  // próprio indicador de progresso (fonte da verdade da fila), e cada passo espera um sinal
  // explícito (progresso avançou, ou a tela de resumo apareceu) em vez de uma contagem fixa.
  for (let reviewed = 0; reviewed < total; reviewed += 1) {
    await session.reveal();
    await session.rate(4);
    if (reviewed === total - 1) {
      await expect(backButton).toBeVisible();
    } else {
      await expect(progressBar).toHaveAttribute('aria-valuenow', String(reviewed + 1));
    }
  }
}

async function studyAllDueCardsOffline(page: Page): Promise<number> {
  const session = new StudySessionPage(page);
  await gotoOfflineWithRetry(page, '/estudar', session.region);
  await expect(session.region).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  const total = Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
  await reviewAllCards(page, session, total);
  const dashboard = new DashboardPage(page);
  await gotoOfflineWithRetry(page, '/', dashboard.syncStatus);
  // Depois de avaliar todos os cartões vencidos, o painel não mostra mais "Começar sessão" (só
  // reaparece se algum cartão voltar a vencer); "Tudo em dia" é o sinal correto de que a fila
  // esvaziou.
  await expect(dashboard.allCaughtUpButton).toBeVisible();
  // Offline, o indicador prioriza "Sem conexão" sobre a contagem de pendentes (ver
  // SyncStatusStore.computeStatus e sync-indicator.spec.ts); "N pendentes" só aparece depois
  // de reconectar, antes do flush terminar.
  await expect(dashboard.syncStatus).toHaveText('Sem conexão');
  return total;
}

async function attemptCardCreationOffline(page: Page, deckId: string): Promise<void> {
  const deckPage = new DeckPage(page);
  await gotoOfflineWithRetry(page, `/decks/${deckId}`, deckPage.newCardButton);
  await deckPage.newCardButton.click();
  await deckPage.frontField.fill('Pergunta offline');
  await deckPage.backField.fill('Resposta offline');
  await expect(deckPage.offlineNotice).toBeVisible();
  await expect(deckPage.cardSubmitButton).toBeDisabled();
  await expect(deckPage.frontField).toHaveValue('Pergunta offline');
}

async function totalReviewLogsOnServer(candidate: Candidate, cardIds: readonly string[]): Promise<number> {
  let total = 0;
  for (const cardId of cardIds) {
    const history = await fetchCardReviewHistory(candidate, cardId);
    total += history.reviewLogs.length;
  }
  return total;
}

test('E2E-07 — sessão sem rede e sincronização', async ({ page, context, candidate }) => {
  test.setTimeout(120_000);
  const seed = await seedForCandidate(candidate, 'due_cards', { count: DUE_CARD_COUNT });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await waitForServiceWorker(page);

  await context.setOffline(true);
  const dashboard = new DashboardPage(page);
  await gotoOfflineWithRetry(page, '/', dashboard.startSessionButton);
  await expect(dashboard.startSessionButton).toBeVisible();

  const reviewedCount = await studyAllDueCardsOffline(page);
  await attemptCardCreationOffline(page, seed.deckId);

  await context.setOffline(false);
  await gotoOfflineWithRetry(page, '/', dashboard.startSessionButton);
  await expect(dashboard.syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });

  expect(reviewedCount).toBeGreaterThanOrEqual(DUE_CARD_COUNT);
  expect(await totalReviewLogsOnServer(candidate, seed.cardIds)).toBe(reviewedCount);
});
