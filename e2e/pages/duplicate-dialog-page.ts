import type { Locator, Page } from '@playwright/test';

export type DuplicateMode = 'carry' | 'fresh';
const PROGRESS_LABEL: Record<DuplicateMode, RegExp> = { carry: /Levar meu progresso/, fresh: /Começar do zero/ };
export class DuplicateDialogPage {
  readonly dialog: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Duplicar como deck próprio' });
  }

  async openFromDeck(deckId: string): Promise<void> {
    await this.page.goto(`/decks/${deckId}`);
    await this.page.getByRole('button', { name: 'Duplicar como deck próprio' }).click();
  }

  async confirm(mode: DuplicateMode): Promise<void> {
    await this.dialog.getByRole('radio', { name: PROGRESS_LABEL[mode] }).check();
    await this.dialog.getByRole('radio', { name: /Manter a inscrição/ }).check();
    await this.dialog.getByRole('button', { name: 'Duplicar', exact: true }).click();
  }
}
