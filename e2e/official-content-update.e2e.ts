import type { Browser, Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { readLocalCardStateDue } from './fixtures/local-db';
import { queueSize, rateAllCards } from './fixtures/study-flow';
import { DashboardPage } from './pages/dashboard-page';
import { OfficialEditorPage } from './pages/official-editor-page';
import { StudySessionPage } from './pages/study-session-page';

const DECK_CARDS = 5;
const NOTE = 'Lei 14.999/2026';
const CORRECTED_BACK = 'Resposta corrigida';
const SYNC_TIMEOUT_MS = 30_000;

async function studyEveryCard(page: Page): Promise<void> {
  await new DashboardPage(page).startSessionButton.click();
  await expect(new StudySessionPage(page).revealButton).toBeVisible();
  await rateAllCards(page, await queueSize(page));
  await page.getByRole('button', { name: 'Voltar ao painel' }).click();
  await expect(new DashboardPage(page).syncStatus).toHaveText('Sincronizado', { timeout: SYNC_TIMEOUT_MS });
}
async function adminEdits(editor: OfficialEditorPage, kind: string, back: string): Promise<void> {
  await editor.openCard('Pergunta 0');
  await expect(editor.cardSheet).toContainText('Esta edição atinge 1 inscrito');
  await editor.editBack(kind, back);
}
async function adminMarksContentChange(editor: OfficialEditorPage): Promise<void> {
  await adminEdits(editor, 'Alteração de conteúdo', 'Resposta nova');
  await editor.saveCard();
  await expect(editor.cardSheet).toContainText('Escreva o que mudou no conteúdo.');
  await editor.cardSheet.getByLabel('O que mudou').fill(NOTE);
  await editor.saveCard();
}
async function candidateReloadsUntil(page: Page, assertion: () => Promise<void>): Promise<void> {
  await expect(async () => {
    await page.reload();
    await assertion();
  }).toPass({ timeout: SYNC_TIMEOUT_MS });
}
async function adminPage(browser: Browser, admin: Candidate): Promise<Page> {
  const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await loginAndReachHome(page, admin.email, admin.password);
  return page;
}

test('E2E-19 — correção e alteração de conteúdo chegam ao inscrito', async ({ page, browser, candidate, admin }) => {
  test.setTimeout(180_000);
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck vivo'), subjectName: 'Português', cardCount: DECK_CARDS });
  await subscribeByApi(candidate, deck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await studyEveryCard(page);
  const dueBefore = await readLocalCardStateDue(page, deck.cardIds[0] ?? '');
  const chartBefore = (await new DashboardPage(page).last14Days.textContent()) ?? '';
  const adminSession = await adminPage(browser, admin);
  const editor = new OfficialEditorPage(adminSession);
  await editor.gotoDeck(deck.deckId);
  await adminEdits(editor, 'Correção', CORRECTED_BACK);
  await editor.saveCard();
  await candidateReloadsUntil(page, async () => {
    await page.goto(`/decks/${deck.deckId}`);
    await expect(page.getByText(CORRECTED_BACK)).toBeVisible({ timeout: 2_000 });
  });
  expect(await readLocalCardStateDue(page, deck.cardIds[0] ?? '')).toBe(dueBefore);
  await adminMarksContentChange(editor);
  await candidateReloadsUntil(page, async () => {
    await page.goto('/');
    await expect(new DashboardPage(page).startSessionButton).toBeVisible({ timeout: 2_000 });
  });
  await new DashboardPage(page).startSessionButton.click();
  await expect(page.getByText(new RegExp(`Atualizado em .*: ${NOTE}`))).toBeVisible();
  await page.goto('/');
  await expect(new DashboardPage(page).last14Days).toHaveText(chartBefore);
});
