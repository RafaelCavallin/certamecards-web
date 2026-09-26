import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { SyncApi } from '../api/sync-api';
import type { ConflictDetail } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import type { ConflictCacheRow } from '../db/account-db.model';
import { ConflictCache, ConflictExpiredError } from './conflict-cache';

let db: AccountDb;
const DETAIL: ConflictDetail = {
  id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'concurrent_edit',
  losingSnapshot: { front: 'Q' }, winningSnapshot: null, currentVersion: 2, currentDeleted: false,
  expiresAt: '2026-10-01T00:00:00Z', restoredAt: null,
};
function aRow(overrides: Partial<ConflictCacheRow> = {}): ConflictCacheRow {
  return {
    id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: null, reason: 'concurrent_edit',
    expiresAt: '2026-10-01T00:00:00Z', detail: null, ...overrides,
  };
}
function setup(conflictDetail: ReturnType<typeof vi.fn>): ConflictCache {
  TestBed.configureTestingModule({ providers: [{ provide: SyncApi, useValue: { conflictDetail } }] });
  db = new AccountDb('conflict-cache-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'conflict-cache-test' });
  return TestBed.inject(ConflictCache);
}

afterEach(async () => {
  await db.delete();
});

it('TU — all lista os conflitos por expiresAt crescente', async () => {
  const cache = setup(vi.fn());
  await db.conflicts.bulkPut([
    aRow({ id: 'conf-later', expiresAt: '2026-11-01T00:00:00Z' }),
    aRow({ id: 'conf-earlier', expiresAt: '2026-09-20T00:00:00Z' }),
  ]);
  await waitFor(() => cache.all().length === 2);
  expect(cache.all().map((row) => row.id)).toEqual(['conf-earlier', 'conf-later']);
});

it('TU — loadDetail busca e guarda o detalhe quando ainda não está em cache', async () => {
  const conflictDetail = vi.fn().mockResolvedValue(DETAIL);
  const cache = setup(conflictDetail);
  await db.conflicts.put(aRow());
  const detail = await cache.loadDetail('conf-1');
  expect(detail).toEqual(DETAIL);
  expect(conflictDetail).toHaveBeenCalledWith('conf-1');
  expect((await db.conflicts.get('conf-1'))?.detail).toEqual(DETAIL);
});

it('TU — loadDetail devolve o detalhe já cacheado sem chamar a API', async () => {
  const conflictDetail = vi.fn();
  const cache = setup(conflictDetail);
  await db.conflicts.put(aRow({ detail: DETAIL }));
  const detail = await cache.loadDetail('conf-1');
  expect(detail).toEqual(DETAIL);
  expect(conflictDetail).not.toHaveBeenCalled();
});

it('TU-81 — loadDetail recusa buscar um conflito expirado localmente', async () => {
  const conflictDetail = vi.fn();
  const cache = setup(conflictDetail);
  await db.conflicts.put(aRow({ expiresAt: '2020-01-01T00:00:00Z' }));
  await expect(cache.loadDetail('conf-1')).rejects.toBeInstanceOf(ConflictExpiredError);
  expect(conflictDetail).not.toHaveBeenCalled();
});

it('TU — loadDetail marca erro quando a API falha e limpa ao ter sucesso depois', async () => {
  const conflictDetail = vi.fn().mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValueOnce(DETAIL);
  const cache = setup(conflictDetail);
  await db.conflicts.put(aRow());
  await expect(cache.loadDetail('conf-1')).rejects.toThrow('falha de rede');
  expect(cache.hasError('conf-1')).toBe(true);
  await cache.loadDetail('conf-1');
  expect(cache.hasError('conf-1')).toBe(false);
});
