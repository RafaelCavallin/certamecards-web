import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { CardState } from '../api/card-state.model';
import { CardsApi } from '../api/cards-api';
import { LocalDb } from '../db/local-db';
import { CardStatesData } from './card-states-data';

let db: LocalDb;

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
function setup(cardsApi: Partial<CardsApi>): CardStatesData {
  TestBed.configureTestingModule({ providers: [{ provide: CardsApi, useValue: cardsApi }] });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(CardStatesData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — byCardId indexa os estados gravados pelo cardId', async () => {
  const cardStatesData = setup({});
  await db.cardStates.add(aState());
  await waitFor(() => cardStatesData.byCardId().size > 0);
  expect(cardStatesData.byCardId().get('c1')).toMatchObject({ state: 2 });
});

it('TU — setSuspension grava o estado devolvido pela API', async () => {
  const setSuspension = vi.fn().mockResolvedValue(aState({ suspended: true }));
  const cardStatesData = setup({ setSuspension });
  const state = await cardStatesData.setSuspension('c1', true);
  expect(state.suspended).toBe(true);
  expect(await db.cardStates.get('c1')).toMatchObject({ suspended: true });
});
