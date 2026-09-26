import { Injectable, inject } from '@angular/core';
import { AccountActivator } from './account-activator';
import type { AccountDb } from './account-db';
import { RevokedAccountError } from './account-db-resolver';
import { BootstrapDb } from './bootstrap-db';

@Injectable({ providedIn: 'root' })
export class AppDatabaseBootstrap {
  private readonly bootstrapDb = inject(BootstrapDb);
  private readonly accountActivator = inject(AccountActivator);

  async run(): Promise<AccountDb | null> {
    const session = await this.bootstrapDb.getSession();
    if (session === null) {
      return null;
    }
    return this.openOrClearBlocked(session.userId);
  }

  private async openOrClearBlocked(userId: string): Promise<AccountDb | null> {
    try {
      return await this.accountActivator.open(userId);
    } catch (error) {
      if (!(error instanceof RevokedAccountError)) {
        throw error;
      }
      await this.bootstrapDb.clearSession();
      return null;
    }
  }
}
