import type { StoredSession } from './local-db.model';

export type AccountMigrationStatus = 'not_applicable' | 'pending' | 'migrating' | 'migrated';
export interface AccountRecord {
  readonly userId: string;
  readonly databaseName: string;
  readonly migrationStatus: AccountMigrationStatus;
  readonly lastAccessedAt: string;
  readonly blockedAt: string | null;
}
export type LegacyMigrationStepName = 'not_started' | 'copying' | 'verified' | 'cleaned_up';
export interface LegacyMigrationRecord {
  readonly userId: string;
  readonly step: LegacyMigrationStepName;
  readonly verifiedCounts: Readonly<Record<string, number>>;
  readonly updatedAt: string;
}
export interface BootstrapMetaSchema {
  readonly session: StoredSession;
  readonly deviceId: string;
  readonly activeAccountId: string;
}
export interface BootstrapMetaRow<K extends keyof BootstrapMetaSchema = keyof BootstrapMetaSchema> {
  readonly key: K;
  readonly value: BootstrapMetaSchema[K];
}
