import { expect, it } from 'vitest';
import { OFFICIAL_DECK_ACTIONS, OWN_DECK_ACTIONS } from '../../deck-page/deck-actions';
import { offlineActionsNote } from './offline-actions-note';

it('TU — deck próprio lista só zerar progresso', () => {
  expect(offlineActionsNote(OWN_DECK_ACTIONS)).toBe('Isso precisa de conexão: zerar progresso.');
});

it('TU — deck oficial lista zerar, duplicar e cancelar a inscrição', () => {
  expect(offlineActionsNote(OFFICIAL_DECK_ACTIONS)).toBe(
    'Isso precisa de conexão: zerar progresso, duplicar, cancelar a inscrição.',
  );
});

it('TU — sem ações que dependem da rede não há aviso', () => {
  expect(offlineActionsNote({ ...OWN_DECK_ACTIONS, resetProgress: false })).toBe('');
});
