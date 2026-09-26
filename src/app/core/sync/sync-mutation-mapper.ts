import type { SyncOperationWire } from '../api/sync.model';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

function wirePayload(payload: SyncOperationPayload): unknown {
  if (payload.kind === 'deck_create' || payload.kind === 'deck_update') {
    return { subjectId: payload.deck.subjectId, name: payload.deck.name, description: payload.deck.description };
  }
  if (payload.kind === 'card_create' || payload.kind === 'card_update') {
    return { front: payload.card.front, back: payload.card.back, source: payload.card.source, parentBaseVersion: null };
  }
  if (payload.kind === 'card_suspension') {
    return { suspended: payload.suspended };
  }
  if (payload.kind === 'settings_patch') {
    return payload.changes;
  }
  if (payload.kind === 'profile_patch') {
    return { displayName: payload.displayName };
  }
  if (payload.kind === 'conflict_restore') {
    return { conflictId: payload.conflictId, snapshot: payload.snapshot, targetDeckId: payload.targetDeckId };
  }
  return null;
}
export function toOperationWire(operation: SyncOperationRow<SyncOperationPayload>): SyncOperationWire {
  return {
    operationId: operation.operationId,
    kind: operation.kind,
    entityId: operation.entityId,
    parentId: operation.parentId,
    baseVersion: operation.baseVersion,
    predecessorOperationId: operation.predecessorOperationId,
    dependsOn: operation.dependsOn,
    occurredAt: operation.occurredAt,
    clock: operation.clock,
    observedServerTime: operation.observedServerTime,
    payload: wirePayload(operation.payload),
  };
}
