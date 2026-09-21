import type { Page } from '@playwright/test';

export class DeckFormPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/decks/novo');
  }

  async createDeck(subjectName: string, name: string): Promise<void> {
    await this.page.getByLabel('Matéria').selectOption({ label: subjectName });
    await this.page.getByLabel('Nome').fill(name);
    await this.page.getByRole('button', { name: 'Criar deck' }).click();
    await this.page.waitForURL(/\/decks\/[^/]+$/);
  }
}
