import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

export async function loginAndReachHome(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/termos');
  if (new URL(page.url()).pathname === '/termos') {
    await page.getByRole('button', { name: 'Aceitar termos e continuar' }).click();
    await page.waitForURL((url) => url.pathname === '/');
  }
}
