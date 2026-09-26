import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { cardCreateOperation, cardRow } from './sync-action-test-support';
import { describeOperation } from './sync-operation-describer';

let db: AccountDb;
afterEach(async () => {
  await db.delete();
});

it('CA-09 — identifica criação de cartão pela frente e oferece o texto completo para cópia', async () => {
  db = new AccountDb('describer-test-1');
  const description = await describeOperation(db, cardCreateOperation('op-1', cardRow('c1', 'd1', 'Pergunta')));
  expect(description).toEqual({ kindLabel: 'Criar cartão', subject: 'Pergunta', copyText: 'Pergunta\n\nVerso Pergunta' });
});

it('CA-24 — suspensão identifica o cartão pela cópia local, sem texto para copiar', async () => {
  db = new AccountDb('describer-test-2');
  await db.cards.add(cardRow('c1', 'd1', 'Frente oficial'));
  const operation = cardCreateOperation('op-1', cardRow('c1', 'd1', 'x'), {
    kind: 'card_suspension', payload: { kind: 'card_suspension', cardId: 'c1', suspended: true },
  });
  expect(await describeOperation(db, operation)).toEqual({ kindLabel: 'Suspender ou reativar cartão', subject: 'Frente oficial', copyText: null });
});

it('TU — deck e restauração usam nome/frente do payload; item sem cópia local não tem objeto', async () => {
  db = new AccountDb('describer-test-3');
  const base = cardCreateOperation('op-1', cardRow('c1', 'd1', 'x'));
  const deck = {
    id: 'd1', subjectId: 's1', name: 'Crase', description: 'Regras', origin: 'own' as const, originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 0,
  };
  expect(await describeOperation(db, { ...base, kind: 'deck_update', payload: { kind: 'deck_update', deck } })).toMatchObject({ subject: 'Crase', copyText: 'Crase\n\nRegras' });
  const restore = { ...base, kind: 'conflict_restore' as const, payload: { kind: 'conflict_restore' as const, conflictId: 'k', snapshot: { name: 'Deck antigo', description: null }, targetDeckId: null } };
  expect(await describeOperation(db, restore)).toMatchObject({ kindLabel: 'Restaurar versão guardada', subject: 'Deck antigo', copyText: 'Deck antigo' });
  const empty = { ...base, kind: 'conflict_restore' as const, payload: { kind: 'conflict_restore' as const, conflictId: 'k', snapshot: null, targetDeckId: null } };
  expect(await describeOperation(db, empty)).toMatchObject({ subject: null, copyText: null });
  expect(await describeOperation(db, { ...base, kind: 'deck_reset', entityId: 'sem-copia', payload: { kind: 'deck_reset', deckId: 'sem-copia' } })).toMatchObject({ subject: null });
});
