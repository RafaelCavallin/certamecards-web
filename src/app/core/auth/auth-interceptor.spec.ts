import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { expect, it, vi } from 'vitest';
import { authInterceptor } from './auth-interceptor';
import { AuthStore } from './auth-store';

interface Harness {
  readonly http: HttpClient;
  readonly httpMock: HttpTestingController;
  readonly handleUnauthorized: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  setToken(token: string | null): void;
  setUserId(userId: string | null): void;
}

function setup(initialToken: string | null, initialUserId = 'user-1'): Harness {
  let currentToken = initialToken;
  let currentUserId: string | null = initialUserId;
  const handleUnauthorized = vi.fn<() => Promise<boolean>>();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      {
        provide: AuthStore,
        useValue: {
          accessToken: () => currentToken,
          user: () => (currentUserId === null ? null : { id: currentUserId }),
          handleUnauthorized,
        },
      },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    handleUnauthorized,
    setToken: (token) => {
      currentToken = token;
    },
    setUserId: (userId) => {
      currentUserId = userId;
    },
  };
}

it('TU — sem token de acesso, não anexa cabeçalho de autorização', () => {
  const { http, httpMock } = setup(null);
  http.get('/api/decks').subscribe();
  const req = httpMock.expectOne('/api/decks');
  expect(req.request.headers.has('Authorization')).toBe(false);
  req.flush([]);
  httpMock.verify();
});

it('TU — erro não relacionado a 401 propaga sem tentar reautenticar', async () => {
  const harness = setup('token-1');
  const resultPromise = firstValueFrom(harness.http.get('/api/decks')).catch((error: unknown) => error);
  const req = harness.httpMock.expectOne('/api/decks');
  req.flush({ code: 'server_error', detail: 'x' }, { status: 500, statusText: 'Server Error' });
  await resultPromise;
  expect(harness.handleUnauthorized).not.toHaveBeenCalled();
  harness.httpMock.verify();
});

it('TU — anexa o token de acesso às chamadas autenticadas', () => {
  const { http, httpMock } = setup('token-1');
  http.get('/api/decks').subscribe();
  const req = httpMock.expectOne('/api/decks');
  expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
  req.flush([]);
  httpMock.verify();
});

it('TU — não anexa nem repete chamadas públicas de autenticação em caso de 401', async () => {
  const { http, httpMock, handleUnauthorized } = setup('token-1');
  const result = firstValueFrom(http.post('/api/auth/login', {})).catch((error: unknown) => error);
  const req = httpMock.expectOne('/api/auth/login');
  expect(req.request.headers.has('Authorization')).toBe(false);
  req.flush({ code: 'invalid_credentials', detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
  await result;
  expect(handleUnauthorized).not.toHaveBeenCalled();
  httpMock.verify();
});

it('TI-29 — repete a requisição uma vez com o novo token depois de um 401', async () => {
  const harness = setup('token-1');
  harness.handleUnauthorized.mockImplementation(() => {
    harness.setToken('token-2');
    return Promise.resolve(true);
  });
  const resultPromise = firstValueFrom(harness.http.get('/api/decks'));
  const firstReq = harness.httpMock.expectOne('/api/decks');
  firstReq.flush({ code: 'unauthenticated', detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
  const secondReq = await vi.waitFor(() => harness.httpMock.expectOne('/api/decks'));
  expect(secondReq.request.headers.get('Authorization')).toBe('Bearer token-2');
  secondReq.flush([{ id: 'deck-1' }]);
  await expect(resultPromise).resolves.toEqual([{ id: 'deck-1' }]);
  harness.httpMock.verify();
});

it('TI-29 — um segundo 401 depois do refresh propaga o erro original', async () => {
  const harness = setup('token-1');
  harness.handleUnauthorized.mockResolvedValue(false);
  const resultPromise = firstValueFrom(harness.http.get('/api/decks'));
  const req = harness.httpMock.expectOne('/api/decks');
  req.flush({ code: 'unauthenticated', detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
  await expect(resultPromise).rejects.toMatchObject({ status: 401 });
  harness.httpMock.verify();
});

it('TU-78 — refresh trocando de identidade não repete a requisição com a nova conta', async () => {
  const harness = setup('token-1', 'user-a');
  harness.handleUnauthorized.mockImplementation(() => {
    harness.setToken('token-b');
    harness.setUserId('user-b');
    return Promise.resolve(true);
  });
  const resultPromise = firstValueFrom(harness.http.get('/api/decks'));
  const req = harness.httpMock.expectOne('/api/decks');
  req.flush({ code: 'unauthenticated', detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
  await expect(resultPromise).rejects.toMatchObject({ status: 401 });
  harness.httpMock.verify();
});
