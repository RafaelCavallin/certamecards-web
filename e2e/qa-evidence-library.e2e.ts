import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedOneDeckPerSubject } from './fixtures/library-scenarios';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck, subscribeByApi } from './fixtures/official-api';
import { discontinueByApi } from './fixtures/official-lifecycle';
import { gotoOfflineWithRetry } from './fixtures/offline-navigation';
import { waitForServiceWorker } from './fixtures/service-worker';
import { LibraryPage } from './pages/library-page';

const EVIDENCE_DIR = resolve(__dirname, '../../tasks/prd-02-biblioteca-oficial/evidences');
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '1280', width: 1280, height: 800 },
];
const ADMIN_SCREENS: readonly (readonly [route: string, name: string])[] = [
  ['decks-oficiais', 'admin-decks-oficiais'],
  ['apontamentos', 'admin-apontamentos'],
  ['registro', 'admin-registro'],
];

async function shot(page: Page, name: string, size: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}-${size}.png`, fullPage: true });
}

async function captureAdminScreens(page: Page, size: string): Promise<void> {
  for (const [route, name] of ADMIN_SCREENS) {
    await page.goto(`/admin/${route}`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await shot(page, name, size);
  }
}

for (const viewport of VIEWPORTS) {
  test(`QA PRD 2 — capturas da biblioteca em ${viewport.name}px`, async ({ page, candidate, admin }) => {
    test.setTimeout(120_000);
    const mainName = uniqueName('Deck de QA');
    await seedOneDeckPerSubject(admin, mainName, 12);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAndReachHome(page, candidate.email, candidate.password);
    await expect(page.getByText('Oficial').first()).toBeVisible();
    await shot(page, 'painel-vazio-sugestoes', viewport.name);
    const library = new LibraryPage(page);
    await library.goto();
    await library.search(mainName);
    await expect(library.deckItem(mainName)).toBeVisible();
    await shot(page, 'biblioteca', viewport.name);
    await library.search('zzzz');
    await expect(library.noResults).toBeVisible();
    await shot(page, 'biblioteca-sem-resultado', viewport.name);
    await library.search(mainName);
    await library.openPreview(mainName);
    await shot(page, 'biblioteca-previa', viewport.name);
    await page.keyboard.press('Escape');
    await waitForServiceWorker(page);
    await page.context().setOffline(true);
    await gotoOfflineWithRetry(page, '/biblioteca', library.offlineNotice);
    await shot(page, 'biblioteca-sem-rede', viewport.name);
    await page.context().setOffline(false);
    await loginAndReachHome(page, admin.email, admin.password);
    await captureAdminScreens(page, viewport.name);
  });
}

for (const viewport of VIEWPORTS) {
  test(`QA PRD 2 — painel e deck oficial em ${viewport.name}px`, async ({ page, candidate, admin }) => {
    const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck inscrito'), subjectName: 'Português', cardCount: 8 });
    await subscribeByApi(candidate, deck.deckId);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAndReachHome(page, candidate.email, candidate.password);
    await expect(page.getByText('Oficial').first()).toBeVisible();
    await shot(page, 'painel-deck-oficial', viewport.name);
    await page.getByRole('button', { name: new RegExp(deck.name) }).click();
    await expect(page.getByRole('button', { name: 'Duplicar como deck próprio' })).toBeVisible();
    await shot(page, 'deck-oficial', viewport.name);
    await discontinueByApi(admin, deck.deckId);
    await page.goto('/');
    await expect(page.getByText('Descontinuado').first()).toBeVisible();
    await shot(page, 'painel-deck-descontinuado', viewport.name);
  });
}
