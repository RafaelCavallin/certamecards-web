import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { CardsApi } from './cards-api';

function setup(): { cardsApi: CardsApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { cardsApi: TestBed.inject(CardsApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — create envia o cartão para o deck informado', async () => {
  const { cardsApi, httpMock } = setup();
  const promise = cardsApi.create('d1', { id: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  const req = httpMock.expectOne('/api/decks/d1/cards');
  expect(req.request.method).toBe('POST');
  req.flush({ id: 'c1', deckId: 'd1', front: 'Q', back: 'R', version: 1 });
  await expect(promise).resolves.toMatchObject({ id: 'c1' });
});

it('TU — update envia If-Match com a versão atual', async () => {
  const { cardsApi, httpMock } = setup();
  const promise = cardsApi.update('c1', 4, { front: 'Nova pergunta' });
  const req = httpMock.expectOne('/api/cards/c1');
  expect(req.request.method).toBe('PATCH');
  expect(req.request.headers.get('If-Match')).toBe('4');
  req.flush({ id: 'c1', front: 'Nova pergunta', version: 5 });
  await promise;
});

it('TU — delete envia If-Match e responde sem corpo', async () => {
  const { cardsApi, httpMock } = setup();
  const promise = cardsApi.delete('c1', 5);
  const req = httpMock.expectOne('/api/cards/c1');
  expect(req.request.method).toBe('DELETE');
  expect(req.request.headers.get('If-Match')).toBe('5');
  req.flush(null, { status: 204, statusText: 'No Content' });
  await promise;
});

it('TU — setSuspension envia o estado desejado e devolve o CardState', async () => {
  const { cardsApi, httpMock } = setup();
  const promise = cardsApi.setSuspension('c1', true);
  const req = httpMock.expectOne('/api/cards/c1/suspension');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ suspended: true });
  req.flush({ cardId: 'c1', suspended: true });
  await expect(promise).resolves.toMatchObject({ suspended: true });
});

it('TU — history busca o histórico completo do cartão', async () => {
  const { cardsApi, httpMock } = setup();
  const promise = cardsApi.history('c1');
  const req = httpMock.expectOne('/api/cards/c1/reviews');
  expect(req.request.method).toBe('GET');
  req.flush({ reviewLogs: [], reviewVoids: [] });
  await expect(promise).resolves.toEqual({ reviewLogs: [], reviewVoids: [] });
});
