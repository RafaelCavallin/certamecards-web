import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { waitForEmailLink } from './fixtures/mailpit';
import { loginAndReachHome } from './fixtures/session';
import { DeleteAccountPage } from './pages/delete-account-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';

const WRONG_PASSWORD = 'senha-errada-1234';

test('E2E-01 — cadastro, confirmação e primeiro acesso', async ({ page }) => {
  const email = `candidato-${crypto.randomUUID()}@teste.certamecards.local`;
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.register('Candidata de teste', email, 'senha-teste-1234');
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, 'senha-teste-1234');
  await expect(loginPage.alert).toContainText('Confirme seu e-mail');
  const link = await waitForEmailLink(email, 'Confirme seu e-mail');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'E-mail confirmado' })).toBeVisible();
  await loginAndReachHome(page, email, 'senha-teste-1234');
  await page.goto('/ajustes/excluir-conta');
  await expect(page.getByLabel('Confirme sua senha')).toBeVisible();
});

test('E2E-10 — sexta tentativa de login é bloqueada mesmo com a senha certa', async ({ page, candidate }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await loginPage.login(candidate.email, WRONG_PASSWORD);
    await expect(loginPage.alert).toBeVisible();
  }
  await loginPage.login(candidate.email, candidate.password);
  await expect(loginPage.alert).toContainText('minutos');
});

test('E2E-10 — link de redefinição usado duas vezes mostra que expirou', async ({ page, candidate }) => {
  await page.goto('/esqueci-senha');
  await page.getByLabel('E-mail').fill(candidate.email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  const link = await waitForEmailLink(candidate.email, 'Redefina sua senha');
  await resetPasswordFromLink(page, link, 'nova-senha-1234');
  await expect(page.getByRole('heading', { name: 'Senha redefinida' })).toBeVisible();
  await page.goto('/entrar');
  await resetPasswordFromLink(page, link, 'outra-senha-1234');
  await expect(page.getByRole('heading', { name: 'Esse link expirou' })).toBeVisible();
});

test('E2E-11 — login com o Google (conta de teste)', async ({ page }) => {
  test.skip(true, 'login com o Google fica para uma versão futura (googleSignInEnabled = false)');
  await page.goto('/entrar');
});

test('E2E-12 — excluir a conta bloqueia o acesso imediatamente', async ({ page, candidate }) => {
  const loginPage = new LoginPage(page);
  await loginAndReachHome(page, candidate.email, candidate.password);
  const deleteAccountPage = new DeleteAccountPage(page);
  await deleteAccountPage.goto();
  await deleteAccountPage.deleteWithPassword(candidate.password);
  await expect(page).toHaveURL(/\/entrar/);
  await loginPage.login(candidate.email, candidate.password);
  await expect(loginPage.alert).toContainText('incorretos');
});

async function resetPasswordFromLink(page: Page, link: string, password: string): Promise<void> {
  await page.goto(link);
  await page.getByLabel('Nova senha', { exact: true }).fill(password);
  await page.getByLabel('Confirme a nova senha').fill(password);
  await page.getByRole('button', { name: 'Redefinir senha' }).click();
}
