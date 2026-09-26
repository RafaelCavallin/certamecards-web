import { Component, computed, effect, inject, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { SignOutFlow } from '../../../core/auth/sign-out-flow';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-sign-out-button',
  imports: [Button],
  templateUrl: './sign-out-button.html',
})
export class SignOutButton {
  private readonly signOutFlow = inject(SignOutFlow);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly dialogState = this.signOutFlow.dialog;
  protected readonly pendingCount = this.signOutFlow.pendingCount;
  protected readonly online = this.signOutFlow.online;
  protected readonly logoutFailed = this.signOutFlow.logoutFailed;
  protected readonly dialogOpen = computed(() => this.dialogState() !== 'closed');

  constructor() {
    effect(() => this.syncOpenState());
  }

  protected onSignOut(): void {
    this.signOutFlow.requestSignOut();
  }

  protected onStay(): void {
    this.signOutFlow.stay();
  }

  protected onSyncAndSignOut(): void {
    void this.signOutFlow.syncAndSignOut();
  }

  protected onRequestDiscard(): void {
    this.signOutFlow.requestDiscard();
  }

  protected onBackToChoice(): void {
    this.signOutFlow.backToChoice();
  }

  protected onConfirmDiscard(): void {
    void this.signOutFlow.confirmDiscard();
  }

  private syncOpenState(): void {
    const dialog = this.dialogRef().nativeElement;
    if (this.dialogOpen() && !dialog.open) {
      dialog.showModal();
    }
    if (!this.dialogOpen() && dialog.open) {
      dialog.close();
    }
  }
}
