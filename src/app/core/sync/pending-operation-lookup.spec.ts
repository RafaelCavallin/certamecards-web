import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { findPendingOperation } from './pending-operation-lookup';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

it('TU — encontra a operação pending do mesmo objeto e tipo', async () => {
  db = new AccountDb('pending-lookup-test-1');
  await db.syncOperations.add({
    operationId: 'op-1', accountId: 'u1', deviceId: 'dev-1', deviceSequence: 1, kind: 'deck_create', entityId: 'd1',
    parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: 'x',
    clock: { wallTime: 'x', logicalCounter: 0 }, observedServerTime: 'x', payload: { kind: 'deck_delete', deckId: 'd1' },
    status: 'pending', attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
  });
  const found = await findPendingOperation(db, 'd1', ['deck_create', 'deck_update', 'deck_delete']);
  expect(found?.operationId).toBe('op-1');
});

it('TU — ignora operações já enviadas e de outro objeto ou tipo', async () => {
  db = new AccountDb('pending-lookup-test-2');
  await db.syncOperations.bulkAdd([
    {
      operationId: 'op-synced', accountId: 'u1', deviceId: 'dev-1', deviceSequence: 1, kind: 'deck_create', entityId: 'd1',
      parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: 'x',
      clock: { wallTime: 'x', logicalCounter: 0 }, observedServerTime: 'x', payload: { kind: 'deck_delete', deckId: 'd1' },
      status: 'synced', attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: 'x',
    },
    {
      operationId: 'op-other-entity', accountId: 'u1', deviceId: 'dev-1', deviceSequence: 2, kind: 'deck_create', entityId: 'd2',
      parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: 'x',
      clock: { wallTime: 'x', logicalCounter: 0 }, observedServerTime: 'x', payload: { kind: 'deck_delete', deckId: 'd2' },
      status: 'pending', attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
    },
  ]);
  const found = await findPendingOperation(db, 'd1', ['deck_create', 'deck_update', 'deck_delete']);
  expect(found).toBeUndefined();
});
