import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { LocalStorageFullError } from './local-storage-error';
import { runMutationTransaction } from './local-mutation-writer';

let db: AccountDb;

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — grava em todas as tabelas da transação atomicamente', async () => {
  db = new AccountDb('local-mutation-writer-test-1');
  const result = await runMutationTransaction(db, [db.decks, db.syncOperations], async () => {
    await db.decks.add({
      id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
      officialStatus: null, originLabel: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x',
      deletedAt: null, version: 1, changeSeq: 0,
    });
    return 'ok';
  });
  expect(result).toBe('ok');
  expect(await db.decks.get('d1')).toBeDefined();
});

it('TU-68 — QuotaExceededError vira LocalStorageFullError e aborta a transação inteira', async () => {
  db = new AccountDb('local-mutation-writer-test-2');
  const quotaError = new Error('quota');
  quotaError.name = 'QuotaExceededError';
  await expect(
    runMutationTransaction(db, [db.decks], async () => {
      await db.decks.add({
        id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null,
        officialStatus: null, originLabel: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x',
        deletedAt: null, version: 1, changeSeq: 0,
      });
      throw quotaError;
    }),
  ).rejects.toBeInstanceOf(LocalStorageFullError);
  expect(await db.decks.get('d1')).toBeUndefined();
});

it('TU — erro que não é de quota propaga sem alterar o tipo', async () => {
  db = new AccountDb('local-mutation-writer-test-3');
  const domainError = new Error('validação falhou');
  await expect(runMutationTransaction(db, [db.decks], () => Promise.reject(domainError))).rejects.toBe(domainError);
});
