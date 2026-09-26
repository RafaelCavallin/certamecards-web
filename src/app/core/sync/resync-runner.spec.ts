import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import { isResyncRequired, ResyncRunner } from './resync-runner';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import { expectOneEventually } from '../../testing/http-testing-waits';

let db: AccountDb | undefined;
function setup(): ResyncRunner {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  db = new AccountDb('resync-runner-test');
  return TestBed.inject(ResyncRunner);
}

afterEach(async () => {
  if (db !== undefined) {
    TestBed.inject(HttpTestingController).verify();
    await db.delete();
    db = undefined;
  }
});

it('TU — isResyncRequired reconhece o 410 resync_required', () => {
  const error = new HttpErrorResponse({ status: 410, error: { code: 'resync_required', detail: 'x' } });
  expect(isResyncRequired(error)).toBe(true);
  expect(isResyncRequired(new HttpErrorResponse({ status: 404 }))).toBe(false);
  expect(isResyncRequired(new Error('outro'))).toBe(false);
});

it('TU-75 — full resync zera o cursor, preserva a fila e reaplica as projeções', async () => {
  const runner = setup();
  if (db === undefined) {
    throw new Error('db not initialized');
  }
  const pendingOp: SyncOperationRow<SyncOperationPayload> = {
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'deck_delete',
    entityId: 'd1', parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z', payload: { kind: 'deck_delete', deckId: 'd1' }, status: 'pending',
    attempts: 0, retryAt: null, leaseUntil: null, error: null, syncedAt: null,
  };
  await db.syncOperations.add(pendingOp);
  await db.setCursor(999);
  const promise = runner.resync(db, 'u1');
  const httpMock = TestBed.inject(HttpTestingController);
  const req = await expectOneEventually(httpMock, (request) => request.url === '/api/sync/changes');
  expect(req.request.params.get('cursor')).toBe('0');
  req.flush({
    serverTime: '2026-09-23T00:01:00Z',
    changes: [{ changeSeq: 5, type: 'subject', payload: { id: 's1', name: 'Direito', active: true } }],
    nextCursor: 5,
    hasMore: false,
  });
  await promise;
  expect(await db.getCursor()).toBe(5);
  expect(await db.syncOperations.get('op-1')).toMatchObject({ status: 'pending' });
  expect(await db.subjects.get('s1')).toMatchObject({ name: 'Direito' });
});
