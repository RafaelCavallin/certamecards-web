import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { LibraryApi } from './library-api';

function setup(): { api: LibraryApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(LibraryApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — list envia busca, matéria e página e omite filtros vazios', async () => {
  const { api, httpMock } = setup();
  const promise = api.list({ q: 'crase', subjectId: null, page: 1 });
  const req = httpMock.expectOne((r) => r.url === '/api/library/decks');
  expect(req.request.params.get('q')).toBe('crase');
  expect(req.request.params.get('page')).toBe('1');
  expect(req.request.params.has('subjectId')).toBe(false);
  req.flush({ items: [], page: 1, size: 20, total: 0 });
  await expect(promise).resolves.toMatchObject({ total: 0 });
});

it('TU — subjects e suggestions devolvem a lista de items', async () => {
  const { api, httpMock } = setup();
  const subjects = api.subjects();
  httpMock.expectOne('/api/library/subjects').flush({ items: [{ id: 's1', name: 'Português', deckCount: 2 }] });
  await expect(subjects).resolves.toHaveLength(1);
  const suggestions = api.suggestions(3);
  const req = httpMock.expectOne((r) => r.url === '/api/library/suggestions');
  expect(req.request.params.get('limit')).toBe('3');
  req.flush({ items: [] });
  await expect(suggestions).resolves.toEqual([]);
});

it('TU — preview, subscribe, unsubscribe e duplicate usam as rotas da TechSpec', async () => {
  const { api, httpMock } = setup();
  const preview = api.preview('d1');
  httpMock.expectOne('/api/library/decks/d1/preview').flush({ deck: {}, cards: [] });
  await preview;
  const subscribe = api.subscribe('d1');
  const subscribeReq = httpMock.expectOne('/api/library/decks/d1/subscription');
  expect(subscribeReq.request.method).toBe('POST');
  subscribeReq.flush({ restoredProgress: false });
  await subscribe;
  const unsubscribe = api.unsubscribe('d1');
  const deleteReq = httpMock.expectOne('/api/library/decks/d1/subscription');
  expect(deleteReq.request.method).toBe('DELETE');
  deleteReq.flush(null);
  await unsubscribe;
  const duplicate = api.duplicate('d1', { id: 'n1', carryProgress: true, cancelSubscription: false });
  const duplicateReq = httpMock.expectOne('/api/library/decks/d1/duplicate');
  expect(duplicateReq.request.body).toEqual({ id: 'n1', carryProgress: true, cancelSubscription: false });
  duplicateReq.flush({ copiedCards: 1 });
  await duplicate;
});

it('TU — content envia after e limit e omite after na primeira página', async () => {
  const { api, httpMock } = setup();
  const first = api.content('d1', null);
  const firstReq = httpMock.expectOne((r) => r.url === '/api/library/decks/d1/content');
  expect(firstReq.request.params.has('after')).toBe(false);
  expect(firstReq.request.params.get('limit')).toBe('500');
  firstReq.flush({ cards: [], cardStates: [], nextAfter: null, hasMore: false });
  await first;
  const next = api.content('d1', 'c9');
  const nextReq = httpMock.expectOne((r) => r.url === '/api/library/decks/d1/content');
  expect(nextReq.request.params.get('after')).toBe('c9');
  nextReq.flush({ cards: [], cardStates: [], nextAfter: null, hasMore: false });
  await next;
});
