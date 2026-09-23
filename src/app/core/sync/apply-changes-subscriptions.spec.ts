import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { DeckSubscription } from '../api/library.model';
import type { ChangesPage } from '../api/sync.model';
import { toCardRow } from '../db/card-row';
import { LocalDb } from '../db/local-db';
import { applyChangesPage } from './apply-changes-page';

let db: LocalDb;

const DECK: Deck = {
  id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'official_subscription', originRef: null,
  originLabel: null, officialStatus: 'published', cardCount: 1, contentUpdatedAt: '2026-09-19T00:00:00Z',
  createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
};
const CARD = {
  id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null,
  createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 2,
};
const STATE: CardState = {
  cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null, reps: 1,
  lapses: 0, learningSteps: 0, scheduledDays: 4, reviewCount: 1, suspended: false, contentUpdateNote: null,
  contentUpdatedAt: null, changeSeq: 3,
};
const ACTIVE: DeckSubscription = { deckId: 'd1', subscribedAt: '2026-09-19T00:00:00Z', cancelledAt: null, changeSeq: 4 };

function page(overrides: Partial<ChangesPage>): ChangesPage {
  return {
    subjects: [], decks: [], cards: [], cardStates: [], reviewLogs: [], reviewVoids: [], subscriptions: [],
    settings: null, nextCursor: 0, hasMore: false, ...overrides,
  };
}

afterEach(async () => {
  await db.delete();
});

it('TI-54 — inscrição ativa é gravada e o deck permanece', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await applyChangesPage(db, page({ decks: [DECK], cards: [CARD], cardStates: [STATE], subscriptions: [ACTIVE] }));
  expect(await db.subscriptions.get('d1')).toEqual(ACTIVE);
  expect(await db.decks.count()).toBe(1);
  expect(await db.cards.count()).toBe(1);
});

it('TI-54 — cancelamento apaga deck, cartões e estados locais e guarda a inscrição cancelada', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await db.decks.put(DECK);
  await db.cards.put(toCardRow(CARD));
  await db.cardStates.put(STATE);
  const cancelled = { ...ACTIVE, cancelledAt: '2026-10-02T09:12:00Z', changeSeq: 9 };
  await applyChangesPage(db, page({ subscriptions: [cancelled] }));
  expect(await db.decks.count()).toBe(0);
  expect(await db.cards.count()).toBe(0);
  expect(await db.cardStates.count()).toBe(0);
  expect(await db.subscriptions.get('d1')).toEqual(cancelled);
});

it('TI-54 — cancelamento não afeta outros decks', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  const other = { ...CARD, id: 'c2', deckId: 'd2' };
  await db.decks.bulkPut([DECK, { ...DECK, id: 'd2' }]);
  await db.cards.bulkPut([toCardRow(CARD), toCardRow(other)]);
  await db.cardStates.bulkPut([STATE, { ...STATE, cardId: 'c2' }]);
  await applyChangesPage(db, page({ subscriptions: [{ ...ACTIVE, cancelledAt: '2026-10-02T09:12:00Z' }] }));
  expect((await db.decks.toArray()).map((deck) => deck.id)).toEqual(['d2']);
  expect((await db.cardStates.toArray()).map((state) => state.cardId)).toEqual(['c2']);
});

it('TI-54 — estado órfão que volta no pull é gravado sem cartão correspondente', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await applyChangesPage(db, page({ cardStates: [STATE] }));
  expect(await db.cardStates.count()).toBe(1);
  expect(await db.cards.count()).toBe(0);
});
