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

it('TU — mutate envia o lote e devolve os resultados', async () => {
  const { syncApi, httpMock } = setup();
  const request = { deviceId: 'device-1', operations: [] };
  const promise = syncApi.mutate(request);
  const req = httpMock.expectOne('/api/sync/mutations');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(request);
  req.flush({ serverTime: '2026-09-23T00:00:00Z', results: [] });
  await expect(promise).resolves.toMatchObject({ results: [] });
});

it('TU — pushReviews envia o corpo e devolve o resultado', async () => {
  const { syncApi, httpMock } = setup();
  const request = { deviceId: 'device-1', reviews: [], voids: [], states: [] };
  const promise = syncApi.pushReviews(request);
  const req = httpMock.expectOne('/api/sync/reviews');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(request);
  req.flush({
    acceptedReviews: [], rejectedReviews: [], acceptedVoids: [], appliedStates: [], staleStates: [],
    ignoredStates: [],
  });
  await expect(promise).resolves.toMatchObject({ acceptedReviews: [] });
});

it('TU — cardReviews busca o histórico de um cartão sem cursor', async () => {
  const { syncApi, httpMock } = setup();
  const promise = syncApi.cardReviews('card-1');
  const req = httpMock.expectOne((request) => request.url === '/api/cards/card-1/reviews');
  expect(req.request.method).toBe('GET');
  expect(req.request.params.keys()).toHaveLength(0);
  req.flush({ reviewLogs: [], reviewVoids: [], nextCursor: null, hasMore: false });
  await expect(promise).resolves.toMatchObject({ reviewLogs: [], hasMore: false });
});

it('TU — cardReviews envia cursor quando informado', async () => {
  const { syncApi, httpMock } = setup();
  const promise = syncApi.cardReviews('card-1', 'opaque-cursor', 100);
  const req = httpMock.expectOne((request) => request.url === '/api/cards/card-1/reviews');
  expect(req.request.params.get('cursor')).toBe('opaque-cursor');
  expect(req.request.params.get('limit')).toBe('100');
  req.flush({ reviewLogs: [], reviewVoids: [], nextCursor: null, hasMore: false });
  await promise;
});

it('TU — changes envia cursor e limit como parâmetros de consulta', async () => {
  const { syncApi, httpMock } = setup();
  const promise = syncApi.changes(1080, 500);
  const req = httpMock.expectOne((request) => request.url === '/api/sync/changes');
  expect(req.request.method).toBe('GET');
  expect(req.request.params.get('cursor')).toBe('1080');
  expect(req.request.params.get('limit')).toBe('500');
  req.flush({ serverTime: '2026-09-23T00:00:00Z', changes: [], nextCursor: 1080, hasMore: false });
  await expect(promise).resolves.toMatchObject({ nextCursor: 1080, hasMore: false });
});
