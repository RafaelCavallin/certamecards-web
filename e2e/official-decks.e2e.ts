import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { openApi } from './fixtures/api-session';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import type { Candidate } from './fixtures/api-client';
import { LibraryPage } from './pages/library-page';
import { OfficialEditorPage } from './pages/official-editor-page';

const SUBJECT = 'Informática';
const HAS_SUBSCRIBERS_STATUS = 422;
const FORBIDDEN_STATUS = 403;

async function publishAfterMinimumCards(editor: OfficialEditorPage): Promise<void> {
  await editor.addCards(['C1', 'C2', 'C3', 'C4']);
  await editor.runStatusAction('Publicar');
  await expect(editor.alert).toContainText('pelo menos 5 cartões');
  await editor.addCards(['C5'], 4);
  await editor.runStatusAction('Publicar');
  await expect(editor.header).toContainText('Publicado');
}
async function expectDeleteRefused(admin: Candidate, deckId: string): Promise<void> {
  const api = await openApi(admin);
  const { version } = (await (await api.get(`/api/admin/official-decks/${deckId}`)).json()) as { version: number };
  const response = await api.delete(`/api/admin/official-decks/${deckId}`, { headers: { 'If-Match': String(version) } });
  expect(response.status()).toBe(HAS_SUBSCRIBERS_STATUS);
  expect(((await response.json()) as { code: string }).code).toBe('official_deck_has_subscribers');
  await api.dispose();
}
async function expectDiscontinuedForSubscriber(page: Page, name: string, deckId: string): Promise<void> {
  const library = new LibraryPage(page);
  await library.goto();
  await library.search(name);
  await expect(library.noResults).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Descontinuado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Estudar' })).toBeEnabled();
  await page.goto(`/decks/${deckId}`);
  await expect(page.getByRole('button', { name: 'Duplicar como deck próprio' })).toBeEnabled();
}

test('E2E-21 — editor oficial e situações', async ({ page, browser, candidate, admin }) => {
  await loginAndReachHome(page, admin.email, admin.password);
  const editor = new OfficialEditorPage(page);
  const name = uniqueName('Deck do editor');
  const deckId = await editor.createDeck(SUBJECT, name);
  await publishAfterMinimumCards(editor);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const candidatePage = await context.newPage();
  await loginAndReachHome(candidatePage, candidate.email, candidate.password);
  const library = new LibraryPage(candidatePage);
  await library.goto();
  await library.search(name);
  await expect(library.deckItem(name)).toBeVisible();
  await subscribeByApi(candidate, deckId);
  await editor.runStatusAction('Voltar para rascunho');
  await expect(editor.alert).toContainText('Descontinue o deck');
  await expectDeleteRefused(admin, deckId);
  await editor.runStatusAction('Descontinuar');
  await expect(editor.header).toContainText('Descontinuado');
  await candidatePage.reload();
  await expectDiscontinuedForSubscriber(candidatePage, name, deckId);
  await context.close();
});

test('E2E-24 — candidato fora da área oficial', async ({ page, candidate, admin }) => {
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck protegido'), subjectName: SUBJECT });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await page.goto('/admin/decks-oficiais');
  await expect(page).not.toHaveURL(/\/admin/);
  const candidateApi = await openApi(candidate);
  const attempt = await candidateApi.patch(`/api/admin/official-decks/${deck.deckId}`, {
    data: { name: 'Invadido' },
    headers: { 'If-Match': '0' },
  });
  expect(attempt.status()).toBe(FORBIDDEN_STATUS);
  await candidateApi.dispose();
  const adminApi = await openApi(admin);
  const current = (await (await adminApi.get(`/api/admin/official-decks/${deck.deckId}`)).json()) as { name: string };
  expect(current.name).toBe(deck.name);
  await adminApi.dispose();
});
