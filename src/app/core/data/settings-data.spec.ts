import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { SettingsApi } from '../api/settings-api';
import { AuthStore } from '../auth/auth-store';
import { LocalDb } from '../db/local-db';
import { SettingsData } from './settings-data';

let db: LocalDb;

function setup(userId: string | null, settingsApi: Partial<SettingsApi> = {}): SettingsData {
  const user = userId === null ? null : { id: userId, email: 'a@a.com', displayName: 'Ana', role: 'candidate' as const, termsAccepted: true };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: () => user } },
      { provide: SettingsApi, useValue: settingsApi },
    ],
  });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(SettingsData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — current devolve undefined sem usuário autenticado', () => {
  const settingsData = setup(null);
  expect(settingsData.current()).toBeUndefined();
});

it('TU — current devolve os ajustes gravados para o usuário atual', async () => {
  const settingsData = setup('u1');
  await db.settings.add({
    userId: 'u1',
    newPerDay: 20,
    reviewsPerDay: 9999,
    focusMinutes: 25,
    examDate: '2026-11-08',
    timeZone: 'America/Sao_Paulo',
    theme: 'noite',
    changeSeq: 1,
  });
  await waitFor(() => settingsData.current() !== undefined);
  expect(settingsData.current()).toMatchObject({ newPerDay: 20, examDate: '2026-11-08' });
});

it('TU — update envia à API e grava o resultado no Dexie', async () => {
  const updated = {
    newPerDay: 30,
    reviewsPerDay: 100,
    focusMinutes: 30,
    examDate: null,
    timeZone: 'America/Sao_Paulo',
    theme: 'dia' as const,
    changeSeq: 2,
  };
  const settingsApi = { update: vi.fn().mockResolvedValue(updated) };
  const settingsData = setup('u1', settingsApi);
  const request = {
    newPerDay: updated.newPerDay,
    reviewsPerDay: updated.reviewsPerDay,
    focusMinutes: updated.focusMinutes,
    examDate: updated.examDate,
    timeZone: updated.timeZone,
    theme: updated.theme,
  };

  await settingsData.update(request);

  expect(settingsApi.update).toHaveBeenCalledWith(request);
  await waitFor(() => settingsData.current()?.changeSeq === 2);
  expect(settingsData.current()).toMatchObject({ userId: 'u1', newPerDay: 30 });
});
