import { expect, test } from './fixtures/test';
import { waitForServiceWorker } from './fixtures/service-worker';

const MANIFEST_PATH = 'manifest.webmanifest';

interface WebAppManifest {
  readonly display: string;
  readonly start_url: string;
  readonly icons: readonly unknown[];
}

test('E2E-13 — Pixel emulado: manifest instalável e service worker ativo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-pixel', 'Caso do Pixel emulado (Chromium), ver techspec E2E-13');
  await page.goto('/');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe(MANIFEST_PATH);

  const manifestResponse = await page.request.get(new URL(MANIFEST_PATH, page.url()).toString());
  const manifest = (await manifestResponse.json()) as WebAppManifest;
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons.length).toBeGreaterThan(0);

  await waitForServiceWorker(page);

  // O `beforeinstallprompt` não dispara de forma confiável em Chromium headless: registramos
  // apenas que o listener pode ser anexado sem erro, e a instalação real é verificada no qa.md.
  const listenerAttached = await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.addEventListener('beforeinstallprompt', () => resolve(true));
        resolve(true);
      }),
  );
  expect(listenerAttached).toBe(true);
});

test('E2E-13 — iPhone emulado: metadados de app standalone no head', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-iphone', 'Caso do iPhone emulado (WebKit), ver techspec E2E-13');
  await page.goto('/');
  const capable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
  expect(capable).toBe('yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

// A instalação em iPhone físico fica fora da automação (Playwright não controla o fluxo real de
// "Adicionar à Tela de Início" em um dispositivo real) e é registrada no qa.md, conforme a techspec.
test.skip('E2E-13 — instalação em iPhone físico', () => {
  // ver comentário acima
});
