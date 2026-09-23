import { Injectable, inject } from '@angular/core';
import { EventsService } from '../events/events-service';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { LibraryApi } from '../api/library-api';
import type { DeckContentPage, DeckSubscription } from '../api/library.model';
import { toCardRow } from '../db/card-row';
import { LocalDb } from '../db/local-db';
import { removeDeckLocally } from '../sync/apply-changes-page';
import { SyncService } from '../sync/sync-service';
import type { DuplicateChoice } from './duplicate-options';
import { toDuplicateRequest } from './duplicate-options';

interface Snapshot {
  readonly cards: readonly Card[];
  readonly cardStates: readonly CardState[];
}
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(LibraryApi);
  private readonly localDb = inject(LocalDb);
  private readonly syncService = inject(SyncService);
  private readonly events = inject(EventsService);

  async subscribe(deckId: string): Promise<Deck> {
    const { deck, subscription, restoredProgress } = await this.api.subscribe(deckId);
    const snapshot = await this.fetchSnapshot(deckId);
    await this.storeSnapshot(deck, subscription, snapshot);
    void this.events.record('deck_subscribed', { deckId, cardCount: snapshot.cards.length, restoredProgress });
    await this.syncService.pull();
    return deck;
  }

  async cancel(deckId: string): Promise<void> {
    await this.api.unsubscribe(deckId);
    void this.events.record('deck_unsubscribed', { deckId });
    await this.localDb.transaction('rw', [this.localDb.decks, this.localDb.cards, this.localDb.cardStates], () =>
      removeDeckLocally(this.localDb, deckId),
    );
    await this.syncService.pull();
  }

  async duplicate(deckId: string, newDeckId: string, choice: DuplicateChoice): Promise<Deck> {
    const { deck } = await this.api.duplicate(deckId, toDuplicateRequest(newDeckId, choice));
    void this.events.record('deck_duplicated', {
      sourceDeckId: deckId,
      mode: choice.carryProgress ? 'carry' : 'fresh',
      cancelledSubscription: choice.cancelSubscription,
    });
    await this.syncService.pull();
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
    const db = this.localDb;
    await db.transaction('rw', [db.decks, db.cards, db.cardStates, db.subscriptions], async () => {
      await db.decks.put(deck);
      await db.cards.bulkPut(snapshot.cards.map((card) => toCardRow(card)));
      await db.cardStates.bulkPut([...snapshot.cardStates]);
      await db.subscriptions.put(subscription);
    });
  }
}
