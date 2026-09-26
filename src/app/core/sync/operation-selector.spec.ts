import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { markOperationsSending, recoverOrphanedLeases, selectReadyOperations } from './operation-selector';
import type { SyncOperationPayload } from './sync-operation-payload.model';

let db: AccountDb;
const NOW_MS = Date.parse('2026-09-23T12:00:00Z');

function operation(overrides: Partial<SyncOperationRow<SyncOperationPayload>>): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'deck_delete',
    entityId: 'e1', parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z', payload: { kind: 'deck_delete', deckId: 'e1' }, status: 'pending',
    attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
    ...overrides,
  };
}

afterEach(async () => {
  await db.delete();
});

it('TU-70 — seleciona pending e ignora sending com lease ainda válida', async () => {
  db = new AccountDb('operation-selector-test-1');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'a', deviceSequence: 1 }),
    operation({ operationId: 'b', deviceSequence: 2, status: 'sending', leaseUntil: '2026-09-23T12:00:10Z' }),
  ]);
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['a']);
});

it('TU-70 — recupera operação sending com lease expirada', async () => {
  db = new AccountDb('operation-selector-test-2');
  await db.syncOperations.add(operation({ operationId: 'a', status: 'sending', leaseUntil: '2026-09-23T11:59:00Z' }));
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['a']);
});

it('TU-70 — ignora operações cujo retryAt ainda não venceu', async () => {
  db = new AccountDb('operation-selector-test-3');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'a', status: 'retry_wait', retryAt: '2026-09-23T13:00:00Z' }),
    operation({ operationId: 'b', deviceSequence: 2, status: 'retry_wait', retryAt: '2026-09-23T11:00:00Z' }),
  ]);
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['b']);
});

it('TU-70 — bloqueia operação com dependência ainda não sincronizada', async () => {
  db = new AccountDb('operation-selector-test-4');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'parent', deviceSequence: 1 }),
    operation({ operationId: 'child', deviceSequence: 2, dependsOn: ['parent'] }),
  ]);
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['parent']);
});

it('TU-70 — libera a dependente quando a dependência já está synced', async () => {
  db = new AccountDb('operation-selector-test-5');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'parent', deviceSequence: 1, status: 'synced' }),
    operation({ operationId: 'child', deviceSequence: 2, dependsOn: ['parent'] }),
  ]);
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['child']);
});

it('TU-70 — respeita o limite do lote', async () => {
  db = new AccountDb('operation-selector-test-6');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'a', deviceSequence: 1 }),
    operation({ operationId: 'b', deviceSequence: 2 }),
  ]);
  const ready = await selectReadyOperations(db, NOW_MS, 1);
  expect(ready).toHaveLength(1);
});

it('TI-74 — 500 operações persistem após fechar/reabrir e leases expiradas são retomadas', async () => {
  const dbName = 'operation-selector-ti-74';
  db = new AccountDb(dbName);
  const operations: SyncOperationRow<SyncOperationPayload>[] = [];
  for (let index = 0; index < 500; index += 1) {
    const stuckSending = index === 250;
    operations.push(
      operation({
        operationId: `op-${index}`,
        entityId: `e${index}`,
        deviceSequence: index + 1,
        payload: { kind: 'deck_delete', deckId: `e${index}` },
        status: stuckSending ? 'sending' : 'pending',
        leaseUntil: stuckSending ? '2026-09-23T11:59:00Z' : null,
      }),
    );
  }
  await db.syncOperations.bulkAdd(operations);
  db.close();
  const reopened = new AccountDb(dbName);
  db = reopened;
  expect(await reopened.syncOperations.count()).toBe(500);
  const ready = await selectReadyOperations(reopened, NOW_MS, 1000);
  expect(ready).toHaveLength(500);
  expect(ready.find((op) => op.operationId === 'op-250')?.status).toBe('sending');
});

it('markOperationsSending marca status, leaseUntil e incrementa attempts', async () => {
  db = new AccountDb('operation-selector-test-7');
  await db.syncOperations.add(operation({ operationId: 'a', attempts: 1 }));
  const [op] = await selectReadyOperations(db, NOW_MS, 100);
  await markOperationsSending(db, [op as SyncOperationRow<SyncOperationPayload>], '2026-09-23T12:00:30Z');
  const updated = await db.syncOperations.get('a');
  expect(updated).toMatchObject({ status: 'sending', leaseUntil: '2026-09-23T12:00:30Z', attempts: 2 });
});

it('TU-70 — no início do ciclo, recupera o lease de operação sending deixada por um ciclo interrompido', async () => {
  db = new AccountDb('operation-selector-test-orphan');
  await db.syncOperations.bulkAdd([
    operation({ operationId: 'a', deviceSequence: 1, status: 'sending', leaseUntil: '2026-09-23T12:00:30Z' }),
    operation({ operationId: 'b', deviceSequence: 2 }),
  ]);
  await recoverOrphanedLeases(db, NOW_MS);
  const ready = await selectReadyOperations(db, NOW_MS, 100);
  expect(ready.map((op) => op.operationId)).toEqual(['a', 'b']);
  expect(await db.syncOperations.get('b')).toMatchObject({ status: 'pending', leaseUntil: null });
});
