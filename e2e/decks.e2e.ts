import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckFormPage } from './pages/deck-form-page';
import { DeckPage } from './pages/deck-page';

const SUBJECT_NAME = 'Direito Constitucional';
const CARD_COUNT = 5;
const LARGE_DECK_CARDS = 30;

test('E2E-02 — criar deck e cartões com Ctrl+Enter', async ({ page, candidate }) => {
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).newDeckButton.click();
  const deckFormPage = new DeckFormPage(page);
  await deckFormPage.createDeck(SUBJECT_NAME, 'CF/88 — direitos fundamentais');
  const deckPage = new DeckPage(page);
  await deckPage.newCardButton.click();
  for (let index = 0; index < CARD_COUNT; index += 1) {
    await deckPage.addCardWithShortcut(`Pergunta ${index}`, `Resposta ${index}`);
  }
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('group', { name: `Novos: ${CARD_COUNT}` })).toBeVisible();
});

test('E2E-05 — suspender cartão vencido tira a contagem de para hoje', async ({ page, candidate }) => {
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const deckPage = new DeckPage(page);
  await deckPage.goto(seed.deckId);
  await expect(page.getByRole('group', { name: 'Para hoje: 1' })).toBeVisible();
  await deckPage.openCard('Frente 0');
  await deckPage.suspendCurrentCard();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('group', { name: 'Para hoje: 0' })).toBeVisible();
});

test('E2E-05 — editar a frente de um cartão em revisão mantém o vencimento', async ({ page, candidate }) => {
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const deckPage = new DeckPage(page);
  await deckPage.goto(seed.deckId);
  await deckPage.openCard('Frente 0');
  await deckPage.frontField.fill('Frente editada');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('group', { name: 'Para hoje: 1' })).toBeVisible();
});

test('E2E-05 — cartão com 8 lapsos aparece como problemático', async ({ page, candidate }) => {
  const seed = await seedForCandidate(candidate, 'leech_card', { count: 1 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DeckPage(page).goto(seed.deckId);
  await expect(page.getByText('Problemático')).toBeVisible();
});

test('E2E-09 — zerar progresso e excluir deck', async ({ page, browser, candidate }) => {
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 3 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboardPage = new DashboardPage(page);
  const totalBeforeReset = await dashboardPage.last14DaysTotalText();
  const deckPage = new DeckPage(page);
  await deckPage.goto(seed.deckId);
  await page.getByRole('button', { name: 'Zerar progresso' }).click();
  await deckPage.confirmDialog('Zerar progresso', 'Zerar');
  await expect(page.getByRole('group', { name: 'Para hoje: 0' })).toBeVisible();
  await dashboardPage.goto();
  await expect(dashboardPage.last14Days.locator('dd').first()).toHaveText(totalBeforeReset);
  const secondContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const secondPage = await secondContext.newPage();
  await loginAndReachHome(secondPage, candidate.email, candidate.password);
  await deckPage.goto(seed.deckId);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await deckPage.confirmDialog('Excluir deck', 'Excluir');
  await expect(page).toHaveURL('/');
  await secondPage.reload();
  await expect(secondPage.getByRole('button', { name: 'Seed due_cards', exact: true })).toHaveCount(0);
  await secondContext.close();
});

test('lista de cartões de um deck grande rola até o último cartão sob a CSP de produção', async ({ page, candidate }) => {
  const seed = await seedForCandidate(candidate, 'large_deck', { count: LARGE_DECK_CARDS });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await page.goto(`/decks/${seed.deckId}`);
  const deckPage = new DeckPage(page);
  await expect(deckPage.cardRow('Frente 0')).toBeVisible();
  const lastRow = deckPage.cardRow(`Frente ${LARGE_DECK_CARDS - 1}`);
  const viewport = page.locator('cdk-virtual-scroll-viewport');
  await viewport.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(lastRow).toBeVisible();
});
