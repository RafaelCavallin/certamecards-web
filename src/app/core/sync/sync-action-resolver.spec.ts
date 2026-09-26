import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { SyncActionResolver } from './sync-action-resolver';
import { cardCreateOperation, cardRow } from './sync-action-test-support';
import { SyncCycleCoordinator } from './sync-cycle-coordinator';

let db: AccountDb;
const retryNow = vi.fn();
function setup(name: string): SyncActionResolver {
  TestBed.configureTestingModule({ providers: [{ provide: SyncCycleCoordinator, useValue: { retryNow } }] });
  db = new AccountDb(name);
  TestBed.inject(CurrentAccountDb).set({ db, userId: name });
  return TestBed.inject(SyncActionResolver);
}
afterEach(async () => {
  retryNow.mockReset();
  await db.delete();
});

it('CA-26 — tentar novamente reenfileira com operationId novo (o recusado não se repete), remapeia dependentes e antecipa o ciclo', async () => {
  const resolver = setup('action-resolver-test-1');
  const card = cardRow('c1', 'd1', 'A');
  await db.syncOperations.bulkAdd([
    cardCreateOperation('op-1', card, { attempts: 3, error: { code: 'user_card_limit', message: 'x' } }),
    cardCreateOperation('op-2', card, { kind: 'card_update', status: 'pending', error: null, predecessorOperationId: 'op-1', dependsOn: ['op-1'] }),
  ]);
  await resolver.retry('op-1');
  await resolver.retry('inexistente');
  expect(await db.syncOperations.get('op-1')).toBeUndefined();
  const renewed = (await db.syncOperations.toArray()).find((operation) => operation.kind === 'card_create');
  expect(renewed).toMatchObject({ status: 'pending', error: null, attempts: 0, retryAt: null, entityId: 'c1' });
  expect(await db.syncOperations.get('op-2')).toMatchObject({ predecessorOperationId: renewed?.operationId, dependsOn: [renewed?.operationId] });
  expect(retryNow).toHaveBeenCalledTimes(2);
});

it('CA-09 — descartar um deck criado offline remove dependentes, o deck, seus cartões e pede novo pull completo', async () => {
  const resolver = setup('action-resolver-test-2');
  const card = cardRow('c1', 'd1', 'A');
  const deckOp = cardCreateOperation('op-deck', card, { kind: 'deck_create', entityId: 'd1', parentId: null });
  const cardOp = cardCreateOperation('op-card', card, { status: 'pending', error: null, dependsOn: ['op-deck'] });
  const editOp = cardCreateOperation('op-edit', card, { kind: 'card_update', status: 'pending', error: null, predecessorOperationId: 'op-card' });
  const unrelated = cardCreateOperation('op-other', cardRow('c2', 'd2', 'B'), { status: 'pending', error: null });
  await db.syncOperations.bulkAdd([deckOp, cardOp, editOp, unrelated]);
  await db.cards.bulkAdd([card, cardRow('c2', 'd2', 'B')]);
  await db.setCursor(42);
  expect(await resolver.affectedCount('op-deck')).toBe(3);
  await resolver.discard('op-deck');
  expect((await db.syncOperations.toArray()).map((operation) => operation.operationId)).toEqual(['op-other']);
  expect(await db.cards.get('c1')).toBeUndefined();
  expect(await db.cards.get('c2')).toBeDefined();
  expect(await db.getCursor()).toBe(0);
  expect(retryNow).toHaveBeenCalledOnce();
});

it('CA-09 — descartar edição recusada mantém o cartão local para o pull restaurá-lo; restauração descartada sai do dispositivo', async () => {
  const resolver = setup('action-resolver-test-3');
  await db.cards.bulkAdd([cardRow('c1', 'd1', 'A'), cardRow('c2', 'd1', 'B')]);
  await db.syncOperations.bulkAdd([
    cardCreateOperation('op-edit', cardRow('c1', 'd1', ''), { kind: 'card_update' }),
    cardCreateOperation('op-restore', cardRow('c2', 'd1', 'B'), { kind: 'conflict_restore', payload: { kind: 'conflict_restore', conflictId: 'k', snapshot: null, targetDeckId: 'd1' } }),
  ]);
  await resolver.discard('op-edit');
  await resolver.discard('op-restore');
  expect(await db.cards.get('c1')).toBeDefined();
  expect(await db.cards.get('c2')).toBeUndefined();
  expect(await db.syncOperations.count()).toBe(0);
});
