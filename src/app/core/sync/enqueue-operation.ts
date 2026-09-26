import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { compactPendingOperation } from './operation-compactor';
import { findPendingOperation } from './pending-operation-lookup';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export async function enqueueCompactableOperation(
  db: AccountDb,
  incoming: SyncOperationRow<SyncOperationPayload>,
  compactableKinds: readonly SyncOperationKind[],
): Promise<void> {
  const pending = await findPendingOperation(db, incoming.entityId, compactableKinds);
  const outcome = compactPendingOperation(pending, incoming);
  if (outcome.action === 'append') {
    await db.syncOperations.add(incoming);
    return;
  }
  if (outcome.action === 'cancel') {
    await db.syncOperations.delete(outcome.cancelOperationId);
    return;
  }
  await db.syncOperations.delete(outcome.cancelOperationId);
  await db.syncOperations.put(outcome.operation);
}
export async function enqueueCoalescedOperation(
  db: AccountDb,
  incoming: SyncOperationRow<SyncOperationPayload>,
): Promise<void> {
  const pending = await findPendingOperation(db, incoming.entityId, [incoming.kind]);
  if (pending !== undefined) {
    await db.syncOperations.delete(pending.operationId);
  }
  await db.syncOperations.add(incoming);
}
