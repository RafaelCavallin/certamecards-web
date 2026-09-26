import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { SettingsMutationWriter } from './settings-mutation-writer';

let db: AccountDb;

function setup(): SettingsMutationWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('settings-mutation-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'settings-mutation-writer-test' });
  return TestBed.inject(SettingsMutationWriter);
}
const BASE_REQUEST = {
  newPerDay: 20, reviewsPerDay: 200, focusMinutes: 25, examDate: null,
  timeZone: 'America/Sao_Paulo', theme: 'auto' as const,
};

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — grava só os campos alterados e avança o relógio deles', async () => {
  const writer = setup();
  const updated = await writer.execute({ kind: 'settings_patch', changes: { ...BASE_REQUEST, newPerDay: 35, theme: 'dia' } });
  expect(updated.newPerDay).toBe(35);
  expect(updated.theme).toBe('dia');
  const ops = await db.syncOperations.toArray();
  expect(ops).toHaveLength(1);
  expect(ops[0]?.payload).toEqual({ kind: 'settings_patch', changes: { newPerDay: 35, theme: 'dia' } });
});

it('TU — patch sem nenhum campo alterado não grava nem enfileira nada', async () => {
  const writer = setup();
  const result = await writer.execute({ kind: 'settings_patch', changes: BASE_REQUEST });
  expect(result.newPerDay).toBe(BASE_REQUEST.newPerDay);
  expect(await db.syncOperations.count()).toBe(0);
});

it('TU — campos diferentes em duas edições combinam seus relógios', async () => {
  const writer = setup();
  await writer.execute({ kind: 'settings_patch', changes: { ...BASE_REQUEST, newPerDay: 35 } });
  await writer.execute({ kind: 'settings_patch', changes: { ...BASE_REQUEST, newPerDay: 35, focusMinutes: 45 } });
  const stored = await db.settings.get('settings-mutation-writer-test');
  expect(stored?.fieldClocks.newPerDay).toBeDefined();
  expect(stored?.fieldClocks.focusMinutes).toBeDefined();
  expect(await db.syncOperations.count()).toBe(2);
});
