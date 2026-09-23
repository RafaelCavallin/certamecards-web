import { expect, it } from 'vitest';
import { adminErrorMessage } from './admin-errors';

function error(code: string, detail = 'x'): Parameters<typeof adminErrorMessage>[0] {
  return { type: 'x', title: 'x', status: 422, code, detail };
}

it('CA-18 — official_deck_min_cards mostra o texto do servidor', () => {
  expect(adminErrorMessage(error('official_deck_min_cards', 'Este tem 4.'))).toBe('Este tem 4.');
});

it('CA-19 — official_deck_has_subscribers orienta a descontinuar', () => {
  expect(adminErrorMessage(error('official_deck_has_subscribers'))).toContain('Descontinue o deck');
});

it('TU — conflito de versão, matéria desativada, limite e permissão têm mensagem própria', () => {
  expect(adminErrorMessage(error('version_conflict'))).toContain('alterado por outra pessoa');
  expect(adminErrorMessage(error('subject_inactive'))).toContain('desativada');
  expect(adminErrorMessage(error('deck_card_limit'))).toContain('5.000');
  expect(adminErrorMessage(error('forbidden'))).toContain('permissão');
});
