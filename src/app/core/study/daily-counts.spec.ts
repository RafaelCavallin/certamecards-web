import { expect, it } from 'vitest';
import type { ReviewLogRow } from '../db/account-db.model';
import { dailyCounts } from './daily-counts';
import type { StudyDayWindow } from './queue.model';

const DAY: StudyDayWindow = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };

function aLog(overrides: Partial<ReviewLogRow> = {}): ReviewLogRow {
  return {
    id: 'log-1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-18T12:00:00Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1',
    sessionId: null, changeSeq: 1, voided: false, eventAt: '2026-09-18T12:00:00Z', eventCounter: 0,
    eventDeviceId: 'device-1', operationId: 'log-1', ...overrides,
  };
}

it('TU-13 — conta novos a partir de stateBefore nulo ou estado 0, ignora anuladas e soma dispositivos', () => {
  const logs: ReviewLogRow[] = [
    aLog({ id: 'l1', stateBefore: null, rating: 3, deviceId: 'device-1' }),
    aLog({ id: 'l2', stateBefore: { state: 0 }, rating: 4, deviceId: 'device-2' }),
    aLog({ id: 'l3', stateBefore: { state: 2 }, rating: 1 }),
    aLog({ id: 'l4', stateBefore: { state: 2 }, rating: 3, voided: true }),
    aLog({ id: 'l5', stateBefore: { state: 2 }, reviewedAt: '2026-09-17T12:00:00Z', rating: 3 }),
    aLog({ id: 'l6', kind: 'reset', rating: null }),
  ];
  const counts = dailyCounts(logs, DAY);
  expect(counts.newCards).toBe(2);
  expect(counts.reviews).toBe(3);
  expect(counts.correct).toBe(2);
});
