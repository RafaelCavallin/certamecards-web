import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { DecksData } from './decks-data';

let db: AccountDb;

function setup(): DecksData {
  TestBed.configureTestingModule({ providers: [{ provide: EventsService, useValue: { record: vi.fn() } }] });
  db = new AccountDb('decks-data-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'decks-data-test' });
  return TestBed.inject(DecksData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — active devolve só os decks não excluídos', async () => {
  const decksData = setup();
  await db.decks.bulkAdd([
    { id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1 },
    { id: 'd2', subjectId: 's1', name: 'Excluído', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: 'x', version: 1, changeSeq: 1 },
  ]);
  await waitFor(() => decksData.active().length > 0);
  expect(decksData.active().map((deck) => deck.id)).toEqual(['d1']);
});

it('TU-67 — create grava a projeção local sem chamada de rede', async () => {
  const decksData = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  const created = await decksData.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  expect(created.id).toBe('d1');
  expect(await db.decks.get('d1')).toMatchObject({ name: 'CF/88' });
  expect(await db.syncOperations.where('entityId').equals('d1').count()).toBe(1);
});

it('TU — update grava a nova versão do deck', async () => {
  const decksData = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await decksData.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  await decksData.update('d1', { name: 'Novo nome' });
  expect(await db.decks.get('d1')).toMatchObject({ name: 'Novo nome', version: 1 });
});

it('TU — delete marca o deck como excluído no Dexie', async () => {
  const decksData = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await decksData.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  await decksData.delete('d1');
  expect((await db.decks.get('d1'))?.deletedAt).not.toBeNull();
});

it('TU-77 — resetProgress marca os cartões do deck como novos imediatamente', async () => {
  const decksData = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await decksData.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  await db.cards.add({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r',
  });
  await db.cardStates.add({
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-17T00:00:00Z', lastReview: 'x',
    reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7, reviewCount: 3, suspended: false,
    contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1,
  });
  await decksData.resetProgress('d1');
  expect((await db.cardStates.get('c1'))?.state).toBe(0);
  expect(await db.deckResets.where('deckId').equals('d1').count()).toBe(1);
});
