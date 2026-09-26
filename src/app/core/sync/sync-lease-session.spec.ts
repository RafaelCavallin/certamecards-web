import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { withAccountLease } from './sync-lease-session';

let db: AccountDb;

afterEach(async () => {
  await db.delete();
});

it('TU — executa o corpo e libera a lease ao final', async () => {
  db = new AccountDb('sync-lease-session-test-1');
  let ran = false;
  await withAccountLease(db, 'device-1', async () => {
    ran = true;
    expect(await db.getLease()).toMatchObject({ ownerId: 'device-1' });
  });
  expect(ran).toBe(true);
  expect(await db.getLease()).toBeNull();
});

it('TU — não executa o corpo quando outra sessão já detém a lease', async () => {
  db = new AccountDb('sync-lease-session-test-2');
  await db.setLease({ ownerId: 'other-device', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  let ran = false;
  await withAccountLease(db, 'device-1', () => {
    ran = true;
    return Promise.resolve();
  });
  expect(ran).toBe(false);
});

it('TU — libera a lease mesmo quando o corpo lança erro', async () => {
  db = new AccountDb('sync-lease-session-test-3');
  await expect(
    withAccountLease(db, 'device-1', () => {
      throw new Error('falhou');
    }),
  ).rejects.toThrow('falhou');
  expect(await db.getLease()).toBeNull();
});
