import type { CardState } from '../api/card-state.model';
import type { ReviewLogRow } from '../db/local-db.model';

type SeedFields = Omit<CardState, 'cardId' | 'reviewCount' | 'suspended' | 'contentUpdateNote' | 'contentUpdatedAt' | 'changeSeq'>;
const NUMERIC_FIELDS = ['state', 'stability', 'difficulty', 'reps', 'lapses', 'learningSteps', 'scheduledDays'] as const;
function isSeedFields(value: unknown): value is SeedFields {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const lastReviewValid = record['lastReview'] === null || typeof record['lastReview'] === 'string';
  return typeof record['due'] === 'string' && lastReviewValid && NUMERIC_FIELDS.every((key) => typeof record[key] === 'number');
}
export function seedStateFrom(log: ReviewLogRow, previous: CardState | null, reviewCount: number): CardState | null {
  if (!isSeedFields(log.stateAfter)) {
    return previous === null ? null : { ...previous, reviewCount };
  }
  const { state, stability, difficulty, due, lastReview, reps, lapses, learningSteps, scheduledDays } = log.stateAfter;
  return {
    cardId: log.cardId,
    state, stability, difficulty, due, lastReview, reps, lapses, learningSteps, scheduledDays,
    reviewCount,
    suspended: previous?.suspended ?? false,
    contentUpdateNote: null,
    contentUpdatedAt: null,
    changeSeq: previous?.changeSeq ?? 0,
  };
}
