import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
function isSelectableStatus(operation: Operation, nowMs: number): boolean {
  if (operation.status === 'pending' || operation.status === 'retry_wait') {
    return true;
  }
  if (operation.status !== 'sending') {
    return false;
  }
  return operation.leaseUntil !== null && Date.parse(operation.leaseUntil) <= nowMs;
}
function isRetryDue(operation: Operation, nowMs: number): boolean {
  return operation.retryAt === null || Date.parse(operation.retryAt) <= nowMs;
}
function dependenciesSatisfied(
  operation: Operation,
  syncedIds: ReadonlySet<string>,
  knownIds: ReadonlySet<string>,
): boolean {
  return operation.dependsOn.every((id) => syncedIds.has(id) || !knownIds.has(id));
}
export async function selectReadyOperations(
  db: AccountDb,
  nowMs: number,
  limit: number,
): Promise<readonly Operation[]> {
  const all = await db.syncOperations.orderBy('deviceSequence').toArray();
  const syncedIds = new Set(all.filter((operation) => operation.status === 'synced').map((op) => op.operationId));
  const knownIds = new Set(all.map((operation) => operation.operationId));
  const ready = all.filter(
    (operation) =>
      isSelectableStatus(operation, nowMs) &&
      isRetryDue(operation, nowMs) &&
      dependenciesSatisfied(operation, syncedIds, knownIds),
  );
  return ready.slice(0, limit);
}
export async function markOperationsSending(
  db: AccountDb,
  operations: readonly Operation[],
  leaseUntilIso: string,
): Promise<void> {
  for (const operation of operations) {
    await db.syncOperations.update(operation.operationId, {
      status: 'sending',
      leaseUntil: leaseUntilIso,
      attempts: operation.attempts + 1,
    });
  }
}
export async function recoverOrphanedLeases(db: AccountDb, nowMs: number): Promise<void> {
  const nowIso = new Date(nowMs).toISOString();
  await db.syncOperations.where('status').equals('sending').modify({ leaseUntil: nowIso });
}
