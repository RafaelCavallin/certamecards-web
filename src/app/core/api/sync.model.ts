import type { Card } from './card.model';
import type { CardState } from './card-state.model';
import type { Deck } from './deck.model';
import type { ReviewLog, ReviewVoid } from './review-log.model';
import type { UserSettings } from './settings.model';
import type { Subject } from './subject.model';

export interface ChangesPage {
  readonly subjects: readonly Subject[];
  readonly decks: readonly Deck[];
  readonly cards: readonly Card[];
  readonly cardStates: readonly CardState[];
  readonly reviewLogs: readonly ReviewLog[];
  readonly reviewVoids: readonly ReviewVoid[];
  readonly settings: UserSettings | null;
  readonly nextCursor: number;
  readonly hasMore: boolean;
}
export type ReviewLogPush = Omit<ReviewLog, 'changeSeq'>;
export type ReviewVoidPush = Omit<ReviewVoid, 'changeSeq'>;
export type CardStatePush = Omit<CardState, 'suspended' | 'changeSeq'>;
export interface ReviewPushRequest {
  readonly deviceId: string;
  readonly reviews: readonly ReviewLogPush[];
  readonly voids: readonly ReviewVoidPush[];
  readonly states: readonly CardStatePush[];
}
export interface RejectedReview {
  readonly id: string;
  readonly code: string;
}
export interface AppliedState {
  readonly cardId: string;
  readonly changeSeq: number;
}
export interface StaleState {
  readonly cardId: string;
  readonly serverReviewCount: number;
}
export interface IgnoredState {
  readonly cardId: string;
  readonly reason: string;
}
export interface ReviewPushResult {
  readonly acceptedReviewIds: readonly string[];
  readonly rejectedReviews: readonly RejectedReview[];
  readonly acceptedVoids: readonly string[];
  readonly appliedStates: readonly AppliedState[];
  readonly staleStates: readonly StaleState[];
  readonly ignoredStates: readonly IgnoredState[];
}
export interface CardReviewHistory {
  readonly reviewLogs: readonly ReviewLog[];
  readonly reviewVoids: readonly ReviewVoid[];
}
