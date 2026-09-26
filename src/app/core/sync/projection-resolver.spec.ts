import { afterEach, expect, it } from 'vitest';
import type { ChangeEntry } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import { applyChangeEntry } from './projection-resolver';
import { pendingOperation } from './projection-resolver-test-support';

let db: AccountDb;

afterEach(async () => {
  await db.delete();
});

it('TU-74 — pull remoto recompõe overlay sem apagar payload pendente do deck', async () => {
  db = new AccountDb('projection-resolver-test-1');
  const localDeck = {
    id: 'd1', subjectId: 's1', name: 'Editado offline', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  };
  await db.decks.put(localDeck);
  await db.syncOperations.add(pendingOperation('deck_update', 'd1'));
  const remoteEntry: ChangeEntry = {
    changeSeq: 50,
    type: 'deck',
    payload: {
      id: 'd1', subjectId: 's1', name: 'Versão antiga do servidor', description: null, origin: 'own',
      originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  const stored = await db.decks.get('d1');
  expect(stored?.name).toBe('Editado offline');
});

it('TU-80 — restauração de conflito pendente preserva o cartão restaurado localmente contra uma página remota desatualizada', async () => {
  db = new AccountDb('projection-resolver-test-19');
  await db.cards.add({
    id: 'c1', deckId: 'd2', type: 'basic', front: 'Restaurado', back: 'Verso', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 0, searchText: 'restaurado verso',
  });
  await db.syncOperations.add(pendingOperation('conflict_restore', 'c1'));
  const remoteEntry: ChangeEntry = {
    changeSeq: 60, type: 'card',
    payload: {
      id: 'c1', deckId: 'd1', type: 'basic', front: 'Antigo', back: 'Antigo', source: null,
      createdAt: 'x', updatedAt: 'x', deletedAt: '2026-09-20T00:00:00Z', version: 1,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  const stored = await db.cards.get('c1');
  expect(stored?.front).toBe('Restaurado');
  expect(stored?.deletedAt).toBeNull();
});

it('TU-74 — sem operação local pendente, a base remota substitui a projeção', async () => {
  db = new AccountDb('projection-resolver-test-2');
  const localDeck = {
    id: 'd1', subjectId: 's1', name: 'Antigo', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  };
  await db.decks.put(localDeck);
  const remoteEntry: ChangeEntry = {
    changeSeq: 50,
    type: 'deck',
    payload: {
      id: 'd1', subjectId: 's1', name: 'Atualizado remotamente', description: null, origin: 'own',
      originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  const stored = await db.decks.get('d1');
  expect(stored?.name).toBe('Atualizado remotamente');
  expect(stored?.changeSeq).toBe(50);
});

it('TU-74 — card_state com suspensão pendente preserva o overlay local', async () => {
  db = new AccountDb('projection-resolver-test-3');
  const localState = {
    cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null, reps: 1,
    lapses: 0, learningSteps: 0, scheduledDays: 4, reviewCount: 1, suspended: true, contentUpdateNote: null,
    contentUpdatedAt: null, changeSeq: 0,
  };
  await db.cardStates.put(localState);
  await db.syncOperations.add(pendingOperation('card_suspension', 'c1'));
  const remoteEntry: ChangeEntry = {
    changeSeq: 50,
    type: 'card_state',
    payload: {
      cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null,
      reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 4, reviewCount: 1, suspended: false,
      contentUpdateNote: null, contentUpdatedAt: null,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  const stored = await db.cardStates.get('c1');
  expect(stored?.suspended).toBe(true);
});

it('TU — card remoto com edição pendente preserva o overlay local', async () => {
  db = new AccountDb('projection-resolver-test-6');
  const localCard = {
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Editado offline', back: 'B', source: null, searchText: 'x',
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  };
  await db.cards.put(localCard);
  await db.syncOperations.add(pendingOperation('card_update', 'c1'));
  const remoteEntry: ChangeEntry = {
    changeSeq: 10, type: 'card',
    payload: {
      id: 'c1', deckId: 'd1', type: 'basic', front: 'Do servidor', back: 'B', source: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.cards.get('c1')).toMatchObject({ front: 'Editado offline' });
});

it('TU — card remoto sem pendência aplica normalmente', async () => {
  db = new AccountDb('projection-resolver-test-7');
  const remoteEntry: ChangeEntry = {
    changeSeq: 10, type: 'card',
    payload: {
      id: 'c1', deckId: 'd1', type: 'basic', front: 'Do servidor', back: 'B', source: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.cards.get('c1')).toMatchObject({ front: 'Do servidor', changeSeq: 10 });
});

it('TU — card_state sem cartão local conhecido não bloqueia por reset pendente', async () => {
  db = new AccountDb('projection-resolver-test-8');
  const remoteEntry: ChangeEntry = {
    changeSeq: 10, type: 'card_state',
    payload: {
      cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null,
      reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 4, reviewCount: 1, suspended: false,
      contentUpdateNote: null, contentUpdatedAt: null,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.cardStates.get('c1')).toMatchObject({ suspended: false, changeSeq: 10 });
});

it('TU — card_state com deck_reset pendente preserva o overlay local', async () => {
  db = new AccountDb('projection-resolver-test-9');
  await db.cards.put({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null, searchText: 'x',
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  await db.cardStates.put({
    cardId: 'c1', state: 0, stability: 0, difficulty: 0, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 0,
    lapses: 0, learningSteps: 0, scheduledDays: 0, reviewCount: 0, suspended: false, contentUpdateNote: null,
    contentUpdatedAt: null, changeSeq: 0,
  });
  await db.syncOperations.add(pendingOperation('deck_reset', 'd1'));
  const remoteEntry: ChangeEntry = {
    changeSeq: 10, type: 'card_state',
    payload: {
      cardId: 'c1', state: 2, stability: 9, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null,
      reps: 5, lapses: 0, learningSteps: 0, scheduledDays: 4, reviewCount: 5, suspended: false,
      contentUpdateNote: null, contentUpdatedAt: null,
    },
  };
  await applyChangeEntry(db, remoteEntry, 'u1');
  expect(await db.cardStates.get('c1')).toMatchObject({ state: 0, reps: 0 });
});
