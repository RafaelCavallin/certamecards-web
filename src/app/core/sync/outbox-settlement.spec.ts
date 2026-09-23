import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import type { ReviewPushResult } from '../api/sync.model';
import type { OutboxItem } from '../db/local-db.model';
import { seqsToRemove } from './outbox-settlement';

const STATE: CardState = {
  cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
  lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
  reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
};
function aLog(id: string, cardId: string): ReviewLog {
  return {
    id, cardId, kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z', durationMs: 1000,
    stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
  };
}
function emptyResult(overrides: Partial<ReviewPushResult> = {}): ReviewPushResult {
  return {
    acceptedReviewIds: [], rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [],
    ignoredStates: [], ...overrides,
  };
}

it('TU — remove itens de review aceitos e rejeitados', () => {
  const items: OutboxItem[] = [
    { seq: 1, kind: 'review', log: aLog('log-1', 'c1'), state: STATE },
    { seq: 2, kind: 'review', log: aLog('log-2', 'c2'), state: STATE },
  ];
  const result = emptyResult({
    acceptedReviewIds: ['log-1'],
    rejectedReviews: [{ id: 'log-2', code: 'invalid_review' }],
    appliedStates: [{ cardId: 'c1', changeSeq: 10 }, { cardId: 'c2', changeSeq: 11 }],
  });
  expect(seqsToRemove(items, result)).toEqual([1, 2]);
});

it('TU — mantém itens de um cartão stale mesmo com a revisão aceita', () => {
  const items: OutboxItem[] = [{ seq: 1, kind: 'review', log: aLog('log-1', 'c1'), state: STATE }];
  const result = emptyResult({
    acceptedReviewIds: ['log-1'],
    staleStates: [{ cardId: 'c1', serverReviewCount: 5 }],
  });
  expect(seqsToRemove(items, result)).toEqual([]);
});

it('TU — remove voids aceitos e itens de estado resolvidos', () => {
  const items: OutboxItem[] = [
    { seq: 1, kind: 'void', reviewId: 'v1', voidedAt: '2026-09-18T10:00:00Z', cardId: 'c1', state: null },
    { seq: 2, kind: 'state', cardId: 'c2', state: STATE },
  ];
  const result = emptyResult({
    acceptedVoids: ['v1'],
    ignoredStates: [{ cardId: 'c2', reason: 'card_deleted' }],
  });
  expect(seqsToRemove(items, result)).toEqual([1, 2]);
});
