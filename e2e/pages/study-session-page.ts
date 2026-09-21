import type { Locator, Page } from '@playwright/test';

export type Rating = 1 | 2 | 3 | 4;
export class StudySessionPage {
  readonly region: Locator;
  readonly revealButton: Locator;
  readonly undoButton: Locator;
  readonly endButton: Locator;

  constructor(private readonly page: Page) {
    this.region = page.getByRole('region', { name: 'Sessão de estudo' });
    this.revealButton = page.locator('#s-reveal');
    this.undoButton = page.locator('#s-undo');
    this.endButton = page.locator('#s-end');
  }

  rateButton(rating: Rating): Locator {
    return this.page.locator(`#s-rate-${rating}`);
  }

  async reveal(): Promise<void> {
    await this.page.keyboard.press(' ');
  }

  async rate(rating: Rating): Promise<void> {
    await this.page.keyboard.press(String(rating));
  }

  async undo(): Promise<void> {
    await this.page.keyboard.press('z');
  }

  async end(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async currentSubject(): Promise<string> {
    const headerText = await this.page.locator('article[aria-label="Cartão"] header').innerText();
    return (headerText.split('·')[0] ?? '').trim();
  }
}
