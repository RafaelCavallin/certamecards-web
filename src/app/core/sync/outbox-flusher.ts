import { Injectable, inject } from '@angular/core';
import type { ReviewPushResult } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import { LocalDb } from '../db/local-db';
import type { OutboxItem } from '../db/local-db.model';
import { buildReviewPushRequest } from './build-review-push-request';
import { seqsToRemove } from './outbox-settlement';
import { OUTBOX_BATCH_SIZE } from './sync-constants';

interface FlushOutcome {
  readonly staleCardIds: readonly string[];
  readonly itemCount: number;
}
@Injectable({ providedIn: 'root' })
export class OutboxFlusher {
  private readonly localDb = inject(LocalDb);
  private readonly syncApi = inject(SyncApi);

  async flushAll(): Promise<readonly string[]> {
    const staleCardIds = new Set<string>();
    let hasMore = true;
    while (hasMore) {
      const outcome = await this.flushBatch();
      if (outcome === null) {
        break;
      }
      outcome.staleCardIds.forEach((cardId) => staleCardIds.add(cardId));
      hasMore = outcome.itemCount >= OUTBOX_BATCH_SIZE;
    }
    return Array.from(staleCardIds);
  }

  private async flushBatch(): Promise<FlushOutcome | null> {
    const items = await this.localDb.outbox.orderBy('seq').limit(OUTBOX_BATCH_SIZE).toArray();
    if (items.length === 0) {
      return null;
    }
    const deviceId = await this.localDb.getOrCreateDeviceId();
    const request = buildReviewPushRequest(deviceId, items);
    const result = await this.syncApi.pushReviews(request);
    await this.settle(items, result);
    return { staleCardIds: result.staleStates.map((state) => state.cardId), itemCount: items.length };
  }

  private async settle(items: readonly OutboxItem[], result: ReviewPushResult): Promise<void> {
    await this.localDb.outbox.bulkDelete([...seqsToRemove(items, result)]);
  }
}
