import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { SyncApi } from './sync-api';

function setup(): { syncApi: SyncApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { syncApi: TestBed.inject(SyncApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — pushReviews envia o corpo e devolve o resultado', async () => {
  const { syncApi, httpMock } = setup();
  const request = { deviceId: 'device-1', reviews: [], voids: [], states: [] };
  const promise = syncApi.pushReviews(request);
  const req = httpMock.expectOne('/api/sync/reviews');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(request);
  req.flush({
    acceptedReviewIds: [], rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [],
    ignoredStates: [],
  });
  await expect(promise).resolves.toMatchObject({ acceptedReviewIds: [] });
});

it('TU — cardReviews busca o histórico de um cartão', async () => {
  const { syncApi, httpMock } = setup();
  const promise = syncApi.cardReviews('card-1');
  const req = httpMock.expectOne('/api/cards/card-1/reviews');
  expect(req.request.method).toBe('GET');
  req.flush({ reviewLogs: [], reviewVoids: [] });
  await expect(promise).resolves.toEqual({ reviewLogs: [], reviewVoids: [] });
});

it('TU — changes envia cursor e limit como parâmetros de consulta', async () => {
  const { syncApi, httpMock } = setup();
  const promise = syncApi.changes(1080, 500);
  const req = httpMock.expectOne((request) => request.url === '/api/sync/changes');
  expect(req.request.method).toBe('GET');
  expect(req.request.params.get('cursor')).toBe('1080');
  expect(req.request.params.get('limit')).toBe('500');
  req.flush({
    subjects: [],
    decks: [],
    cards: [],
    cardStates: [],
    reviewLogs: [],
    reviewVoids: [],
    settings: null,
    nextCursor: 1080,
    hasMore: false,
  });
  await expect(promise).resolves.toMatchObject({ nextCursor: 1080, hasMore: false });
});
