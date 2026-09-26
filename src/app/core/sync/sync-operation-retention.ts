import type { AccountDb } from '../db/account-db';

export const SYNCED_OPERATION_RETENTION_MS = 24 * 60 * 60 * 1000;
export async function purgeSyncedOperations(db: AccountDb, nowMs: number): Promise<number> {
  const expired = await db.syncOperations
    .where('status')
    .equals('synced')
    .filter((operation) => operation.syncedAt !== null && nowMs - Date.parse(operation.syncedAt) >= SYNCED_OPERATION_RETENTION_MS)
    .primaryKeys();
  await db.syncOperations.bulkDelete(expired);
  return expired.length;
}
