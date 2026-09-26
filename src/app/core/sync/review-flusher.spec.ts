import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { ReviewOutboxItem } from '../db/account-db.model';
import { ReviewFlusher } from './review-flusher';
import { expectOneEventually } from '../../testing/http-testing-waits';

let db: AccountDb;
const STATE = {
  cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1,
  lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null,
  contentUpdatedAt: null, changeSeq: 0,
};
function setup(): ReviewFlusher {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  db = new AccountDb('review-flusher-test');
  return TestBed.inject(ReviewFlusher);
}

afterEach(async () => {
  TestBed.inject(HttpTestingController).verify();
  await db.delete();
});

it('TU — remove os aceitos, mantém os recusados marcados e reporta cartões stale', async () => {
  const flusher = setup();
  const item: ReviewOutboxItem = {
    kind: 'review',
    log: {
      id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
      voided: false, eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
    },
    state: STATE, observedServerTime: '2026-09-22T00:00:00Z', status: 'pending', retryAt: null,
  };
  const seq = await db.reviewOutbox.add(item);
  const promise = flusher.flush(db, 'device-1');
  const req = await expectOneEventually(TestBed.inject(HttpTestingController), '/api/sync/reviews');
  req.flush({
    acceptedReviews: [{ id: 'r1', canonicalOrder: { eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'r1' } }],
    rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [{ cardId: 'c2', serverReviewCount: 3 }],
    ignoredStates: [],
  });
  const outcome = await promise;
  expect(outcome.staleCardIds).toEqual(['c2']);
  expect(await db.reviewOutbox.get(seq)).toBeUndefined();
});

it('TU — marca reviews recusados como rejected sem apagar', async () => {
  const flusher = setup();
  const item: ReviewOutboxItem = {
    kind: 'review',
    log: {
      id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
      voided: false, eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
    },
    state: STATE, observedServerTime: '2026-09-22T00:00:00Z', status: 'pending', retryAt: null,
  };
  const seq = await db.reviewOutbox.add(item);
  const promise = flusher.flush(db, 'device-1');
  const req = await expectOneEventually(TestBed.inject(HttpTestingController), '/api/sync/reviews');
  req.flush({
    acceptedReviews: [], rejectedReviews: [{ id: 'r1', code: 'validation_failed' }], acceptedVoids: [],
    appliedStates: [], staleStates: [], ignoredStates: [],
  });
  await promise;
  expect(await db.reviewOutbox.get(seq)).toMatchObject({ status: 'rejected' });
});
