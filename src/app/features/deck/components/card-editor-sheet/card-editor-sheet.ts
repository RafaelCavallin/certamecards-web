import { SlicePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CardsApi } from '../../../../core/api/cards-api';
import type { CardHistory } from '../../../../core/api/cards-api';
import { CardStatesData } from '../../../../core/data/card-states-data';
import { CardsData } from '../../../../core/data/cards-data';
import { ConnectivityStore } from '../../../../core/connectivity/connectivity-store';
import type { CardRow } from '../../../../core/db/local-db.model';
import { generateUuidV7 } from '../../../../core/db/uuid7';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Sheet } from '../../../../shared/ui/sheet/sheet';
import type { CardFormModel } from '../../../../shared/ui/card-form/card-content-form';
import { CardForm } from '../../../../shared/ui/card-form/card-form';
import { summarizeCardHistory } from '../../deck-page/card-history-summary';

@Component({
  selector: 'app-card-editor-sheet',
  imports: [Sheet, CardForm, ConfirmDialog, Button, SlicePipe],
  templateUrl: './card-editor-sheet.html',
})
export class CardEditorSheet {
  private readonly cardsData = inject(CardsData);
  private readonly cardStatesData = inject(CardStatesData);
  private readonly cardsApi = inject(CardsApi);
  protected readonly connectivity = inject(ConnectivityStore);

  readonly deckId = input.required<string>();
  readonly open = input(false);
  readonly cardId = input<string | null>(null);
  readonly cards = input.required<readonly CardRow[]>();
  readonly closed = output<void>();

  protected readonly card = computed(() => this.cards().find((row) => row.id === this.cardId()));
  protected readonly initialModel = computed(() => {
    const current = this.card();
    return current === undefined ? null : { front: current.front, back: current.back, source: current.source ?? '' };
  });
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly history = signal<ReturnType<typeof summarizeCardHistory> | null>(null);

  constructor() {
    effect(() => {
      const currentCardId = this.cardId();
      this.history.set(null);
      if (this.open() && currentCardId !== null && this.connectivity.online()) {
        void this.loadHistory(currentCardId);
      }
    });
  }

  protected async onSave(value: CardFormModel): Promise<void> {
    const content = { front: value.front, back: value.back, source: value.source === '' ? null : value.source };
    const editingId = this.cardId();
    if (editingId === null) {
      await this.cardsData.create(this.deckId(), { id: generateUuidV7(), type: 'basic', ...content });
      return;
    }
    const version = this.card()?.version ?? 1;
    await this.cardsData.update(editingId, version, content);
    this.closed.emit();
  }

  protected onDelete(): void {
    this.deleteConfirmOpen.set(true);
  }

  protected async onConfirmDelete(): Promise<void> {
    const editingId = this.cardId();
    if (editingId === null) {
      return;
    }
    const version = this.card()?.version ?? 1;
    await this.cardsData.delete(editingId, version);
    this.deleteConfirmOpen.set(false);
    this.closed.emit();
  }

  protected async onToggleSuspend(): Promise<void> {
    const editingId = this.cardId();
    if (editingId === null) {
      return;
    }
    await this.cardStatesData.setSuspension(editingId, !this.isSuspended());
  }

  protected isSuspended(): boolean {
    return this.cardStatesData.byCardId().get(this.cardId() ?? '')?.suspended ?? false;
  }

  protected onClose(): void {
    this.closed.emit();
  }

  private async loadHistory(cardId: string): Promise<void> {
    const cardHistory: CardHistory = await this.cardsApi.history(cardId);
    this.history.set(summarizeCardHistory(cardHistory));
  }
}
