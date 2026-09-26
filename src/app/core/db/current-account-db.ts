import { Injectable, inject, signal } from '@angular/core';
import type { AccountDb } from './account-db';
import { BootstrapDb } from './bootstrap-db';

export interface CurrentAccount {
  readonly db: AccountDb;
  readonly userId: string;
}
export class NoActiveAccountError extends Error {
  constructor() {
    super('no account database is open');
    this.name = 'NoActiveAccountError';
  }
}
@Injectable({ providedIn: 'root' })
export class CurrentAccountDb {
  private readonly bootstrapDb = inject(BootstrapDb);
  private readonly currentSignal = signal<CurrentAccount | null>(null);

  readonly current = this.currentSignal.asReadonly();

  set(account: CurrentAccount): void {
    this.currentSignal.set(account);
  }

  clear(): void {
    this.currentSignal.set(null);
  }

  require(): CurrentAccount {
    const account = this.currentSignal();
    if (account === null) {
      throw new NoActiveAccountError();
    }
    return account;
  }

  deviceId(): Promise<string> {
    return this.bootstrapDb.getOrCreateDeviceId();
  }
}
