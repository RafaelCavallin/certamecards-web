import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { LocalDb } from '../db/local-db';
import { dailyCounts } from './daily-counts';
import { ReviewWriter } from './review-writer';

let db: LocalDb;

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}

function aLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: 'log-1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1',
    sessionId: null, changeSeq: 0, ...overrides,
  };
}

function setup(): ReviewWriter {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  return TestBed.inject(ReviewWriter);
}

afterEach(async () => {
  await db.delete();
});

it('TI-25 — desfazer depois do envio marca o log como anulado e enfileira a anulação', async () => {
  const writer = setup();
  const previousState = aState({ reviewCount: 2 });
  await writer.record({ log: aLog(), state: aState({ reviewCount: 3 }) });
  await db.outbox.clear();
  await writer.undoLastUnsynced('log-1', 'c1', previousState);
  expect(await db.reviewLogs.get('log-1')).toMatchObject({ id: 'log-1', voided: true });
  expect(await db.cardStates.get('c1')).toMatchObject({ reviewCount: 2 });
  const outboxItems = await db.outbox.toArray();
  expect(outboxItems).toMatchObject([{ kind: 'void', reviewId: 'log-1', cardId: 'c1' }]);
});

it('TI-25 — desfazer depois do envio de um cartão sem estado anterior mantém o void sem estado', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState({ reviewCount: 1 }) });
  await db.outbox.clear();
  await writer.undoLastUnsynced('log-1', 'c1', null);
  expect(await db.cardStates.get('c1')).toBeUndefined();
  const outboxItems = await db.outbox.toArray();
  expect(outboxItems[0]).toMatchObject({ kind: 'void', state: null });
});

it('TI-25 — a estatística diária exclui a avaliação anulada depois do envio', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState({ reviewCount: 3 }) });
  await db.outbox.clear();
  await writer.undoLastUnsynced('log-1', 'c1', aState({ reviewCount: 2 }));
  const day = { start: new Date('2026-09-18T00:00:00Z'), end: new Date('2026-09-19T00:00:00Z') };
  expect(dailyCounts(await db.reviewLogs.toArray(), day).reviews).toBe(0);
});
