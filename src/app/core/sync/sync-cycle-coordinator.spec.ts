import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { AccountDb } from '../db/account-db';
import { baseMocks, setupCoordinator, teardownCoordinator } from './sync-cycle-coordinator-test-support';

let db: AccountDb;

afterEach(async () => {
  await teardownCoordinator(db);
});

it('TI-75 — cada ciclo é estritamente push de mutações → reviews → pull', async () => {
  const order: string[] = [];
  const { coordinator, db: newDb } = setupCoordinator(baseMocks(order));
  db = newDb;
  coordinator.requestSync();
  await waitFor(() => order.includes('pull'));
  expect(order.indexOf('mutation')).toBeLessThan(order.indexOf('review'));
  expect(order.indexOf('review')).toBeLessThan(order.indexOf('pull'));
});

it('TI-75 — ciclos não executam de forma concorrente', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  const control: { release: (() => void) | null } = { release: null };
  mocks.mutationFlusher.flush = vi.fn().mockImplementation(() => {
    order.push('mutation');
    if (control.release !== null) {
      return Promise.resolve({ authRequired: false });
    }
    return new Promise((resolve) => {
      control.release = () => resolve({ authRequired: false });
    });
  });
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  coordinator.requestSync();
  await waitFor(() => control.release !== null);
  coordinator.requestSync();
  coordinator.requestSync();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(mocks.pullRunner.pull).not.toHaveBeenCalled();
  control.release?.();
  await waitFor(() => order.includes('pull'));
});

it('TU — requestSync não faz nada quando offline', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  const { db: newDb } = setupCoordinator(mocks, false);
  db = newDb;
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(mocks.mutationFlusher.flush).not.toHaveBeenCalled();
});

it('TU — reporta erro quando um passo do ciclo falha de verdade', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  mocks.mutationFlusher.flush = vi.fn().mockRejectedValue(new Error('falha real'));
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  coordinator.requestSync();
  await waitFor(() => mocks.mutationFlusher.flush.mock.calls.length > 0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(mocks.pullRunner.pull).not.toHaveBeenCalled();
});

it('TU-72 — retryNow limpa o retryAt das operações em espera e sincroniza na hora', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  await db.syncOperations.add({
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'deck_delete',
    entityId: 'd1', parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z', payload: { kind: 'deck_delete', deckId: 'd1' },
    status: 'retry_wait', attempts: 1, retryAt: '2099-01-01T00:00:00Z', leaseUntil: null, error: null, syncedAt: null,
  });
  coordinator.retryNow();
  await waitFor(() => order.includes('pull'));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(await db.syncOperations.get('op-1')).toMatchObject({ retryAt: null });
});

it('TU — ngOnDestroy interrompe o watchdog e novos disparos não sincronizam', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  coordinator.ngOnDestroy();
  coordinator.requestSync();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(mocks.mutationFlusher.flush).not.toHaveBeenCalled();
});

it('TU — whenIdle espera o ciclo corrente e o enfileirado terminarem', async () => {
  const order: string[] = [];
  const { coordinator, db: newDb } = setupCoordinator(baseMocks(order));
  db = newDb;
  coordinator.requestSync();
  coordinator.requestSync();
  await coordinator.whenIdle();
  expect(order.filter((entry) => entry === 'pull').length).toBeGreaterThanOrEqual(1);
  await coordinator.whenIdle();
});
