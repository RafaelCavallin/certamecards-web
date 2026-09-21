import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { CardRow } from '../db/local-db.model';
import { computeDeckCounts } from './deck-counts';

const NOW = new Date('2026-09-17T12:00:00Z');
function aDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1,
    changeSeq: 1, ...overrides,
  };
}
function aCardRow(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', deletedAt: null, version: 1,
    changeSeq: 1, searchText: 'q r', ...overrides,
  };
}
function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-17T00:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, changeSeq: 1, ...overrides,
  };
}

it('TU — cartão vencido conta como para revisar e cartão sem estado conta como novo', () => {
  const counts = computeDeckCounts({
    decks: [aDeck()],
    cards: [aCardRow({ id: 'c1' }), aCardRow({ id: 'c2' })],
    states: new Map([['c1', aState()]]),
    now: NOW,
    newPerDay: 20,
  });
  expect(counts).toEqual([{ deck: aDeck(), due: 1, fresh: 1 }]);
});

it('TU — cartão suspenso não conta como para revisar', () => {
  const counts = computeDeckCounts({
    decks: [aDeck()],
    cards: [aCardRow({ id: 'c1' })],
    states: new Map([['c1', aState({ suspended: true })]]),
    now: NOW,
    newPerDay: 20,
  });
  expect(counts[0]?.due).toBe(0);
});

it('TU-11 — cartão zerado (estado novo) conta como fresh, não como para revisar', () => {
  const counts = computeDeckCounts({
    decks: [aDeck()],
    cards: [aCardRow({ id: 'c1' })],
    states: new Map([['c1', aState({ state: 0, due: NOW.toISOString() })]]),
    now: NOW,
    newPerDay: 20,
  });
  expect(counts[0]).toMatchObject({ due: 0, fresh: 1 });
});

it('TU — novos exibidos respeitam a cota global entre decks', () => {
  const decks = [aDeck({ id: 'd1', name: 'A' }), aDeck({ id: 'd2', name: 'B' })];
  const cards = [
    aCardRow({ id: 'c1', deckId: 'd1' }),
    aCardRow({ id: 'c2', deckId: 'd1' }),
    aCardRow({ id: 'c3', deckId: 'd1' }),
    aCardRow({ id: 'c4', deckId: 'd2' }),
  ];
  const counts = computeDeckCounts({ decks, cards, states: new Map(), now: NOW, newPerDay: 2 });
  const total = counts.reduce((sum, entry) => sum + entry.fresh, 0);
  expect(total).toBe(2);
});

it('TU — ordena por vencidos desc, depois novos desc, depois nome', () => {
  const decks = [aDeck({ id: 'd1', name: 'Zebra' }), aDeck({ id: 'd2', name: 'Alfa' })];
  const cards = [aCardRow({ id: 'c1', deckId: 'd2' })];
  const counts = computeDeckCounts({
    decks,
    cards,
    states: new Map([['c1', aState({ due: '2026-09-01T00:00:00Z' })]]),
    now: NOW,
    newPerDay: 20,
  });
  expect(counts.map((entry) => entry.deck.id)).toEqual(['d2', 'd1']);
});
