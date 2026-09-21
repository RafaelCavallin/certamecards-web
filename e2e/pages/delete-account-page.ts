import type { Locator, Page } from '@playwright/test';

export class DeleteAccountPage {
  readonly password: Locator;
  readonly continueButton: Locator;
  readonly confirmButton: Locator;

  constructor(private readonly page: Page) {
    this.password = page.getByLabel('Confirme sua senha');
    this.continueButton = page.getByRole('button', { name: 'Continuar' });
    this.confirmButton = page.getByRole('button', { name: 'Sim, excluir minha conta' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/ajustes/excluir-conta');
  }

  async deleteWithPassword(password: string): Promise<void> {
    await this.password.fill(password);
    await this.continueButton.click();
    await this.confirmButton.click();
  }
}
