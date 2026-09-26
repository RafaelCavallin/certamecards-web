import type { EventOrder, HybridClockState } from '../sync/event-order.model';
import type { MutationResult, SyncOperationKind } from '../sync/sync-operation.model';
import type { CardState } from './card-state.model';
import type { Card } from './card.model';
import type { Deck } from './deck.model';
import type { DeckSubscription } from './library.model';
import type { ReviewLog, ReviewVoid } from './review-log.model';
import type { UserSettings } from './settings.model';
import type { Subject } from './subject.model';

export type ChangeType =
  | 'subject'
  | 'deck'
  | 'card'
  | 'card_state'
  | 'review_log'
  | 'review_void'
  | 'subscription'
  | 'settings'
  | 'profile'
  | 'conflict';
export interface ProfileChangePayload {
  readonly id: string;
  readonly displayName: string;
}
export interface ConflictChangePayload {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly deckId: string | null;
  readonly reason: string;
  readonly expiresAt: string | null;
  readonly restoredAt: string | null;
  readonly expiredAt: string | null;
}
export interface CanonicalOrderFields {
  readonly eventAt: string;
  readonly eventCounter: number;
  readonly eventDeviceId: string;
  readonly operationId: string;
}
export type SubjectChangePayload = Omit<Subject, 'changeSeq'>;
export type DeckChangePayload = Omit<Deck, 'changeSeq'>;
export type CardChangePayload = Omit<Card, 'changeSeq'>;
export type CardStateChangePayload = Omit<CardState, 'changeSeq'>;
export type ReviewLogChangePayload = Omit<ReviewLog, 'changeSeq'> & CanonicalOrderFields;
export type ReviewVoidChangePayload = Omit<ReviewVoid, 'changeSeq'>;
export type SubscriptionChangePayload = Omit<DeckSubscription, 'changeSeq'>;
export type SettingsChangePayload = Omit<UserSettings, 'changeSeq'>;
export type ChangePayload =
  | SubjectChangePayload
  | DeckChangePayload
  | CardChangePayload
  | CardStateChangePayload
  | ReviewLogChangePayload
  | ReviewVoidChangePayload
  | SubscriptionChangePayload
  | SettingsChangePayload
  | ProfileChangePayload
  | ConflictChangePayload;
export interface ChangeEntry {
  readonly changeSeq: number;
  readonly type: ChangeType;
  readonly payload: ChangePayload;
}
export interface ChangesPage {
  readonly serverTime: string;
  readonly changes: readonly ChangeEntry[];
  readonly nextCursor: number;
  readonly hasMore: boolean;
}
export interface SyncOperationWire {
  readonly operationId: string;
  readonly kind: SyncOperationKind;
  readonly entityId: string;
  readonly parentId: string | null;
  readonly baseVersion: number | null;
  readonly predecessorOperationId: string | null;
  readonly dependsOn: readonly string[];
  readonly occurredAt: string;
  readonly clock: HybridClockState;
  readonly observedServerTime: string;
  readonly payload: unknown;
}
export interface SyncMutationRequest {
  readonly deviceId: string;
  readonly operations: readonly SyncOperationWire[];
}
export interface SyncMutationResponse {
  readonly serverTime: string;
  readonly results: readonly MutationResult[];
}
export type ReviewLogPush = Omit<ReviewLog, 'changeSeq'> & {
  readonly clock: HybridClockState;
  readonly observedServerTime: string;
};
export type ReviewVoidPush = Omit<ReviewVoid, 'changeSeq'>;
export type CardStatePush = Omit<CardState, 'suspended' | 'contentUpdateNote' | 'contentUpdatedAt' | 'changeSeq'>;
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
export interface AcceptedReview {
  readonly id: string;
  readonly canonicalOrder: EventOrder;
}
export interface ReviewPushResult {
  readonly acceptedReviews: readonly AcceptedReview[];
  readonly rejectedReviews: readonly RejectedReview[];
  readonly acceptedVoids: readonly string[];
  readonly appliedStates: readonly AppliedState[];
  readonly staleStates: readonly StaleState[];
  readonly ignoredStates: readonly IgnoredState[];
}
export interface ReviewLogHistoryEntry extends ReviewLog, CanonicalOrderFields {}
export interface ReviewVoidHistoryEntry extends ReviewVoid {
  readonly voidedAt: string;
}
export interface CardReviewHistory {
  readonly reviewLogs: readonly ReviewLogHistoryEntry[];
  readonly reviewVoids: readonly ReviewVoidHistoryEntry[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}
export interface ConflictDetail {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly deckId: string | null;
  readonly reason: string;
  readonly losingSnapshot: unknown;
  readonly winningSnapshot: unknown;
  readonly currentVersion: number | null;
  readonly currentDeleted: boolean;
  readonly expiresAt: string;
  readonly restoredAt: string | null;
}
