import { expect, it } from 'vitest';
import type { ReviewOutboxItem } from '../db/account-db.model';
import { buildReviewPushRequest } from './review-push-mapper';

const STATE = {
  cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1,
  lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null,
  contentUpdatedAt: null, changeSeq: 0,
};

it('TU — usa o clock e o observedServerTime persistidos com cada review', () => {
  const items: ReviewOutboxItem[] = [
    {
      kind: 'review',
      log: {
        id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
        stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
        voided: false, eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
      },
      state: STATE, observedServerTime: '2026-09-22T00:00:00Z', status: 'pending', retryAt: null,
    },
    {
      kind: 'review',
      log: {
        id: 'r2', cardId: 'c1', kind: 'review', rating: 4, reviewedAt: '2026-09-23T00:01:00Z', durationMs: 1,
        stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
        voided: false, eventAt: '2026-09-23T00:01:00Z', eventCounter: 1, eventDeviceId: 'device-1', operationId: 'r2',
      },
      state: STATE, observedServerTime: '2026-09-22T00:00:30Z', status: 'pending', retryAt: null,
    },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.reviews).toHaveLength(2);
  expect(request.reviews[0]?.observedServerTime).toBe('2026-09-22T00:00:00Z');
  expect(request.reviews[0]?.clock).toEqual({ wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 });
  expect(request.reviews[1]?.clock).toEqual({ wallTime: '2026-09-23T00:01:00Z', logicalCounter: 1 });
});

it('TU — mapeia voids e usa o state mais recente por cartão', () => {
  const items: ReviewOutboxItem[] = [
    { kind: 'void', reviewId: 'r1', voidedAt: '2026-09-23T00:00:00Z', cardId: 'c1', state: { ...STATE, reviewCount: 1 }, status: 'pending', retryAt: null },
    { kind: 'state', cardId: 'c1', state: { ...STATE, reviewCount: 2 }, status: 'pending', retryAt: null },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.voids).toEqual([{ reviewId: 'r1', voidedAt: '2026-09-23T00:00:00Z' }]);
  expect(request.states).toHaveLength(1);
  expect(request.states[0]?.reviewCount).toBe(2);
});

it('TU — void sem state associado não contribui para os states enviados', () => {
  const items: ReviewOutboxItem[] = [
    { kind: 'void', reviewId: 'r1', voidedAt: '2026-09-23T00:00:00Z', cardId: 'c1', state: null, status: 'pending', retryAt: null },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.states).toEqual([]);
});
