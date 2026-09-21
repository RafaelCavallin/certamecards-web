import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReviewLog } from '../api/review-log.model';
import { SyncApi } from '../api/sync-api';
import { LocalDb } from '../db/local-db';
import { StaleResolver } from './stale-resolver';

let db: LocalDb;

function aLog(id: string, reviewedAt: string, rating: number): ReviewLog {
  return {
    id, cardId: 'c1', kind: 'review', rating, reviewedAt, durationMs: 1000, stateBefore: null, stateAfter: {},
    offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 5,
  };
}
function setup(cardReviews: ReturnType<typeof vi.fn>): StaleResolver {
  TestBed.configureTestingModule({ providers: [{ provide: SyncApi, useValue: { cardReviews } }] });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(StaleResolver);
}

afterEach(async () => {
  await db.delete();
});

it('TI-24 — refaz o estado a partir do histórico completo do servidor e reenfileira', async () => {
  const cardReviews = vi.fn().mockResolvedValue({
    reviewLogs: [
      aLog('log-a', '2026-09-18T09:00:00Z', 3),
      aLog('log-b', '2026-09-18T10:00:00Z', 4),
    ],
    reviewVoids: [],
  });
  const resolver = setup(cardReviews);
  await resolver.resolve(['c1']);
  expect(cardReviews).toHaveBeenCalledWith('c1');
  const state = await db.cardStates.get('c1');
  expect(state).toMatchObject({ cardId: 'c1', reviewCount: 2 });
  const outboxItems = await db.outbox.toArray();
  expect(outboxItems).toHaveLength(1);
  expect(outboxItems[0]).toMatchObject({ kind: 'state', cardId: 'c1' });
});

it('TI-24 — anulações do servidor são aplicadas antes do replay', async () => {
  const cardReviews = vi.fn().mockResolvedValue({
    reviewLogs: [aLog('log-a', '2026-09-18T09:00:00Z', 3), aLog('log-b', '2026-09-18T10:00:00Z', 4)],
    reviewVoids: [{ reviewId: 'log-b', voidedAt: '2026-09-18T11:00:00Z', changeSeq: 6 }],
  });
  const resolver = setup(cardReviews);
  await resolver.resolve(['c1']);
  const state = await db.cardStates.get('c1');
  expect(state).toMatchObject({ reviewCount: 1 });
  expect(await db.reviewLogs.get('log-b')).toMatchObject({ voided: true });
});
