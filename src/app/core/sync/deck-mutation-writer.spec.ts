import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { LocalMutationValidationError } from './local-storage-error';
import { DeckMutationWriter } from './deck-mutation-writer';

let db: AccountDb;

function setup(): DeckMutationWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('deck-mutation-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'deck-mutation-writer-test' });
  return TestBed.inject(DeckMutationWriter);
}

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — deck_create grava a projeção e enfileira a operação atomicamente', async () => {
  const writer = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  const deck = await writer.execute({ kind: 'deck_create', deckId: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  expect(deck.id).toBe('d1');
  expect(await db.decks.get('d1')).toMatchObject({ name: 'CF/88' });
  const ops = await db.syncOperations.toArray();
  expect(ops).toHaveLength(1);
  expect(ops[0]?.kind).toBe('deck_create');
});

it('TU — deck_create recusa matéria inativa e não grava nada', async () => {
  const writer = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: false, changeSeq: 1 });
  await expect(
    writer.execute({ kind: 'deck_create', deckId: 'd1', subjectId: 's1', name: 'CF/88', description: null }),
  ).rejects.toBeInstanceOf(LocalMutationValidationError);
  expect(await db.decks.get('d1')).toBeUndefined();
  expect(await db.syncOperations.count()).toBe(0);
});

it('TU — deck_update grava o novo nome preservando a versão local', async () => {
  const writer = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await writer.execute({ kind: 'deck_create', deckId: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  const updated = await writer.execute({ kind: 'deck_update', deckId: 'd1', changes: { name: 'Novo nome' } });
  expect(updated.name).toBe('Novo nome');
});

it('TU — deck_delete marca o deck como excluído', async () => {
  const writer = setup();
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await writer.execute({ kind: 'deck_create', deckId: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  const deleted = await writer.execute({ kind: 'deck_delete', deckId: 'd1' });
  expect(deleted.deletedAt).not.toBeNull();
});
