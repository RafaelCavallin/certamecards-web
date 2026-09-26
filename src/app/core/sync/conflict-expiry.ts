import type { AccountDb } from '../db/account-db';
import type { ConflictCacheRow } from '../db/account-db.model';

export function isConflictExpired(row: ConflictCacheRow, nowIso: string): boolean {
  return row.expiresAt !== '' && row.expiresAt <= nowIso;
}
export function withExpiredSnapshotsStripped(rows: readonly ConflictCacheRow[], nowIso: string): readonly ConflictCacheRow[] {
  return rows.map((row) => (row.detail !== null && isConflictExpired(row, nowIso) ? { ...row, detail: null } : row));
}
export async function pruneExpiredConflictSnapshots(db: AccountDb, nowIso: string): Promise<void> {
  const rows = await db.conflicts.toArray();
  const expiredIds = rows.filter((row) => row.detail !== null && isConflictExpired(row, nowIso)).map((row) => row.id);
  if (expiredIds.length === 0) {
    return;
  }
  await db.conflicts.where('id').anyOf(expiredIds).modify({ detail: null });
}
