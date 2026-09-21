import { Component, effect, input, output, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';

let nextSheetId = 0;
@Component({
  selector: 'app-sheet',
  templateUrl: './sheet.html',
})
export class Sheet {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly closed = output<void>();
  protected readonly titleId = `sheet-title-${(nextSheetId += 1)}`;
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => this.syncOpenState());
  }

  protected onCancel(): void {
    this.closed.emit();
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
