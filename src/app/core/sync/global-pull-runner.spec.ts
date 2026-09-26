import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { GlobalPullRunner } from './global-pull-runner';
import { expectOneEventually } from '../../testing/http-testing-waits';

let db: AccountDb;
function setup(): GlobalPullRunner {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  db = new AccountDb('global-pull-runner-test');
  return TestBed.inject(GlobalPullRunner);
}

afterEach(async () => {
  TestBed.inject(HttpTestingController).verify();
  await db.delete();
});

it('TI-75 — consome o feed em páginas até hasMore=false, aplicando o cursor a cada página', async () => {
  const runner = setup();
  const httpMock = TestBed.inject(HttpTestingController);
  const promise = runner.pull(db, 'u1');
  const first = await expectOneEventually(httpMock, (request) => request.url === '/api/sync/changes');
  expect(first.request.params.get('cursor')).toBe('0');
  first.flush({
    serverTime: '2026-09-23T00:00:01Z',
    changes: [{ changeSeq: 10, type: 'subject', payload: { id: 's1', name: 'Direito', active: true } }],
    nextCursor: 10,
    hasMore: true,
  });
  const second = await expectOneEventually(httpMock, (request) => request.url === '/api/sync/changes');
  expect(second.request.params.get('cursor')).toBe('10');
  second.flush({ serverTime: '2026-09-23T00:00:02Z', changes: [], nextCursor: 10, hasMore: false });
  await promise;
  expect(await db.getCursor()).toBe(10);
  expect(await db.subjects.get('s1')).toMatchObject({ name: 'Direito' });
});

it('TU-76 — um fato de reset dentro da página do feed limpa o marcador de deckResets sem erro de transação', async () => {
  const runner = setup();
  await db.cards.add({
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null,
    createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 1, searchText: 'q r',
  });
  await db.deckResets.put({ operationId: 'op-1', deckId: 'd1', eventAt: '2026-09-23T00:00:00Z' });
  const httpMock = TestBed.inject(HttpTestingController);
  const promise = runner.pull(db, 'u1');
  const request = await expectOneEventually(httpMock, (req) => req.url === '/api/sync/changes');
  request.flush({
    serverTime: '2026-09-23T00:00:01Z',
    changes: [{
      changeSeq: 11, type: 'review_log',
      payload: {
        id: 'r1', cardId: 'c1', kind: 'reset', rating: null, reviewedAt: '2026-09-23T00:00:00Z', durationMs: 0,
        stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null,
        eventAt: '2026-09-23T00:00:00Z', eventCounter: 0, eventDeviceId: 'device-1', operationId: 'r1',
      },
    }],
    nextCursor: 11,
    hasMore: false,
  });
  await promise;
  expect(await db.deckResets.get('op-1')).toBeUndefined();
  expect(await db.reviewLogs.get('r1')).toMatchObject({ kind: 'reset' });
});
