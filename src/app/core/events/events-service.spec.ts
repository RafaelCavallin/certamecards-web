import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { EventsApi } from '../api/events-api';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { LocalDb } from '../db/local-db';
import type { ProductEvent } from './event.model';
import { MAX_LOCAL_EVENTS } from './events-constants';
import { EventsService } from './events-service';

let db: LocalDb;

function setup(submitImpl: ReturnType<typeof vi.fn>, online = true): EventsService {
  TestBed.configureTestingModule({
    providers: [
      { provide: EventsApi, useValue: { submit: submitImpl } },
      { provide: ConnectivityStore, useValue: { online: () => online, reportHttpStatus: vi.fn() } },
    ],
  });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(EventsService);
}

afterEach(async () => {
  await db.delete();
});

it('TU — record grava o evento local e envia em lote quando há rede', async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const eventsService = setup(submit);
  await eventsService.record('deck_created', { deckId: 'd1' });
  await eventsService.flush();
  expect(submit.mock.calls[0]?.[0]).toMatchObject([{ name: 'deck_created', props: { deckId: 'd1' } }]);
  expect(await db.events.count()).toBe(0);
});

it('TU — flush não chama a API quando está offline', async () => {
  const submit = vi.fn();
  const eventsService = setup(submit, false);
  await eventsService.record('session_started', {});
  await eventsService.flush();
  expect(submit).not.toHaveBeenCalled();
  expect(await db.events.count()).toBe(1);
});

it('TU — record descarta os eventos mais antigos acima do limite local', async () => {
  const eventsService = setup(vi.fn(), false);
  const seed: ProductEvent[] = Array.from({ length: MAX_LOCAL_EVENTS }, (_, index) => ({
    id: `seed-${index}`,
    name: 'session_started',
    props: {},
    occurredAt: new Date(2026, 8, 1, 0, 0, index).toISOString(),
  }));
  await db.events.bulkAdd(seed);
  await eventsService.record('session_ended', {});
  const count = await db.events.count();
  expect(count).toBe(MAX_LOCAL_EVENTS);
  expect(await db.events.get('seed-0')).toBeUndefined();
});
