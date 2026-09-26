import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { SettingsData } from './settings-data';

let db: AccountDb;

function setup(): SettingsData {
  TestBed.configureTestingModule({});
  db = new AccountDb('settings-data-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'settings-data-test' });
  return TestBed.inject(SettingsData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — current devolve os ajustes gravados para a conta atual', async () => {
  const settingsData = setup();
  await db.settings.add({
    userId: 'settings-data-test', newPerDay: 20, reviewsPerDay: 9999, focusMinutes: 25,
    examDate: '2026-11-08', timeZone: 'America/Sao_Paulo', theme: 'noite', changeSeq: 1, fieldClocks: {},
  });
  await waitFor(() => settingsData.current() !== undefined);
  expect(settingsData.current()).toMatchObject({ newPerDay: 20, examDate: '2026-11-08' });
});

it('TU-67 — update grava os ajustes localmente e registra a operação', async () => {
  const settingsData = setup();
  const request = {
    newPerDay: 30, reviewsPerDay: 100, focusMinutes: 30, examDate: null,
    timeZone: 'America/Sao_Paulo', theme: 'dia' as const,
  };
  await settingsData.update(request);
  await waitFor(() => settingsData.current()?.newPerDay === 30);
  expect(settingsData.current()).toMatchObject({ userId: 'settings-data-test', newPerDay: 30 });
  expect(await db.syncOperations.where('entityId').equals('settings-data-test').count()).toBe(1);
});

it('TU — update repetido com os mesmos valores não registra uma segunda operação', async () => {
  const settingsData = setup();
  const request = {
    newPerDay: 35, reviewsPerDay: 200, focusMinutes: 25, examDate: null,
    timeZone: 'America/Sao_Paulo', theme: 'auto' as const,
  };
  await settingsData.update(request);
  await settingsData.update(request);
  expect(await db.syncOperations.count()).toBe(1);
});
