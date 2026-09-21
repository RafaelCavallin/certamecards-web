import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { ReviewLogRow } from '../db/local-db.model';
import { SchedulerService } from './scheduler-service';
import type { Rating } from './scheduler.model';

function setup(): SchedulerService {
  TestBed.configureTestingModule({});
  return TestBed.inject(SchedulerService);
}

interface LogForInput {
  readonly cardId: string;
  readonly step: { rating: Rating; reviewedAt: string };
  readonly before: CardState | null;
  readonly after: CardState;
}

function logFor(input: LogForInput): ReviewLogRow {
  const { cardId, step, before, after } = input;
  return {
    id: `${cardId}-${step.reviewedAt}`,
    cardId,
    kind: 'review',
    rating: step.rating,
    reviewedAt: step.reviewedAt,
    durationMs: 1000,
    stateBefore: before,
    stateAfter: after,
    offline: false,
    deviceId: 'device-1',
    sessionId: null,
    changeSeq: 1,
    voided: false,
  };
}

it('TU-02 — scheduler.preview de cartão novo tem os 4 rótulos esperados', () => {
  const scheduler = setup();
  const now = new Date('2026-09-17T12:00:00Z');
  const previews = scheduler.preview(null, now);
  expect(previews[1].intervalLabel).toMatch(/min$/);
  expect(previews[2].intervalLabel).toMatch(/min$/);
  expect(previews[3].intervalLabel).toMatch(/min$/);
  expect(previews[4].intervalLabel).toMatch(/d$/);
});

it('TU-03 — replay é determinístico com fuzz ligado', () => {
  const scheduler = setup();
  const now = new Date('2026-09-17T12:00:00Z');
  let sequential: CardState | null = null;
  const logs: ReviewLogRow[] = [];
  const ratings: Rating[] = [3, 3, 3, 1];
  let reviewedAt = now;
  for (const rating of ratings) {
    const applied = scheduler.apply(sequential, rating, reviewedAt);
    logs.push(logFor({ cardId: 'card-1', step: { rating, reviewedAt: reviewedAt.toISOString() }, before: sequential, after: applied.state }));
    sequential = applied.state;
    reviewedAt = new Date(applied.state.due);
  }
  const replayed = scheduler.replay(logs);
  expect(replayed).toEqual(sequential);
});

it('TU-04 — replay ignora anuladas e trata reset', () => {
  const scheduler = setup();
  const now = new Date('2026-09-17T12:00:00Z');
  const firstApplied = scheduler.apply(null, 3, now);
  const baseLog = logFor({ cardId: 'card-1', step: { rating: 3, reviewedAt: now.toISOString() }, before: null, after: firstApplied.state });
  const voidedLog = { ...baseLog, voided: true };
  const resetLog: ReviewLogRow = { ...baseLog, id: 'reset-1', kind: 'reset', rating: null };
  const laterNow = new Date('2026-09-18T12:00:00Z');
  const secondApplied = scheduler.apply(null, 4, laterNow);
  const secondLog = logFor({ cardId: 'card-1', step: { rating: 4, reviewedAt: laterNow.toISOString() }, before: null, after: secondApplied.state });
  const replayed = scheduler.replay([voidedLog, resetLog, secondLog]);
  expect(replayed).toEqual({ ...secondApplied.state, reviewCount: 2 });
});

it('TU-05 — replay ordena por (reviewedAt, id)', () => {
  const scheduler = setup();
  const firstNow = new Date('2026-09-17T12:00:00Z');
  const secondNow = new Date('2026-09-18T12:00:00Z');
  const firstApplied = scheduler.apply(null, 3, firstNow);
  const secondApplied = scheduler.apply(firstApplied.state, 4, secondNow);
  const firstLog = logFor({ cardId: 'card-1', step: { rating: 3, reviewedAt: firstNow.toISOString() }, before: null, after: firstApplied.state });
  const secondLog = logFor({ cardId: 'card-1', step: { rating: 4, reviewedAt: secondNow.toISOString() }, before: firstApplied.state, after: secondApplied.state });
  const replayedInOrder = scheduler.replay([secondLog, firstLog]);
  expect(replayedInOrder).toEqual(secondApplied.state);
});
