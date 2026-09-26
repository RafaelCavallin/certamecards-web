import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { ReviewOutboxItem, ReviewOutboxStatus } from '../db/account-db.model';
import { ReviewFlusher } from './review-flusher';
import { expectOneEventually } from '../../testing/http-testing-waits';

const REVIEWS_URL = '/api/sync/reviews';
const EMPTY_RESULT = { acceptedReviews: [], rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [], ignoredStates: [] };
const STATE = {
  cardId: 'c1', state: 2, stability: 1, difficulty: 1, due: '2026-09-24T00:00:00Z', lastReview: null, reps: 1,
  lapses: 0, learningSteps: 0, scheduledDays: 1, reviewCount: 1, suspended: false, contentUpdateNote: null,
  contentUpdatedAt: null, changeSeq: 0,
};
let db: AccountDb;

function setup(): ReviewFlusher {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  db = new AccountDb('review-flusher-claim-test');
  return TestBed.inject(ReviewFlusher);
}
function anItem(status: ReviewOutboxStatus): ReviewOutboxItem {
  return {
    kind: 'review',
    log: {
      id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 1,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null, changeSeq: 0,
      voided: false, eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
    },
    state: STATE, observedServerTime: '2026-09-22T00:00:00Z', status, retryAt: null,
  };
}
async function nextRequest(): Promise<ReturnType<HttpTestingController['expectOne']>> {
  return expectOneEventually(TestBed.inject(HttpTestingController), REVIEWS_URL);
}

afterEach(async () => {
  TestBed.inject(HttpTestingController).verify();
  await db.delete();
});

it('TU — marca o lote como em envio enquanto a requisição está em andamento', async () => {
  const flusher = setup();
  const seq = await db.reviewOutbox.add(anItem('pending'));
  const promise = flusher.flush(db, 'device-1');
  const req = await nextRequest();
  expect(await db.reviewOutbox.get(seq)).toMatchObject({ status: 'sending' });
  req.flush(EMPTY_RESULT);
  await promise;
});

it('TU — devolve o lote para pendente quando o envio falha', async () => {
  const flusher = setup();
  const seq = await db.reviewOutbox.add(anItem('pending'));
  const promise = flusher.flush(db, 'device-1');
  const req = await nextRequest();
  req.flush(null, { status: 503, statusText: 'Service Unavailable' });
  await expect(promise).rejects.toBeDefined();
  expect(await db.reviewOutbox.get(seq)).toMatchObject({ status: 'pending' });
});

it('TU — reenvia item que ficou em envio num ciclo interrompido', async () => {
  const flusher = setup();
  await db.reviewOutbox.add(anItem('sending'));
  const promise = flusher.flush(db, 'device-1');
  const req = await nextRequest();
  expect((req.request.body as { reviews: readonly { id: string }[] }).reviews.map((review) => review.id)).toEqual(['r1']);
  req.flush(EMPTY_RESULT);
  await promise;
});
