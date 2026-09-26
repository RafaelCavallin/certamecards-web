import { HttpErrorResponse } from '@angular/common/http';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { AccountDb } from '../db/account-db';
import { baseMocks, setupCoordinator, teardownCoordinator } from './sync-cycle-coordinator-test-support';

let db: AccountDb;

afterEach(async () => {
  await teardownCoordinator(db);
});

it('TU — cartões stale disparam o StaleResolver e um novo envio de reviews', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  let calls = 0;
  mocks.reviewFlusher.flush = vi.fn().mockImplementation(() => {
    calls += 1;
    order.push('review');
    return Promise.resolve({ staleCardIds: calls === 1 ? ['c1'] : [] });
  });
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  coordinator.requestSync();
  await waitFor(() => order.includes('pull'));
  expect(mocks.staleResolver.resolve).toHaveBeenCalledWith(db, ['c1']);
  // O construtor do coordenador também dispara um ciclo automático assim que
  // `isAuthenticated` fica verdadeiro (ver `registerReactiveTriggers`); esse ciclo é
  // enfileirado atrás do ciclo manual desta corrida e pode rodar (de forma inofensiva,
  // idempotente) antes desta asserção sob carga. Por isso comparamos só o prefixo de
  // `order` até o primeiro `pull`, que é o que este teste realmente verifica: a
  // resolução de stale dispara exatamente um reenvio extra de reviews antes do pull.
  const pullIndex = order.indexOf('pull');
  expect(order.slice(0, pullIndex)).toEqual(['mutation', 'review', 'review']);
});

it('TU — erro não relacionado a resync no pull propaga e não chama o ResyncRunner', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  mocks.pullRunner.pull = vi.fn().mockRejectedValue(new Error('rede indisponível'));
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  coordinator.requestSync();
  await waitFor(() => mocks.pullRunner.pull.mock.calls.length > 0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(mocks.resyncRunner.resync).not.toHaveBeenCalled();
});

it('TU — runNow aguarda o ciclo em andamento e depois roda o seu próprio', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  const control: { release: (() => void) | null } = { release: null };
  let calls = 0;
  mocks.mutationFlusher.flush = vi.fn().mockImplementation(() => {
    calls += 1;
    order.push('mutation');
    if (calls > 1) {
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
  const runNowPromise = coordinator.runNow();
  control.release?.();
  await runNowPromise;
  expect(order.filter((entry) => entry === 'pull').length).toBeGreaterThanOrEqual(2);
});

it('TI-76 — 410 no pull aciona o resync e preserva erros locais de ação obrigatória', async () => {
  const order: string[] = [];
  const mocks = baseMocks(order);
  mocks.pullRunner.pull = vi
    .fn()
    .mockRejectedValue(new HttpErrorResponse({ status: 410, error: { code: 'resync_required', detail: 'x' } }));
  const { coordinator, db: newDb } = setupCoordinator(mocks);
  db = newDb;
  await db.syncOperations.add({
    operationId: 'blocked-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'card_update',
    entityId: 'c1', parentId: null, baseVersion: 1, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z',
    payload: {
      kind: 'card_update',
      card: {
        id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null,
        createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1,
        changeSeq: 0,
      },
    },
    status: 'action_required', attempts: 3, retryAt: null, leaseUntil: null,
    error: { code: 'validation_failed', message: 'x' }, syncedAt: null,
  });
  coordinator.requestSync();
  await waitFor(() => mocks.resyncRunner.resync.mock.calls.length > 0);
  const preserved = await db.syncOperations.get('blocked-1');
  expect(preserved).toMatchObject({ status: 'action_required', error: { code: 'validation_failed' } });
});
