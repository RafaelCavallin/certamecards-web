import { expect, test } from './fixtures/test';
import { expectFocusReturnedTo, openAndCloseByKeyboard, tabTo } from './fixtures/keyboard';
import { discontinueByApi, duplicateByApi } from './fixtures/official-lifecycle';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { DashboardPage } from './pages/dashboard-page';
import { LibraryPage } from './pages/library-page';
import { OfficialEditorPage } from './pages/official-editor-page';
import { StudySessionPage } from './pages/study-session-page';

const CARDS = ['C1', 'C2', 'C3', 'C4', 'C5'];

test('E2E-25 — percurso só por teclado: biblioteca, prévia, duplicar, inscrever-se e apontar erro', async ({ page, candidate, admin }) => {
  const name = uniqueName('Deck teclado');
  await publishOfficialDeck(admin, { name, subjectName: 'Português' });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await tabTo(page, page.getByRole('button', { name: 'Biblioteca', exact: true }));
  await page.keyboard.press('Enter');
  const library = new LibraryPage(page);
  await tabTo(page, library.searchInput);
  await page.keyboard.type(name);
  const dialog = library.previewDialog(name);
  await openAndCloseByKeyboard(page, library.previewButton(name), dialog);
  await page.keyboard.press('Enter');
  const duplicateDialog = page.getByRole('dialog', { name: 'Duplicar como deck próprio' });
  await openAndCloseByKeyboard(page, dialog.getByRole('button', { name: 'Duplicar como deck próprio' }), duplicateDialog);
  await tabTo(page, dialog.getByRole('button', { name: 'Inscrever-se' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}/);
  await page.goto('/');
  await tabTo(page, new DashboardPage(page).startSessionButton);
  await page.keyboard.press('Enter');
  await expect(new StudySessionPage(page).revealButton).toBeVisible();
  await openAndCloseByKeyboard(page, page.getByRole('button', { name: 'Apontar erro' }), page.getByRole('dialog', { name: 'Apontar erro' }));
});

test('E2E-25 — publicar só por teclado devolve o foco ao fechar a confirmação', async ({ page, admin }) => {
  await loginAndReachHome(page, admin.email, admin.password);
  const editor = new OfficialEditorPage(page);
  await editor.createDeck('Português', uniqueName('Deck para publicar'));
  await editor.addCards(CARDS);
  const publish = editor.header.getByRole('button', { name: 'Publicar', exact: true });
  await tabTo(page, publish);
  await page.keyboard.press('Enter');
  await expect(editor.cardSheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expectFocusReturnedTo(page, publish);
  await page.keyboard.press('Enter');
  await tabTo(page, editor.cardSheet.getByRole('button', { name: 'Publicar', exact: true }));
  await page.keyboard.press('Enter');
  await expect(editor.header).toContainText('Publicado');
});

test('E2E-25 — selos Oficial, Descontinuado e Baseado em são lidos como texto', async ({ page, candidate, admin }) => {
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck com selos'), subjectName: 'Português' });
  await subscribeByApi(candidate, deck.deckId);
  await duplicateByApi(candidate, deck.deckId);
  await discontinueByApi(admin, deck.deckId);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const row = page.locator('div', { has: page.getByRole('button', { name: deck.name, exact: true }) }).first();
  await expect(row).toContainText('Oficial');
  await expect(row).toContainText('Descontinuado');
  await expect(page.getByText(`Baseado em ${deck.name}`)).toBeVisible();
});
