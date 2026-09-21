import type { Locator, Page } from '@playwright/test';

export class DeckPage {
  readonly newCardButton: Locator;
  readonly frontField: Locator;
  readonly backField: Locator;
  readonly cardSubmitButton: Locator;
  readonly offlineNotice: Locator;

  constructor(private readonly page: Page) {
    this.newCardButton = page.getByRole('button', { name: 'Novo cartão' });
    this.frontField = page.getByLabel('Pergunta');
    this.backField = page.getByLabel('Resposta');
    this.cardSubmitButton = page.locator('dialog[open]').getByRole('button', { name: /Salvar/ });
    this.offlineNotice = page.locator('dialog[open]').getByText('Isso precisa de conexão.');
  }

  async goto(deckId: string): Promise<void> {
    await this.page.goto(`/decks/${deckId}`);
  }

  async addCardWithShortcut(front: string, back: string): Promise<void> {
    await this.frontField.fill(front);
    await this.backField.fill(back);
    await this.backField.press('Control+Enter');
  }

  cardRow(front: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(front) });
  }

  async openCard(front: string): Promise<void> {
    await this.cardRow(front).click();
  }

  async suspendCurrentCard(): Promise<void> {
    await this.page.getByRole('button', { name: /^(Suspender|Reativar)$/ }).click();
  }

  async confirmDialog(dialogTitle: string, confirmLabel: string): Promise<void> {
    const dialog = this.page.locator('dialog', { hasText: dialogTitle });
    await dialog.getByRole('button', { name: confirmLabel, exact: true }).click();
  }
}
