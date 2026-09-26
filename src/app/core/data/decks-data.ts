import { Injectable, Injector, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import type { CreateDeckRequest, Deck, UpdateDeckRequest } from '../api/deck.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { DeckMutationWriter } from '../sync/deck-mutation-writer';
import { DeckResetWriter } from '../sync/deck-reset-writer';
import { accountLiveSignal } from './account-live-query';

@Injectable({ providedIn: 'root' })
export class DecksData {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly deckWriter = inject(DeckMutationWriter);
  private readonly deckResetWriter = inject(DeckResetWriter);
  private readonly eventsService = inject(EventsService);
  private readonly injector = inject(Injector);

  readonly active: Signal<readonly Deck[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchActive(account), initialValue: [],
  });

  watchById(id: string): Signal<Deck | undefined> {
    return accountLiveSignal(this.injector, this.currentAccountDb, {
      query: (account) => account.db.decks.get(id), initialValue: undefined,
    });
  }

  async create(request: CreateDeckRequest): Promise<Deck> {
    const deck = await this.deckWriter.execute({
      kind: 'deck_create', deckId: request.id, subjectId: request.subjectId, name: request.name, description: request.description,
    });
    void this.eventsService.record('deck_created', { deckId: deck.id });
    return deck;
  }

  update(id: string, request: UpdateDeckRequest): Promise<Deck> {
    return this.deckWriter.execute({ kind: 'deck_update', deckId: id, changes: request });
  }

  async delete(id: string): Promise<void> {
    await this.deckWriter.execute({ kind: 'deck_delete', deckId: id });
  }

  async resetProgress(id: string): Promise<void> {
    await this.deckResetWriter.execute({ kind: 'deck_reset', deckId: id });
  }

  private async fetchActive(account: CurrentAccount): Promise<Deck[]> {
    const all = await account.db.decks.toArray();
    return all.filter((deck) => deck.deletedAt === null);
  }
}
