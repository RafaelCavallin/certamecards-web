import type { SyncOperationRow } from '../db/account-db.model';
import type { CardRow } from '../db/local-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

type Operation = SyncOperationRow<SyncOperationPayload>;
export function cardRow(id: string, deckId: string, front: string): CardRow {
  return {
    id, deckId, type: 'basic', front, back: `Verso ${front}`, source: null, createdAt: 'x', updatedAt: 'x',
    deletedAt: null, version: 1, changeSeq: 1, searchText: front.toLowerCase(),
  };
}
export function cardCreateOperation(operationId: string, card: CardRow, overrides: Partial<Operation> = {}): Operation {
  return {
    operationId, accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: 'card_create', entityId: card.id,
    parentId: card.deckId, baseVersion: null, predecessorOperationId: null, dependsOn: [], occurredAt: '2026-09-23T00:00:00Z',
    clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 }, observedServerTime: '2026-09-23T00:00:00Z',
    payload: { kind: 'card_create', card }, status: 'action_required', attempts: 1, retryAt: null, leaseUntil: null,
    error: { code: 'validation_failed', message: 'inválido' }, syncedAt: null, ...overrides,
  };
}
