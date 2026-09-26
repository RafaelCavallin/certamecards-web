import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import { DECK_WRITE_KINDS } from './operation-compactor';
import { enqueueCoalescedOperation, enqueueCompactableOperation } from './enqueue-operation';

let db: AccountDb;

function anOperation(overrides: Partial<SyncOperationRow<SyncOperationPayload>> = {}): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'dev-1', deviceSequence: 1, kind: 'deck_create', entityId: 'd1',
    parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: 'x',
    clock: { wallTime: 'x', logicalCounter: 0 }, observedServerTime: 'x', payload: { kind: 'deck_delete', deckId: 'd1' },
    status: 'pending', attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
    ...overrides,
  };
}

afterEach(async () => {
  await db?.delete();
});

it('TU-69 — enqueueCompactableOperation compacta create+delete removendo a operação pending', async () => {
  db = new AccountDb('enqueue-operation-test-1');
  await db.syncOperations.add(anOperation());
  await enqueueCompactableOperation(db, anOperation({ operationId: 'op-2', kind: 'deck_delete' }), DECK_WRITE_KINDS);
  expect(await db.syncOperations.count()).toBe(0);
});

it('TU — enqueueCompactableOperation anexa quando não há operação compactável pendente', async () => {
  db = new AccountDb('enqueue-operation-test-2');
  await enqueueCompactableOperation(db, anOperation(), DECK_WRITE_KINDS);
  expect(await db.syncOperations.count()).toBe(1);
});

it('TU-77 — enqueueCoalescedOperation substitui a operação pending do mesmo tipo pela mais recente', async () => {
  db = new AccountDb('enqueue-operation-test-3');
  await db.syncOperations.add(anOperation({ kind: 'card_suspension', entityId: 'c1' }));
  await enqueueCoalescedOperation(db, anOperation({ operationId: 'op-2', kind: 'card_suspension', entityId: 'c1' }));
  const ops = await db.syncOperations.toArray();
  expect(ops).toHaveLength(1);
  expect(ops[0]?.operationId).toBe('op-2');
});
