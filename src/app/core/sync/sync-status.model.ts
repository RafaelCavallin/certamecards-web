export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';
export interface SyncActionRequired {
  readonly operationId: string;
  readonly kind: string;
  readonly code: string;
  readonly kindLabel: string;
  readonly subject: string | null;
  readonly copyText: string | null;
  readonly knownCardCount: number | null;
}
export interface SyncNotice {
  readonly operationId: string;
  readonly kindLabel: string;
  readonly subject: string | null;
}
export interface SyncStatusDetails {
  readonly pendingCount: number;
  readonly actionRequiredCount: number;
  readonly reviewPendingCount: number;
  readonly oldestPendingAt: string | null;
  readonly lastSyncAt: string;
  readonly availableConflictCount: number;
  readonly actionsRequired: readonly SyncActionRequired[];
  readonly notices: readonly SyncNotice[];
}
