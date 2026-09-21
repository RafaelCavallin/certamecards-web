import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';

export type Rating = 1 | 2 | 3 | 4;
export type ReviewLogDraft = Pick<ReviewLog, 'kind' | 'rating' | 'reviewedAt' | 'stateBefore' | 'stateAfter'>;
export interface RatingPreview {
  readonly state: CardState;
  readonly intervalLabel: string;
}
export type PreviewByRating = Record<Rating, RatingPreview>;
export interface ApplyResult {
  readonly state: CardState;
  readonly log: ReviewLogDraft;
}
