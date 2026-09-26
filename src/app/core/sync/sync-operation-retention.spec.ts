import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { purgeSyncedOperations, SYNCED_OPERATION_RETENTION_MS } from './sync-operation-retention';
import type { DeckResetPayload } from './sync-operation-payload.model';

let db: AccountDb;

afterEach(async () => {
  await db.delete();
});

const NOW = Date.parse('2026-09-17T12:00:00.000Z');

function operation(id: string, status: SyncOperationRow<DeckResetPayload>['status'], syncedAt: string | null): SyncOperationRow<DeckResetPayload> {
  return {
    operationId: id, accountId: 'user-1', deviceId: 'device-1', deviceSequence: 1, kind: 'deck_reset',
    entityId: 'deck-1', parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-17T00:00:00.000Z', clock: { wallTime: '2026-09-17T00:00:00.000Z', logicalCounter: 0 },
    observedServerTime: '2026-09-17T00:00:00.000Z', payload: { kind: 'deck_reset', deckId: 'deck-1' },
    status, attempts: 1, retryAt: null, leaseUntil: null, error: null, syncedAt,
  };
}

it('TU — purgeSyncedOperations remove só operações sincronizadas há mais de 24 horas', async () => {
  db = new AccountDb('user-retention-test-1');
  const overdueAt = new Date(NOW - SYNCED_OPERATION_RETENTION_MS - 1_000).toISOString();
  const recentAt = new Date(NOW - 1_000).toISOString();
  await db.syncOperations.bulkPut([
    operation('op-old', 'synced', overdueAt),
    operation('op-recent', 'synced', recentAt),
    operation('op-pending', 'pending', null),
    operation('op-action', 'action_required', overdueAt),
  ]);
  const removed = await purgeSyncedOperations(db, NOW);
  expect(removed).toBe(1);
  expect(await db.syncOperations.get('op-old')).toBeUndefined();
  expect(await db.syncOperations.get('op-recent')).not.toBeUndefined();
  expect(await db.syncOperations.get('op-pending')).not.toBeUndefined();
  expect(await db.syncOperations.get('op-action')).not.toBeUndefined();
});
