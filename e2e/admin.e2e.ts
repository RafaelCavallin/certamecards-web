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

  test('cria matéria duplicada, renomeia, desativa e não retira o próprio papel', async ({ page, candidate }) => {
    await loginAndReachHome(page, adminEmail ?? '', adminPassword ?? '');
    const renamedName = await createDuplicateThenRenameSubject(page);
    await deactivateSubject(page, renamedName);
    await attemptRevokeOwnRole(page, adminEmail ?? '');
    await loginAndReachHome(page, candidate.email, candidate.password);
    await page.goto('/decks/novo');
    await expect(page.getByLabel('Matéria').getByRole('option', { name: renamedName })).toHaveCount(0);
  });
});
async function createDuplicateThenRenameSubject(page: Page): Promise<string> {
  await page.goto('/admin/materias');
  await page.getByLabel('Nova matéria').fill(SEEDED_SUBJECT_NAME);
  await page.getByRole('button', { name: 'Criar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const renamedName = `Direito Constitucional ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByRole('row', { name: new RegExp(SEEDED_SUBJECT_NAME) }).getByText('Renomear').click();
  await page.getByRole('row', { name: new RegExp(SEEDED_SUBJECT_NAME) }).locator('input').fill(renamedName);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(renamedName)).toBeVisible();
  return renamedName;
}
async function deactivateSubject(page: Page, name: string): Promise<void> {
  await page.getByRole('row', { name: new RegExp(name) }).getByText('Desativar').click();
  await page.getByText('Sim').click();
  await expect(page.getByRole('row', { name: new RegExp(name) }).getByText('Desativada')).toBeVisible();
}
async function attemptRevokeOwnRole(page: Page, adminEmail: string): Promise<void> {
  await page.goto('/admin/administradores');
  const adminRow = page.getByRole('row', { name: new RegExp(adminEmail) });
  await adminRow.getByText('Retirar papel').click();
  await adminRow.getByText('Sim').click();
  await expect(page.getByRole('alert')).toBeVisible();
}
