import { expect, it } from 'vitest';
import type { ReviewPushResult } from '../api/sync.model';
import type { ReviewOutboxItem } from '../db/account-db.model';
import { planSettlement } from './review-outbox-settlement';

const STATE = {
  cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1,
  lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null,
  contentUpdatedAt: null, changeSeq: 0,
};
function reviewItem(seq: number, id: string, cardId: string): ReviewOutboxItem {
  return {
    seq, kind: 'review',
    log: {
      id, cardId, kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1, stateBefore: null,
      stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0, voided: false,
      eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: id,
    },
    state: { ...STATE, cardId }, observedServerTime: '2026-09-22T00:00:00Z', status: 'pending', retryAt: null,
  };
}
function emptyResult(overrides: Partial<ReviewPushResult>): ReviewPushResult {
  return { acceptedReviews: [], rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [], ignoredStates: [], ...overrides };
}

it('TU — remove reviews aceitos e mantém os recusados marcados para rejeição', () => {
  const items = [reviewItem(1, 'r1', 'c1'), reviewItem(2, 'r2', 'c2')];
  const result = emptyResult({
    acceptedReviews: [{ id: 'r1', canonicalOrder: { eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'r1' } }],
    rejectedReviews: [{ id: 'r2', code: 'validation_failed' }],
  });
  const plan = planSettlement(items, result);
  expect(plan.removeSeqs).toEqual([1]);
  expect(plan.rejectSeqs).toEqual([2]);
});

it('TU — remove voids aceitos e mantém os não aceitos', () => {
  const accepted = { seq: 1, kind: 'void' as const, reviewId: 'v1', voidedAt: '2026-09-23T00:00:00Z', cardId: 'c1', state: null, status: 'pending' as const, retryAt: null };
  const pending = { seq: 2, kind: 'void' as const, reviewId: 'v2', voidedAt: '2026-09-23T00:00:00Z', cardId: 'c2', state: null, status: 'pending' as const, retryAt: null };
  const result = emptyResult({ acceptedVoids: ['v1'] });
  const plan = planSettlement([accepted, pending], result);
  expect(plan.removeSeqs).toEqual([1]);
});

it('TU — remove itens de state resolvidos (aplicados ou ignorados) e mantém os demais', () => {
  const applied = { seq: 1, kind: 'state' as const, cardId: 'c1', state: STATE, status: 'pending' as const, retryAt: null };
  const ignored = { seq: 2, kind: 'state' as const, cardId: 'c2', state: STATE, status: 'pending' as const, retryAt: null };
  const untouched = { seq: 3, kind: 'state' as const, cardId: 'c3', state: STATE, status: 'pending' as const, retryAt: null };
  const result = emptyResult({
    appliedStates: [{ cardId: 'c1', changeSeq: 1 }],
    ignoredStates: [{ cardId: 'c2', reason: 'no_op' }],
  });
  const plan = planSettlement([applied, ignored, untouched], result);
  expect([...plan.removeSeqs].sort()).toEqual([1, 2]);
});

it('TU — ignora itens sem seq atribuído', () => {
  const item = reviewItem(undefined as unknown as number, 'r1', 'c1');
  const result = emptyResult({ acceptedReviews: [{ id: 'r1', canonicalOrder: { eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'r1' } }] });
  const plan = planSettlement([item], result);
  expect(plan.removeSeqs).toEqual([]);
});

it('TU — mantém todos os itens de um cartão stale, mesmo aceitos', () => {
  const items = [reviewItem(1, 'r1', 'c1')];
  const result = emptyResult({
    acceptedReviews: [{ id: 'r1', canonicalOrder: { eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'r1' } }],
    staleStates: [{ cardId: 'c1', serverReviewCount: 5 }],
  });
  const plan = planSettlement(items, result);
  expect(plan.removeSeqs).toEqual([]);
  expect(plan.rejectSeqs).toEqual([]);
});
