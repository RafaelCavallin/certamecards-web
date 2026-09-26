import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { CARD_STATE_NEW } from '../api/card-state.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { LocalMutationValidationError } from './local-storage-error';
import { DeckResetWriter } from './deck-reset-writer';

let db: AccountDb;

function setup(): DeckResetWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('deck-reset-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'deck-reset-writer-test' });
  return TestBed.inject(DeckResetWriter);
}
async function givenDeckWithCards(): Promise<void> {
  await db.decks.add({
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    version: 1, changeSeq: 1,
  });
  await db.cards.bulkAdd([
    { id: 'c1', deckId: 'd1', type: 'basic', front: 'Q1', back: 'R1', source: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q1 r1' },
    { id: 'c2', deckId: 'd1', type: 'basic', front: 'Q2', back: 'R2', source: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q2 r2' },
  ]);
  await db.cardStates.add({
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-17T00:00:00Z', lastReview: 'x',
    reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7, reviewCount: 3, suspended: true,
    contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
  });
}

afterEach(async () => {
  await db?.delete();
});

it('TU-77 — zerar um deck marca todos os cartões estudados como novos', async () => {
  const writer = setup();
  await givenDeckWithCards();
  const result = await writer.execute({ kind: 'deck_reset', deckId: 'd1' });
  expect(result.resetCards).toBe(2);
  expect((await db.cardStates.get('c1'))?.state).toBe(CARD_STATE_NEW);
  expect((await db.cardStates.get('c2'))?.state).toBe(CARD_STATE_NEW);
});

it('TU-77 — o marcador de reset é gravado e a suspensão é preservada', async () => {
  const writer = setup();
  await givenDeckWithCards();
  await writer.execute({ kind: 'deck_reset', deckId: 'd1' });
  const markers = await db.deckResets.where('deckId').equals('d1').toArray();
  expect(markers).toHaveLength(1);
  expect((await db.cardStates.get('c1'))?.suspended).toBe(true);
});

it('TU — recusa zerar um deck que não existe mais', async () => {
  const writer = setup();
  await expect(writer.execute({ kind: 'deck_reset', deckId: 'missing' })).rejects.toBeInstanceOf(LocalMutationValidationError);
});
