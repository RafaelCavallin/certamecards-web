import { expect, it } from 'vitest';
import type { CardState } from '../../../core/api/card-state.model';
import type { CardRow } from '../../../core/db/local-db.model';
import { computeDeckCardCounters } from './deck-card-counters';

const NOW = new Date('2026-09-17T12:00:00Z');
function aCardRow(id: string): CardRow {
  return {
    id,
    deckId: 'd1',
    type: 'basic',
    front: 'Q',
    back: 'R',
    source: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
    searchText: 'q r',
  };
}
function aState(overrides: Partial<CardState>): CardState {
  return {
    cardId: 'c1',
    state: 2,
    stability: 4,
    difficulty: 5,
    due: '2026-09-17T00:00:00Z',
    lastReview: '2026-09-10T00:00:00Z',
    reps: 3,
    lapses: 0,
    learningSteps: 0,
    scheduledDays: 7,
    reviewCount: 3,
    suspended: false,
    changeSeq: 1,
    ...overrides,
  };
}

it('TU-12 — conta cada categoria de cartão do deck', () => {
  const cards = [aCardRow('c1'), aCardRow('c2'), aCardRow('c3'), aCardRow('c4'), aCardRow('c5')];
  const states = new Map<string, CardState>([
    ['c2', aState({ state: 1 })],
    ['c3', aState({ state: 2, due: '2026-09-17T00:00:00Z' })],
    ['c4', aState({ state: 2, due: '2026-09-20T00:00:00Z' })],
    ['c5', aState({ state: 2, suspended: true })],
  ]);
  const counters = computeDeckCardCounters(cards, states, NOW);
  expect(counters).toEqual({ total: 5, fresh: 1, learning: 1, review: 3, suspended: 1, dueToday: 2 });
});

it('TU-11 — cartão com progresso zerado conta como novo, não como para revisar', () => {
  const cards = [aCardRow('c1')];
  const states = new Map<string, CardState>([['c1', aState({ state: 0, due: NOW.toISOString() })]]);
  const counters = computeDeckCardCounters(cards, states, NOW);
  expect(counters).toMatchObject({ fresh: 1, dueToday: 0 });
});
