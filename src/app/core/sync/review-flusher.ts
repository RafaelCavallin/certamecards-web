import { Injectable, inject } from '@angular/core';
import type { ReviewPushResult } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import type { AccountDb } from '../db/account-db';
import type { ReviewOutboxItem, ReviewOutboxStatus } from '../db/account-db.model';
import { planSettlement } from './review-outbox-settlement';
import { buildReviewPushRequest } from './review-push-mapper';
import { REVIEW_OUTBOX_BATCH_SIZE } from './sync-constants';

export interface ReviewFlushOutcome {
  readonly staleCardIds: readonly string[];
}
interface BatchOutcome {
  readonly staleCardIds: readonly string[];
  readonly itemCount: number;
}
async function setStatus(db: AccountDb, items: readonly ReviewOutboxItem[], status: ReviewOutboxStatus): Promise<void> {
  const seqs = items.flatMap((item) => (item.seq === undefined ? [] : [item.seq]));
  await db.reviewOutbox.where('seq').anyOf(seqs).modify({ status });
}
@Injectable({ providedIn: 'root' })
export class ReviewFlusher {
  private readonly syncApi = inject(SyncApi);

  async flush(db: AccountDb, deviceId: string): Promise<ReviewFlushOutcome> {
    const staleCardIds = new Set<string>();
    let hasMore = true;
    while (hasMore) {
      const outcome = await this.flushBatch(db, deviceId);
      if (outcome === null) {
        break;
      }
      outcome.staleCardIds.forEach((cardId) => staleCardIds.add(cardId));
      hasMore = outcome.itemCount >= REVIEW_OUTBOX_BATCH_SIZE;
    }
    return { staleCardIds: Array.from(staleCardIds) };
  }

  private async flushBatch(db: AccountDb, deviceId: string): Promise<BatchOutcome | null> {
    const items = await this.claimBatch(db);
    if (items.length === 0) {
      return null;
    }
    const request = buildReviewPushRequest(deviceId, items);
    const result = await this.syncApi.pushReviews(request).catch(async (error: unknown) => {
      await this.release(db, items);
      throw error;
    });
    await this.settle(db, items, result);
    return { staleCardIds: result.staleStates.map((state) => state.cardId), itemCount: items.length };
  }

  private async claimBatch(db: AccountDb): Promise<ReviewOutboxItem[]> {
    return db.transaction('rw', db.reviewOutbox, async () => {
      const unsent = await db.reviewOutbox.where('status').anyOf(['pending', 'sending']).sortBy('seq');
      const items = unsent.slice(0, REVIEW_OUTBOX_BATCH_SIZE);
      await setStatus(db, items, 'sending');
      return items;
    });
  }

  private async release(db: AccountDb, items: readonly ReviewOutboxItem[]): Promise<void> {
    await setStatus(db, items, 'pending');
  }

  private async settle(db: AccountDb, items: readonly ReviewOutboxItem[], result: ReviewPushResult): Promise<void> {
    const plan = planSettlement(items, result);
    await db.reviewOutbox.bulkDelete([...plan.removeSeqs]);
    for (const seq of plan.rejectSeqs) {
      await db.reviewOutbox.update(seq, { status: 'rejected' });
    }
  }
}
