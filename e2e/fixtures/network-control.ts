import type { Page, Route } from '@playwright/test';

export async function dropFirstResponseAfterServerCommit(page: Page, urlPattern: string | RegExp): Promise<void> {
  let dropped = false;
  await page.route(urlPattern, async (route: Route) => {
    if (dropped) {
      await route.continue();
      return;
    }
    dropped = true;
    await route.fetch();
    await route.abort('failed');
  });
}
export async function stopDroppingResponses(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.unroute(urlPattern);
}
