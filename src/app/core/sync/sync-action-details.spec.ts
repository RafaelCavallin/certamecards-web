import { afterEach, expect, it } from 'vitest';
import { AccountDb } from '../db/account-db';
import { buildActionsRequired, buildNotices } from './sync-action-details';
import { cardCreateOperation, cardRow } from './sync-action-test-support';

let db: AccountDb;
afterEach(async () => {
  await db.delete();
});

it('CA-26 — limite da conta traz a mensagem do servidor e o total conhecido no dispositivo', async () => {
  db = new AccountDb('action-details-test-1');
  await db.cards.bulkAdd([cardRow('c1', 'd1', 'A'), cardRow('c2', 'd2', 'B'), { ...cardRow('c3', 'd1', 'C'), deletedAt: 'x' }]);
  const error = { code: 'user_card_limit', message: 'Você chegou a 50.000 cartões.' };
  const [action] = await buildActionsRequired(db, [cardCreateOperation('op-1', cardRow('c1', 'd1', 'A'), { error })]);
  expect(action).toMatchObject({ code: 'user_card_limit', knownCardCount: 2, subject: 'A' });
});

it('CA-26 — limite do deck conta só os cartões ativos daquele deck', async () => {
  db = new AccountDb('action-details-test-2');
  await db.cards.bulkAdd([cardRow('c1', 'd1', 'A'), cardRow('c2', 'd2', 'B')]);
  const error = { code: 'deck_card_limit', message: 'Este deck chegou a 5.000 cartões.' };
  const [action] = await buildActionsRequired(db, [cardCreateOperation('op-1', cardRow('c9', 'd1', 'Novo'), { error })]);
  expect(action?.knownCardCount).toBe(1);
});

it('CA-09 — ignora pendentes, sem erro vira o próprio status e limite de deck sem deck não conta', async () => {
  db = new AccountDb('action-details-test-3');
  const card = cardRow('c1', 'd1', 'A');
  const operations = [
    cardCreateOperation('op-1', card, { status: 'pending', error: null }),
    cardCreateOperation('op-2', card, { status: 'auth_required', error: null }),
    cardCreateOperation('op-3', card, { kind: 'deck_reset', parentId: null, payload: { kind: 'deck_reset', deckId: 'd1' }, error: { code: 'deck_card_limit', message: 'x' } }),
  ];
  const actions = await buildActionsRequired(db, operations);
  expect(actions.map((action) => [action.operationId, action.code, action.knownCardCount])).toEqual([['op-2', 'auth_required', null], ['op-3', 'deck_card_limit', null]]);
});

it('CA-24 — avisos listam só operações sincronizadas com not_applicable', async () => {
  db = new AccountDb('action-details-test-4');
  await db.cards.add(cardRow('c1', 'd1', 'Pergunta oficial'));
  const suspension = { kind: 'card_suspension' as const, payload: { kind: 'card_suspension' as const, cardId: 'c1', suspended: true } };
  const operations = [
    cardCreateOperation('op-1', cardRow('c1', 'd1', 'x'), { ...suspension, status: 'synced', error: { code: 'not_applicable', message: 'x' } }),
    cardCreateOperation('op-2', cardRow('c1', 'd1', 'x'), { ...suspension, status: 'synced', error: null }),
  ];
  expect(await buildNotices(db, operations)).toEqual([{ operationId: 'op-1', kindLabel: 'Suspender ou reativar cartão', subject: 'Pergunta oficial' }]);
});
