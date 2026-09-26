import { Injectable, Injector, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import { CardSuspensionWriter } from '../sync/card-suspension-writer';
import { accountLiveSignal } from './account-live-query';

@Injectable({ providedIn: 'root' })
export class CardStatesData {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly suspensionWriter = inject(CardSuspensionWriter);
  private readonly injector = inject(Injector);

  readonly byCardId = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchAll(account), initialValue: new Map<string, CardState>(),
  });

  setSuspension(cardId: string, suspended: boolean): Promise<CardState> {
    return this.suspensionWriter.execute({ kind: 'card_suspension', cardId, suspended });
  }

  private async fetchAll(account: CurrentAccount): Promise<Map<string, CardState>> {
    const states = await account.db.cardStates.toArray();
    return new Map(states.map((state) => [state.cardId, state]));
  }
}
