export const MAX_CARDS_PER_DECK = 5_000;
export const MAX_CARDS_PER_USER = 50_000;
export type CardLimitViolation = 'deck_card_limit' | 'user_card_limit' | null;
export function cardLimitViolation(deckCardCount: number, userCardCount: number): CardLimitViolation {
  if (deckCardCount >= MAX_CARDS_PER_DECK) {
    return 'deck_card_limit';
  }
  if (userCardCount >= MAX_CARDS_PER_USER) {
    return 'user_card_limit';
  }
  return null;
}
