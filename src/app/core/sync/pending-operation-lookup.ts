import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export async function findPendingOperation(
  db: AccountDb,
  entityId: string,
  kinds: readonly SyncOperationKind[],
): Promise<SyncOperationRow<SyncOperationPayload> | undefined> {
  return db.syncOperations
    .where('entityId')
    .equals(entityId)
    .filter((operation) => operation.status === 'pending' && kinds.includes(operation.kind))
    .first();
}
