import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { generateUuidV7 } from '../db/uuid7';
import { SchedulerService } from '../scheduler/scheduler-service';
import type { PreviewByRating, Rating } from '../scheduler/scheduler.model';
import { ReviewWriter, type ReviewWriteEntry } from './review-writer';

export interface RecordReviewInput {
  readonly previousState: CardState | null;
  readonly rating: Rating;
  readonly now: Date;
  readonly cardId: string;
  readonly durationMs: number;
  readonly deviceId: string;
  readonly sessionId: string;
}
@Injectable({ providedIn: 'root' })
export class ReviewRecorder {
  private readonly scheduler = inject(SchedulerService);
  private readonly reviewWriter = inject(ReviewWriter);
  private readonly connectivity = inject(ConnectivityStore);

  preview(state: CardState | null, now: Date): PreviewByRating {
    return this.scheduler.preview(state, now);
  }

  compute(input: RecordReviewInput): ReviewWriteEntry {
    const applied = this.scheduler.apply(input.previousState, input.rating, input.now);
    const state: CardState = { ...applied.state, cardId: input.cardId };
    const log: ReviewLog = {
      id: generateUuidV7(),
      cardId: input.cardId,
      kind: applied.log.kind,
      rating: applied.log.rating,
      reviewedAt: applied.log.reviewedAt,
      durationMs: input.durationMs,
      stateBefore: applied.log.stateBefore,
      stateAfter: applied.log.stateAfter,
      offline: !this.connectivity.online(),
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      changeSeq: 0,
    };
    return { log, state };
  }

  async persist(computed: ReviewWriteEntry): Promise<void> {
    await this.reviewWriter.record(computed);
  }

  async undo(logId: string, cardId: string, previousState: CardState | null): Promise<void> {
    await this.reviewWriter.undoLastUnsynced(logId, cardId, previousState);
  }
}
