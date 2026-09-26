import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import { waitFor } from '../../testing/dom-testing';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { SyncStatusStore } from './sync-status-store';

let db: AccountDb;

function setup(online: boolean): SyncStatusStore {
  TestBed.configureTestingModule({ providers: [{ provide: ConnectivityStore, useValue: { online: () => online } }] });
  db = new AccountDb('sync-status-store-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'sync-status-store-test' });
  return TestBed.inject(SyncStatusStore);
}

afterEach(async () => {
  await db.delete();
});

it('TU — status é "offline" quando não há conexão', () => {
  const store = setup(false);
  expect(store.status()).toBe('offline');
});

it('TU — status é "synced" quando não há pendências e há conexão', async () => {
  const store = setup(true);
  await waitFor(() => store.status() === 'synced');
  expect(store.pendingCount()).toBe(0);
});

it('TU — status é "pending" quando há um item pendente na fila de reviews', async () => {
  const store = setup(true);
  await db.reviewOutbox.add({
    kind: 'void', reviewId: 'r1', voidedAt: '2026-09-18T00:00:00Z', cardId: 'c1', status: 'pending', retryAt: null,
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

it('TU-73 — prioriza erro, offline, sincronizando, pendente e sincronizado', async () => {
  const store = setup(true);
  await waitFor(() => store.status() === 'synced');
  store.reportSyncing(true);
  expect(store.status()).toBe('syncing');
  store.reportError(true);
  expect(store.status()).toBe('error');
});

it('TU-73 — não mostra sincronizado quando uma operação exige ação', async () => {
  const store = setup(true);
  await db.syncOperations.add({
    operationId: 'op-action', accountId: 'sync-status-store-test', deviceId: 'device', deviceSequence: 1,
    kind: 'deck_delete', entityId: 'deck', parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-18T00:00:00Z', clock: { wallTime: '2026-09-18T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-18T00:00:00Z', payload: { kind: 'deck_delete', deckId: 'deck' },
    status: 'action_required', attempts: 1, retryAt: null, leaseUntil: null, error: { code: 'validation_failed', message: 'erro' }, syncedAt: null,
  });
  await waitFor(() => store.details().actionRequiredCount === 1);
  expect(store.status()).toBe('error');
});

it('CA-20 — conflito restaurado ou expirado não conta como versão disponível', async () => {
  const store = setup(true);
  const base = { entityType: 'card', entityId: 'c1', deckId: null, reason: 'concurrent_edit', detail: null };
  await db.conflicts.bulkAdd([
    { ...base, id: 'k1', expiresAt: '2099-01-01T00:00:00Z' },
    { ...base, id: 'k2', expiresAt: '2099-01-01T00:00:00Z', restoredAt: '2026-09-26T00:00:00Z' },
    { ...base, id: 'k3', expiresAt: '2020-01-01T00:00:00Z' },
  ]);
  await waitFor(() => store.details().availableConflictCount === 1);
  expect(store.details().availableConflictCount).toBe(1);
});
