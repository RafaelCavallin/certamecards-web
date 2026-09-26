import type { Card } from '../../core/api/card.model';
import type { Deck } from '../../core/api/deck.model';
import type { ConflictCacheRow } from '../../core/db/account-db.model';
import { formatDateTimePtBr } from '../../shared/i18n/format-date';

export interface ConflictRowView {
  readonly id: string;
  readonly typeLabel: string;
  readonly title: string | null;
  readonly deckLine: string | null;
  readonly savedAtLabel: string;
  readonly expiresAtLabel: string;
  readonly expired: boolean;
  readonly restoredAtLabel: string | null;
}
const CONFLICT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
function snapshotTitle(row: ConflictCacheRow): string | null {
  const snapshot = row.detail?.losingSnapshot;
  if (typeof snapshot !== 'object' || snapshot === null) {
    return null;
  }
  const record = snapshot as Readonly<Record<string, unknown>>;
  const title = row.entityType === 'deck' ? record['name'] : record['front'];
  return typeof title === 'string' ? title : null;
}
function title(row: ConflictCacheRow, cards: readonly Card[], decks: readonly Deck[]): string | null {
  const local = row.entityType === 'deck' ? decks.find((deck) => deck.id === row.entityId)?.name : cards.find((card) => card.id === row.entityId)?.front;
  return local ?? snapshotTitle(row);
}
function deckLine(row: ConflictCacheRow, decks: readonly Deck[]): string | null {
  if (row.entityType === 'deck' || row.deckId === null) {
    return null;
  }
  const deck = decks.find((candidate) => candidate.id === row.deckId);
  return deck === undefined ? 'Deck: excluído' : `Deck: ${deck.name}`;
}
export function toConflictRows(rows: readonly ConflictCacheRow[], context: { cards: readonly Card[]; decks: readonly Deck[]; nowIso: string }): readonly ConflictRowView[] {
  return rows.map((row) => ({
    id: row.id,
    typeLabel: row.entityType === 'deck' ? 'Deck' : 'Cartão',
    title: title(row, context.cards, context.decks),
    deckLine: deckLine(row, context.decks),
    savedAtLabel: formatDateTimePtBr(new Date(Date.parse(row.expiresAt) - CONFLICT_RETENTION_MS).toISOString()),
    expiresAtLabel: formatDateTimePtBr(row.expiresAt),
    expired: row.expiresAt <= context.nowIso,
    restoredAtLabel: typeof row.restoredAt === 'string' ? formatDateTimePtBr(row.restoredAt) : null,
  }));
}
