import { afterEach, expect, it } from 'vitest';
import type { CardChangePayload, ChangeEntry } from '../api/sync.model';
import { AccountDb } from '../db/account-db';
import { toCardRow } from '../db/card-row';
import { settleMutationResults } from './mutation-settler';
import { applyChangeEntry } from './projection-resolver';
import { pendingOperation } from './projection-resolver-test-support';
import type { MutationResult } from './sync-operation.model';

let db: AccountDb;
const ORDER = { eventAt: '2026-09-26T00:00:00Z', logicalCounter: 0, deviceId: 'device-1', operationId: 'op-1' };

afterEach(async () => {
  await db.delete();
});

function cardPayload(front: string, deletedAt: string | null = null): CardChangePayload {
  return {
    id: 'c1', deckId: 'd1', type: 'basic', front, back: 'Verso', source: null, version: 1,
    createdAt: '2026-09-26T00:00:00Z', updatedAt: '2026-09-26T00:00:00Z', deletedAt,
  };
}
function cardEntry(front: string, changeSeq: number, deletedAt: string | null = null): ChangeEntry {
  return { changeSeq, type: 'card', payload: cardPayload(front, deletedAt) };
}
function result(outcome: MutationResult['outcome'], changeSeq: number | null): MutationResult {
  return { operationId: 'op-1', outcome, entityVersion: null, changeSeq, canonicalOrder: ORDER, conflictId: null, error: null };
}
async function withPendingLocalEdit(name: string): Promise<ReturnType<typeof pendingOperation>> {
  db = new AccountDb(name);
  await db.cards.put(toCardRow({ ...cardPayload('Editado localmente'), changeSeq: 10 }));
  const operation = { ...pendingOperation('card_update', 'c1'), status: 'sending' as const };
  await db.syncOperations.add(operation);
  return operation;
}

it('TU-74 — versão remota vencedora recebida durante a edição pendente é aplicada quando a operação resolve', async () => {
  const operation = await withPendingLocalEdit('remote-base-test-1');
  await applyChangeEntry(db, cardEntry('Editado no outro dispositivo', 21), 'u1');
  await applyChangeEntry(db, cardEntry('Versão intermediária', 15), 'u1');
  expect((await db.cards.get('c1'))?.front).toBe('Editado localmente');
  await settleMutationResults(db, { operations: [operation], results: [result('duplicate', 20)] }, Date.now());
  expect(await db.cards.get('c1')).toMatchObject({ front: 'Editado no outro dispositivo', changeSeq: 21 });
  expect(await db.remoteBases.count()).toBe(0);
});

it('TU-74 — versão remota anterior ao resultado da própria operação é descartada', async () => {
  const operation = await withPendingLocalEdit('remote-base-test-2');
  await applyChangeEntry(db, cardEntry('Estado antigo do servidor', 12), 'u1');
  await settleMutationResults(db, { operations: [operation], results: [result('applied', 20)] }, Date.now());
  expect((await db.cards.get('c1'))?.front).toBe('Editado localmente');
  expect(await db.remoteBases.count()).toBe(0);
});

it('TU-74 — exclusão remota vence a edição pendente e é aplicada quando o conflito resolve', async () => {
  const operation = await withPendingLocalEdit('remote-base-test-3');
  await applyChangeEntry(db, cardEntry('Editado localmente', 30, '2026-09-26T01:00:00Z'), 'u1');
  await settleMutationResults(db, { operations: [operation], results: [result('conflict', null)] }, Date.now());
  expect((await db.cards.get('c1'))?.deletedAt).toBe('2026-09-26T01:00:00Z');
});

it('TU-74 — com outra operação ainda pendente na mesma entidade, a base remota continua guardada', async () => {
  const operation = await withPendingLocalEdit('remote-base-test-4');
  await db.syncOperations.add({ ...pendingOperation('card_update', 'c1'), operationId: 'op-2', deviceSequence: 2 });
  await applyChangeEntry(db, cardEntry('Remoto', 40), 'u1');
  await settleMutationResults(db, { operations: [operation], results: [result('applied', 20)] }, Date.now());
  expect((await db.cards.get('c1'))?.front).toBe('Editado localmente');
  expect(await db.remoteBases.get('c1')).toMatchObject({ changeSeq: 40 });
});

it('TU-74 — pull sem pendência aplica o remoto e descarta base antiga guardada', async () => {
  db = new AccountDb('remote-base-test-5');
  await db.remoteBases.put({ entityId: 'c1', entityType: 'card', changeSeq: 5, payload: cardPayload('Antiga') });
  await applyChangeEntry(db, cardEntry('Atual', 50), 'u1');
  expect((await db.cards.get('c1'))?.front).toBe('Atual');
  expect(await db.remoteBases.count()).toBe(0);
});
