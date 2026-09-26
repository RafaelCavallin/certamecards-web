import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { SyncLease } from './sync-lease';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

const NOW = Date.parse('2026-09-17T12:00:00.000Z');

it('TU — acquire concede o lease quando não há dono ativo', async () => {
  db = new AccountDb('user-lease-test-1');
  const lease = new SyncLease(db, 'tab-a');
  expect(await lease.acquire(NOW)).toBe(true);
  expect(await db.getLease()).toEqual({ ownerId: 'tab-a', expiresAt: new Date(NOW + 15_000).toISOString() });
});

it('TU — acquire recusa outra aba enquanto o lease de dono diferente é válido', async () => {
  db = new AccountDb('user-lease-test-2');
  await new SyncLease(db, 'tab-a').acquire(NOW);
  const other = new SyncLease(db, 'tab-b');
  expect(await other.acquire(NOW + 1_000)).toBe(false);
});

it('TU — acquire recupera um lease expirado de outra aba', async () => {
  db = new AccountDb('user-lease-test-3');
  await new SyncLease(db, 'tab-a').acquire(NOW);
  const other = new SyncLease(db, 'tab-b');
  expect(await other.acquire(NOW + 20_000)).toBe(true);
});

it('TU — heartbeat renova o lease só para o dono atual', async () => {
  db = new AccountDb('user-lease-test-4');
  const owner = new SyncLease(db, 'tab-a');
  await owner.acquire(NOW);
  await new SyncLease(db, 'tab-b').heartbeat(NOW + 1_000);
  expect(await db.getLease()).toEqual({ ownerId: 'tab-a', expiresAt: new Date(NOW + 15_000).toISOString() });
  await owner.heartbeat(NOW + 5_000);
  expect(await db.getLease()).toEqual({ ownerId: 'tab-a', expiresAt: new Date(NOW + 20_000).toISOString() });
});

it('TU — release libera o lease só quando quem chama é o dono atual', async () => {
  db = new AccountDb('user-lease-test-5');
  const owner = new SyncLease(db, 'tab-a');
  await owner.acquire(NOW);
  await new SyncLease(db, 'tab-b').release();
  expect(await db.getLease()).not.toBeNull();
  await owner.release();
  expect(await db.getLease()).toBeNull();
});
