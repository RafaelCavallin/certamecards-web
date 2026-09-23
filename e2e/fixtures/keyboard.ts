import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const MAX_TABS = 60;
async function isFocused(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element === document.activeElement).catch(() => false);
}
export async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let attempt = 0; attempt < MAX_TABS; attempt += 1) {
    if (await isFocused(target)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Foco não alcançou ${String(target)} só com Tab`);
}
export async function expectFocusReturnedTo(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  await expect(page.locator(':focus-visible')).toBeVisible();
}
export async function openAndCloseByKeyboard(page: Page, trigger: Locator, opened: Locator): Promise<void> {
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  await expect(opened).toBeVisible();
  await page.keyboard.press('Escape');
  await expectFocusReturnedTo(page, trigger);
}
