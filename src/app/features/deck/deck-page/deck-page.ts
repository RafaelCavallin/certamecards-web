import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { CardEditorSheet } from '../components/card-editor-sheet/card-editor-sheet';
import { CardSearch, type CardStateFilter } from '../components/card-search/card-search';
import { CardList } from '../components/card-list/card-list';
import { DeckCounters } from '../components/deck-counters/deck-counters';
import { DeckHeader } from '../components/deck-header/deck-header';
import { DeckForm } from '../../../shared/ui/deck-form/deck-form';
import type { DeckFormModel } from '../../../shared/ui/deck-form/deck-content-form';
import { OfficialCardSheet } from '../components/official-card-sheet/official-card-sheet';
import { OfficialDeckDialogs } from '../components/official-deck-dialogs/official-deck-dialogs';
import { deckBadges } from '../../../core/library/deck-badges';
import { deckActions } from './deck-actions';
import { saveDeckEdit } from './deck-edit';
import { computeDeckCardCounters } from './deck-card-counters';
import { buildCardListRows } from './deck-page-rows';

@Component({
  selector: 'app-deck-page',
  imports: [OfficialCardSheet, OfficialDeckDialogs, DeckHeader, DeckCounters, CardSearch, CardList, Sheet, ConfirmDialog, DeckForm, CardEditorSheet, Button],
  templateUrl: './deck-page.html',
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly decksData = inject(DecksData);
  private readonly cardsData = inject(CardsData);
  private readonly cardStatesData = inject(CardStatesData);
  protected readonly subjectsData = inject(SubjectsData);
  protected readonly connectivity = inject(ConnectivityStore);

  protected readonly deckId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly deck = this.decksData.watchById(this.deckId);
  protected readonly subjectName = computed(
    () => this.subjectsData.all().find((subject) => subject.id === this.deck()?.subjectId)?.name ?? '',
  );
  protected readonly cards = this.cardsData.byDeck(this.deckId);
  protected readonly counters = computed(() =>
    computeDeckCardCounters(this.cards(), this.cardStatesData.byCardId(), new Date()),
  );
  protected readonly query = signal('');
  protected readonly stateFilter = signal<CardStateFilter>('all');
  protected readonly rows = computed(() =>
    buildCardListRows({
      cards: this.cards(),
      states: this.cardStatesData.byCardId(),
      query: this.query(),
      stateFilter: this.stateFilter(),
      now: new Date(),
    }),
  );
  protected readonly actionsOf = deckActions;
  protected readonly badgesOf = deckBadges;
  protected readonly cancelSubscriptionOpen = signal(false);
  protected readonly duplicateOpen = signal(false);
  protected readonly editDeckOpen = signal(false);
  protected readonly deleteDeckConfirmOpen = signal(false);
  protected readonly resetProgressConfirmOpen = signal(false);
  protected readonly cardSheetOpen = signal(false);
  protected readonly editingCardId = signal<string | null>(null);
  protected readonly editingCard = computed(() => this.cards().find((card) => card.id === this.editingCardId()));
  protected onNewCard(): void {
    this.editingCardId.set(null);
    this.cardSheetOpen.set(true);
  }

  protected onOpenCard(cardId: string): void {
    this.editingCardId.set(cardId);
    this.cardSheetOpen.set(true);
  }

  protected async onSaveDeckEdit(value: DeckFormModel): Promise<void> {
    await saveDeckEdit(this.decksData, this.deck(), value);
    this.editDeckOpen.set(false);
  }

  protected async onConfirmDeleteDeck(): Promise<void> {
    const currentDeck = this.deck();
    if (currentDeck === undefined) {
      return;
    }
    await this.decksData.delete(currentDeck.id);
    this.deleteDeckConfirmOpen.set(false);
    await this.router.navigate(['/']);
  }
  protected async onConfirmResetProgress(): Promise<void> {
    await this.decksData.resetProgress(this.deckId);
    this.resetProgressConfirmOpen.set(false);
  }
}
