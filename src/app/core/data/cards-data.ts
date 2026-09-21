import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import type { Card, CreateCardRequest, UpdateCardRequest } from '../api/card.model';
import { CardsApi } from '../api/cards-api';
import { toCardRow } from '../db/card-row';
import { LocalDb } from '../db/local-db';
import type { CardRow } from '../db/local-db.model';
import { EventsService } from '../events/events-service';
import { SyncService } from '../sync/sync-service';

@Injectable({ providedIn: 'root' })
export class CardsData {
  private readonly localDb = inject(LocalDb);
  private readonly cardsApi = inject(CardsApi);
  private readonly syncService = inject(SyncService);
  private readonly eventsService = inject(EventsService);
  private readonly injector = inject(Injector);

  readonly allActive: Signal<readonly CardRow[]> = toSignal(from(liveQuery(() => this.fetchAllActive())), {
    initialValue: [],
  });

  byDeck(deckId: string): Signal<readonly CardRow[]> {
    return runInInjectionContext(this.injector, () =>
      toSignal(from(liveQuery(() => this.fetchByDeck(deckId))), { initialValue: [] }),
    );
  }

  async create(deckId: string, request: CreateCardRequest): Promise<Card> {
    const card = await this.cardsApi.create(deckId, request);
    await this.localDb.cards.put(toCardRow(card));
    void this.syncService.pull();
    void this.eventsService.record('card_created', { deckId, cardId: card.id });
    return card;
  }

  async update(id: string, ifMatch: number, request: UpdateCardRequest): Promise<Card> {
    const card = await this.cardsApi.update(id, ifMatch, request);
    await this.localDb.cards.put(toCardRow(card));
    void this.syncService.pull();
    return card;
  }

  async delete(id: string, ifMatch: number): Promise<void> {
    await this.cardsApi.delete(id, ifMatch);
    await this.localDb.cards.delete(id);
    void this.syncService.pull();
  }

  private async fetchByDeck(deckId: string): Promise<CardRow[]> {
    const cards = await this.localDb.cards.where('deckId').equals(deckId).toArray();
    return cards.filter((card) => card.deletedAt === null);
  }

  private async fetchAllActive(): Promise<CardRow[]> {
    const cards = await this.localDb.cards.toArray();
    return cards.filter((card) => card.deletedAt === null);
  }
}
