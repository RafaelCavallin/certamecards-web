import { Injectable } from '@angular/core';
import { createEmptyCard, fsrs, generatorParameters, Grades } from 'ts-fsrs';
import type { CardState } from '../api/card-state.model';
import type { ReviewLogRow } from '../db/local-db.model';
import { fromFsrsCard, toFsrsCard, withoutTransientFields } from './card-state-conversion';
import { formatInterval } from './format-interval';
import { seedStateFrom } from './seed-state';
import { compareReviewLogs } from './review-log-order';
import {
  FSRS_ENABLE_FUZZ,
  FSRS_ENABLE_SHORT_TERM,
  FSRS_LEARNING_STEPS,
  FSRS_MAXIMUM_INTERVAL,
  FSRS_RELEARNING_STEPS,
  FSRS_REQUEST_RETENTION,
} from './scheduler-constants';
import type { ApplyResult, PreviewByRating, Rating } from './scheduler.model';

export const FSRS_PARAMETERS = generatorParameters({
  request_retention: FSRS_REQUEST_RETENTION,
  maximum_interval: FSRS_MAXIMUM_INTERVAL,
  enable_fuzz: FSRS_ENABLE_FUZZ,
  enable_short_term: FSRS_ENABLE_SHORT_TERM,
  learning_steps: [...FSRS_LEARNING_STEPS],
  relearning_steps: [...FSRS_RELEARNING_STEPS],
});
@Injectable({ providedIn: 'root' })
export class SchedulerService {
  private readonly engine = fsrs(FSRS_PARAMETERS);

  preview(state: CardState | null, now: Date): PreviewByRating {
    const input = state !== null ? toFsrsCard(state) : createEmptyCard(now);
    const recordLog = this.engine.repeat(input, now);
    const meta = { cardId: state?.cardId ?? '', reviewCount: (state?.reviewCount ?? 0) + 1, previous: state };
    const entries = Grades.map((grade) => [
      grade,
      {
        state: fromFsrsCard(recordLog[grade].card, meta),
        intervalLabel: formatInterval(now, recordLog[grade].card.due),
      },
    ]);
    return Object.fromEntries(entries) as PreviewByRating;
  }

  apply(state: CardState | null, rating: Rating, now: Date): ApplyResult {
    const input = state !== null ? toFsrsCard(state) : createEmptyCard(now);
    const { card } = this.engine.next(input, now, rating);
    const meta = { cardId: state?.cardId ?? '', reviewCount: (state?.reviewCount ?? 0) + 1, previous: state };
    const nextState = fromFsrsCard(card, meta);
    return {
      state: nextState,
      log: {
        kind: 'review',
        rating,
        reviewedAt: now.toISOString(),
        stateBefore: state === null ? null : withoutTransientFields(state),
        stateAfter: withoutTransientFields(nextState),
      },
    };
  }

  replay(logs: readonly ReviewLogRow[]): CardState | null {
    const sorted = logs.filter((log) => !log.voided).sort(compareReviewLogs);
    let state: CardState | null = null;
    let reviewCount = 0;
    for (const log of sorted) {
      reviewCount += 1;
      if (log.kind === 'reset') {
        state = null;
        continue;
      }
      if (log.kind === 'content_update' || log.kind === 'duplicate') {
        state = seedStateFrom(log, state, reviewCount);
        continue;
      }
      const rating = log.rating as Rating;
      const { state: nextState } = this.apply(state, rating, new Date(log.reviewedAt));
      state = { ...nextState, reviewCount };
    }
    return state;
  }

  formatInterval(from: Date, due: Date): string {
    return formatInterval(from, due);
  }
}
