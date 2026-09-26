import { expect, it } from 'vitest';
import type { ReviewLogRow } from '../db/account-db.model';
import { computeLast14Days } from './last-14-days';

const SAO_PAULO = 'America/Sao_Paulo';
const NOW = new Date('2026-09-17T18:00:00Z');
function reviewLog(overrides: Partial<ReviewLogRow>): ReviewLogRow {
  const id = crypto.randomUUID();
  return {
    id,
    cardId: 'card-1',
    kind: 'review',
    rating: 3,
    reviewedAt: NOW.toISOString(),
    durationMs: 6_000,
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
    operationId: id,
    ...overrides,
  };
}
function reviewLogs(count: number, rating: number): ReviewLogRow[] {
  return Array.from({ length: count }, () => reviewLog({ rating }));
}
it('TU-18 — soma 10 revisões de hoje com acerto de Bom e Fácil, sem anuladas', () => {
  const logs = [...reviewLogs(5, 3), ...reviewLogs(2, 4), ...reviewLogs(3, 2), reviewLog({ rating: 4, voided: true })];
  const stats = computeLast14Days(logs, NOW, SAO_PAULO);
  expect(stats.totalReviews).toBe(10);
  expect(stats.accuracyPercent).toBe(70);
  expect(stats.days.at(-1)?.reviews).toBe(10);
});
it('TU-18 — exclui avaliações fora da janela de 14 dias', () => {
  const outsideWindow = reviewLog({ reviewedAt: new Date(NOW.getTime() - 20 * 86_400_000).toISOString() });
  const stats = computeLast14Days([outsideWindow], NOW, SAO_PAULO);
  expect(stats.totalReviews).toBe(0);
  expect(stats.days).toHaveLength(14);
});
it('TU-18 — soma minutos de foco a partir da duração das revisões', () => {
  const logs = [reviewLog({ durationMs: 30_000 }), reviewLog({ durationMs: 30_000 })];
  const stats = computeLast14Days(logs, NOW, SAO_PAULO);
  expect(stats.focusMinutes).toBe(1);
});
