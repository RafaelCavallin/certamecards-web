import { expect, it } from 'vitest';
import { summarizeChanges } from './audit-changes';
import { actionLabel } from './audit-log-labels';

it('TU — resume cada campo como "campo: antes → depois" e mostra "vazio" para nulo', () => {
  expect(summarizeChanges({ back: { before: 'A', after: 'B' }, note: { before: null, after: 'Lei' } })).toEqual([
    'back: A → B', 'note: vazio → Lei',
  ]);
});

it('TU — valores que não são texto viram JSON e sem mudanças devolve lista vazia', () => {
  expect(summarizeChanges({ role: { before: ['candidate'], after: 1 } })).toEqual(['role: ["candidate"] → 1']);
  expect(summarizeChanges({})).toEqual([]);
});

it('TU — ação desconhecida aparece pelo código', () => {
  expect(actionLabel('official_deck_published')).toBe('Deck oficial publicado');
  expect(actionLabel('nova_acao')).toBe('nova_acao');
});
