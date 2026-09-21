import type { CardHistory } from '../../../core/api/cards-api';

export interface CardHistorySummary {
  readonly reviews: number;
  readonly again: number;
  readonly lastReviewedAt: string | null;
}
const AGAIN_RATING = 1;
export function summarizeCardHistory(history: CardHistory): CardHistorySummary {
  const reviews = history.reviewLogs.filter((log) => log.kind === 'review');
  const voidedIds = new Set(history.reviewVoids.map((voidItem) => voidItem.reviewId));
  const valid = reviews.filter((log) => !voidedIds.has(log.id));
  const sorted = [...valid].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
  return {
    reviews: valid.length,
    again: valid.filter((log) => log.rating === AGAIN_RATING).length,
    lastReviewedAt: sorted.at(-1)?.reviewedAt ?? null,
  };
}
