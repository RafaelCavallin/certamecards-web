import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { accountLiveSignal } from './account-live-query';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

it('TU — devolve o valor inicial enquanto não há conta ativa', () => {
  TestBed.configureTestingModule({});
  const currentAccountDb = TestBed.inject(CurrentAccountDb);
  const injector = TestBed.inject(Injector);
  const signal = accountLiveSignal(injector, currentAccountDb, { query: (account) => account.db.subjects.toArray(), initialValue: [] });
  expect(signal()).toEqual([]);
});

it('TU — reflete as escritas feitas na conta ativa', async () => {
  TestBed.configureTestingModule({});
  db = new AccountDb('account-live-query-test');
  const currentAccountDb = TestBed.inject(CurrentAccountDb);
  const injector = TestBed.inject(Injector);
  currentAccountDb.set({ db, userId: 'account-live-query-test' });
  const signal = accountLiveSignal(injector, currentAccountDb, { query: (account) => account.db.subjects.toArray(), initialValue: [] });
  await db.subjects.add({ id: 's1', name: 'Direito', active: true, changeSeq: 1 });
  await waitFor(() => signal().length > 0);
  expect(signal().map((subject) => subject.id)).toEqual(['s1']);
});
