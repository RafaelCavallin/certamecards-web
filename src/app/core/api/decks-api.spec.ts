import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { DecksApi } from './decks-api';

function setup(): { decksApi: DecksApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { decksApi: TestBed.inject(DecksApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — create envia o deck e devolve a entidade criada', async () => {
  const { decksApi, httpMock } = setup();
  const promise = decksApi.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  const req = httpMock.expectOne('/api/decks');
  expect(req.request.method).toBe('POST');
  req.flush({ id: 'd1', subjectId: 's1', name: 'CF/88', changeSeq: 1, version: 1 });
  await expect(promise).resolves.toMatchObject({ id: 'd1' });
});

it('TU — update envia If-Match com a versão atual', async () => {
  const { decksApi, httpMock } = setup();
  const promise = decksApi.update('d1', 2, { name: 'Novo nome' });
  const req = httpMock.expectOne('/api/decks/d1');
  expect(req.request.method).toBe('PATCH');
  expect(req.request.headers.get('If-Match')).toBe('2');
  req.flush({ id: 'd1', name: 'Novo nome', version: 3 });
  await promise;
});

it('TU — delete envia If-Match e responde sem corpo', async () => {
  const { decksApi, httpMock } = setup();
  const promise = decksApi.delete('d1', 3);
  const req = httpMock.expectOne('/api/decks/d1');
  expect(req.request.method).toBe('DELETE');
  expect(req.request.headers.get('If-Match')).toBe('3');
  req.flush(null, { status: 204, statusText: 'No Content' });
  await promise;
});

it('TU — resetProgress devolve a contagem de cartões zerados', async () => {
  const { decksApi, httpMock } = setup();
  const promise = decksApi.resetProgress('d1');
  const req = httpMock.expectOne('/api/decks/d1/reset-progress');
  expect(req.request.method).toBe('POST');
  req.flush({ resetCards: 12, cursorHint: 500 });
  await expect(promise).resolves.toEqual({ resetCards: 12, cursorHint: 500 });
});
