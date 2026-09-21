import { expect, it } from 'vitest';
import { toCardRow } from './card-row';

it('TU-20 — searchText normaliza frente, verso e fonte sem acentos', () => {
  const row = toCardRow({
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'Mandado de Segurança',
    back: 'Prazo de 120 dias',
    source: 'Lei 12.016/09',
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
  });
  expect(row.searchText).toBe('mandado de seguranca prazo de 120 dias lei 12.016/09');
});

it('TU-20 — searchText não quebra quando não há fonte', () => {
  const row = toCardRow({
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'Q',
    back: 'R',
    source: null,
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
  });
  expect(row.searchText).toBe('q r');
});
