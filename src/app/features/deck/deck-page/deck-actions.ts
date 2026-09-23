import type { Deck } from '../../../core/api/deck.model';

export interface DeckActions {
  readonly editMetadata: boolean;
  readonly deleteDeck: boolean;
  readonly createCard: boolean;
  readonly editCard: boolean;
  readonly suspend: boolean;
  readonly resetProgress: boolean;
  readonly cancelSubscription: boolean;
  readonly duplicate: boolean;
  readonly reportError: boolean;
}
export const OWN_DECK_ACTIONS: DeckActions = {
  editMetadata: true,
  deleteDeck: true,
  createCard: true,
  editCard: true,
  suspend: true,
  resetProgress: true,
  cancelSubscription: false,
  duplicate: false,
  reportError: false,
};
export const OFFICIAL_DECK_ACTIONS: DeckActions = {
  editMetadata: false,
  deleteDeck: false,
  createCard: false,
  editCard: false,
  suspend: true,
  resetProgress: true,
  cancelSubscription: true,
  duplicate: true,
  reportError: true,
};
export function deckActions(deck: Pick<Deck, 'origin'>): DeckActions {
  return deck.origin === 'official_subscription' ? OFFICIAL_DECK_ACTIONS : OWN_DECK_ACTIONS;
}
