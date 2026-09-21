import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AuthApi } from './auth-api';

function setup(): { authApi: AuthApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { authApi: TestBed.inject(AuthApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — login envia e-mail e senha e devolve o AuthResponse', async () => {
  const { authApi, httpMock } = setup();
  const promise = authApi.login({ email: 'ana@exemplo.com', password: 'senha1234' });
  const req = httpMock.expectOne('/api/auth/login');
  expect(req.request.method).toBe('POST');
  req.flush({
    accessToken: 'token',
    expiresIn: 900,
    user: { id: '1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate', termsAccepted: true },
  });
  await expect(promise).resolves.toMatchObject({ accessToken: 'token' });
});

it('TU — refresh envia credenciais do cookie com o cabeçalho X-Certame-Client', async () => {
  const { authApi, httpMock } = setup();
  const promise = authApi.refresh();
  const req = httpMock.expectOne('/api/auth/refresh');
  expect(req.request.withCredentials).toBe(true);
  expect(req.request.headers.get('X-Certame-Client')).toBe('web');
  req.flush({
    accessToken: 'token',
    expiresIn: 900,
    user: { id: '1', email: 'a@a.com', displayName: 'A', role: 'candidate', termsAccepted: true },
  });
  await promise;
});

it('TU — deleteAccount envia a senha no corpo da requisição DELETE', async () => {
  const { authApi, httpMock } = setup();
  const promise = authApi.deleteAccount({ password: 'senha1234', reauthToken: null });
  const req = httpMock.expectOne('/api/me');
  expect(req.request.method).toBe('DELETE');
  expect(req.request.body).toEqual({ password: 'senha1234', reauthToken: null });
  req.flush(null, { status: 204, statusText: 'No Content' });
  await promise;
});
