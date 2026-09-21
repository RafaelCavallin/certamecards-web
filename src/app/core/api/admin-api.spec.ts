import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AdminApi } from './admin-api';

function setup(): { adminApi: AdminApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { adminApi: TestBed.inject(AdminApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — listSubjects busca a lista de matérias com contagem de decks', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.listSubjects();
  const req = httpMock.expectOne('/api/admin/subjects');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: '1', name: 'Direito Penal', active: true, changeSeq: 1, deckCount: 3 }]);
  await expect(promise).resolves.toMatchObject([{ deckCount: 3 }]);
});

it('TU — createSubject envia o nome e devolve a matéria criada', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.createSubject({ name: 'Direito Tributário' });
  const req = httpMock.expectOne('/api/admin/subjects');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual({ name: 'Direito Tributário' });
  req.flush({ id: '2', name: 'Direito Tributário', active: true, changeSeq: 2, deckCount: 0 });
  await expect(promise).resolves.toMatchObject({ id: '2' });
});

it('TU — updateSubject envia o subconjunto de campos por PATCH', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.updateSubject('2', { active: false });
  const req = httpMock.expectOne('/api/admin/subjects/2');
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ active: false });
  req.flush({ id: '2', name: 'Direito Tributário', active: false, changeSeq: 3, deckCount: 0 });
  await promise;
});

it('TU — listAdmins busca a lista de administradores', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.listAdmins();
  const req = httpMock.expectOne('/api/admin/admins');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: '1', email: 'ana@exemplo.com', displayName: 'Ana' }]);
  await expect(promise).resolves.toMatchObject([{ email: 'ana@exemplo.com' }]);
});

it('TU — grantAdmin envia o e-mail e devolve o usuário promovido', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.grantAdmin({ email: 'bruno@exemplo.com' });
  const req = httpMock.expectOne('/api/admin/admins');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual({ email: 'bruno@exemplo.com' });
  req.flush({ id: '3', email: 'bruno@exemplo.com', displayName: 'Bruno' });
  await expect(promise).resolves.toMatchObject({ displayName: 'Bruno' });
});

it('TU — revokeAdmin envia DELETE para o id do usuário', async () => {
  const { adminApi, httpMock } = setup();
  const promise = adminApi.revokeAdmin('3');
  const req = httpMock.expectOne('/api/admin/admins/3');
  expect(req.request.method).toBe('DELETE');
  req.flush(null, { status: 204, statusText: 'No Content' });
  await promise;
});
