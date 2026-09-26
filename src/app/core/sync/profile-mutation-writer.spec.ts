import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { ProfileMutationWriter } from './profile-mutation-writer';

let db: AccountDb;

function setup(): ProfileMutationWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('profile-mutation-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'profile-mutation-writer-test' });
  return TestBed.inject(ProfileMutationWriter);
}

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — grava o nome de exibição com o relógio da operação', async () => {
  const writer = setup();
  const profile = await writer.execute({ kind: 'profile_patch', displayName: 'Ana Paula' });
  expect(profile.displayName).toBe('Ana Paula');
  expect(profile.displayNameClock).not.toBeNull();
  expect(await db.syncOperations.count()).toBe(1);
});

it('TU — patch com o mesmo nome atual não grava nem enfileira nada', async () => {
  const writer = setup();
  await writer.execute({ kind: 'profile_patch', displayName: 'Ana Paula' });
  await writer.execute({ kind: 'profile_patch', displayName: 'Ana Paula' });
  expect(await db.syncOperations.count()).toBe(1);
});
