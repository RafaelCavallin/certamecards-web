import { afterEach, expect, it } from 'vitest';
import { AccountDb, accountDatabaseName } from './account-db';

let db: AccountDb | undefined;

afterEach(async () => {
  await db?.delete();
});

it('TU — accountDatabaseName monta um nome de banco isolado por conta', () => {
  expect(accountDatabaseName('user-1')).toBe('certamecards-account-user-1');
});

it('TU — getCursor devolve 0 quando nunca foi gravado', async () => {
  db = new AccountDb('user-account-test-1');
  expect(await db.getCursor()).toBe(0);
});

it('TU — setCursor grava e getCursor devolve o valor gravado', async () => {
  db = new AccountDb('user-account-test-2');
  await db.setCursor(1042);
  expect(await db.getCursor()).toBe(1042);
});

it('TU — setLastSyncAt e setServerTime gravam os respectivos marcadores', async () => {
  db = new AccountDb('user-account-test-3');
  await db.setLastSyncAt('2026-09-17T12:00:00.000Z');
  await db.setServerTime('2026-09-17T12:00:05.000Z');
  expect((await db.meta.get('lastSyncAt'))?.value).toBe('2026-09-17T12:00:00.000Z');
  expect((await db.meta.get('serverTime'))?.value).toBe('2026-09-17T12:00:05.000Z');
});

it('TU — getServerTime devolve a época quando nunca foi gravado e o valor depois de setServerTime', async () => {
  db = new AccountDb('user-account-test-4');
  expect(await db.getServerTime()).toBe(new Date(0).toISOString());
  await db.setServerTime('2026-09-17T12:00:05.000Z');
  expect(await db.getServerTime()).toBe('2026-09-17T12:00:05.000Z');
});

it('TU — getClock devolve null quando nunca foi gravado e o valor gravado depois', async () => {
  db = new AccountDb('user-account-test-4');
  expect(await db.getClock()).toBeNull();
  const clock = { wallTime: '2026-09-17T12:00:00.000Z', logicalCounter: 2 };
  await db.setClock(clock);
  expect(await db.getClock()).toEqual(clock);
});

it('TU — getLease devolve null quando nunca foi gravado e o valor gravado depois', async () => {
  db = new AccountDb('user-account-test-5');
  expect(await db.getLease()).toBeNull();
  const lease = { ownerId: 'tab-a', expiresAt: '2026-09-17T12:00:15.000Z' };
  await db.setLease(lease);
  expect(await db.getLease()).toEqual(lease);
  await db.setLease(null);
  expect(await db.getLease()).toBeNull();
});

it('TU — getDeviceSequence devolve 0 quando nunca foi gravado e o valor gravado depois', async () => {
  db = new AccountDb('user-account-test-7');
  expect(await db.getDeviceSequence()).toBe(0);
  await db.setDeviceSequence(5);
  expect(await db.getDeviceSequence()).toBe(5);
});

it('TU — as stores de conteúdo gravam e recuperam registros por chave', async () => {
  db = new AccountDb('user-account-test-6');
  await db.deckResets.put({ operationId: 'op-1', deckId: 'deck-1', eventAt: '2026-09-17T12:00:00.000Z' });
  await db.reviewVoids.put({ reviewId: 'review-1', voidedAt: '2026-09-17T12:00:00.000Z', cardId: 'card-1' });
  await db.profile.put({ userId: 'user-account-test-6', displayName: 'Ana', displayNameClock: null });
  await db.conflicts.put({
    id: 'conflict-1', entityType: 'card', entityId: 'card-1', deckId: null, reason: 'concurrent_edit',
    expiresAt: '2026-10-17T12:00:00.000Z', detail: null,
  });
  expect(await db.deckResets.count()).toBe(1);
  expect(await db.reviewVoids.count()).toBe(1);
  expect((await db.profile.get('user-account-test-6'))?.displayName).toBe('Ana');
  expect(await db.conflicts.count()).toBe(1);
});
