import { expect, it } from 'vitest';
import type { ReviewLogRow } from '../db/local-db.model';
import { compareReviewLogs } from './review-log-order';

function aLog(overrides: Partial<ReviewLogRow> = {}): ReviewLogRow {
  return {
    id: 'a', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-17T12:00:00Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1',
    sessionId: null, changeSeq: 1, voided: false, ...overrides,
  };
}

it('TU — ordena por reviewedAt quando diferente', () => {
  const earlier = aLog({ id: 'z', reviewedAt: '2026-09-17T10:00:00Z' });
  const later = aLog({ id: 'a', reviewedAt: '2026-09-17T11:00:00Z' });
  expect(compareReviewLogs(earlier, later)).toBeLessThan(0);
  expect(compareReviewLogs(later, earlier)).toBeGreaterThan(0);
});

it('TU — desempata por id quando reviewedAt é igual', () => {
  const first = aLog({ id: 'a' });
  const second = aLog({ id: 'b' });
  expect(compareReviewLogs(first, second)).toBeLessThan(0);
  expect(compareReviewLogs(second, first)).toBeGreaterThan(0);
});

it('TU — id igual devolve 0', () => {
  const log = aLog({ id: 'a' });
  expect(compareReviewLogs(log, { ...log })).toBe(0);
});
