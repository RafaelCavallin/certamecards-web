export interface SyncLeaseState {
  readonly ownerId: string;
  readonly expiresAt: string;
}
export function isSyncLeaseState(value: unknown): value is SyncLeaseState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ownerId' in value &&
    'expiresAt' in value &&
    typeof value.ownerId === 'string' &&
    typeof value.expiresAt === 'string'
  );
}
