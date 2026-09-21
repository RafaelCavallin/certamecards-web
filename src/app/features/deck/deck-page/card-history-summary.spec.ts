import { expect, it } from 'vitest';
import type { CardHistory } from '../../../core/api/cards-api';
import { summarizeCardHistory } from './card-history-summary';

it('TU-04 — conta revisões e erros ignorando anuladas', () => {
  const history: CardHistory = {
    reviewLogs: [
      { id: 'r1', cardId: 'c1', kind: 'review', rating: 1, reviewedAt: '2026-09-10T00:00:00Z', durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'd1', sessionId: null, changeSeq: 1 },
      { id: 'r2', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-15T00:00:00Z', durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'd1', sessionId: null, changeSeq: 2 },
      { id: 'r3', cardId: 'c1', kind: 'review', rating: 1, reviewedAt: '2026-09-16T00:00:00Z', durationMs: 1000, stateBefore: null, stateAfter: {}, offline: false, deviceId: 'd1', sessionId: null, changeSeq: 3 },
    ],
    reviewVoids: [{ reviewId: 'r3', voidedAt: '2026-09-16T00:01:00Z', changeSeq: 4 }],
  };
  const summary = summarizeCardHistory(history);
  expect(summary).toEqual({ reviews: 2, again: 1, lastReviewedAt: '2026-09-15T00:00:00Z' });
});

it('TU-04 — histórico vazio devolve zeros', () => {
  expect(summarizeCardHistory({ reviewLogs: [], reviewVoids: [] })).toEqual({
    reviews: 0,
    again: 0,
    lastReviewedAt: null,
  });
});
