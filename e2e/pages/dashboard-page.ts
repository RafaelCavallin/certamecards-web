import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly newDeckButton: Locator;
  readonly startSessionButton: Locator;
  readonly allCaughtUpButton: Locator;
  readonly syncStatus: Locator;
  readonly signOutButton: Locator;
  readonly settingsButton: Locator;
  readonly last14Days: Locator;

  constructor(private readonly page: Page) {
    this.newDeckButton = page.getByRole('button', { name: 'Novo deck' });
    this.startSessionButton = page.getByRole('button', { name: 'Começar sessão' });
    this.allCaughtUpButton = page.getByRole('button', { name: 'Tudo em dia' });
    this.syncStatus = page.getByRole('button', { name: /^(Sincronizado|Sincronizando|Sem conexão|\d+ pendentes|Erro ao sincronizar)/ });
    this.signOutButton = page.getByRole('button', { name: 'Sair', exact: true });
    this.settingsButton = page.getByRole('button', { name: 'Ajustes' });
    this.last14Days = page.getByRole('region', { name: 'Últimos 14 dias' });
  }

  async last14DaysTotalText(): Promise<string> {
    return (await this.last14Days.locator('dd').first().textContent()) ?? '';
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  deckRow(name: string): Locator {
    return this.page.getByRole('button', { name });
  }

  async selectSubject(name: string): Promise<void> {
    await this.page.getByRole('button', { name, exact: true }).click();
  }
}
