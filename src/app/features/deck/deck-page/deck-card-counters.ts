import type { CardState } from '../../../core/api/card-state.model';
import {
  CARD_STATE_LEARNING,
  CARD_STATE_NEW,
  CARD_STATE_RELEARNING,
  CARD_STATE_REVIEW,
} from '../../../core/api/card-state.model';
import type { CardRow } from '../../../core/db/local-db.model';

export interface DeckCardCounters {
  readonly total: number;
  readonly fresh: number;
  readonly learning: number;
  readonly review: number;
  readonly suspended: number;
  readonly dueToday: number;
}
export function computeDeckCardCounters(
  cards: readonly CardRow[],
  states: ReadonlyMap<string, CardState>,
  now: Date,
): DeckCardCounters {
  const withState = cards.map((card) => states.get(card.id));
  return {
    total: cards.length,
    fresh: withState.filter(isFresh).length,
    learning: withState.filter(isLearning).length,
    review: withState.filter((state) => state?.state === CARD_STATE_REVIEW).length,
    suspended: withState.filter((state) => state?.suspended === true).length,
    dueToday: withState.filter((state) => isDueToday(state, now)).length,
  };
}
function isFresh(state: CardState | undefined): boolean {
  return state === undefined || state.state === CARD_STATE_NEW;
}
function isLearning(state: CardState | undefined): boolean {
  return state?.state === CARD_STATE_LEARNING || state?.state === CARD_STATE_RELEARNING;
}
function isDueToday(state: CardState | undefined, now: Date): boolean {
  return state !== undefined && !isFresh(state) && !state.suspended && new Date(state.due).getTime() <= now.getTime();
}
