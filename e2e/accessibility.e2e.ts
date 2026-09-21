import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { DeckPage } from './pages/deck-page';
import { StudySessionPage } from './pages/study-session-page';

const VIEWPORT_360 = { width: 360, height: 800 };
const MIN_TARGET_SIZE = 44;
const SERIOUS_IMPACTS = ['serious', 'critical'];

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBe(sizes.clientWidth);
}
async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => SERIOUS_IMPACTS.includes(violation.impact ?? ''));
  expect(serious).toEqual([]);
}
async function setTheme(page: Page, theme: 'noite' | 'dia'): Promise<void> {
  await new DashboardPage(page).settingsButton.click();
  await page.getByLabel('Aparência').selectOption(theme);
  await page.getByRole('button', { name: 'Cancelar' }).click();
}

test('E2E-14 — painel em 360px, sem rolagem horizontal e sem violações graves nos dois temas', async ({
  page,
  candidate,
}) => {
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousViolations(page);
  await setTheme(page, 'dia');
  await expectNoSeriousViolations(page);
});

test('E2E-14 — tela do deck em 360px sem violações graves', async ({ page, candidate }) => {
  const seed = await seedForCandidate(candidate, 'due_cards', { count: 3 });
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DeckPage(page).goto(seed.deckId);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousViolations(page);
});

test('E2E-14 — sessão em grade 2×2 com alvos de 44px e sem violações graves', async ({ page, candidate }) => {
  await seedForCandidate(candidate, 'due_cards', { count: 2 });
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.region).toBeVisible();
  await session.reveal();
  const ratingGroup = page.getByRole('group', { name: 'Como foi lembrar a resposta?' });
  const ratingButtons = await ratingGroup.getByRole('button').all();
  for (const button of ratingButtons) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
  }
  await expectNoHorizontalScroll(page);
  await expectNoSeriousViolations(page);
});

test('E2E-14 — ajustes com foco visível e sem violações graves', async ({ page, candidate }) => {
  await page.setViewportSize(VIEWPORT_360);
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).settingsButton.click();
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus-visible')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousViolations(page);
});
