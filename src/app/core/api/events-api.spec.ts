import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { EventsApi } from './events-api';

function setup(): { eventsApi: EventsApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { eventsApi: TestBed.inject(EventsApi), httpMock: TestBed.inject(HttpTestingController) };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
});

it('TU — submit envia os eventos em um único lote', async () => {
  const { eventsApi, httpMock } = setup();
  const promise = eventsApi.submit([{ id: 'e1', name: 'deck_created', props: {}, occurredAt: '2026-09-17T00:00:00Z' }]);
  const req = httpMock.expectOne('/api/events');
  expect(req.request.method).toBe('POST');
  expect((req.request.body as { events: unknown[] }).events).toHaveLength(1);
  req.flush(null, { status: 202, statusText: 'Accepted' });
  await promise;
});
