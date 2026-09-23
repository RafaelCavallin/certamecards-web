import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { LocalDb } from '../db/local-db';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import { waitFor } from '../../testing/dom-testing';
import { SyncStatusStore } from './sync-status-store';

let db: LocalDb;

function setup(online: boolean): SyncStatusStore {
  TestBed.configureTestingModule({ providers: [{ provide: ConnectivityStore, useValue: { online: () => online } }] });
  db = TestBed.inject(LocalDb);
  return TestBed.inject(SyncStatusStore);
}

afterEach(async () => {
  await db.delete();
});

it('TU — status é "offline" quando não há conexão', () => {
  const store = setup(false);
  expect(store.status()).toBe('offline');
});

it('TU — status é "synced" quando não há pendências e há conexão', () => {
  const store = setup(true);
  expect(store.status()).toBe('synced');
  expect(store.pendingCount()).toBe(0);
});

it('TU — status é "pending" quando há itens na outbox', async () => {
  const store = setup(true);
  await db.outbox.add({
    kind: 'void', reviewId: 'r1', voidedAt: '2026-09-18T00:00:00Z', cardId: 'c1',
    state: {
      cardId: 'c1', state: CARD_STATE_REVIEW, stability: 1, difficulty: 1, due: '2026-09-18T00:00:00Z',
      lastReview: null, reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 0, reviewCount: 1,
      suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 0,
    },
  });
  await waitFor(() => store.pendingCount() === 1);
  expect(store.status()).toBe('pending');
});

it('TU — status é "error" quando reportError(true) é chamado', () => {
  const store = setup(true);
  store.reportError(true);
  expect(store.status()).toBe('error');
});
