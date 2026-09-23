import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { OfficialDecksApi } from './official-decks-api';

function setup(): { api: OfficialDecksApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(OfficialDecksApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — list envia só os filtros preenchidos', async () => {
  const { api, httpMock } = setup();
  const promise = api.list({ status: 'draft', subjectId: null, page: 0 });
  const req = httpMock.expectOne((r) => r.url === '/api/admin/official-decks');
  expect(req.request.params.get('status')).toBe('draft');
  expect(req.request.params.has('subjectId')).toBe(false);
  req.flush({ items: [], page: 0, size: 20, total: 0 });
  await promise;
});

it('TU — update, delete e changeStatus enviam If-Match com a versão', async () => {
  const { api, httpMock } = setup();
  const update = api.update('d1', 4, { name: 'Novo' });
  const updateReq = httpMock.expectOne('/api/admin/official-decks/d1');
  expect(updateReq.request.method).toBe('PATCH');
  expect(updateReq.request.headers.get('If-Match')).toBe('4');
  updateReq.flush({});
  await update;
  const status = api.changeStatus('d1', 5, 'published');
  const statusReq = httpMock.expectOne('/api/admin/official-decks/d1/status');
  expect(statusReq.request.body).toEqual({ status: 'published' });
  expect(statusReq.request.headers.get('If-Match')).toBe('5');
  statusReq.flush({});
  await status;
  const remove = api.delete('d1', 6);
  const deleteReq = httpMock.expectOne('/api/admin/official-decks/d1');
  expect(deleteReq.request.headers.get('If-Match')).toBe('6');
  deleteReq.flush(null);
  await remove;
});

it('TU — get, create e cartões oficiais usam as rotas da TechSpec', async () => {
  const { api, httpMock } = setup();
  const get = api.get('d1');
  httpMock.expectOne('/api/admin/official-decks/d1').flush({});
  await get;
  const create = api.create({ id: 'd1', subjectId: 's1', name: 'CF', description: null });
  const createReq = httpMock.expectOne('/api/admin/official-decks');
  expect(createReq.request.method).toBe('POST');
  createReq.flush({});
  await create;
});

it('TU — listCards, createCard, updateCard e deleteCard', async () => {
  const { api, httpMock } = setup();
  const list = api.listCards('d1', 2);
  const listReq = httpMock.expectOne((r) => r.url === '/api/admin/official-decks/d1/cards');
  expect(listReq.request.params.get('page')).toBe('2');
  listReq.flush({ items: [], page: 2, size: 20, total: 0 });
  await list;
  const created = api.createCard('d1', { id: 'c1', type: 'basic', front: 'F', back: 'B', source: null });
  httpMock.expectOne('/api/admin/official-decks/d1/cards').flush({});
  await created;
  const updated = api.updateCard('c1', 3, { back: 'B2', contentChanged: true, note: 'Mudou' });
  const updateReq = httpMock.expectOne('/api/admin/official-cards/c1');
  expect(updateReq.request.headers.get('If-Match')).toBe('3');
  updateReq.flush({ card: {}, affectedSubscribers: 1, contentUpdateQueued: true });
  await expect(updated).resolves.toMatchObject({ contentUpdateQueued: true });
  const removed = api.deleteCard('c1', 4);
  httpMock.expectOne('/api/admin/official-cards/c1').flush(null);
  await removed;
});
