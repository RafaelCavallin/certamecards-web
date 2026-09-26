import { CARD_STATE_NEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';

export function newCardState(cardId: string, previous: CardState | undefined): CardState {
  return {
    cardId,
    state: CARD_STATE_NEW,
    stability: 0,
    difficulty: 0,
    due: new Date().toISOString(),
    lastReview: null,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    scheduledDays: 0,
    reviewCount: 0,
    suspended: previous?.suspended ?? false,
    contentUpdateNote: null,
    contentUpdatedAt: null,
    changeSeq: previous?.changeSeq ?? 0,
  };
}
