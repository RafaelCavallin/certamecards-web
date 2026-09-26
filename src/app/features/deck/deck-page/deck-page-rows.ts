import type { CardState } from '../../../core/api/card-state.model';
import { CARD_STATE_LEARNING, CARD_STATE_RELEARNING, CARD_STATE_REVIEW } from '../../../core/api/card-state.model';
import type { CardRow } from '../../../core/db/local-db.model';
import { isLeech } from '../../../core/data/card-flags';
import { isFresh } from '../../../core/data/deck-counts';
import { normalizeText } from '../../../shared/i18n/normalize-text';
import type { CardStateFilter } from '../components/card-search/card-search';
import type { CardListRow } from '../components/card-list/card-list.model';
import { dueLabel } from './due-label';

export interface DeckPageRowsInput {
  readonly cards: readonly CardRow[];
  readonly states: ReadonlyMap<string, CardState>;
  readonly query: string;
  readonly stateFilter: CardStateFilter;
  readonly now: Date;
}
export function buildCardListRows(input: DeckPageRowsInput): readonly CardListRow[] {
  const normalizedQuery = normalizeText(input.query);
  return input.cards
    .filter((card) => card.searchText.includes(normalizedQuery))
    .filter((card) => matchesStateFilter(input.states.get(card.id), input.stateFilter))
    .map((card) => toRow(card, input.states.get(card.id), input.now))
    .sort(byFront);
}
function matchesStateFilter(state: CardState | undefined, filter: CardStateFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'new') {
    return isFresh(state);
  }
  if (filter === 'suspended') {
    return state?.suspended === true;
  }
  if (filter === 'learning') {
    return state?.state === CARD_STATE_LEARNING || state?.state === CARD_STATE_RELEARNING;
  }
  return state?.state === CARD_STATE_REVIEW;
}
function toRow(card: CardRow, state: CardState | undefined, now: Date): CardListRow {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    source: card.source,
    dueText: dueLabel(state?.due, now),
    leech: isLeech(state ?? null),
    suspended: state?.suspended ?? false,
  };
}
function byFront(a: CardListRow, b: CardListRow): number {
  return a.front.localeCompare(b.front, 'pt-BR');
}
