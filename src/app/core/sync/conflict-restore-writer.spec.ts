import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { ConflictDetail } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import type { ConflictCacheRow } from '../db/account-db.model';
import { ConflictRestoreWriter } from './conflict-restore-writer';

let db: AccountDb;
function cardDetail(overrides: Partial<ConflictDetail> = {}): ConflictDetail {
  return {
    id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins',
    losingSnapshot: { front: 'Pergunta', back: 'Resposta', source: null }, winningSnapshot: null,
    currentVersion: null, currentDeleted: true, expiresAt: '2026-10-01T00:00:00Z', restoredAt: null, ...overrides,
  };
}
function conflictRow(detail: ConflictDetail, overrides: Partial<ConflictCacheRow> = {}): ConflictCacheRow {
  return {
    id: detail.id, entityType: detail.entityType, entityId: detail.entityId, deckId: detail.deckId,
    reason: detail.reason, expiresAt: detail.expiresAt, detail, ...overrides,
  };
}
function setup(): ConflictRestoreWriter {
  TestBed.configureTestingModule({});
  db = new AccountDb('conflict-restore-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'u1' });
  return TestBed.inject(ConflictRestoreWriter);
}

afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
});

it('TU-80 — restaura um cartão órfão em outro deck e enfileira uma nova operação sem apagar o registro do conflito', async () => {
  const writer = setup();
  await db.decks.put({
    id: 'd2', subjectId: 's1', name: 'Deck de destino', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x',
    deletedAt: null, version: 1, changeSeq: 0,
  });
  const detail = cardDetail();
  await db.conflicts.put(conflictRow(detail));

  const result = await writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd2' });

  expect(result).toMatchObject({ entityType: 'card', entityId: 'c1' });
  const card = await db.cards.get('c1');
  expect(card).toMatchObject({ id: 'c1', deckId: 'd2', front: 'Pergunta', back: 'Resposta', deletedAt: null });
  const operations = await db.syncOperations.toArray();
  expect(operations).toHaveLength(1);
  expect(operations[0]).toMatchObject({ kind: 'conflict_restore', entityId: 'c1', status: 'pending' });
  expect(result.operationId).toBe(operations[0]?.operationId);
  expect(operations[0]?.payload).toMatchObject({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd2' });
  expect(await db.conflicts.get('conf-1')).toBeDefined();
});

it('TU-80 — usa o deck original quando nenhum destino é informado', async () => {
  const writer = setup();
  await db.decks.put({
    id: 'd1', subjectId: 's1', name: 'Deck original', description: null, origin: 'own', originRef: null,
    originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x',
    deletedAt: null, version: 1, changeSeq: 0,
  });
  await db.conflicts.put(conflictRow(cardDetail()));

  const result = await writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: null });

  expect(result.entityId).toBe('c1');
  expect(await db.cards.get('c1')).toMatchObject({ deckId: 'd1' });
});

it('TU-80 — restaura um deck excluído por delete-wins', async () => {
  const writer = setup();
  const detail = cardDetail({
    entityType: 'deck', entityId: 'd1', deckId: null,
    losingSnapshot: { subjectId: 's1', name: 'Meu deck', description: 'Notas' },
  });
  await db.conflicts.put(conflictRow(detail));

  const result = await writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: null });

  expect(result).toMatchObject({ entityType: 'deck', entityId: 'd1' });
  expect(typeof result.operationId).toBe('string');
  expect(await db.decks.get('d1')).toMatchObject({ id: 'd1', name: 'Meu deck', deletedAt: null });
});

it('TU-80 — exige um deck de destino quando o cartão não tem mais deck', async () => {
  const writer = setup();
  await db.conflicts.put(conflictRow(cardDetail({ deckId: null })));

  await expect(writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: null })).rejects.toThrow();
  expect(await db.cards.get('c1')).toBeUndefined();
});

it('TU-81 — recusa restaurar um conflito expirado mesmo offline', async () => {
  const writer = setup();
  await db.conflicts.put(conflictRow(cardDetail({ expiresAt: '2020-01-01T00:00:00Z' }), { expiresAt: '2020-01-01T00:00:00Z' }));

  await expect(writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd1' })).rejects.toThrow();
  expect(await db.syncOperations.count()).toBe(0);
});

it('TU-81 — recusa restaurar quando o snapshot ainda não foi baixado', async () => {
  const writer = setup();
  await db.conflicts.put({
    id: 'conf-1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins',
    expiresAt: '2026-10-01T00:00:00Z', detail: null,
  });

  await expect(writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd1' })).rejects.toThrow();
});

it('CA-20 — isSynced só confirma a restauração depois que a operação sincroniza', async () => {
  const writer = setup();
  await db.decks.put({
    id: 'd2', subjectId: 's1', name: 'Destino', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x',
    deletedAt: null, version: 1, changeSeq: 0,
  });
  await db.conflicts.put(conflictRow(cardDetail()));
  const { operationId } = await writer.execute({ kind: 'conflict_restore', conflictId: 'conf-1', targetDeckId: 'd2' });
  expect(await writer.isSynced(operationId)).toBe(false);
  await db.syncOperations.update(operationId, { status: 'synced' });
  expect(await writer.isSynced(operationId)).toBe(true);
  expect(await writer.isSynced('purged-operation')).toBe(true);
});
