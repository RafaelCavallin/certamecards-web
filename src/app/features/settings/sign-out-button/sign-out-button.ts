import { Component, effect, inject, viewChild } from '@angular/core';
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
  protected readonly confirmationOpen = this.signOutFlow.confirmationOpen;

  constructor() {
    effect(() => this.syncOpenState());
  }

  protected onSignOut(): void {
    this.signOutFlow.requestSignOut();
  }

  protected onCancel(): void {
    this.signOutFlow.cancel();
  }

  protected onWait(): void {
    void this.signOutFlow.confirmWait();
  }

  protected onLeaveAnyway(): void {
    void this.signOutFlow.confirmLeaveAnyway();
  }

  private syncOpenState(): void {
    const dialog = this.dialogRef().nativeElement;
    if (this.confirmationOpen() && !dialog.open) {
      dialog.showModal();
    }
    if (!this.confirmationOpen() && dialog.open) {
      dialog.close();
    }
  }
}
