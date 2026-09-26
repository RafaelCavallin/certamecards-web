import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountActivator } from './account-activator';
import { AccountDbResolver } from './account-db-resolver';
import type { AccountDb } from './account-db';
import { BootstrapDb } from './bootstrap-db';
import { CurrentAccountDb } from './current-account-db';

let bootstrapDb: BootstrapDb;
let accountDb: AccountDb | null = null;

afterEach(async () => {
  await bootstrapDb?.delete();
  await accountDb?.delete();
  accountDb = null;
});

it('TU-78 — reauthenticate reabre a conta bloqueada e devolve as operações auth_required para pending', async () => {
  TestBed.configureTestingModule({});
  bootstrapDb = TestBed.inject(BootstrapDb);
  const resolver = TestBed.inject(AccountDbResolver);
  const activator = TestBed.inject(AccountActivator);
  accountDb = await activator.open('activator-user-1');
  await accountDb.syncOperations.add({
    operationId: 'op-1', accountId: 'activator-user-1', deviceId: 'device-1', deviceSequence: 1,
    kind: 'deck_delete', entityId: 'd1', parentId: null, baseVersion: 1, predecessorOperationId: null,
    dependsOn: [], occurredAt: '2026-09-24T00:00:00Z', clock: { wallTime: '2026-09-24T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-24T00:00:00Z', payload: { kind: 'deck_delete', deckId: 'd1' },
    status: 'auth_required', attempts: 1, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
  });
  await resolver.block('activator-user-1');
  const reopened = await activator.reauthenticate('activator-user-1');
  expect(reopened).toBe(accountDb);
  expect(await reopened.syncOperations.get('op-1')).toMatchObject({ status: 'pending' });
  expect((await bootstrapDb.getAccount('activator-user-1'))?.blockedAt).toBeNull();
  expect(TestBed.inject(CurrentAccountDb).require().userId).toBe('activator-user-1');
});
