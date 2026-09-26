import type { CardState } from '../api/card-state.model';
import type { CardChangePayload, DeckChangePayload } from '../api/sync.model';
import type { ReviewLog } from '../api/review-log.model';
import type { UserSettings } from '../api/settings.model';
import type { ConflictDetail } from '../api/sync.model';
import type { HybridClockState } from '../sync/event-order.model';
import type { SyncLeaseState } from '../sync/sync-lease.model';
import type { SyncOperation } from '../sync/sync-operation.model';

export interface SyncOperationRow<TPayload> extends SyncOperation<TPayload> {
  readonly syncedAt: string | null;
}
export interface ReviewLogRow extends ReviewLog {
  readonly voided: boolean;
  readonly eventAt: string;
  readonly eventCounter: number;
  readonly eventDeviceId: string;
  readonly operationId: string;
}
export type ReviewOutboxStatus = 'pending' | 'sending' | 'rejected';
export interface ReviewOutboxReviewItem {
  readonly seq?: number;
  readonly kind: 'review';
  readonly log: ReviewLogRow;
  readonly state: CardState;
  readonly observedServerTime: string;
  readonly status: ReviewOutboxStatus;
  readonly retryAt: string | null;
}
export interface ReviewOutboxVoidItem {
  readonly seq?: number;
  readonly kind: 'void';
  readonly reviewId: string;
  readonly voidedAt: string;
  readonly cardId: string;
  readonly state: CardState | null;
  readonly status: ReviewOutboxStatus;
  readonly retryAt: string | null;
}
export interface ReviewOutboxStateItem {
  readonly seq?: number;
  readonly kind: 'state';
  readonly cardId: string;
  readonly state: CardState;
  readonly status: ReviewOutboxStatus;
  readonly retryAt: string | null;
}
export type ReviewOutboxItem = ReviewOutboxReviewItem | ReviewOutboxVoidItem | ReviewOutboxStateItem;
export type SettingsFieldName = 'newPerDay' | 'reviewsPerDay' | 'focusMinutes' | 'examDate' | 'timeZone' | 'theme';
export interface AccountSettingsRow extends UserSettings {
  readonly userId: string;
  readonly fieldClocks: Partial<Record<SettingsFieldName, HybridClockState>>;
}
export interface DeckResetRow {
  readonly operationId: string;
  readonly deckId: string;
  readonly eventAt: string;
}
export interface ReviewVoidRow {
  readonly reviewId: string;
  readonly voidedAt: string;
  readonly cardId: string;
}
export interface ProfileRow {
  readonly userId: string;
  readonly displayName: string;
  readonly displayNameClock: HybridClockState | null;
}
export interface ConflictCacheRow {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly deckId: string | null;
  readonly reason: string;
  readonly expiresAt: string;
  readonly detail: ConflictDetail | null;
  readonly restoredAt?: string | null;
}
export interface AccountMetaSchema {
  readonly cursor: number;
  readonly lastSyncAt: string;
  readonly serverTime: string;
  readonly deviceSequence: number;
  readonly clock: HybridClockState;
  readonly lease: SyncLeaseState | null;
}
export interface AccountMetaRow<K extends keyof AccountMetaSchema = keyof AccountMetaSchema> {
  readonly key: K;
  readonly value: AccountMetaSchema[K];
}
export type RemoteBaseRow =
  | { readonly entityId: string; readonly entityType: 'deck'; readonly changeSeq: number; readonly payload: DeckChangePayload }
  | { readonly entityId: string; readonly entityType: 'card'; readonly changeSeq: number; readonly payload: CardChangePayload };
