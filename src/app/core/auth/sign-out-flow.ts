import { Injectable, inject, signal } from '@angular/core';
import { LocalDb } from '../db/local-db';
import { SyncService } from '../sync/sync-service';
import { AuthStore } from './auth-store';

@Injectable({ providedIn: 'root' })
export class SignOutFlow {
  private readonly authStore = inject(AuthStore);
  private readonly syncService = inject(SyncService);
  private readonly localDb = inject(LocalDb);
  private readonly confirmationOpenSignal = signal(false);

  readonly confirmationOpen = this.confirmationOpenSignal.asReadonly();

  requestSignOut(): void {
    if (this.syncService.pendingCount() > 0) {
      this.confirmationOpenSignal.set(true);
      return;
    }
    void this.authStore.logout();
  }

  cancel(): void {
    this.confirmationOpenSignal.set(false);
  }

  async confirmWait(): Promise<void> {
    this.confirmationOpenSignal.set(false);
    await this.syncService.flush();
    await this.authStore.logout();
  }

  async confirmLeaveAnyway(): Promise<void> {
    this.confirmationOpenSignal.set(false);
    await this.localDb.clearAllLocalData();
    await this.authStore.logout();
  }
}
