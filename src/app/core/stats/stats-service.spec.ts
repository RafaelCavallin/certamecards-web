import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { SettingsData } from '../data/settings-data';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { StatsService } from './stats-service';

const NOW = new Date('2026-09-17T18:00:00Z');
let db: AccountDb;

function setup(): StatsService {
  TestBed.configureTestingModule({
    providers: [{ provide: SettingsData, useValue: { current: () => ({ timeZone: 'America/Sao_Paulo' }) } }],
  });
  db = new AccountDb('stats-service-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'stats-service-test' });
  return TestBed.inject(StatsService);
}

afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
});

it('TU-18 — last14Days conta as revisões gravadas localmente', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  const statsService = setup();
  await db.reviewLogs.add({
    id: 'log-1',
    cardId: 'card-1',
    kind: 'review',
    rating: 4,
    reviewedAt: NOW.toISOString(),
    durationMs: 5_000,
    stateBefore: null,
    stateAfter: null,
    offline: false,
    deviceId: 'device-1',
    sessionId: null,
    changeSeq: 1,
    voided: false,
    eventAt: NOW.toISOString(),
    eventCounter: 0,
    eventDeviceId: 'device-1',
    operationId: 'log-1',
  });

  await waitFor(() => statsService.last14Days().totalReviews === 1);

  expect(statsService.last14Days().accuracyPercent).toBe(100);
});
