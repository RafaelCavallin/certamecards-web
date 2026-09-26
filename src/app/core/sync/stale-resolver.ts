import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { CardReviewHistory } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import type { AccountDb } from '../db/account-db';
import { SchedulerService } from '../scheduler/scheduler-service';

@Injectable({ providedIn: 'root' })
export class StaleResolver {
  private readonly syncApi = inject(SyncApi);
  private readonly scheduler = inject(SchedulerService);

  async resolve(db: AccountDb, cardIds: readonly string[]): Promise<void> {
    for (const cardId of cardIds) {
      await this.resolveCard(db, cardId);
    }
  }

  private async resolveCard(db: AccountDb, cardId: string): Promise<void> {
    const history = await this.fetchFullHistory(cardId);
    await this.mergeHistory(db, cardId, history);
    const logs = await db.reviewLogs.where('cardId').equals(cardId).toArray();
    const state = this.scheduler.replay(logs);
    if (state === null) {
      return;
    }
    await this.applyResolvedState(db, cardId, state);
  }

  private async fetchFullHistory(cardId: string): Promise<CardReviewHistory> {
    const reviewLogs: CardReviewHistory['reviewLogs'][number][] = [];
    const reviewVoids: CardReviewHistory['reviewVoids'][number][] = [];
    let cursor: string | null = null;
    let hasMore = true;
    while (hasMore) {
      const page = await this.syncApi.cardReviews(cardId, cursor);
      reviewLogs.push(...page.reviewLogs);
      reviewVoids.push(...page.reviewVoids);
      ({ nextCursor: cursor, hasMore } = page);
    }
    return { reviewLogs, reviewVoids, nextCursor: null, hasMore: false };
  }

  private async mergeHistory(db: AccountDb, cardId: string, history: CardReviewHistory): Promise<void> {
    const tables = [db.reviewLogs, db.reviewVoids];
    await db.transaction('rw', tables, async () => {
      await db.reviewLogs.bulkPut(history.reviewLogs.map((log) => ({ ...log, voided: false })));
      for (const voidItem of history.reviewVoids) {
        await db.reviewLogs.update(voidItem.reviewId, { voided: true });
        await db.reviewVoids.put({ reviewId: voidItem.reviewId, voidedAt: voidItem.voidedAt, cardId });
      }
    });
  }

  private async applyResolvedState(db: AccountDb, cardId: string, replayed: CardState): Promise<void> {
    const tables = [db.cardStates, db.reviewOutbox];
    await db.transaction('rw', tables, async () => {
      const existing = await db.cardStates.get(cardId);
      const state: CardState = { ...replayed, cardId, suspended: existing?.suspended ?? false };
      await db.cardStates.put(state);
      await db.reviewOutbox.add({ kind: 'state', cardId, state, status: 'pending', retryAt: null });
    });
  }
}
