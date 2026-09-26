import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { LibraryApi } from '../api/library-api';
import type { DeckContentPage, DeckSubscription } from '../api/library.model';
import { toCardRow } from '../db/card-row';
import { CurrentAccountDb } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { removeUnsubscribedDeck } from '../sync/projection-resolver';
import { SyncCycleCoordinator } from '../sync/sync-cycle-coordinator';
import type { DuplicateChoice } from './duplicate-options';
import { toDuplicateRequest } from './duplicate-options';

interface Snapshot {
  readonly cards: readonly Card[];
  readonly cardStates: readonly CardState[];
}
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(LibraryApi);
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly syncCycleCoordinator = inject(SyncCycleCoordinator);
  private readonly events = inject(EventsService);

  async subscribe(deckId: string): Promise<Deck> {
    const { deck, subscription, restoredProgress } = await this.api.subscribe(deckId);
    const snapshot = await this.fetchSnapshot(deckId);
    await this.storeSnapshot(deck, subscription, snapshot);
    void this.events.record('deck_subscribed', { deckId, cardCount: snapshot.cards.length, restoredProgress });
    await this.syncCycleCoordinator.runNow();
    return deck;
  }

  async cancel(deckId: string): Promise<void> {
    await this.api.unsubscribe(deckId);
    void this.events.record('deck_unsubscribed', { deckId });
    const { db } = this.currentAccountDb.require();
    await removeUnsubscribedDeck(db, deckId);
    await this.syncCycleCoordinator.runNow();
  }

  async duplicate(deckId: string, newDeckId: string, choice: DuplicateChoice): Promise<Deck> {
    const { deck } = await this.api.duplicate(deckId, toDuplicateRequest(newDeckId, choice));
    void this.events.record('deck_duplicated', {
      sourceDeckId: deckId,
      mode: choice.carryProgress ? 'carry' : 'fresh',
      cancelledSubscription: choice.cancelSubscription,
    });
    await this.syncCycleCoordinator.runNow();
    return deck;
  }

  private async fetchSnapshot(deckId: string): Promise<Snapshot> {
    const cards: Card[] = [];
    const cardStates: CardState[] = [];
    let after: string | null = null;
    let page: DeckContentPage;
    do {
      page = await this.api.content(deckId, after);
      cards.push(...page.cards);
      cardStates.push(...page.cardStates);
      after = page.nextAfter;
    } while (page.hasMore && after !== null);
    return { cards, cardStates };
  }

  private async storeSnapshot(deck: Deck, subscription: DeckSubscription, snapshot: Snapshot): Promise<void> {
    const { db } = this.currentAccountDb.require();
    await db.transaction('rw', [db.decks, db.cards, db.cardStates, db.subscriptions], async () => {
      await db.decks.put(deck);
      await db.cards.bulkPut(snapshot.cards.map((card) => toCardRow(card)));
      await db.cardStates.bulkPut([...snapshot.cardStates]);
      await db.subscriptions.put(subscription);
    });
  }
}
