import { expect, it } from 'vitest';
import { deckActions } from './deck-actions';

it('TU-41 — deck oficial inscrito não oferece criar, editar nem excluir', () => {
  const actions = deckActions({ origin: 'official_subscription' });
  expect(actions).toMatchObject({ editMetadata: false, deleteDeck: false, createCard: false, editCard: false });
});

it('TU-41 — deck oficial inscrito oferece suspender, zerar, cancelar, duplicar e apontar erro', () => {
  const actions = deckActions({ origin: 'official_subscription' });
  expect(actions).toMatchObject({
    suspend: true, resetProgress: true, cancelSubscription: true, duplicate: true, reportError: true,
  });
});

it('TU-41 — deck próprio e cópia oferecem tudo do PRD 1 e nada da inscrição', () => {
  for (const origin of ['own', 'official_copy']) {
    expect(deckActions({ origin })).toMatchObject({
      editMetadata: true, deleteDeck: true, createCard: true, editCard: true, suspend: true, resetProgress: true,
      cancelSubscription: false, duplicate: false, reportError: false,
    });
  }
});
