import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';
import { seedForCandidate } from './fixtures/test-support';
import { DashboardPage } from './pages/dashboard-page';
import { StudySessionPage } from './pages/study-session-page';

test('E2E-03 — sessão completa só com teclado', async ({ page, candidate }) => {
  await seedForCandidate(candidate, 'due_cards', { count: 2 });
  await loginAndReachHome(page, candidate.email, candidate.password);
  await new DashboardPage(page).startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.region).toBeVisible();
  await session.reveal();
  await expect(session.rateButton(1)).toBeVisible();
  await expect(session.rateButton(2)).toBeVisible();
  await expect(session.rateButton(3)).toBeVisible();
  await expect(session.rateButton(4)).toBeVisible();
  await session.rate(3);
  await session.undo();
  await expect(session.rateButton(3)).toBeVisible();
  await session.end();
  await expect(page.getByRole('button', { name: 'Voltar ao painel' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao painel' }).click();
  await expect(page).toHaveURL('/');
});

test('E2E-04 — filtro por matéria mostra só cartões daquela matéria', async ({ page, candidate }) => {
  await seedForCandidate(candidate, 'due_cards', { count: 2, subjectName: 'Direito Constitucional' });
  await seedForCandidate(candidate, 'due_cards', { count: 2, subjectName: 'Português' });
  await loginAndReachHome(page, candidate.email, candidate.password);
  const dashboard = new DashboardPage(page);
  await dashboard.selectSubject('Português');
  await dashboard.startSessionButton.click();
  const session = new StudySessionPage(page);
  await expect(session.region).toBeVisible();
  for (let seen = 0; seen < 2; seen += 1) {
    expect((await session.currentSubject()).toLowerCase()).toBe('português');
    await session.reveal();
    await session.rate(3);
  }
});
