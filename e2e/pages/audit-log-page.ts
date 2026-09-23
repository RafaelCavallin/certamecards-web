import type { Locator, Page } from '@playwright/test';

export class AuditLogPage {
  readonly entries: Locator;
  readonly emptyNotice: Locator;

  constructor(private readonly page: Page) {
    this.entries = page.locator('main ol > li');
    this.emptyNotice = page.getByText('Nenhuma ação registrada neste filtro.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/registro');
  }

  async filterByActor(displayName: string): Promise<void> {
    await this.page.getByLabel('Administrador').selectOption({ label: displayName });
  }

  async filterByPeriod(from: string, to: string): Promise<void> {
    await this.page.getByLabel('De', { exact: true }).fill(from);
    await this.page.getByLabel('Até', { exact: true }).fill(to);
  }

  entry(text: string): Locator {
    return this.entries.filter({ hasText: text });
  }
}
