import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck } from './fixtures/official-api';
import { expectSuggestionsWithDifferentSubjects, seedOneDeckPerSubject } from './fixtures/library-scenarios';
import { seedForCandidate } from './fixtures/test-support';
import { waitForServiceWorker } from './fixtures/service-worker';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { LibraryPage } from './pages/library-page';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

const PREVIEW_CARDS = 10;
const DECK_CARDS = 30;
const DAILY_NEW_LIMIT = 20;

test('E2E-16 — primeiro acesso pela biblioteca', async ({ page, candidate, admin }) => {
  const mainName = uniqueName('CF/88 princípios');
  await seedOneDeckPerSubject(admin, mainName, DECK_CARDS);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await expect(new DashboardPage(page).newDeckButton.first()).toBeVisible();
  await expectSuggestionsWithDifferentSubjects(page);
  await page.getByRole('button', { name: 'Ver biblioteca' }).click();
  const library = new LibraryPage(page);
  await library.search(mainName);
  const item = library.deckItem(mainName);
  for (const text of ['Direito Constitucional', `Descrição de ${mainName}`, `${DECK_CARDS} cartões`, 'Oficial', 'Atualizado em']) {
    await expect(item).toContainText(text);
  }
  const dialog = await library.openPreview(mainName);
  await expect(dialog.locator('ol[aria-label="Primeiros cartões do deck"] > li')).toHaveCount(PREVIEW_CARDS);
  await dialog.getByRole('button', { name: 'Inscrever-se' }).click();
  await page.goto('/');
  await expect(page.getByText(mainName)).toBeVisible();
  await expect(page.getByText(`${DAILY_NEW_LIMIT} novos`, { exact: true })).toBeVisible();
  await new DashboardPage(page).startSessionButton.click();
  await expect(new StudySessionPage(page).region).toContainText('Pergunta');
});

test('E2E-17 — busca e filtro', async ({ page, candidate, admin }) => {
  const crase = await publishOfficialDeck(admin, { name: uniqueName('Crase e acentuação'), subjectName: 'Português' });
  const other = await publishOfficialDeck(admin, { name: uniqueName('Princípios fundamentais'), subjectName: 'Direito Constitucional' });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const uniqueSuffix = crase.name.split(' ').at(-1) ?? '';
  const library = new LibraryPage(page);
  await library.goto();
  await library.search(`acentuação ${uniqueSuffix}`);
  await expect(library.deckItem(crase.name)).toBeVisible();
  await expect(library.deckItem(other.name)).toHaveCount(0);
  await expect(library.resultsAnnouncement).toContainText(/decks? encontrados?/);
  await library.subjectFilter('Português').click();
  await expect(library.deckItem(crase.name)).toBeVisible();
  await library.subjectFilter('Todas').click();
  await library.search(`ACENTUACAO ${uniqueSuffix.toUpperCase()}`);
  await expect(library.deckItem(crase.name)).toBeVisible();
  await library.search('zzz');
  await expect(library.noResults).toBeVisible();
  await library.clearButton.click();
  await expect(library.searchInput).toHaveValue('');
});

test.describe('sem rede', () => {
  test.describe.configure({ retries: 2 });

  test('E2E-18 — biblioteca sem rede', async ({ page, context, candidate }) => {
    await seedForCandidate(candidate, 'due_cards', { count: 3 });
    await loginAndReachHome(page, candidate.email, candidate.password);
    await waitForServiceWorker(page);
    await context.setOffline(true);
    const library = new LibraryPage(page);
    await gotoOfflineWithRetry(page, '/biblioteca', library.offlineNotice);
    await expect(library.offlineNotice).toBeVisible();
    await expect(page.getByText('A biblioteca só abre com internet.')).toBeVisible();
    await expect(library.backButton).toBeVisible();
    const dashboard = new DashboardPage(page);
    await gotoOfflineWithRetry(page, '/', dashboard.startSessionButton);
    await dashboard.startSessionButton.click();
    await expect(new StudySessionPage(page).region).toBeVisible();
  });
});
