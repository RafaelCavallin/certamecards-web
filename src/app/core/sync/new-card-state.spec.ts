import { expect, it } from 'vitest';
import { CARD_STATE_NEW } from '../api/card-state.model';
import { newCardState } from './new-card-state';

it('TU-77 — sem estado anterior, cria um estado novo não suspenso', () => {
  const state = newCardState('c1', undefined);
  expect(state).toMatchObject({ cardId: 'c1', state: CARD_STATE_NEW, reps: 0, reviewCount: 0, suspended: false });
});

it('TU-77 — preserva a suspensão do estado anterior', () => {
  const previous = { cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: 'x', lastReview: 'x', reps: 5, lapses: 1, learningSteps: 0, scheduledDays: 1, reviewCount: 5, suspended: true, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 3 };
  const state = newCardState('c1', previous);
  expect(state.suspended).toBe(true);
  expect(state.state).toBe(CARD_STATE_NEW);
  expect(state.reps).toBe(0);
});
