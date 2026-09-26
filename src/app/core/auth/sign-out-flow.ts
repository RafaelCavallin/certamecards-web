import { Injectable, inject, signal } from '@angular/core';
import { ConnectivityStore } from '../connectivity/connectivity-store';
import { SyncCycleCoordinator } from '../sync/sync-cycle-coordinator';
import { SyncStatusStore } from '../sync/sync-status-store';
import { AuthStore } from './auth-store';

export type SignOutDialog = 'closed' | 'choice' | 'discardConfirm';
@Injectable({ providedIn: 'root' })
export class SignOutFlow {
  private readonly authStore = inject(AuthStore);
  private readonly syncCycleCoordinator = inject(SyncCycleCoordinator);
  private readonly syncStatusStore = inject(SyncStatusStore);
  private readonly connectivity = inject(ConnectivityStore);
  private readonly dialogSignal = signal<SignOutDialog>('closed');
  private readonly failedSignal = signal(false);

  readonly dialog = this.dialogSignal.asReadonly();
  readonly logoutFailed = this.failedSignal.asReadonly();
  readonly pendingCount = this.syncStatusStore.pendingCount;
  readonly online = this.connectivity.online;

  requestSignOut(): void {
    this.failedSignal.set(false);
    if (this.syncStatusStore.pendingCount() === 0) {
      void this.finishLogout();
      return;
    }
    this.dialogSignal.set('choice');
  }

  stay(): void {
    this.dialogSignal.set('closed');
  }

  async syncAndSignOut(): Promise<void> {
    await this.syncCycleCoordinator.runNow();
    if (this.syncStatusStore.pendingCount() > 0) {
      this.failedSignal.set(true);
      return;
    }
    await this.finishLogout();
  }

  requestDiscard(): void {
    this.dialogSignal.set('discardConfirm');
  }

  backToChoice(): void {
    this.dialogSignal.set('choice');
  }

  async confirmDiscard(): Promise<void> {
    await this.finishLogout();
  }

  private async finishLogout(): Promise<void> {
    try {
      await this.authStore.logout();
      this.dialogSignal.set('closed');
    } catch {
      this.failedSignal.set(true);
    }
  }
}
