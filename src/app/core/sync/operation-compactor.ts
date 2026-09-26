import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export const DECK_WRITE_KINDS: readonly SyncOperationKind[] = ['deck_create', 'deck_update', 'deck_delete', 'conflict_restore'];
export const CARD_WRITE_KINDS: readonly SyncOperationKind[] = ['card_create', 'card_update', 'card_delete', 'conflict_restore'];
type WriteStep = 'create' | 'update' | 'delete';
const CREATE_KINDS = new Set<SyncOperationKind>(['deck_create', 'card_create']);
const UPDATE_KINDS = new Set<SyncOperationKind>(['deck_update', 'card_update']);
const DELETE_KINDS = new Set<SyncOperationKind>(['deck_delete', 'card_delete']);
export type CompactionOutcome =
  | { readonly action: 'append' }
  | { readonly action: 'cancel'; readonly cancelOperationId: string }
  | {
      readonly action: 'replace';
      readonly cancelOperationId: string;
      readonly operation: SyncOperationRow<SyncOperationPayload>;
    };
function stepOf(kind: SyncOperationKind): WriteStep | null {
  if (CREATE_KINDS.has(kind)) {
    return 'create';
  }
  if (UPDATE_KINDS.has(kind)) {
    return 'update';
  }
  if (DELETE_KINDS.has(kind)) {
    return 'delete';
  }
  return null;
}
function replacing(
  pending: SyncOperationRow<SyncOperationPayload>,
  kind: SyncOperationKind,
  incoming: SyncOperationRow<SyncOperationPayload>,
): CompactionOutcome {
  return {
    action: 'replace',
    cancelOperationId: pending.operationId,
    operation: {
      ...pending,
      kind,
      payload: incoming.payload,
      clock: incoming.clock,
      occurredAt: incoming.occurredAt,
      observedServerTime: incoming.observedServerTime,
      deviceSequence: incoming.deviceSequence,
    },
  };
}
export function compactPendingOperation(
  pending: SyncOperationRow<SyncOperationPayload> | undefined,
  incoming: SyncOperationRow<SyncOperationPayload>,
): CompactionOutcome {
  if (pending === undefined) {
    return { action: 'append' };
  }
  const pendingStep = stepOf(pending.kind);
  const incomingStep = stepOf(incoming.kind);
  if (pendingStep === null || incomingStep === null) {
    return { action: 'append' };
  }
  if (pendingStep === 'create' && incomingStep === 'update') {
    return replacing(pending, pending.kind, incoming);
  }
  if (pendingStep === 'update' && incomingStep === 'update') {
    return replacing(pending, pending.kind, incoming);
  }
  if (pendingStep === 'update' && incomingStep === 'delete') {
    return replacing(pending, incoming.kind, incoming);
  }
  if (pendingStep === 'create' && incomingStep === 'delete') {
    return { action: 'cancel', cancelOperationId: pending.operationId };
  }
  return { action: 'append' };
}
