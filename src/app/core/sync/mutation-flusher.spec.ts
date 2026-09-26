import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { MutationFlusher } from './mutation-flusher';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import { expectOneEventually } from '../../testing/http-testing-waits';

let db: AccountDb;

function operation(id: string, deviceSequence: number): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: id, accountId: 'u1', deviceId: 'device-1', deviceSequence, kind: 'deck_delete',
    entityId: `entity-${id}`, parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z', payload: { kind: 'deck_delete', deckId: `entity-${id}` },
    status: 'pending', attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
  };
}
function setup(): MutationFlusher {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  db = new AccountDb('mutation-flusher-test');
  return TestBed.inject(MutationFlusher);
}

afterEach(async () => {
  TestBed.inject(HttpTestingController).verify();
  await db.delete();
});

it('TU — envia o lote pendente e marca as operações como synced', async () => {
  const flusher = setup();
  await db.syncOperations.add(operation('a', 1));
  const promise = flusher.flush(db, 'device-1');
  const req = await expectOneEventually(TestBed.inject(HttpTestingController), '/api/sync/mutations');
  req.flush({
    serverTime: '2026-09-23T00:01:00Z',
    results: [{ operationId: 'a', outcome: 'applied', entityVersion: null, changeSeq: null, canonicalOrder: {
      eventAt: '2026-09-23T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'a',
    }, conflictId: null, error: null }],
  });
  const outcome = await promise;
  expect(outcome.authRequired).toBe(false);
  expect(await db.syncOperations.get('a')).toMatchObject({ status: 'synced' });
});

it('TU-71/72 — falha transitória volta para retry_wait com backoff calculado', async () => {
  const flusher = setup();
  await db.syncOperations.add(operation('a', 1));
  const promise = flusher.flush(db, 'device-1');
  const req = await expectOneEventually(TestBed.inject(HttpTestingController), '/api/sync/mutations');
  req.flush({ code: 'server_error' }, { status: 503, statusText: 'Service Unavailable' });
  await promise;
  const stored = await db.syncOperations.get('a');
  expect(stored?.status).toBe('retry_wait');
  expect(stored?.retryAt).not.toBeNull();
});

it('TU-71 — 401 pausa a conta em auth_required e interrompe o laço', async () => {
  const flusher = setup();
  await db.syncOperations.add(operation('a', 1));
  const promise = flusher.flush(db, 'device-1');
  const req = await expectOneEventually(TestBed.inject(HttpTestingController), '/api/sync/mutations');
  req.flush({ code: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  const outcome = await promise;
  expect(outcome.authRequired).toBe(true);
  expect(await db.syncOperations.get('a')).toMatchObject({ status: 'auth_required' });
});
