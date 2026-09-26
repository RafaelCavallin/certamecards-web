import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { CardState } from '../api/card-state.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { CardStatesData } from './card-states-data';

let db: AccountDb;

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-17T00:00:00Z', lastReview: '2026-09-10T00:00:00Z',
    reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7, reviewCount: 3, suspended: false,
    contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
    ...overrides,
  };
}
function setup(): CardStatesData {
  TestBed.configureTestingModule({});
  db = new AccountDb('card-states-data-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'card-states-data-test' });
  return TestBed.inject(CardStatesData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — byCardId indexa os estados gravados pelo cardId', async () => {
  const cardStatesData = setup();
  await db.cardStates.add(aState());
  await waitFor(() => cardStatesData.byCardId().size > 0);
  expect(cardStatesData.byCardId().get('c1')).toMatchObject({ state: 2 });
});

it('TU-77 — setSuspension grava a preferência localmente', async () => {
  const cardStatesData = setup();
  await db.cards.add({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r',
  });
  const state = await cardStatesData.setSuspension('c1', true);
  expect(state.suspended).toBe(true);
  expect(await db.cardStates.get('c1')).toMatchObject({ suspended: true });
});
