import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export function pendingOperation(
  kind: SyncOperationPayload['kind'],
  entityId: string,
): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind, entityId, parentId: null,
    baseVersion: 1, predecessorOperationId: null, dependsOn: [], occurredAt: '2026-09-23T00:00:00Z',
    clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 }, observedServerTime: '2026-09-23T00:00:00Z',
    payload: { kind: 'deck_delete', deckId: entityId }, status: 'pending', attempts: 0,
    retryAt: null, leaseUntil: null, error: null, syncedAt: null,
  };
}
