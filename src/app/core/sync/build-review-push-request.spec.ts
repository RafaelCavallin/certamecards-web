import { expect, it } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import type { OutboxItem } from '../db/local-db.model';
import { buildReviewPushRequest } from './build-review-push-request';

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}
function aLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: 'log-1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1',
    sessionId: null, changeSeq: 0, ...overrides,
  };
}

it('TU — monta reviews, voids e states sem os campos do servidor', () => {
  const items: OutboxItem[] = [
    { kind: 'review', log: aLog(), state: aState({ reviewCount: 1 }) },
    { kind: 'void', reviewId: 'log-0', voidedAt: '2026-09-18T10:00:00Z', cardId: 'c1', state: aState({ reviewCount: 0 }) },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.deviceId).toBe('device-1');
  expect(request.reviews).toEqual([
    {
      id: 'log-1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z',
      durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null,
    },
  ]);
  expect(request.voids).toEqual([{ reviewId: 'log-0', voidedAt: '2026-09-18T10:00:00Z' }]);
});

it('TU — mantém só o estado mais recente por cartão', () => {
  const items: OutboxItem[] = [
    { kind: 'review', log: aLog({ id: 'log-1' }), state: aState({ reviewCount: 1 }) },
    { kind: 'review', log: aLog({ id: 'log-2' }), state: aState({ reviewCount: 2 }) },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.states).toHaveLength(1);
  expect(request.states[0]).toMatchObject({ cardId: 'c1', reviewCount: 2 });
});

it('TU — void sem estado não gera entrada em states', () => {
  const items: OutboxItem[] = [
    { kind: 'void', reviewId: 'log-1', voidedAt: '2026-09-18T10:00:00Z', cardId: 'c1', state: null },
  ];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.states).toHaveLength(0);
});

it('TU — item do tipo state entra em states', () => {
  const items: OutboxItem[] = [{ kind: 'state', cardId: 'c1', state: aState({ reviewCount: 5 }) }];
  const request = buildReviewPushRequest('device-1', items);
  expect(request.states).toEqual([
    {
      cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
      lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7, reviewCount: 5,
    },
  ]);
});
