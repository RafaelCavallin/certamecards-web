import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import type { CardState } from '../api/card-state.model';
import { CardsApi } from '../api/cards-api';
import { LocalDb } from '../db/local-db';

@Injectable({ providedIn: 'root' })
export class CardStatesData {
  private readonly localDb = inject(LocalDb);
  private readonly cardsApi = inject(CardsApi);

  readonly byCardId = toSignal(from(liveQuery(() => this.fetchAll())), {
    initialValue: new Map<string, CardState>(),
  });

  async setSuspension(cardId: string, suspended: boolean): Promise<CardState> {
    const state = await this.cardsApi.setSuspension(cardId, suspended);
    await this.localDb.cardStates.put(state);
    return state;
  }

  private async fetchAll(): Promise<Map<string, CardState>> {
    const states = await this.localDb.cardStates.toArray();
    return new Map(states.map((state) => [state.cardId, state]));
  }
}
