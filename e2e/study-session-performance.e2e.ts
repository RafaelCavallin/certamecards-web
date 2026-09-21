import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

const SAMPLE_SIZE = 30;
const P95_BUDGET_MS = 100;
const P95_INDEX = Math.floor(SAMPLE_SIZE * 0.95) - 1;

function percentile95(durationsMs: readonly number[]): number {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  return sorted[P95_INDEX] ?? 0;
}

async function measureNextCardMs(page: Page, front: Locator): Promise<number> {
  const previousFront = await front.textContent();
  const start = performance.now();
  await page.keyboard.press('3');
  await expect(front).not.toHaveText(previousFront ?? '');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  return performance.now() - start;
}

async function collectSamples(page: Page, session: StudySessionPage): Promise<number[]> {
  const front = page.locator('article[aria-label="Cartão"] >> p').first();
  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    await session.reveal();
    durations.push(await measureNextCardMs(page, front));
  }
  return durations;
}

test('E2E-15 — tempo do próximo cartão fica em até 100 ms (p95), com e sem rede', async ({ page, candidate }) => {
  test.setTimeout(120_000);
  await seedForCandidate(candidate, 'large_deck', { count: 5000 });
  await seedForCandidate(candidate, 'due_cards', { count: SAMPLE_SIZE });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.region).toBeVisible();

  const onlineDurations = await collectSamples(page, session);
  expect(percentile95(onlineDurations)).toBeLessThanOrEqual(P95_BUDGET_MS);

  await page.context().setOffline(true);
  const offlineDurations = await collectSamples(page, session);
  await page.context().setOffline(false);
  expect(percentile95(offlineDurations)).toBeLessThanOrEqual(P95_BUDGET_MS);
});
