import type { CardState } from '../api/card-state.model';
import { CARD_STATE_NEW } from '../api/card-state.model';
import type { Deck } from '../api/deck.model';
import type { CardRow } from '../db/local-db.model';

export const DEFAULT_NEW_PER_DAY = 20;
export interface DeckCounts {
  readonly deck: Deck;
  readonly due: number;
  readonly fresh: number;
}
export interface DeckCountsInput {
  readonly decks: readonly Deck[];
  readonly cards: readonly CardRow[];
  readonly states: ReadonlyMap<string, CardState>;
  readonly now: Date;
  readonly newPerDay: number;
}
interface RawDeckCounts {
  readonly deck: Deck;
  readonly due: number;
  readonly freshAvailable: number;
}
export function computeDeckCounts(input: DeckCountsInput): readonly DeckCounts[] {
  const rawCounts = input.decks.map((deck) => rawDeckCounts(deck, input));
  const sorted = [...rawCounts].sort(byDueThenFreshThenName);
  return withGlobalNewQuota(sorted, input.newPerDay);
}
function rawDeckCounts(deck: Deck, input: DeckCountsInput): RawDeckCounts {
  const deckCards = input.cards.filter((card) => card.deckId === deck.id);
  const due = deckCards.filter((card) => isDue(input.states.get(card.id), input.now)).length;
  const freshAvailable = deckCards.filter((card) => isFresh(input.states.get(card.id))).length;
  return { deck, due, freshAvailable };
}
function isFresh(state: CardState | undefined): boolean {
  return state === undefined || state.state === CARD_STATE_NEW;
}
function isDue(state: CardState | undefined, now: Date): boolean {
  return state !== undefined && !isFresh(state) && !state.suspended && new Date(state.due).getTime() <= now.getTime();
}
function byDueThenFreshThenName(a: RawDeckCounts, b: RawDeckCounts): number {
  if (a.due !== b.due) {
    return b.due - a.due;
  }
  if (a.freshAvailable !== b.freshAvailable) {
    return b.freshAvailable - a.freshAvailable;
  }
  return a.deck.name.localeCompare(b.deck.name, 'pt-BR');
}
function withGlobalNewQuota(entries: readonly RawDeckCounts[], newPerDay: number): readonly DeckCounts[] {
  let remaining = newPerDay;
  return entries.map((entry) => {
    const fresh = Math.max(0, Math.min(entry.freshAvailable, remaining));
    remaining -= fresh;
    return { deck: entry.deck, due: entry.due, fresh };
  });
}
