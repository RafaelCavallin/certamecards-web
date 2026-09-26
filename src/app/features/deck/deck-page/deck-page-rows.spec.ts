import { expect, it } from 'vitest';
import type { CardState } from '../../../core/api/card-state.model';
import { toCardRow } from '../../../core/db/card-row';
import type { Card } from '../../../core/api/card.model';
import { buildCardListRows } from './deck-page-rows';

const NOW = new Date('2026-09-17T12:00:00Z');
function aCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'Mandado de segurança',
    back: 'Prazo de 120 dias',
    source: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
    ...overrides,
  };
}
function aState(overrides: Partial<CardState> = {}): CardState {
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
    suspended: false, contentUpdateNote: null, contentUpdatedAt: null,
    changeSeq: 1,
    ...overrides,
  };
}

it('TU-20 — busca normalizada encontra em maiúsculas e com acentos diferentes', () => {
  const rows = buildCardListRows({
    cards: [toCardRow(aCard())],
    states: new Map(),
    query: 'MANDADO',
    stateFilter: 'all',
    now: NOW,
  });
  expect(rows).toHaveLength(1);
});

it('TU — filtro suspended mostra só cartões suspensos', () => {
  const rows = buildCardListRows({
    cards: [toCardRow(aCard({ id: 'c1' })), toCardRow(aCard({ id: 'c2' }))],
    states: new Map([['c1', aState({ suspended: true })]]),
    query: '',
    stateFilter: 'suspended',
    now: NOW,
  });
  expect(rows.map((row) => row.id)).toEqual(['c1']);
});

it('TU — filtro new mostra cartões nunca estudados e cartões zerados (state=CARD_STATE_NEW)', () => {
  const rows = buildCardListRows({
    cards: [toCardRow(aCard({ id: 'c1' })), toCardRow(aCard({ id: 'c2' })), toCardRow(aCard({ id: 'c3' }))],
    states: new Map([
      ['c2', aState({ state: 0 })],
      ['c3', aState({ state: 2 })],
    ]),
    query: '',
    stateFilter: 'new',
    now: NOW,
  });
  expect(rows.map((row) => row.id)).toEqual(['c1', 'c2']);
});

it('TU-19 — marca leech quando lapses chega a 8', () => {
  const rows = buildCardListRows({
    cards: [toCardRow(aCard())],
    states: new Map([['c1', aState({ lapses: 8 })]]),
    query: '',
    stateFilter: 'all',
    now: NOW,
  });
  expect(rows[0]?.leech).toBe(true);
});
