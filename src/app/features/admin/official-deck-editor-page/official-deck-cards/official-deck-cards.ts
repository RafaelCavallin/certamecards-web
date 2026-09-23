import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import type { Card } from '../../../../core/api/card.model';
import type { OfficialStatus } from '../../../../core/api/deck.model';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import type { OfficialCardPage } from '../../../../core/api/official-deck.model';
import { Button } from '../../../../shared/ui/button/button';
import { OfficialCardEditor } from '../official-card-editor/official-card-editor';
import { findCardInDeck } from './find-card-in-deck';

@Component({
  selector: 'app-official-deck-cards',
  imports: [Button, OfficialCardEditor],
  templateUrl: './official-deck-cards.html',
})
export class OfficialDeckCards {
  private readonly api = inject(OfficialDecksApi);
  readonly deckId = input.required<string>();
  readonly status = input.required<OfficialStatus>();
  readonly subscribers = input(0);
  readonly online = input(true);
  readonly openCardId = input<string | null>(null);
  readonly changed = output<void>();
  protected readonly result = signal<OfficialCardPage | null>(null);
  protected readonly failed = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editing = signal<Card | null>(null);
  protected readonly page = signal(0);

  constructor() {
    effect(() => {
      const openId = this.openCardId();
      untracked(() => void this.initialLoad(openId));
    });
  }

  protected onNew(): void {
    this.editing.set(null);
    this.editorOpen.set(true);
  }

  protected onEdit(card: Card): void {
    this.editing.set(card);
    this.editorOpen.set(true);
  }

  protected async onSaved(): Promise<void> {
    await this.load();
    this.changed.emit();
  }

  protected onPage(delta: number): void {
    this.page.update((current) => current + delta);
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.result.set(await this.api.listCards(this.deckId(), this.page()));
    } catch {
      this.failed.set(true);
    }
  }

  private async initialLoad(openId: string | null): Promise<void> {
    await this.load();
    if (openId === null) {
      return;
    }
    const found = await findCardInDeck(this.api, this.deckId(), openId);
    if (found !== null) {
      this.onEdit(found);
    }
  }
}
