import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { ConflictCacheRow } from '../db/account-db.model';
import { isConflictExpired, pruneExpiredConflictSnapshots, withExpiredSnapshotsStripped } from './conflict-expiry';

let db: AccountDb;
const DETAIL = {
  id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'concurrent_edit', losingSnapshot: { front: 'Q' },
  winningSnapshot: null, currentVersion: 2, currentDeleted: false, expiresAt: '2026-09-17T12:00:00Z', restoredAt: null,
};
function aRow(overrides: Partial<ConflictCacheRow> = {}): ConflictCacheRow {
  return {
    id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'concurrent_edit',
    expiresAt: '2026-09-17T12:00:00Z', detail: DETAIL, ...overrides,
  };
}

afterEach(async () => {
  await db?.delete();
});

it('TU-81 — isConflictExpired compara expiresAt com o relógio atual', () => {
  expect(isConflictExpired(aRow(), '2026-09-17T12:00:01Z')).toBe(true);
  expect(isConflictExpired(aRow(), '2026-09-17T11:59:59Z')).toBe(false);
});

it('TU-81 — withExpiredSnapshotsStripped remove o detalhe dos expirados e preserva os demais', () => {
  const expired = aRow({ id: 'conf-expired' });
  const active = aRow({ id: 'conf-active', expiresAt: '2026-09-20T00:00:00Z' });
  const [strippedExpired, strippedActive] = withExpiredSnapshotsStripped([expired, active], '2026-09-18T00:00:00Z');
  expect(strippedExpired?.detail).toBeNull();
  expect(strippedActive?.detail).toEqual(DETAIL);
});

it('TU-81 — pruneExpiredConflictSnapshots apaga o snapshot mas preserva o registro do conflito', async () => {
  db = new AccountDb('conflict-expiry-test');
  await db.conflicts.put(aRow());
  await pruneExpiredConflictSnapshots(db, '2026-09-18T00:00:00Z');
  const row = await db.conflicts.get('conf-1');
  expect(row).toMatchObject({ id: 'conf-1', detail: null });
});

it('TU-81 — pruneExpiredConflictSnapshots não altera conflitos ainda no prazo', async () => {
  db = new AccountDb('conflict-expiry-test-2');
  await db.conflicts.put(aRow({ expiresAt: '2026-10-01T00:00:00Z' }));
  await pruneExpiredConflictSnapshots(db, '2026-09-18T00:00:00Z');
  const row = await db.conflicts.get('conf-1');
  expect(row?.detail).toEqual(DETAIL);
});
