import { Injectable, inject } from '@angular/core';
import type { AccountDb } from './account-db';
import { AccountDbResolver } from './account-db-resolver';
import { BootstrapDb } from './bootstrap-db';
import { CurrentAccountDb } from './current-account-db';
import { LegacyDbMigrator } from './legacy-db-migrator';
import { LocalDb } from './local-db';

async function resumeAuthRequiredOperations(accountDb: AccountDb): Promise<void> {
  await accountDb.syncOperations
    .where('status')
    .equals('auth_required')
    .modify({ status: 'pending', retryAt: null });
}
@Injectable({ providedIn: 'root' })
export class AccountActivator {
  private readonly bootstrapDb = inject(BootstrapDb);
  private readonly legacyDb = inject(LocalDb);
  private readonly accountDbResolver = inject(AccountDbResolver);
  private readonly currentAccountDb = inject(CurrentAccountDb);

  open(userId: string): Promise<AccountDb> {
    return this.activate(userId, () => this.accountDbResolver.open(userId));
  }

  async reauthenticate(userId: string): Promise<AccountDb> {
    const accountDb = await this.activate(userId, () => this.accountDbResolver.unblock(userId));
    await resumeAuthRequiredOperations(accountDb);
    return accountDb;
  }

  private async activate(userId: string, resolve: () => Promise<AccountDb>): Promise<AccountDb> {
    const accountDb = await resolve();
    await new LegacyDbMigrator(this.bootstrapDb, this.legacyDb, accountDb).migrate(userId);
    this.currentAccountDb.set({ db: accountDb, userId });
    return accountDb;
  }
}
