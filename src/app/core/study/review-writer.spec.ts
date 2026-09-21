import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { LocalDb } from '../db/local-db';
import { ReviewWriter } from './review-writer';

let db: LocalDb;

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, changeSeq: 1, ...overrides,
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

it('TI-22 — record grava log, estado e item na outbox em uma transação', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState() });
  expect(await db.reviewLogs.count()).toBe(1);
  expect(await db.cardStates.get('c1')).toMatchObject({ cardId: 'c1' });
  expect(await db.outbox.count()).toBe(1);
});

it('TI-22 — falha simulada no meio da transação não altera nenhuma das 3 tabelas', async () => {
  const writer = setup();
  const outboxAddSpy = vi.spyOn(db.outbox, 'add').mockRejectedValueOnce(new Error('falha simulada'));

  await expect(writer.record({ log: aLog(), state: aState() })).rejects.toThrow('falha simulada');

  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.cardStates.get('c1')).toBeUndefined();
  expect(await db.outbox.count()).toBe(0);
  outboxAddSpy.mockRestore();
});

it('TU — undoLastUnsynced remove o log, a outbox e apaga o estado quando não havia anterior', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState() });
  await writer.undoLastUnsynced('log-1', 'c1', null);
  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.cardStates.get('c1')).toBeUndefined();
  expect(await db.outbox.count()).toBe(0);
});

it('TU — undoLastUnsynced restaura o estado anterior quando existia', async () => {
  const writer = setup();
  const previousState = aState({ reviewCount: 2 });
  await writer.record({ log: aLog(), state: aState({ reviewCount: 3 }) });
  await writer.undoLastUnsynced('log-1', 'c1', previousState);
  expect(await db.cardStates.get('c1')).toMatchObject({ reviewCount: 2 });
});

it('TU — undoLastUnsynced não falha quando não há item correspondente na outbox', async () => {
  const writer = setup();
  await writer.undoLastUnsynced('log-inexistente', 'c1', null);
  expect(await db.outbox.count()).toBe(0);
});

