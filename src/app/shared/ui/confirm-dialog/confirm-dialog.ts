import { Component, effect, input, output, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Button],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly confirmed = output<void>();
  readonly canceled = output<void>();
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => this.syncOpenState());
  }

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onCancel(): void {
    this.canceled.emit();
  }

  private syncOpenState(): void {
    const dialog = this.dialogRef().nativeElement;
    if (this.open() && !dialog.open) {
      dialog.showModal();
    }
    if (!this.open() && dialog.open) {
      dialog.close();
    }
  }
}
