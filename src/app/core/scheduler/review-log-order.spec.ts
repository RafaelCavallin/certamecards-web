import { expect, it } from 'vitest';
import type { ReviewLogRow } from '../db/account-db.model';
import { compareEventOrder, compareReviewLogs } from './review-log-order';

function aLog(overrides: Partial<ReviewLogRow> = {}): ReviewLogRow {
  return {
    id: 'a', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-17T12:00:00Z',
    durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1',
    sessionId: null, changeSeq: 1, voided: false, eventAt: '2026-09-17T12:00:00Z', eventCounter: 0,
    eventDeviceId: 'device-1', operationId: 'a', ...overrides,
  };
}

it('TU-76 — ordena por eventAt quando diferente', () => {
  const earlier = aLog({ id: 'z', eventAt: '2026-09-17T10:00:00Z' });
  const later = aLog({ id: 'a', eventAt: '2026-09-17T11:00:00Z' });
  expect(compareReviewLogs(earlier, later)).toBeLessThan(0);
  expect(compareReviewLogs(later, earlier)).toBeGreaterThan(0);
});

it('TU-76 — desempata por eventCounter quando eventAt é igual', () => {
  const first = aLog({ eventCounter: 0 });
  const second = aLog({ eventCounter: 1 });
  expect(compareReviewLogs(first, second)).toBeLessThan(0);
  expect(compareReviewLogs(second, first)).toBeGreaterThan(0);
});

it('TU-76 — desempata por eventDeviceId quando eventAt e eventCounter são iguais', () => {
  const first = aLog({ eventDeviceId: 'device-a' });
  const second = aLog({ eventDeviceId: 'device-b' });
  expect(compareReviewLogs(first, second)).toBeLessThan(0);
  expect(compareReviewLogs(second, first)).toBeGreaterThan(0);
});

it('TU-76 — desempata por operationId em comparação binária quando tudo mais é igual', () => {
  const first = aLog({ operationId: '0199a000-0000-7000-8000-000000000001' });
  const second = aLog({ operationId: '0199a000-0000-7000-8000-000000000002' });
  expect(compareReviewLogs(first, second)).toBeLessThan(0);
  expect(compareReviewLogs(second, first)).toBeGreaterThan(0);
});

it('TU-76 — dois fatos idênticos na tupla canônica devolvem 0', () => {
  const log = aLog();
  expect(compareReviewLogs(log, { ...log, id: 'other' })).toBe(0);
});

it('TU-76 — compareEventOrder opera diretamente sobre a tupla', () => {
  const order = { eventAt: '2026-09-17T12:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'a' };
  expect(compareEventOrder(order, { ...order, logicalCounter: 1 })).toBeLessThan(0);
});
