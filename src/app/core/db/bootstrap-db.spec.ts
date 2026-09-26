import { afterEach, expect, it } from 'vitest';
import { BootstrapDb } from './bootstrap-db';

let db: BootstrapDb;

afterEach(async () => {
  await db.delete();
});

const SESSION = {
  userId: 'user-1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate' as const, termsAccepted: true,
};

it('TU — getSession devolve null quando não há sessão guardada', async () => {
  db = new BootstrapDb();
  expect(await db.getSession()).toBeNull();
});

it('TU — setSession grava e getSession devolve a sessão guardada', async () => {
  db = new BootstrapDb();
  await db.setSession(SESSION);
  expect(await db.getSession()).toEqual(SESSION);
});

it('TU — clearSession remove a sessão guardada', async () => {
  db = new BootstrapDb();
  await db.setSession(SESSION);
  await db.clearSession();
  expect(await db.getSession()).toBeNull();
});

it('TU — getOrCreateDeviceId cria um deviceId na primeira chamada e reaproveita depois', async () => {
  db = new BootstrapDb();
  const first = await db.getOrCreateDeviceId();
  const second = await db.getOrCreateDeviceId();
  expect(first).toBe(second);
  expect(first.length).toBeGreaterThan(0);
});

it('TU — getActiveAccountId devolve null antes de qualquer conta ativa', async () => {
  db = new BootstrapDb();
  expect(await db.getActiveAccountId()).toBeNull();
});

it('TU — setActiveAccountId grava e getActiveAccountId devolve a conta ativa', async () => {
  db = new BootstrapDb();
  await db.setActiveAccountId('user-1');
  expect(await db.getActiveAccountId()).toBe('user-1');
});

it('TU — upsertAccount grava e getAccount devolve o registro da conta', async () => {
  db = new BootstrapDb();
  const account = {
    userId: 'user-1', databaseName: 'certamecards-account-user-1', migrationStatus: 'migrated' as const,
    lastAccessedAt: '2026-09-17T12:00:00.000Z', blockedAt: null,
  };
  await db.upsertAccount(account);
  expect(await db.getAccount('user-1')).toEqual(account);
});
