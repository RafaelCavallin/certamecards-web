import { afterEach, expect, it } from 'vitest';
import { LocalDb } from './local-db';

let db: LocalDb;

afterEach(async () => {
  await db.delete();
});

it('TU — getSession devolve null quando não há sessão guardada', async () => {
  db = new LocalDb();
  expect(await db.getSession()).toBeNull();
});

it('TU — setSession grava e getSession devolve a sessão guardada', async () => {
  db = new LocalDb();
  const session = {
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'candidate' as const,
    termsAccepted: true,
  };
  await db.setSession(session);
  expect(await db.getSession()).toEqual(session);
});

it('TU — clearSession remove a sessão guardada', async () => {
  db = new LocalDb();
  await db.setSession({
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'candidate',
    termsAccepted: true,
  });
  await db.clearSession();
  expect(await db.getSession()).toBeNull();
});

it('TU — getOrCreateDeviceId cria um deviceId na primeira chamada e reaproveita depois', async () => {
  db = new LocalDb();
  const first = await db.getOrCreateDeviceId();
  const second = await db.getOrCreateDeviceId();
  expect(first).toBe(second);
  expect(first.length).toBeGreaterThan(0);
});

it('TU — getCursor devolve 0 quando nunca foi gravado', async () => {
  db = new LocalDb();
  expect(await db.getCursor()).toBe(0);
});

it('TU — setCursor grava e getCursor devolve o valor gravado', async () => {
  db = new LocalDb();
  await db.setCursor(1042);
  expect(await db.getCursor()).toBe(1042);
});

it('TU — setLastSyncAt grava a data da última sincronização', async () => {
  db = new LocalDb();
  await db.setLastSyncAt('2026-09-17T12:00:00Z');
  const row = await db.meta.get('lastSyncAt');
  expect(row?.value).toBe('2026-09-17T12:00:00Z');
});

it('clearAllLocalData apaga todas as tabelas locais, inclusive a outbox', async () => {
  db = new LocalDb();
  await db.setSession({
    userId: 'user-1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate', termsAccepted: true,
  });
  await db.setCursor(500);
  await db.outbox.add({
    kind: 'void', reviewId: 'r1', voidedAt: '2026-09-17T00:00:00Z', cardId: 'c1', state: null,
  });
  await db.clearAllLocalData();
  expect(await db.getSession()).toBeNull();
  expect(await db.outbox.count()).toBe(0);
  expect(await db.getCursor()).toBe(0);
});
