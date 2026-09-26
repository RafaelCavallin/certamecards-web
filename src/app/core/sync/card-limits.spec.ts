import { expect, it } from 'vitest';
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER, cardLimitViolation } from './card-limits';

it('TU — abaixo dos dois limites não há violação', () => {
  expect(cardLimitViolation(MAX_CARDS_PER_DECK - 1, MAX_CARDS_PER_USER - 1)).toBeNull();
});

it('TU — no limite exato do deck recusa com deck_card_limit', () => {
  expect(cardLimitViolation(MAX_CARDS_PER_DECK, 0)).toBe('deck_card_limit');
});

it('TU — no limite exato do usuário recusa com user_card_limit', () => {
  expect(cardLimitViolation(0, MAX_CARDS_PER_USER)).toBe('user_card_limit');
});

it('TU — o limite do deck é verificado antes do limite do usuário', () => {
  expect(cardLimitViolation(MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER)).toBe('deck_card_limit');
});
