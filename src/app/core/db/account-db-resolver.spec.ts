import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import type { AccountDb } from './account-db';
import { AccountDbResolver, RevokedAccountError } from './account-db-resolver';
import { BootstrapDb } from './bootstrap-db';

let bootstrapDb: BootstrapDb;
let openedDbs: AccountDb[] = [];

afterEach(async () => {
  await bootstrapDb?.delete();
  await Promise.all(openedDbs.map((db) => db.delete()));
  openedDbs = [];
});

function resolver(): AccountDbResolver {
  TestBed.configureTestingModule({});
  bootstrapDb = TestBed.inject(BootstrapDb);
  return TestBed.inject(AccountDbResolver);
}

it('TU-78 — open cria o registro da conta e retorna o mesmo AccountDb em chamadas seguintes', async () => {
  const target = resolver();
  const first = await target.open('resolver-user-1');
  openedDbs.push(first);
  const second = await target.open('resolver-user-1');
  expect(second).toBe(first);
  expect(await bootstrapDb.getActiveAccountId()).toBe('resolver-user-1');
});

it('TU-78 — open recusa uma conta bloqueada sem apagar o registro', async () => {
  const target = resolver();
  const opened = await target.open('resolver-user-2');
  openedDbs.push(opened);
  await target.block('resolver-user-2');
  await expect(target.open('resolver-user-2')).rejects.toBeInstanceOf(RevokedAccountError);
  expect(await bootstrapDb.getAccount('resolver-user-2')).not.toBeUndefined();
});

it('TU-78 — unblock reabre a fila da conta com o mesmo userId', async () => {
  const target = resolver();
  const opened = await target.open('resolver-user-3');
  openedDbs.push(opened);
  await target.block('resolver-user-3');
  const reopened = await target.unblock('resolver-user-3');
  expect(reopened).toBe(opened);
  expect((await bootstrapDb.getAccount('resolver-user-3'))?.blockedAt).toBeNull();
});
