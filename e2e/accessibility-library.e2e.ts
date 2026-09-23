import { expect, test } from './fixtures/test';
import { VIEWPORT_360, expectAccessibleInBothThemes, expectNoHorizontalScroll, expectTouchTargets } from './fixtures/a11y';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { LibraryPage } from './pages/library-page';
import { OfficialEditorPage } from './pages/official-editor-page';

test('E2E-25 — biblioteca e prévia em 360px, sem violações graves nos dois temas', async ({ page, candidate, admin }) => {
  const name = uniqueName('Deck acessível');
  await publishOfficialDeck(admin, { name, subjectName: 'Português' });
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const library = new LibraryPage(page);
  await library.goto();
  await library.search(name);
  await expect(library.deckItem(name)).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTouchTargets([library.searchInput, library.previewButton(name)]);
  await expectAccessibleInBothThemes(page);
  const dialog = await library.openPreview(name);
  await expectNoHorizontalScroll(page);
  await expectTouchTargets([dialog.getByRole('button', { name: 'Inscrever-se' }), dialog.getByRole('button', { name: 'Duplicar como deck próprio' })]);
  await expectAccessibleInBothThemes(page);
});

test('E2E-25 — editor oficial em 360px, sem violações graves nos dois temas', async ({ page, admin }) => {
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, admin.email, admin.password);
  const editor = new OfficialEditorPage(page);
  await editor.createDeck('Português', uniqueName('Deck do editor'));
  await expectNoHorizontalScroll(page);
  await expectTouchTargets([page.getByRole('button', { name: 'Novo cartão' }), page.getByRole('button', { name: 'Publicar' })]);
  await expectAccessibleInBothThemes(page);
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await expect(editor.cardSheet).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessibleInBothThemes(page);
});

test('E2E-25 — QA-BUG-02: linha do deck oficial no painel em 360px não sobrepõe título, selo e contagens', async ({ page, candidate, admin }) => {
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck inscrito'), subjectName: 'Português' });
  await subscribeByApi(candidate, deck.deckId);
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const row = page.locator('app-deck-row', { hasText: deck.name });
  await expect(row.getByText('Oficial')).toBeVisible();
  const title = await row.getByRole('button', { name: deck.name }).boundingBox();
  const badge = await row.getByText('Oficial').boundingBox();
  const counts = await row.getByText('para revisar').boundingBox();
  expect((title?.y ?? 0) + (title?.height ?? 0)).toBeLessThanOrEqual(counts?.y ?? 0);
  expect((badge?.y ?? 0) + (badge?.height ?? 0)).toBeLessThanOrEqual(counts?.y ?? 0);
  await expectNoHorizontalScroll(page);
  await expectTouchTargets([row.getByRole('button', { name: 'Estudar' })]);
});

test('E2E-25 — QA-BUG-03: lista de decks oficiais em 360px rola dentro da região, não na página', async ({ page, admin }) => {
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, admin.email, admin.password);
  await page.goto('/admin/decks-oficiais');
  const region = page.getByRole('region', { name: 'Lista de decks oficiais' });
  await expect(region).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessibleInBothThemes(page);
  await region.focus();
  await expect(region).toBeFocused();
});
