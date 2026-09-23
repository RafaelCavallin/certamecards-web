import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class OfficialEditorPage {
  readonly header: Locator;
  readonly alert: Locator;
  readonly cardSheet: Locator;

  constructor(private readonly page: Page) {
    this.header = page.locator('main header');
    this.alert = page.locator('main').getByRole('alert');
    this.cardSheet = page.locator('dialog[open]');
  }

  async createDeck(subject: string, name: string): Promise<string> {
    await this.page.goto('/admin/decks-oficiais/novo');
    await this.page.getByLabel('Matéria').selectOption({ label: subject });
    await this.page.getByLabel('Nome').fill(name);
    await this.page.getByRole('button', { name: 'Criar deck' }).click();
    await this.page.waitForURL(/\/admin\/decks-oficiais\/(?!novo)[0-9a-f-]{36}/);
    return this.page.url().split('/').at(-1) ?? '';
  }

  async addCards(fronts: readonly string[], totalBefore = 0): Promise<void> {
    await this.page.getByRole('button', { name: 'Novo cartão' }).click();
    for (const [index, front] of fronts.entries()) {
      await this.cardSheet.getByLabel('Pergunta').fill(front);
      await this.cardSheet.getByLabel('Resposta').fill(`Resposta de ${front}`);
      await this.cardSheet.getByRole('button', { name: 'Salvar e adicionar outro' }).click();
      await expect(this.header).toContainText(`${totalBefore + index + 1} cartões`);
    }
    await this.cardSheet.getByRole('button', { name: 'Fechar' }).click();
  }

  async runStatusAction(label: string): Promise<void> {
    await this.header.getByRole('button', { name: label, exact: true }).click();
    await this.cardSheet.getByRole('button', { name: label, exact: true }).click();
  }

  async gotoDeck(deckId: string): Promise<void> {
    await this.page.goto(`/admin/decks-oficiais/${deckId}`);
  }

  async openCard(front: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(front) }).click();
  }

  async editBack(kind: string, back: string): Promise<void> {
    await this.cardSheet.getByRole('radio', { name: new RegExp(kind) }).check();
    await this.cardSheet.getByLabel('Resposta').fill(back);
  }

  async saveCard(): Promise<void> {
    await this.cardSheet.getByRole('button', { name: 'Salvar', exact: true }).click();
  }
}
