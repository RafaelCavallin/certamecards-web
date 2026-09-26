import type { Locator, Page } from '@playwright/test';

export class SettingsSheetPage {
  readonly newPerDay: Locator;
  readonly theme: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    const dialog = page.locator('dialog[open]');
    this.newPerDay = dialog.getByLabel('Cartões novos por dia');
    this.theme = dialog.getByRole('combobox', { name: 'Aparência' });
    this.saveButton = dialog.getByRole('button', { name: 'Salvar' });
  }

  async open(settingsButton: Locator): Promise<void> {
    await settingsButton.click();
  }

  async setNewPerDay(value: number): Promise<void> {
    await this.newPerDay.fill(String(value));
  }

  async setTheme(value: 'noite' | 'dia' | 'auto'): Promise<void> {
    await this.theme.selectOption(value);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.page.locator('dialog[open]').waitFor({ state: 'detached' });
  }
}
