import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { CardReviewHistory } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import { LocalDb } from '../db/local-db';
import { SchedulerService } from '../scheduler/scheduler-service';

@Injectable({ providedIn: 'root' })
export class StaleResolver {
  private readonly localDb = inject(LocalDb);
  private readonly syncApi = inject(SyncApi);
  private readonly scheduler = inject(SchedulerService);

  async resolve(cardIds: readonly string[]): Promise<void> {
    for (const cardId of cardIds) {
      await this.resolveCard(cardId);
    }
  }

  private async resolveCard(cardId: string): Promise<void> {
    const history = await this.syncApi.cardReviews(cardId);
    await this.mergeHistory(history);
    const logs = await this.localDb.reviewLogs.where('cardId').equals(cardId).toArray();
    const state = this.scheduler.replay(logs);
    if (state === null) {
      return;
    }
    await this.applyResolvedState(cardId, state);
  }

  private async mergeHistory(history: CardReviewHistory): Promise<void> {
    const tables = [this.localDb.reviewLogs];
    await this.localDb.transaction('rw', tables, async () => {
      await this.localDb.reviewLogs.bulkPut(history.reviewLogs.map((log) => ({ ...log, voided: false })));
      for (const voidItem of history.reviewVoids) {
        await this.localDb.reviewLogs.update(voidItem.reviewId, { voided: true });
      }
    });
  }

  private async applyResolvedState(cardId: string, replayed: CardState): Promise<void> {
    const tables = [this.localDb.cardStates, this.localDb.outbox];
    await this.localDb.transaction('rw', tables, async () => {
      const existing = await this.localDb.cardStates.get(cardId);
      const state: CardState = { ...replayed, cardId, suspended: existing?.suspended ?? false };
      await this.localDb.cardStates.put(state);
      await this.localDb.outbox.add({ kind: 'state', cardId, state });
    });
  }
}
