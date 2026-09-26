import { Injectable, inject } from '@angular/core';
import { AccountDb, accountDatabaseName } from './account-db';
import { BootstrapDb } from './bootstrap-db';
import type { AccountRecord } from './bootstrap-db.model';

export class RevokedAccountError extends Error {
  constructor(userId: string) {
    super(`account ${userId} is revoked`);
  }
}
@Injectable({ providedIn: 'root' })
export class AccountDbResolver {
  private readonly bootstrapDb = inject(BootstrapDb);
  private readonly openDatabases = new Map<string, AccountDb>();

  async open(userId: string): Promise<AccountDb> {
    const account = await this.ensureAccountRecord(userId);
    if (account.blockedAt !== null) {
      throw new RevokedAccountError(userId);
    }
    await this.bootstrapDb.setActiveAccountId(userId);
    return this.databaseFor(userId);
  }

  async block(userId: string): Promise<void> {
    const account = await this.bootstrapDb.getAccount(userId);
    if (account === undefined) {
      return;
    }
    await this.bootstrapDb.upsertAccount({ ...account, blockedAt: new Date().toISOString() });
  }

  async unblock(userId: string): Promise<AccountDb> {
    const account = await this.bootstrapDb.getAccount(userId);
    if (account !== undefined) {
      await this.bootstrapDb.upsertAccount({ ...account, blockedAt: null });
    }
    return this.open(userId);
  }

  private databaseFor(userId: string): AccountDb {
    const existing = this.openDatabases.get(userId);
    if (existing !== undefined) {
      return existing;
    }
    const created = new AccountDb(userId);
    this.openDatabases.set(userId, created);
    return created;
  }

  private async ensureAccountRecord(userId: string): Promise<AccountRecord> {
    const existing = await this.bootstrapDb.getAccount(userId);
    if (existing !== undefined) {
      return existing;
    }
    const record: AccountRecord = {
      userId,
      databaseName: accountDatabaseName(userId),
      migrationStatus: 'not_applicable',
      lastAccessedAt: new Date().toISOString(),
      blockedAt: null,
    };
    await this.bootstrapDb.upsertAccount(record);
    return record;
  }
}
