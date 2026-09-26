import { Injectable } from '@angular/core';
import { cardLimitViolation } from './card-limits';
import type { CardLimitViolation } from './card-limits';

@Injectable({ providedIn: 'root' })
export class CardLimitPolicy {
  violation(deckCardCount: number, userCardCount: number): CardLimitViolation {
    return cardLimitViolation(deckCardCount, userCardCount);
  }
}
