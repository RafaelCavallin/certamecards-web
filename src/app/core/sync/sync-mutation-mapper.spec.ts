import { expect, it } from 'vitest';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';
import { toOperationWire } from './sync-mutation-mapper';

function baseOperation(payload: SyncOperationPayload): SyncOperationRow<SyncOperationPayload> {
  return {
    operationId: 'op-1', accountId: 'u1', deviceId: 'device-1', deviceSequence: 1, kind: payload.kind,
    entityId: 'e1', parentId: null, baseVersion: null, predecessorOperationId: null, dependsOn: [],
    occurredAt: '2026-09-23T00:00:00Z', clock: { wallTime: '2026-09-23T00:00:00Z', logicalCounter: 0 },
    observedServerTime: '2026-09-23T00:00:00Z', payload, status: 'pending', attempts: 0, retryAt: null,
    leaseUntil: null, error: null, syncedAt: null,
  };
}

it('TU — mapeia deck_create para subjectId, name e description', () => {
  const operation = baseOperation({
    kind: 'deck_create',
    deck: {
      id: 'd1', subjectId: 's1', name: 'CF/88', description: 'x', origin: 'own', originRef: null,
      originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 1, changeSeq: 0,
    },
  });
  const wire = toOperationWire(operation);
  expect(wire.payload).toEqual({ subjectId: 's1', name: 'CF/88', description: 'x' });
});

it('TU — mapeia card_update para front, back, source e parentBaseVersion nulo', () => {
  const operation = baseOperation({
    kind: 'card_update',
    card: {
      id: 'c1', deckId: 'd1', type: 'basic', front: 'F', back: 'B', source: null,
      createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', deletedAt: null, version: 2, changeSeq: 0,
    },
  });
  const wire = toOperationWire(operation);
  expect(wire.payload).toEqual({ front: 'F', back: 'B', source: null, parentBaseVersion: null });
});

it('TU — mapeia deck_delete e card_delete para payload nulo', () => {
  const deckWire = toOperationWire(baseOperation({ kind: 'deck_delete', deckId: 'd1' }));
  const cardWire = toOperationWire(baseOperation({ kind: 'card_delete', cardId: 'c1' }));
  expect(deckWire.payload).toBeNull();
  expect(cardWire.payload).toBeNull();
});

it('TU — mapeia card_suspension para suspended', () => {
  const wire = toOperationWire(baseOperation({ kind: 'card_suspension', cardId: 'c1', suspended: true }));
  expect(wire.payload).toEqual({ suspended: true });
});

it('TU — mapeia settings_patch repassando os campos alterados', () => {
  const wire = toOperationWire(baseOperation({ kind: 'settings_patch', changes: { theme: 'noite' } }));
  expect(wire.payload).toEqual({ theme: 'noite' });
});

it('TU — mapeia profile_patch para displayName', () => {
  const wire = toOperationWire(baseOperation({ kind: 'profile_patch', displayName: 'Ana' }));
  expect(wire.payload).toEqual({ displayName: 'Ana' });
});

it('TU-80 — mapeia conflict_restore para conflictId, snapshot e targetDeckId', () => {
  const wire = toOperationWire(baseOperation({
    kind: 'conflict_restore', conflictId: 'conf-1', snapshot: { front: 'F', back: 'B' }, targetDeckId: 'd2',
  }));
  expect(wire.payload).toEqual({ conflictId: 'conf-1', snapshot: { front: 'F', back: 'B' }, targetDeckId: 'd2' });
});

it('TU — repassa os campos de identidade e ordem do envelope', () => {
  const wire = toOperationWire(baseOperation({ kind: 'deck_delete', deckId: 'd1' }));
  expect(wire).toMatchObject({
    operationId: 'op-1', kind: 'deck_delete', entityId: 'e1', parentId: null, baseVersion: null,
    predecessorOperationId: null, dependsOn: [], occurredAt: '2026-09-23T00:00:00Z',
    observedServerTime: '2026-09-23T00:00:00Z',
  });
});
