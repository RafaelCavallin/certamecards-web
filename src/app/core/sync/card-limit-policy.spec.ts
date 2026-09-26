import { expect, it } from 'vitest';
import { MAX_CARDS_PER_DECK } from './card-limits';
import { CardLimitPolicy } from './card-limit-policy';

it('TU — delega para cardLimitViolation', () => {
  const policy = new CardLimitPolicy();
  expect(policy.violation(MAX_CARDS_PER_DECK, 0)).toBe('deck_card_limit');
  expect(policy.violation(0, 0)).toBeNull();
});
