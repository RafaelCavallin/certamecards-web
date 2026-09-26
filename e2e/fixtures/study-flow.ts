import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { StudySessionPage } from '../pages/study-session-page';
import type { Rating } from '../pages/study-session-page';
import { countAccountRecords } from './account-db';

const EASY_RATING = 4;
export async function rateAllCards(page: Page, total: number): Promise<void> {
  const session = new StudySessionPage(page);
  const progressBar = page.getByRole('progressbar');
  for (let reviewed = 0; reviewed < total; reviewed += 1) {
    await session.reveal();
    await rateAndAwaitLocalWrite(page, EASY_RATING);
    if (reviewed < total - 1) {
      await expect(progressBar).toHaveAttribute('aria-valuenow', String(reviewed + 1));
    }
  }
  await expect(page.getByRole('button', { name: 'Voltar ao painel' })).toBeVisible();
}
export async function queueSize(page: Page): Promise<number> {
  return Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
}
export async function rateAndAwaitLocalWrite(page: Page, rating: Rating): Promise<void> {
  const before = await countAccountRecords(page, 'reviewLogs');
  await new StudySessionPage(page).rate(rating);
  await expect.poll(() => countAccountRecords(page, 'reviewLogs')).toBeGreaterThan(before);
}
