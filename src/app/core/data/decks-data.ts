import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import type { CreateDeckRequest, Deck, UpdateDeckRequest } from '../api/deck.model';
import { DecksApi } from '../api/decks-api';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { SyncService } from '../sync/sync-service';

@Injectable({ providedIn: 'root' })
export class DecksData {
  private readonly localDb = inject(LocalDb);
  private readonly decksApi = inject(DecksApi);
  private readonly syncService = inject(SyncService);
  private readonly eventsService = inject(EventsService);
  private readonly injector = inject(Injector);

  readonly active: Signal<readonly Deck[]> = toSignal(from(liveQuery(() => this.fetchActive())), {
    initialValue: [],
  });

  watchById(id: string): Signal<Deck | undefined> {
    return runInInjectionContext(this.injector, () =>
      toSignal(from(liveQuery(() => this.localDb.decks.get(id))), { initialValue: undefined }),
    );
  }

  async create(request: CreateDeckRequest): Promise<Deck> {
    const deck = await this.decksApi.create(request);
    await this.localDb.decks.put(deck);
    void this.syncService.pull();
    void this.eventsService.record('deck_created', { deckId: deck.id });
    return deck;
  }

  async update(id: string, ifMatch: number, request: UpdateDeckRequest): Promise<Deck> {
    const deck = await this.decksApi.update(id, ifMatch, request);
    await this.localDb.decks.put(deck);
    void this.syncService.pull();
    return deck;
  }

  async delete(id: string, ifMatch: number): Promise<void> {
    await this.decksApi.delete(id, ifMatch);
    await this.localDb.decks.delete(id);
    void this.syncService.pull();
  }

  async resetProgress(id: string): Promise<void> {
    await this.decksApi.resetProgress(id);
    await this.syncService.pull();
  }

  private async fetchActive(): Promise<Deck[]> {
    const all = await this.localDb.decks.toArray();
    return all.filter((deck) => deck.deletedAt === null);
  }
}
