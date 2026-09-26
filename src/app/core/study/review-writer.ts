import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { AccountDb } from '../db/account-db';
import type { ReviewLogRow, ReviewOutboxReviewItem } from '../db/account-db.model';
import { HybridLogicalClock } from '../sync/hybrid-logical-clock';

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
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async record(entry: ReviewWriteEntry): Promise<void> {
    const { db } = this.currentAccountDb.require();
    const tables = [db.reviewLogs, db.cardStates, db.reviewOutbox, db.meta];
    await db.transaction('rw', tables, async () => {
      const observedServerTime = await db.getServerTime();
      const log = await this.stampCanonicalLog(db, entry.log, observedServerTime);
      await db.reviewLogs.put(log);
      await db.cardStates.put({ ...entry.state, contentUpdateNote: null, contentUpdatedAt: null });
      await db.reviewOutbox.add({ kind: 'review', log, state: entry.state, observedServerTime, status: 'pending', retryAt: null });
    });
  }

  async undoLastUnsynced(logId: string, cardId: string, previousState: CardState | null): Promise<void> {
    const { db } = this.currentAccountDb.require();
    const tables = [db.reviewLogs, db.cardStates, db.reviewOutbox];
    await db.transaction('rw', tables, async () => {
      const log = await db.reviewLogs.get(logId);
      if (log === undefined) {
        return;
      }
      const context: UndoContext = { logId, cardId, previousState };
      const outboxItem = await this.findReviewOutboxItem(db, logId);
      if (outboxItem !== undefined && outboxItem.status !== 'sending') {
        await this.undoBeforeSend(db, context, outboxItem.seq);
        return;
      }
      await this.undoAfterSend(db, context);
    });
  }

  private async stampCanonicalLog(db: AccountDb, log: ReviewLog, observedServerTime: string): Promise<ReviewLogRow> {
    const clock = new HybridLogicalClock(db);
    const clockState = await clock.advance(Date.now(), observedServerTime);
    return {
      ...log,
      voided: false,
      eventAt: clockState.wallTime,
      eventCounter: clockState.logicalCounter,
      eventDeviceId: log.deviceId,
      operationId: log.id,
    };
  }

  private async findReviewOutboxItem(db: AccountDb, logId: string): Promise<ReviewOutboxReviewItem | undefined> {
    const match = await db.reviewOutbox
      .where('kind')
      .equals('review')
      .filter((item) => item.kind === 'review' && item.log.id === logId)
      .first();
    return match?.kind === 'review' ? match : undefined;
  }

  private async undoBeforeSend(db: AccountDb, context: UndoContext, outboxSeq: number | undefined): Promise<void> {
    await db.reviewLogs.delete(context.logId);
    await this.restoreCardState(db, context.cardId, context.previousState);
    if (outboxSeq !== undefined) {
      await db.reviewOutbox.delete(outboxSeq);
    }
  }

  private async undoAfterSend(db: AccountDb, context: UndoContext): Promise<void> {
    await db.reviewLogs.update(context.logId, { voided: true });
    await this.restoreCardState(db, context.cardId, context.previousState);
    await db.reviewOutbox.add({
      kind: 'void',
      reviewId: context.logId,
      voidedAt: new Date().toISOString(),
      cardId: context.cardId,
      state: context.previousState,
      status: 'pending',
      retryAt: null,
    });
  }

  private async restoreCardState(db: AccountDb, cardId: string, previousState: CardState | null): Promise<void> {
    if (previousState === null) {
      await db.cardStates.delete(cardId);
      return;
    }
    await db.cardStates.put(previousState);
  }
}
