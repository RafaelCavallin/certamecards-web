import type { EventOrder, HybridClockState } from './event-order.model';

export type SyncOperationKind =
  | 'deck_create'
  | 'deck_update'
  | 'deck_delete'
  | 'card_create'
  | 'card_update'
  | 'card_delete'
  | 'card_suspension'
  | 'deck_reset'
  | 'settings_patch'
  | 'profile_patch'
  | 'conflict_restore';
export type SyncOperationStatus = 'pending' | 'sending' | 'synced' | 'retry_wait' | 'action_required' | 'auth_required';
export interface SyncOperationError {
  readonly code: string;
  readonly message: string;
}
export interface SyncOperation<TPayload> {
  readonly operationId: string;
  readonly accountId: string;
  readonly deviceId: string;
  readonly deviceSequence: number;
  readonly kind: SyncOperationKind;
  readonly entityId: string;
  readonly parentId: string | null;
  readonly baseVersion: number | null;
  readonly predecessorOperationId: string | null;
  readonly dependsOn: readonly string[];
  readonly occurredAt: string;
  readonly clock: HybridClockState;
  readonly observedServerTime: string;
  readonly payload: TPayload;
  readonly status: SyncOperationStatus;
  readonly attempts: number;
  readonly retryAt: string | null;
  readonly leaseUntil: string | null;
  readonly error: SyncOperationError | null;
}
export type MutationOutcome = 'applied' | 'duplicate' | 'conflict' | 'action_required' | 'dependency_blocked';
export interface MutationResult {
  readonly operationId: string;
  readonly outcome: MutationOutcome;
  readonly entityVersion: number | null;
  readonly changeSeq: number | null;
  readonly canonicalOrder: EventOrder;
  readonly conflictId: string | null;
  readonly error: SyncOperationError | null;
}
