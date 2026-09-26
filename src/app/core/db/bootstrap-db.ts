import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import { BOOTSTRAP_DB_SCHEMA_VERSIONS } from './bootstrap-db-schema';
import { isDeviceId, isStoredSession } from './local-db.model';
import type { StoredSession } from './local-db.model';
import type { AccountRecord, BootstrapMetaRow, LegacyMigrationRecord } from './bootstrap-db.model';

const DATABASE_NAME = 'certamecards';
const SESSION_KEY = 'session' as const;
const DEVICE_ID_KEY = 'deviceId' as const;
const ACTIVE_ACCOUNT_KEY = 'activeAccountId' as const;
@Injectable({ providedIn: 'root' })
export class BootstrapDb extends Dexie {
  meta!: Table<BootstrapMetaRow, string>;
  accounts!: Table<AccountRecord, string>;
  legacyMigration!: Table<LegacyMigrationRecord, string>;

  constructor() {
    super(DATABASE_NAME);
    BOOTSTRAP_DB_SCHEMA_VERSIONS.forEach((stores, index) => this.version(index + 1).stores(stores));
  }

  async getSession(): Promise<StoredSession | null> {
    const row = await this.meta.get(SESSION_KEY);
    return row !== undefined && isStoredSession(row.value) ? row.value : null;
  }

  async setSession(session: StoredSession): Promise<void> {
    await this.meta.put({ key: SESSION_KEY, value: session });
  }

  async clearSession(): Promise<void> {
    await this.meta.delete(SESSION_KEY);
  }

  async getOrCreateDeviceId(): Promise<string> {
    const row = await this.meta.get(DEVICE_ID_KEY);
    if (row !== undefined && isDeviceId(row.value)) {
      return row.value;
    }
    const deviceId = crypto.randomUUID();
    await this.meta.put({ key: DEVICE_ID_KEY, value: deviceId });
    return deviceId;
  }

  async getActiveAccountId(): Promise<string | null> {
    const row = await this.meta.get(ACTIVE_ACCOUNT_KEY);
    return typeof row?.value === 'string' ? row.value : null;
  }

  async setActiveAccountId(userId: string): Promise<void> {
    await this.meta.put({ key: ACTIVE_ACCOUNT_KEY, value: userId });
  }

  async upsertAccount(account: AccountRecord): Promise<void> {
    await this.accounts.put(account);
  }

  async getAccount(userId: string): Promise<AccountRecord | undefined> {
    return this.accounts.get(userId);
  }
}
