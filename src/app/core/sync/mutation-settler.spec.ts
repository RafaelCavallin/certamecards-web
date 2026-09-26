import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { settleMutationResults } from './mutation-settler';
import type { MutationResult } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

let db: AccountDb;
const ORDER = { eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'op-1' };

function operation(overrides: Partial<SyncOperationRow<SyncOperationPayload>>): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'deck_update',
    entityId: 'd1', parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z',
    payload: {
      kind: 'deck_update',
      deck: {
        id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
        originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
        createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
      },
    },
    status: 'sending', attempts: 1, retryAt: null, leaseUntil: '2026-09-23T00:00:30Z', error: null, syncedAt: null,
    ...overrides,
  };
}
function result(overrides: Partial<MutationResult>): MutationResult {
  return {
    operationId: 'op-1', outcome: 'applied', entityVersion: 2, changeSeq: 100, canonicalOrder: ORDER,
    conflictId: null, error: null,
    ...overrides,
  };
}

afterEach(async () => {
  await db.delete();
});

it('TU — applied marca synced e atualiza version/changeSeq da entidade', async () => {
  db = new AccountDb('mutation-settler-test-1');
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  const op = operation({});
  await db.syncOperations.add(op);
  await settleMutationResults(db, { operations: [op], results: [result({})] }, Date.parse('2026-09-23T00:01:00Z'));
  const stored = await db.syncOperations.get('op-1');
  expect(stored).toMatchObject({ status: 'synced', error: null });
  const deck = await db.decks.get('d1');
  expect(deck).toMatchObject({ version: 2, changeSeq: 100 });
});

it('TU — conflict também marca synced (o conflito fica disponível no servidor)', async () => {
  db = new AccountDb('mutation-settler-test-2');
  const op = operation({});
  await db.syncOperations.add(op);
  await settleMutationResults(
    db, { operations: [op], results: [result({ outcome: 'conflict', conflictId: 'c1' })] },
    Date.parse('2026-09-23T00:01:00Z'),
  );
  expect(await db.syncOperations.get('op-1')).toMatchObject({ status: 'synced' });
});

it('TU — dependency_blocked volta para pending sem consumir tentativa extra', async () => {
  db = new AccountDb('mutation-settler-test-3');
  const op = operation({});
  await db.syncOperations.add(op);
  await settleMutationResults(
    db, { operations: [op], results: [result({ outcome: 'dependency_blocked', entityVersion: null, changeSeq: null })] },
    Date.now(),
  );
  expect(await db.syncOperations.get('op-1')).toMatchObject({ status: 'pending' });
});

it('TU — card_create/card_update atualiza version/changeSeq do cartão', async () => {
  db = new AccountDb('mutation-settler-test-5');
  await db.cards.put({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null, searchText: 'f b',
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  const op = operation({ kind: 'card_update', entityId: 'c1' });
  await db.syncOperations.add(op);
  await settleMutationResults(db, { operations: [op], results: [result({})] }, Date.now());
  expect(await db.cards.get('c1')).toMatchObject({ version: 2, changeSeq: 100 });
});

it('TU — card_suspension atualiza o changeSeq do estado do cartão', async () => {
  db = new AccountDb('mutation-settler-test-6');
  await db.cardStates.put({
    cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1,
    lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: true, contentUpdateNote: null,
    contentUpdatedAt: null, changeSeq: 0,
  });
  const op = operation({ kind: 'card_suspension', entityId: 'c1' });
  await db.syncOperations.add(op);
  await settleMutationResults(
    db, { operations: [op], results: [result({ entityVersion: null, changeSeq: 42 })] }, Date.now(),
  );
  expect(await db.cardStates.get('c1')).toMatchObject({ changeSeq: 42 });
});

it('TU — settings_patch atualiza o changeSeq dos ajustes', async () => {
  db = new AccountDb('mutation-settler-test-7');
  await db.settings.put({
    userId: 'u1', newPerDay: 20, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo',
    theme: 'auto', changeSeq: 0, fieldClocks: {},
  });
  const op = operation({ kind: 'settings_patch', entityId: 'u1' });
  await db.syncOperations.add(op);
  await settleMutationResults(
    db, { operations: [op], results: [result({ entityVersion: null, changeSeq: 7 })] }, Date.now(),
  );
  expect(await db.settings.get('u1')).toMatchObject({ changeSeq: 7 });
});

it('TU — resultado sem operação correspondente é ignorado', async () => {
  db = new AccountDb('mutation-settler-test-8');
  const op = operation({ operationId: 'other' });
  await db.syncOperations.add(op);
  await settleMutationResults(db, { operations: [op], results: [result({ operationId: 'not-found' })] }, Date.now());
  expect(await db.syncOperations.get('other')).toMatchObject({ status: 'sending' });
});

it('TU-80 — conflict_restore de cartão atualiza version/changeSeq do cartão restaurado', async () => {
  db = new AccountDb('mutation-settler-test-9');
  await db.cards.put({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null, searchText: 'f b',
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  const op = operation({
    kind: 'conflict_restore', entityId: 'c1',
    payload: { kind: 'conflict_restore', conflictId: 'conf-1', snapshot: { front: 'F', back: 'B', source: null, parentBaseVersion: null }, targetDeckId: 'd1' },
  });
  await db.syncOperations.add(op);
  await settleMutationResults(db, { operations: [op], results: [result({})] }, Date.now());
  expect(await db.cards.get('c1')).toMatchObject({ version: 2, changeSeq: 100 });
});

it('TU-80 — conflict_restore de deck atualiza version/changeSeq do deck restaurado', async () => {
  db = new AccountDb('mutation-settler-test-10');
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
  });
  const op = operation({
    kind: 'conflict_restore', entityId: 'd1',
    payload: { kind: 'conflict_restore', conflictId: 'conf-1', snapshot: { subjectId: 's1', name: 'CF/88', description: null }, targetDeckId: null },
  });
  await db.syncOperations.add(op);
  await settleMutationResults(db, { operations: [op], results: [result({})] }, Date.now());
  expect(await db.decks.get('d1')).toMatchObject({ version: 2, changeSeq: 100 });
});

it('CA-24 — not_applicable resolve a operação como sincronizada e guarda o motivo para o aviso', async () => {
  db = new AccountDb('mutation-settler-test-11');
  const op = operation({ kind: 'card_suspension', entityId: 'c1' });
  await db.syncOperations.add(op);
  const error = { code: 'not_applicable', message: 'o cartão oficial não existe mais' };
  await settleMutationResults(
    db, { operations: [op], results: [result({ outcome: 'action_required', entityVersion: null, changeSeq: null, error })] },
    Date.now(),
  );
  expect(await db.syncOperations.get('op-1')).toMatchObject({ status: 'synced', error });
});

it('TU — action_required preserva o erro estruturado e não repete automaticamente', async () => {
  db = new AccountDb('mutation-settler-test-4');
  const op = operation({});
  await db.syncOperations.add(op);
  const error = { code: 'validation_failed', message: 'inválido' };
  await settleMutationResults(
    db, { operations: [op], results: [result({ outcome: 'action_required', entityVersion: null, changeSeq: null, error })] },
    Date.now(),
  );
  expect(await db.syncOperations.get('op-1')).toMatchObject({ status: 'action_required', error });
});
