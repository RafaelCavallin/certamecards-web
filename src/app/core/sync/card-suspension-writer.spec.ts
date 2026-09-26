import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { LocalMutationValidationError } from './local-storage-error';
import { CardSuspensionWriter } from './card-suspension-writer';

let db: AccountDb;

function setup(): CardSuspensionWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('card-suspension-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'card-suspension-writer-test' });
  return TestBed.inject(CardSuspensionWriter);
}
async function givenCard(): Promise<void> {
  await db.cards.add({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r',
  });
}

afterEach(async () => {
  await db?.delete();
});

it('TU-77 — suspende um cartão sem estado anterior criando a projeção', async () => {
  const writer = setup();
  await givenCard();
  const state = await writer.execute({ kind: 'card_suspension', cardId: 'c1', suspended: true });
  expect(state.suspended).toBe(true);
  expect(await db.syncOperations.count()).toBe(1);
});

it('TU-77 — reativar um cartão suspenso mantém o restante do estado', async () => {
  const writer = setup();
  await givenCard();
  await db.cardStates.add({
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-17T00:00:00Z', lastReview: 'x',
    reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7, reviewCount: 3, suspended: true,
    contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
  });
  const state = await writer.execute({ kind: 'card_suspension', cardId: 'c1', suspended: false });
  expect(state.suspended).toBe(false);
  expect(state.reps).toBe(3);
});

it('TU-77 — duas suspensões seguidas substituem a operação pending anterior', async () => {
  const writer = setup();
  await givenCard();
  await writer.execute({ kind: 'card_suspension', cardId: 'c1', suspended: true });
  await writer.execute({ kind: 'card_suspension', cardId: 'c1', suspended: false });
  expect(await db.syncOperations.count()).toBe(1);
});

it('TU — recusa suspender um cartão inexistente', async () => {
  const writer = setup();
  await expect(writer.execute({ kind: 'card_suspension', cardId: 'missing', suspended: true })).rejects.toBeInstanceOf(
    LocalMutationValidationError,
  );
});
