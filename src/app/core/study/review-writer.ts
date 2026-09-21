import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { LocalDb } from '../db/local-db';
import type { OutboxReviewItem } from '../db/local-db.model';

export interface ReviewWriteEntry {
  readonly log: ReviewLog;
  readonly state: CardState;
}
export interface UndoContext {
  readonly logId: string;
  readonly cardId: string;
  readonly previousState: CardState | null;
}
@Injectable({ providedIn: 'root' })
export class ReviewWriter {
  private readonly localDb = inject(LocalDb);

  async record(entry: ReviewWriteEntry): Promise<void> {
    const tables = [this.localDb.reviewLogs, this.localDb.cardStates, this.localDb.outbox];
    await this.localDb.transaction('rw', tables, async () => {
      await this.localDb.reviewLogs.put({ ...entry.log, voided: false });
      await this.localDb.cardStates.put(entry.state);
      await this.localDb.outbox.add({ kind: 'review', log: entry.log, state: entry.state });
    });
  }

  async undoLastUnsynced(logId: string, cardId: string, previousState: CardState | null): Promise<void> {
    const tables = [this.localDb.reviewLogs, this.localDb.cardStates, this.localDb.outbox];
    await this.localDb.transaction('rw', tables, async () => {
      const log = await this.localDb.reviewLogs.get(logId);
      if (log === undefined) {
        return;
      }
      const context: UndoContext = { logId, cardId, previousState };
      const outboxItem = await this.findReviewOutboxItem(logId);
      if (outboxItem !== undefined) {
        await this.undoBeforeSend(context, outboxItem.seq);
        return;
      }
      await this.undoAfterSend(context);
    });
  }

  private async findReviewOutboxItem(logId: string): Promise<OutboxReviewItem | undefined> {
    const match = await this.localDb.outbox
      .where('kind')
      .equals('review')
      .filter((item) => item.kind === 'review' && item.log.id === logId)
      .first();
    return match?.kind === 'review' ? match : undefined;
  }

  private async undoBeforeSend(context: UndoContext, outboxSeq: number | undefined): Promise<void> {
    await this.localDb.reviewLogs.delete(context.logId);
    await this.restoreCardState(context.cardId, context.previousState);
    if (outboxSeq !== undefined) {
      await this.localDb.outbox.delete(outboxSeq);
    }
  }

  private async undoAfterSend(context: UndoContext): Promise<void> {
    await this.localDb.reviewLogs.update(context.logId, { voided: true });
    await this.restoreCardState(context.cardId, context.previousState);
    await this.localDb.outbox.add({
      kind: 'void',
      reviewId: context.logId,
      voidedAt: new Date().toISOString(),
      cardId: context.cardId,
      state: context.previousState,
    });
  }

  private async restoreCardState(cardId: string, previousState: CardState | null): Promise<void> {
    if (previousState === null) {
      await this.localDb.cardStates.delete(cardId);
      return;
    }
    await this.localDb.cardStates.put(previousState);
  }
}
