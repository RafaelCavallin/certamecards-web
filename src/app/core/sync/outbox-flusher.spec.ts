import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import type { ReviewPushResult } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import { LocalDb } from '../db/local-db';
import { OutboxFlusher } from './outbox-flusher';

let db: LocalDb;

function aState(cardId: string): CardState {
  return {
    cardId, state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 1, suspended: false, changeSeq: 0,
  };
}
function aLog(id: string, cardId: string): ReviewLog {
  return {
    id, cardId, kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z', durationMs: 1000,
    stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
  };
}
function okResult(acceptedReviewIds: readonly string[], cardIds: readonly string[]): ReviewPushResult {
  return {
    acceptedReviewIds, rejectedReviews: [], acceptedVoids: [],
    appliedStates: cardIds.map((cardId) => ({ cardId, changeSeq: 1 })), staleStates: [], ignoredStates: [],
  };
}
function setup(pushReviews: ReturnType<typeof vi.fn>): OutboxFlusher {
  TestBed.configureTestingModule({ providers: [{ provide: SyncApi, useValue: { pushReviews } }] });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(OutboxFlusher);
}

afterEach(async () => {
  await db.delete();
});

it('TI-23 — 50 itens pendentes são enviados em um único lote e removidos da fila', async () => {
  const pushReviews = vi.fn();
  const flusher = setup(pushReviews);
  const cardIds = Array.from({ length: 50 }, (_unused, index) => `c${index}`);
  for (const cardId of cardIds) {
    await db.outbox.add({ kind: 'review', log: aLog(`log-${cardId}`, cardId), state: aState(cardId) });
  }
  pushReviews.mockResolvedValue(okResult(cardIds.map((cardId) => `log-${cardId}`), cardIds));
  const staleCardIds = await flusher.flushAll();
  expect(pushReviews).toHaveBeenCalledOnce();
  expect(staleCardIds).toEqual([]);
  expect(await db.outbox.count()).toBe(0);
});

it('TU — não chama a API quando a fila está vazia', async () => {
  const pushReviews = vi.fn();
  const flusher = setup(pushReviews);
  const staleCardIds = await flusher.flushAll();
  expect(pushReviews).not.toHaveBeenCalled();
  expect(staleCardIds).toEqual([]);
});

it('TU — devolve os cardIds stale e mantém os itens na fila', async () => {
  const pushReviews = vi.fn();
  const flusher = setup(pushReviews);
  await db.outbox.add({ kind: 'review', log: aLog('log-1', 'c1'), state: aState('c1') });
  pushReviews.mockResolvedValue({
    acceptedReviewIds: ['log-1'], rejectedReviews: [], acceptedVoids: [], appliedStates: [],
    staleStates: [{ cardId: 'c1', serverReviewCount: 5 }], ignoredStates: [],
  });
  const staleCardIds = await flusher.flushAll();
  expect(staleCardIds).toEqual(['c1']);
  expect(await db.outbox.count()).toBe(1);
});
