import { expect, it } from 'vitest';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import { compactPendingOperation } from './operation-compactor';

const A_DECK = {
  id: 'e1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null,
  officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
  version: 1, changeSeq: 0,
};
function anOperation(kind: SyncOperationKind, overrides: Partial<SyncOperationRow<SyncOperationPayload>> = {}): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'dev-1', deviceSequence: 1, kind, entityId: 'e1', parentId: null,
    baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: '2026-09-17T00:00:00Z',
    clock: { wallTime: '2026-09-17T00:00:00Z', logicalCounter: 0 }, observedServerTime: '2026-09-17T00:00:00Z',
    payload: { kind: 'deck_delete', deckId: 'e1' }, status: 'pending', attempts: 0, retryAt: null, leaseUntil: null,
    error: null, syncedAt: null,
    ...overrides,
  };
}

it('TU-69 — sem operação pending, a operação entrante é apenas anexada', () => {
  const outcome = compactPendingOperation(undefined, anOperation('deck_create'));
  expect(outcome).toEqual({ action: 'append' });
});

it('TU-69 — create seguido de update vira um único create com o payload mais novo', () => {
  const pending = anOperation('deck_create', { operationId: 'op-create' });
  const incoming = anOperation('deck_update', { operationId: 'op-update', payload: { kind: 'deck_update', deck: A_DECK } });
  const outcome = compactPendingOperation(pending, incoming);
  expect(outcome).toMatchObject({ action: 'replace', cancelOperationId: 'op-create', operation: { kind: 'deck_create', payload: incoming.payload } });
});

it('TU-69 — update seguido de update vira um único update com o relógio mais novo', () => {
  const pending = anOperation('card_update', { operationId: 'op-1', clock: { wallTime: '2026-09-17T00:00:00Z', logicalCounter: 0 } });
  const incoming = anOperation('card_update', { operationId: 'op-2', clock: { wallTime: '2026-09-17T00:01:00Z', logicalCounter: 0 } });
  const outcome = compactPendingOperation(pending, incoming);
  expect(outcome).toMatchObject({ action: 'replace', cancelOperationId: 'op-1', operation: { kind: 'card_update', clock: incoming.clock } });
});

it('TU-69 — update seguido de delete vira delete', () => {
  const pending = anOperation('deck_update', { operationId: 'op-1' });
  const incoming = anOperation('deck_delete', { operationId: 'op-2' });
  const outcome = compactPendingOperation(pending, incoming);
  expect(outcome).toMatchObject({ action: 'replace', cancelOperationId: 'op-1', operation: { kind: 'deck_delete' } });
});

it('TU-69 — create seguido de delete cancela as duas operações', () => {
  const pending = anOperation('card_create', { operationId: 'op-1' });
  const incoming = anOperation('card_delete', { operationId: 'op-2' });
  const outcome = compactPendingOperation(pending, incoming);
  expect(outcome).toEqual({ action: 'cancel', cancelOperationId: 'op-1' });
});

it('TU-69 — avaliações, zeragens e voids nunca são compactados', () => {
  const pending = anOperation('deck_reset', { operationId: 'op-1' });
  const incoming = anOperation('deck_reset', { operationId: 'op-2' });
  expect(compactPendingOperation(pending, incoming)).toEqual({ action: 'append' });
});

it('TU-69 — suspensão e ajustes não têm regra de compactação e são sempre anexados', () => {
  const pending = anOperation('card_suspension', { operationId: 'op-1' });
  const incoming = anOperation('settings_patch', { operationId: 'op-2' });
  expect(compactPendingOperation(pending, incoming)).toEqual({ action: 'append' });
});
