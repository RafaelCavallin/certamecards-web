import { AxeBuilder } from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const VIEWPORT_360 = { width: 360, height: 800 };
const MIN_TARGET_SIZE = 44;
const SERIOUS_IMPACTS = ['serious', 'critical'];
export type Theme = 'noite' | 'dia';
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBe(sizes.clientWidth);
}
export async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => SERIOUS_IMPACTS.includes(violation.impact ?? ''));
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([]);
}
export async function expectTouchTargets(targets: readonly Locator[]): Promise<void> {
  for (const target of targets) {
    const box = await target.first().boundingBox();
    expect(box?.height, String(target)).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    expect(box?.width, String(target)).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
  }
}
export async function applyTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(async (value) => {
    document.documentElement.dataset['theme'] = value;
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
  }, theme);
}
export async function expectAccessibleInBothThemes(page: Page): Promise<void> {
  for (const theme of ['noite', 'dia'] as const) {
    await applyTheme(page, theme);
    await expectNoSeriousViolations(page);
  }
}
