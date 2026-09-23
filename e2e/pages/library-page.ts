import type { Locator, Page } from '@playwright/test';

export class LibraryPage {
  readonly searchInput: Locator;
  readonly resultsAnnouncement: Locator;
  readonly noResults: Locator;
  readonly clearButton: Locator;
  readonly offlineNotice: Locator;
  readonly backButton: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByLabel('Buscar decks');
    this.resultsAnnouncement = page.locator('main [aria-live="polite"]');
    this.noResults = page.getByText('Nenhum deck encontrado.');
    this.clearButton = page.getByRole('button', { name: 'Limpar busca e filtros' });
    this.offlineNotice = page.getByText('Isso precisa de conexão.').first();
    this.backButton = page.getByRole('button', { name: 'Voltar ao painel' }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/biblioteca');
  }

  deckItem(name: string): Locator {
    return this.page.locator('app-library-deck-item', { hasText: name });
  }

  previewButton(name: string): Locator {
    return this.page.getByRole('button', { name: `Ver a prévia de ${name}` });
  }

  subjectFilter(name: string): Locator {
    return this.page.getByRole('group', { name: 'Filtrar por matéria' }).getByRole('button', { name, exact: true });
  }

  previewDialog(name: string): Locator {
    return this.page.getByRole('dialog', { name });
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async openPreview(name: string): Promise<Locator> {
    await this.previewButton(name).click();
    const dialog = this.previewDialog(name);
    await dialog.getByRole('button', { name: 'Inscrever-se' }).or(dialog.getByRole('button', { name: 'Abrir deck' })).waitFor();
    return dialog;
  }
}
