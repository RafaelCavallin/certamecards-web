import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { LocalMutationValidationError } from './local-storage-error';
import { CardLimitPolicy } from './card-limit-policy';
import type { CardLimitViolation } from './card-limits';
import { CardMutationWriter } from './card-mutation-writer';

let db: AccountDb;

function setup(violation: CardLimitViolation = null): CardMutationWriter {
  TestBed.configureTestingModule({
    providers: [{ provide: CardLimitPolicy, useValue: { violation: vi.fn().mockReturnValue(violation) } }],
  });
  db = new AccountDb('card-mutation-writer-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'card-mutation-writer-test' });
  return TestBed.inject(CardMutationWriter);
}
async function givenDeck(id = 'd1'): Promise<void> {
  await db.decks.add({
    id, subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    version: 1, changeSeq: 1,
  });
}

afterEach(async () => {
  await db?.delete();
});

it('TU-67 — card_create grava a projeção com searchText e enfileira a operação', async () => {
  const writer = setup();
  await givenDeck();
  const card = await writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  expect(card.id).toBe('c1');
  expect((await db.cards.get('c1'))?.searchText).toContain('q');
  expect(await db.syncOperations.count()).toBe(1);
});

it('TU — card_create recusa deck excluído', async () => {
  const writer = setup();
  await db.decks.add({
    id: 'd1', subjectId: 's1', name: 'x', description: null, origin: 'own', originRef: null, originLabel: null,
    officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: 'x',
    version: 1, changeSeq: 1,
  });
  await expect(
    writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'c1', type: 'basic', front: 'Q', back: 'R', source: null }),
  ).rejects.toBeInstanceOf(LocalMutationValidationError);
});

it('TU — card_update grava o conteúdo atualizado', async () => {
  const writer = setup();
  await givenDeck();
  await writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  const updated = await writer.execute({ kind: 'card_update', cardId: 'c1', changes: { front: 'Nova pergunta' } });
  expect(updated.front).toBe('Nova pergunta');
});

it('TU — card_delete marca o cartão como excluído', async () => {
  const writer = setup();
  await givenDeck();
  await writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'c1', type: 'basic', front: 'Q', back: 'R', source: null });
  const deleted = await writer.execute({ kind: 'card_delete', cardId: 'c1' });
  expect(deleted.deletedAt).not.toBeNull();
});

it('TU — recusa criar cartão quando o deck atingiu o limite (RF1.11)', async () => {
  const writer = setup('deck_card_limit');
  await givenDeck();
  await expect(
    writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'over-limit', type: 'basic', front: 'Q', back: 'R', source: null }),
  ).rejects.toBeInstanceOf(LocalMutationValidationError);
  expect(await db.cards.get('over-limit')).toBeUndefined();
});

it('TU — recusa criar cartão quando a conta atingiu o limite (RF1.11)', async () => {
  const writer = setup('user_card_limit');
  await givenDeck();
  await expect(
    writer.execute({ kind: 'card_create', deckId: 'd1', cardId: 'over-limit', type: 'basic', front: 'Q', back: 'R', source: null }),
  ).rejects.toBeInstanceOf(LocalMutationValidationError);
  expect(await db.cards.get('over-limit')).toBeUndefined();
});
