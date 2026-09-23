import { expect, test } from './fixtures/test';
import { createAdmin } from './fixtures/admin';
import { createAndDeactivateSubject, markContentChange } from './fixtures/admin-actions';
import { loginAndReachHome } from './fixtures/session';
import { uniqueName } from './fixtures/official-names';
import { publishOfficialDeck } from './fixtures/official-api';
import { AuditLogPage } from './pages/audit-log-page';

const DAY_MS = 86_400_000;
const NOTE = 'Lei 14.777/2026';

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

test('E2E-23 — registro de ações', async ({ page, admin }) => {
  test.setTimeout(150_000);
  const adminB = await createAdmin(uniqueName('Administrador B'));
  const deck = await publishOfficialDeck(admin, { name: uniqueName('Deck auditado'), subjectName: 'Informática' });
  await markContentChange(admin, deck.deckId, NOTE);
  const subjectName = await createAndDeactivateSubject(admin);
  await loginAndReachHome(page, adminB.email, adminB.password);
  const log = new AuditLogPage(page);
  await log.goto();
  await log.filterByActor(admin.displayName);
  await expect(log.entry('Deck oficial publicado')).toContainText(deck.name);
  await expect(log.entry('Conteúdo de cartão oficial alterado')).toContainText('→');
  await expect(log.entry('Matéria desativada')).toContainText(subjectName);
  await expect(log.entry(admin.displayName).first()).toContainText(/\d{2}\/\d{2}\/\d{4}/);
  await expect(page.locator('main ol').getByRole('button')).toHaveCount(0);
  await log.filterByPeriod(isoDay(-1), isoDay(1));
  await expect(log.entry('Deck oficial publicado')).toBeVisible();
  await log.filterByPeriod(isoDay(3), isoDay(4));
  await expect(log.emptyNotice).toBeVisible();
});
