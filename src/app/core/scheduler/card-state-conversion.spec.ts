import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import { toFsrsCard } from './card-state-conversion';

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-18T00:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, changeSeq: 1, ...overrides,
  };
}

it('TU — toFsrsCard lança para estado nulo', () => {
  expect(() => toFsrsCard(null)).toThrow();
});

it('TU — toFsrsCard mantém last_review indefinido quando lastReview é nulo', () => {
  const card = toFsrsCard(aState({ lastReview: null }));
  expect(card.last_review).toBeUndefined();
});
