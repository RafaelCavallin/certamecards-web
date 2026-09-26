import type { UserSettings } from '../api/settings.model';
import type { AccountDb } from '../db/account-db';

export async function pendingSettingsOverlay(db: AccountDb, userId: string): Promise<Partial<UserSettings>> {
  const pending = await db.syncOperations
    .where('entityId')
    .equals(userId)
    .filter((operation) => operation.kind === 'settings_patch' && operation.status !== 'synced')
    .sortBy('deviceSequence');
  return pending.reduce<Partial<UserSettings>>(
    (overlay, operation) => (operation.payload.kind === 'settings_patch' ? { ...overlay, ...operation.payload.changes } : overlay),
    {},
  );
}
