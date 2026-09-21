import type { Locator, Page } from '@playwright/test';

export class RegisterPage {
  readonly displayName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly acceptTerms: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.displayName = page.getByLabel('Nome de exibição');
    this.email = page.getByLabel('E-mail');
    this.password = page.getByLabel('Senha');
    this.acceptTerms = page.getByRole('checkbox');
    this.submit = page.getByRole('button', { name: 'Criar conta' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/cadastrar');
  }

  async register(displayName: string, email: string, password: string): Promise<void> {
    await this.displayName.fill(displayName);
    await this.email.fill(email);
    await this.password.fill(password);
    await this.acceptTerms.check();
    await this.submit.click();
    await this.page.waitForURL('**/confirmar-email**');
  }
}
