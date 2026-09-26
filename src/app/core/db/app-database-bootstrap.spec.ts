import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDbResolver } from './account-db-resolver';
import { AppDatabaseBootstrap } from './app-database-bootstrap';
import { BootstrapDb } from './bootstrap-db';
import { CurrentAccountDb } from './current-account-db';
import { LocalDb } from './local-db';

let bootstrapDb: BootstrapDb;

afterEach(async () => {
  await bootstrapDb?.delete();
});

const SESSION = {
  userId: 'bootstrap-user-1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate' as const, termsAccepted: true,
};

it('TU — run devolve null e não abre conta quando não há sessão local', async () => {
  TestBed.configureTestingModule({});
  bootstrapDb = TestBed.inject(BootstrapDb);
  const bootstrap = TestBed.inject(AppDatabaseBootstrap);
  expect(await bootstrap.run()).toBeNull();
});

it('TU — run abre o AccountDb da sessão e migra os dados legados antes de devolvê-lo', async () => {
  TestBed.configureTestingModule({});
  bootstrapDb = TestBed.inject(BootstrapDb);
  await bootstrapDb.setSession(SESSION);
  const legacyDb = TestBed.inject(LocalDb);
  await legacyDb.decks.put({
    id: 'deck-1', subjectId: 'subject-1', name: 'CF/88', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null,
    version: 1, changeSeq: 1,
  });
  const bootstrap = TestBed.inject(AppDatabaseBootstrap);
  const accountDb = await bootstrap.run();
  expect(accountDb?.userId).toBe(SESSION.userId);
  expect(await accountDb?.decks.count()).toBe(1);
  expect(await legacyDb.decks.count()).toBe(0);
  expect(TestBed.inject(CurrentAccountDb).require().userId).toBe(SESSION.userId);
  await accountDb?.delete();
});

it('TU-78 — run limpa a sessão local e devolve null quando a conta está bloqueada', async () => {
  TestBed.configureTestingModule({});
  bootstrapDb = TestBed.inject(BootstrapDb);
  await bootstrapDb.setSession(SESSION);
  const resolver = TestBed.inject(AccountDbResolver);
  const blocked = await resolver.open(SESSION.userId);
  await resolver.block(SESSION.userId);
  const bootstrap = TestBed.inject(AppDatabaseBootstrap);
  expect(await bootstrap.run()).toBeNull();
  expect(await bootstrapDb.getSession()).toBeNull();
  expect(TestBed.inject(CurrentAccountDb).current()).toBeNull();
  await blocked.delete();
});
