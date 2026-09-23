import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { loginAndReachHome } from './fixtures/session';

const SEEDED_SUBJECT_NAME = 'Direito Constitucional';

test('E2E-06 — candidato é redirecionado ao tentar abrir a área administrativa', async ({ page, candidate }) => {
  await loginAndReachHome(page, candidate.email, candidate.password);
  await page.goto('/admin');
  await expect(page).not.toHaveURL(/\/admin/);
});

test.describe('E2E-06 — ações do administrador', () => {
  const adminEmail = process.env['E2E_ADMIN_EMAIL'];
  const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

  test.skip(
    adminEmail === undefined || adminPassword === undefined,
    'requer E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD de uma conta já promovida por ADMIN_BOOTSTRAP_EMAIL',
  );

  test('cria matéria duplicada, renomeia, desativa e retira o papel de outro administrador', async ({ page, candidate, admin }) => {
    await loginAndReachHome(page, adminEmail ?? '', adminPassword ?? '');
    const renamedName = await createDuplicateThenRenameSubject(page);
    await deactivateSubject(page, renamedName);
    await revokeAnotherAdmin(page, admin.email);
    await loginAndReachHome(page, candidate.email, candidate.password);
    await page.goto('/decks/novo');
    await expect(page.getByLabel('Matéria').getByRole('option', { name: renamedName })).toHaveCount(0);
  });
});
async function createDuplicateThenRenameSubject(page: Page): Promise<string> {
  const originalName = `${SEEDED_SUBJECT_NAME} ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto('/admin/materias');
  await page.getByLabel('Nova matéria').fill(originalName);
  await page.getByRole('button', { name: 'Criar' }).click();
  await expect(page.getByRole('row', { name: new RegExp(originalName) })).toBeVisible();
  await page.getByLabel('Nova matéria').fill(originalName);
  await page.getByRole('button', { name: 'Criar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const renamedName = `${originalName} renomeada`;
  await page.getByRole('row').filter({ hasText: originalName }).getByText('Renomear').click();
  await page.locator('table input').fill(renamedName);
  await page.locator('table input').press('Enter');
  await expect(page.getByText(renamedName)).toBeVisible();
  return renamedName;
}
async function deactivateSubject(page: Page, name: string): Promise<void> {
  await page.getByRole('row', { name: new RegExp(name) }).getByText('Desativar').click();
  await page.getByText('Sim').click();
  await expect(page.getByRole('row', { name: new RegExp(name) }).getByText('Desativada')).toBeVisible();
}
async function revokeAnotherAdmin(page: Page, otherAdminEmail: string): Promise<void> {
  await page.goto('/admin/administradores');
  const otherRow = page.getByRole('row', { name: new RegExp(otherAdminEmail) });
  await otherRow.getByText('Retirar papel').click();
  await otherRow.getByText('Sim').click();
  await expect(page.getByRole('row', { name: new RegExp(otherAdminEmail) })).toHaveCount(0);
}
