import type { Locator, Page } from '@playwright/test';

const OFFLINE_NAVIGATION_ATTEMPTS = 3;
async function locatorAppears(locator: Locator): Promise<boolean> {
  return locator
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
}
export async function gotoOfflineWithRetry(page: Page, url: string, readyLocator: Locator): Promise<void> {
  // Chromium não intercepta o dynamic import() de um chunk lazy pelo service worker de forma
  // confiável quando offline (falha intermitente confirmada nesta sessão mesmo com o chunk já
  // em cache); repetir a navegação é a mitigação prática enquanto o bug de plataforma existir.
  for (let attempt = 0; attempt < OFFLINE_NAVIGATION_ATTEMPTS; attempt += 1) {
    await page.goto(url);
    if (await locatorAppears(readyLocator)) {
      return;
    }
  }
}
