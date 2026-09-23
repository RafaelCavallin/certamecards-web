import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

const EVIDENCE_DIR = resolve(__dirname, '../../tasks/prd-01-nucleo-estudo/evidences');
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '1280', width: 1280, height: 800 },
];

async function shot(page: Page, name: string, size: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}-${size}.png`, fullPage: true });
}

for (const viewport of VIEWPORTS) {
  test(`QA — capturas de estados em ${viewport.name}px`, async ({ page, candidate }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAndReachHome(page, candidate.email, candidate.password);
    await shot(page, 'painel-vazio', viewport.name);
    await seedForCandidate(candidate, 'due_cards', { count: 3 });
    await page.reload();
    const dashboard = new DashboardPage(page);
    await dashboard.startSessionButton.waitFor();
    await shot(page, 'painel-com-dados', viewport.name);
    await dashboard.startSessionButton.click();
    const session = new StudySessionPage(page);
    await session.region.waitFor();
    await shot(page, 'sessao-pergunta', viewport.name);
    await session.reveal();
    await shot(page, 'sessao-avaliacao', viewport.name);
    await session.end();
    await shot(page, 'sessao-resumo', viewport.name);
    await page.getByRole('button', { name: 'Voltar ao painel' }).click();
    await dashboard.settingsButton.click();
    await shot(page, 'ajustes', viewport.name);
  });
}
