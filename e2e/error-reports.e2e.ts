import type { Browser, Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import type { Candidate } from './fixtures/api-client';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

const NOTE = 'Falta o acento na palavra';

async function sendReport(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Apontar erro' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apontar erro' });
  await dialog.getByRole('radio', { name: 'Erro de digitação' }).check();
  await dialog.getByLabel('Detalhes').fill(NOTE);
  await dialog.getByRole('button', { name: 'Enviar' }).click();
  await expect(dialog.getByText('Obrigado. Vamos analisar o cartão.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).last().click();
}
async function expectAlreadyReported(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Apontar erro' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apontar erro' });
  await expect(dialog.getByText('Você já apontou um erro neste cartão.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).last().click();
}
async function resolveAsAdmin(browser: Browser, admin: Candidate, deckName: string): Promise<void> {
  const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await loginAndReachHome(page, admin.email, admin.password);
  await page.goto('/admin/apontamentos');
  const item = page.getByRole('listitem').filter({ hasText: deckName });
  await expect(item).toContainText('Erro de digitação');
  await expect(item).toContainText(NOTE);
  await item.getByRole('button', { name: 'Abrir cartão' }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.goto('/admin/apontamentos');
  await item.getByRole('button', { name: 'Resolvido' }).click();
  await expect(item).toHaveCount(0);
}

test('E2E-22 — apontar erro e resolver', async ({ page, browser, candidate, admin }) => {
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck com erro'), subjectName: 'Português' });
  await subscribeByApi(candidate, deck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.revealButton).toBeVisible();
  await session.reveal();
  await expect(session.rateButton(3)).toBeVisible();
  const card = page.locator('article[aria-label="Cartão"]');
  const before = await card.textContent();
  await sendReport(page);
  await expect(card).toHaveText(before ?? '');
  await expect(session.rateButton(3)).toBeVisible();
  await expectAlreadyReported(page);
  await resolveAsAdmin(browser, admin, deck.name);
});
