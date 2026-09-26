import { expect, it } from 'vitest';
import { reviewOutboxItemCardId } from './review-outbox-item';

it('TU — devolve o cardId do log para itens de review', () => {
  const item = {
    kind: 'review' as const,
    log: {
      id: 'r1', cardId: 'c1', kind: 'review' as const, rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
      voided: false, eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
    },
    state: { cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 0 },
    observedServerTime: '2026-09-22T00:00:00Z',
    status: 'pending' as const,
    retryAt: null,
  };
  expect(reviewOutboxItemCardId(item)).toBe('c1');
});

it('TU — devolve o cardId direto para itens de void e de state', () => {
  const voidItem = { kind: 'void' as const, reviewId: 'r1', voidedAt: '2026-09-23T00:00:00Z', cardId: 'c2', state: null, status: 'pending' as const, retryAt: null };
  const stateItem = {
    kind: 'state' as const, cardId: 'c3',
    state: { cardId: 'c3', state: 0, stability: 0, difficulty: 0, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 0, lapses: 0, learningSteps: 0, scheduledDays: 0, reviewCount: 0, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 0 },
    status: 'pending' as const, retryAt: null,
  };
  expect(reviewOutboxItemCardId(voidItem)).toBe('c2');
  expect(reviewOutboxItemCardId(stateItem)).toBe('c3');
});
