import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { ReviewWriter } from './review-writer';

let db: AccountDb;

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
  db = new AccountDb('review-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'review-writer-test' });
  return TestBed.inject(ReviewWriter);
}

afterEach(async () => {
  await db.delete();
});

it('TI-22 — record grava log com ordem canônica, estado e item na outbox em uma transação', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState() });
  expect(await db.reviewLogs.count()).toBe(1);
  expect(await db.reviewLogs.get('log-1')).toMatchObject({ cardId: 'c1', voided: false, eventDeviceId: 'device-1', operationId: 'log-1' });
  expect(await db.cardStates.get('c1')).toMatchObject({ cardId: 'c1' });
  const outbox = await db.reviewOutbox.toArray();
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({ kind: 'review', status: 'pending' });
});

it('TI-22 — falha simulada no meio da transação não altera nenhuma das 3 tabelas', async () => {
  const writer = setup();
  const outboxAddSpy = vi.spyOn(db.reviewOutbox, 'add').mockRejectedValueOnce(new Error('falha simulada'));

  await expect(writer.record({ log: aLog(), state: aState() })).rejects.toThrow('falha simulada');

  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.cardStates.get('c1')).toBeUndefined();
  expect(await db.reviewOutbox.count()).toBe(0);
  outboxAddSpy.mockRestore();
});

it('QA-BUG — record lê o relógio do servidor uma única vez por avaliação', async () => {
  const writer = setup();
  const getServerTimeSpy = vi.spyOn(db, 'getServerTime');
  await writer.record({ log: aLog(), state: aState() });
  expect(getServerTimeSpy).toHaveBeenCalledTimes(1);
});

it('TU-55 — record avança o relógio híbrido a cada avaliação, incrementando o contador quando o tempo não avança', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-18T09:00:00Z'));
  const writer = setup();
  await writer.record({ log: aLog({ id: 'log-1' }), state: aState() });
  await writer.record({ log: aLog({ id: 'log-2' }), state: aState() });
  const first = await db.reviewLogs.get('log-1');
  const second = await db.reviewLogs.get('log-2');
  expect(first?.eventCounter).toBe(0);
  expect(second?.eventCounter).toBe(1);
  vi.useRealTimers();
});

it('TU — undoLastUnsynced remove o log, a outbox e apaga o estado quando não havia anterior', async () => {
  const writer = setup();
  await writer.record({ log: aLog(), state: aState() });
  await writer.undoLastUnsynced('log-1', 'c1', null);
  expect(await db.reviewLogs.count()).toBe(0);
  expect(await db.cardStates.get('c1')).toBeUndefined();
  expect(await db.reviewOutbox.count()).toBe(0);
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
  expect(await db.reviewOutbox.count()).toBe(0);
});
