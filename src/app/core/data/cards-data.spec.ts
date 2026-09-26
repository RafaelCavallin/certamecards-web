import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { CardsData } from './cards-data';

let db: AccountDb;

function setup(): CardsData {
  TestBed.configureTestingModule({ providers: [{ provide: EventsService, useValue: { record: vi.fn() } }] });
  db = new AccountDb('cards-data-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'cards-data-test' });
  return TestBed.inject(CardsData);
}
async function givenDeck(): Promise<void> {
  await db.decks.add({
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    version: 1, changeSeq: 1,
  });
}

afterEach(async () => {
  await db.delete();
});

it('TU — byDeck devolve só os cartões não excluídos do deck', async () => {
  const cardsData = setup();
  await givenDeck();
  await db.cards.bulkAdd([
    { id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r' },
    { id: 'c2', deckId: 'd1', type: 'basic', front: 'Q2', back: 'R2', source: null, createdAt: 'x', updatedAt: 'x', deletedAt: 'x', version: 1, changeSeq: 1, searchText: 'q2 r2' },
    { id: 'c3', deckId: 'd2', type: 'basic', front: 'Q3', back: 'R3', source: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q3 r3' },
  ]);
  const cards = cardsData.byDeck('d1');
  await waitFor(() => cards().length > 0);
  expect(cards().map((card) => card.id)).toEqual(['c1']);
});

it('TU-67 — create grava o cartão com searchText e a operação enfileirada', async () => {
  const cardsData = setup();
  await givenDeck();
  const created = await cardsData.create('d1', { id: 'c1', type: 'basic', front: 'Mandado', back: 'R', source: null });
  expect(created.front).toBe('Mandado');
  expect((await db.cards.get('c1'))?.searchText).toContain('mandado');
  expect(await db.syncOperations.where('entityId').equals('c1').count()).toBe(1);
});

it('TU-69 — criar e atualizar em sequência compacta em uma única operação pending', async () => {
  const cardsData = setup();
  await givenDeck();
  await cardsData.create('d1', { id: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  await cardsData.update('c1', { front: 'Nova pergunta' });
  expect(await db.cards.get('c1')).toMatchObject({ front: 'Nova pergunta' });
  const ops = await db.syncOperations.where('entityId').equals('c1').toArray();
  expect(ops).toHaveLength(1);
  expect(ops[0]?.kind).toBe('card_create');
});

it('TU — delete marca o cartão como excluído', async () => {
  const cardsData = setup();
  await givenDeck();
  await cardsData.create('d1', { id: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  await cardsData.delete('c1');
  expect((await db.cards.get('c1'))?.deletedAt).not.toBeNull();
});
