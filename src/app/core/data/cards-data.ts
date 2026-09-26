import { Injectable, Injector, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Card, CreateCardRequest, UpdateCardRequest } from '../api/card.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import type { CardRow } from '../db/local-db.model';
import { EventsService } from '../events/events-service';
import { CardMutationWriter } from '../sync/card-mutation-writer';
import { accountLiveSignal } from './account-live-query';

@Injectable({ providedIn: 'root' })
export class CardsData {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly cardWriter = inject(CardMutationWriter);
  private readonly eventsService = inject(EventsService);
  private readonly injector = inject(Injector);

  readonly allActive: Signal<readonly CardRow[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchAllActive(account), initialValue: [],
  });

  byDeck(deckId: string): Signal<readonly CardRow[]> {
    return accountLiveSignal(this.injector, this.currentAccountDb, {
      query: (account) => this.fetchByDeck(account, deckId), initialValue: [],
    });
  }

  async create(deckId: string, request: CreateCardRequest): Promise<Card> {
    const card = await this.cardWriter.execute({
      kind: 'card_create', deckId, cardId: request.id, type: request.type, front: request.front, back: request.back, source: request.source,
    });
    void this.eventsService.record('card_created', { deckId, cardId: card.id });
    return card;
  }

  update(id: string, request: UpdateCardRequest): Promise<Card> {
    return this.cardWriter.execute({ kind: 'card_update', cardId: id, changes: request });
  }

  async delete(id: string): Promise<void> {
    await this.cardWriter.execute({ kind: 'card_delete', cardId: id });
  }

  private async fetchByDeck(account: CurrentAccount, deckId: string): Promise<CardRow[]> {
    const cards = await account.db.cards.where('deckId').equals(deckId).toArray();
    return cards.filter((card) => card.deletedAt === null);
  }

  private async fetchAllActive(account: CurrentAccount): Promise<CardRow[]> {
    const cards = await account.db.cards.toArray();
    return cards.filter((card) => card.deletedAt === null);
  }
}
