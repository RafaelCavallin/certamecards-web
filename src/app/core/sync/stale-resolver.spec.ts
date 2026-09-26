import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReviewLogHistoryEntry } from '../api/sync.model';
import { SyncApi } from '../api/sync-api';
import { AccountDb } from '../db/account-db';
import { StaleResolver } from './stale-resolver';

let db: AccountDb;

function aLog(id: string, reviewedAt: string, rating: number): ReviewLogHistoryEntry {
  return {
    id, cardId: 'c1', kind: 'review', rating, reviewedAt, durationMs: 1000, stateBefore: null, stateAfter: {},
    offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 5,
    eventAt: reviewedAt, eventCounter: 0, eventDeviceId: 'device-1', operationId: id,
  };
}
function setup(cardReviews: ReturnType<typeof vi.fn>): { resolver: StaleResolver; db: AccountDb } {
  TestBed.configureTestingModule({ providers: [{ provide: SyncApi, useValue: { cardReviews } }] });
  db = new AccountDb('stale-resolver-test');
  return { resolver: TestBed.inject(StaleResolver), db };
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
    nextCursor: null,
    hasMore: false,
  });
  const { resolver } = setup(cardReviews);
  await resolver.resolve(db, ['c1']);
  expect(cardReviews).toHaveBeenCalledWith('c1', null);
  const state = await db.cardStates.get('c1');
  expect(state).toMatchObject({ cardId: 'c1', reviewCount: 2 });
  const outboxItems = await db.reviewOutbox.toArray();
  expect(outboxItems).toHaveLength(1);
  expect(outboxItems[0]).toMatchObject({ kind: 'state', cardId: 'c1', status: 'pending' });
});

it('TI-24 — anulações do servidor são aplicadas antes do replay', async () => {
  const cardReviews = vi.fn().mockResolvedValue({
    reviewLogs: [aLog('log-a', '2026-09-18T09:00:00Z', 3), aLog('log-b', '2026-09-18T10:00:00Z', 4)],
    reviewVoids: [{ reviewId: 'log-b', voidedAt: '2026-09-18T11:00:00Z', changeSeq: 6 }],
    nextCursor: null,
    hasMore: false,
  });
  const { resolver } = setup(cardReviews);
  await resolver.resolve(db, ['c1']);
  const state = await db.cardStates.get('c1');
  expect(state).toMatchObject({ reviewCount: 1 });
  expect(await db.reviewLogs.get('log-b')).toMatchObject({ voided: true });
});

it('TU-3 — consome todas as páginas do histórico antes de refazer o estado', async () => {
  const cardReviews = vi
    .fn()
    .mockResolvedValueOnce({
      reviewLogs: [aLog('log-a', '2026-09-18T09:00:00Z', 3)], reviewVoids: [], nextCursor: 'cursor-1', hasMore: true,
    })
    .mockResolvedValueOnce({
      reviewLogs: [aLog('log-b', '2026-09-18T10:00:00Z', 4)], reviewVoids: [], nextCursor: null, hasMore: false,
    });
  const { resolver } = setup(cardReviews);
  await resolver.resolve(db, ['c1']);
  expect(cardReviews).toHaveBeenNthCalledWith(1, 'c1', null);
  expect(cardReviews).toHaveBeenNthCalledWith(2, 'c1', 'cursor-1');
  const state = await db.cardStates.get('c1');
  expect(state).toMatchObject({ reviewCount: 2 });
});
