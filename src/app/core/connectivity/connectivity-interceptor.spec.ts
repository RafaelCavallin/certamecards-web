import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, expect, it } from 'vitest';
import { ConnectivityStore } from './connectivity-store';
import { connectivityInterceptor } from './connectivity-interceptor';

function setup(): { http: HttpClient; httpMock: HttpTestingController; connectivity: ConnectivityStore } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([connectivityInterceptor])), provideHttpClientTesting()],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    connectivity: TestBed.inject(ConnectivityStore),
  };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU-22 — resposta bem-sucedida marca online', async () => {
  const { http, httpMock, connectivity } = setup();
  const promise = firstValueFrom(http.get('/api/decks'));
  httpMock.expectOne('/api/decks').flush([]);
  await promise;
  expect(connectivity.online()).toBe(true);
});

it('TU-22 — 503 marca offline', async () => {
  const { http, httpMock, connectivity } = setup();
  const promise = firstValueFrom(http.get('/api/decks'));
  httpMock.expectOne('/api/decks').flush(null, { status: 503, statusText: 'Service Unavailable' });
  await expect(promise).rejects.toBeTruthy();
  expect(connectivity.online()).toBe(false);
});

it('TU-22 — 404 mantém online', async () => {
  const { http, httpMock, connectivity } = setup();
  const promise = firstValueFrom(http.get('/api/decks/x'));
  httpMock.expectOne('/api/decks/x').flush(null, { status: 404, statusText: 'Not Found' });
  await expect(promise).rejects.toBeTruthy();
  expect(connectivity.online()).toBe(true);
});
