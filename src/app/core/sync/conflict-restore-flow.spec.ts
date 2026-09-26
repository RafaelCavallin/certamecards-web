import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import type { ChangeEntry } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { applyChangeEntry } from './projection-resolver';
import { ConflictRestoreWriter } from './conflict-restore-writer';
import { settleMutationResults } from './mutation-settler';
import type { MutationResult } from './sync-operation.model';

let db: AccountDb;

afterEach(async () => {
  await db.delete();
});

it('TI-77 — um conflito recebido pelo feed pode ser restaurado offline e depois sincronizado', async () => {
  TestBed.configureTestingModule({});
  db = new AccountDb('conflict-restore-flow-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'u1' });
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'Deck', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    version: 1, changeSeq: 0,
  });
  const conflictEntry: ChangeEntry = {
    changeSeq: 10, type: 'conflict',
    payload: {
      id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins',
      expiresAt: '2026-10-20T00:00:00Z', restoredAt: null, expiredAt: null,
    },
  };
  await applyChangeEntry(db, conflictEntry, 'u1');
  await db.conflicts.update('conf-1', {
    detail: {
      id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins',
      losingSnapshot: { front: 'Pergunta', back: 'Resposta', source: null }, winningSnapshot: null,
      currentVersion: null, currentDeleted: true, expiresAt: '2026-10-20T00:00:00Z', restoredAt: null,
    },
  });

  const writer = TestBed.inject(ConflictRestoreWriter);
  const outcome = await writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd1' });

  expect(outcome).toMatchObject({ entityType: 'card', entityId: 'c1' });
  expect(await db.cards.get('c1')).toMatchObject({ id: 'c1', deckId: 'd1', front: 'Pergunta' });
  const [operation] = await db.syncOperations.toArray();
  expect(operation).toMatchObject({ kind: 'conflict_restore', status: 'pending' });
  expect(operation).toBeDefined();
  if (operation === undefined) {
    throw new Error('operação não enfileirada');
  }

  const result: MutationResult = {
    operationId: operation.operationId, outcome: 'applied', entityVersion: 2, changeSeq: 55,
    canonicalOrder: { eventAt: '2026-09-24T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: operation.operationId },
    conflictId: null, error: null,
  };
  await settleMutationResults(db, { operations: [operation], results: [result] }, Date.now());

  expect(await db.syncOperations.get(operation.operationId)).toMatchObject({ status: 'synced' });
  expect(await db.cards.get('c1')).toMatchObject({ version: 2, changeSeq: 55 });
});
