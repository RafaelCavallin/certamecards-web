import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { CardRow } from '../db/local-db.model';
import { computeDeckCounts } from './deck-counts';

const NOW = new Date('2026-09-17T12:00:00Z');
function aDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
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
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}

it('TU-40 — deck oficial inscrito de 30 cartões novos entra com as mesmas contagens e divide a cota global', () => {
  const official = aDeck({ id: 'off', name: 'Oficial', origin: 'official_subscription', officialStatus: 'published' });
  const own = aDeck({ id: 'own', name: 'Próprio' });
  const officialCards = Array.from({ length: 30 }, (_, index) => aCardRow({ id: `o${index}`, deckId: 'off' }));
  const ownCards = Array.from({ length: 30 }, (_, index) => aCardRow({ id: `p${index}`, deckId: 'own' }));
  const counts = computeDeckCounts({
    decks: [official, own], cards: [...officialCards, ...ownCards], states: new Map(), now: NOW, newPerDay: 20,
  });
  const byId = new Map(counts.map((entry) => [entry.deck.id, entry]));
  expect(byId.get('off')?.due).toBe(0);
  expect((byId.get('off')?.fresh ?? 0) + (byId.get('own')?.fresh ?? 0)).toBe(20);
});

it('TU-40 — estado órfão sem cartão local não altera as contagens', () => {
  const counts = computeDeckCounts({
    decks: [aDeck()], cards: [aCardRow()], states: new Map([['orfao', aState({ cardId: 'orfao' })]]), now: NOW, newPerDay: 20,
  });
  expect(counts[0]).toMatchObject({ due: 0, fresh: 1 });
});
