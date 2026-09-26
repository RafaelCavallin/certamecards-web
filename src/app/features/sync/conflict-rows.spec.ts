import { expect, it } from 'vitest';
import type { ConflictCacheRow } from '../../core/db/account-db.model';
import { toConflictRows } from './conflict-rows';

const DECK = {
  id: 'd1', subjectId: 's1', name: 'Crase', description: null, origin: 'own' as const, originRef: null, originLabel: null,
  officialStatus: null, cardCount: 0, contentUpdatedAt: null, createdAt: 'x', updatedAt: 'x', deletedAt: null, version: 1, changeSeq: 0,
};
const CARD_DETAIL = { id: 'k1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins', losingSnapshot: { front: 'Editado' }, winningSnapshot: null, currentVersion: null, currentDeleted: true, expiresAt: '2026-10-26T12:00:00Z', restoredAt: null };
function row(overrides: Partial<ConflictCacheRow>): ConflictCacheRow {
  return { id: 'k1', entityType: 'card', entityId: 'c1', deckId: 'd1', reason: 'delete_wins', expiresAt: '2026-10-26T12:00:00Z', detail: null, ...overrides };
}

it('CA-29 — cartão mostra frente guardada, deck, momento em que foi guardado e prazo', () => {
  const [view] = toConflictRows([row({ detail: CARD_DETAIL })], { cards: [], decks: [DECK], nowIso: '2026-09-26T12:00:00Z' });
  expect(view).toMatchObject({ typeLabel: 'Cartão', title: 'Editado', deckLine: 'Deck: Crase', expired: false, restoredAtLabel: null });
  expect(view?.savedAtLabel).toMatch(/^26\/09\/2026/);
  expect(view?.expiresAtLabel).toMatch(/^26\/10\/2026/);
});

it('CA-21 — prazo vencido marca a linha como expirada; deck excluído e sem título são tratados', () => {
  const rows = toConflictRows(
    [row({ deckId: 'sumiu' }), row({ id: 'k2', entityType: 'deck', entityId: 'd1', deckId: null }), row({ id: 'k3', deckId: null, detail: { ...CARD_DETAIL, losingSnapshot: 'x' } })],
    { cards: [], decks: [DECK], nowIso: '2026-11-01T00:00:00Z' },
  );
  expect(rows.map((view) => [view.title, view.deckLine, view.expired])).toEqual([[null, 'Deck: excluído', true], ['Crase', null, true], [null, null, true]]);
});

it('CA-20 — conflito restaurado continua listado com a data da restauração', () => {
  const [view] = toConflictRows([row({ restoredAt: '2026-09-26T12:00:00Z' })], { cards: [], decks: [DECK], nowIso: '2026-09-26T13:00:00Z' });
  expect(view?.restoredAtLabel).toMatch(/^26\/09\/2026/);
});
