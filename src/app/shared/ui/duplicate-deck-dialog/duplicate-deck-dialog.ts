import { Component, input, output, signal } from '@angular/core';
import { Button } from '../button/button';
import { Sheet } from '../sheet/sheet';

export interface DuplicateChoiceView {
  readonly carryProgress: boolean;
  readonly cancelSubscription: boolean;
}
export interface DuplicateOptionView {
  readonly value: boolean;
  readonly label: string;
  readonly effect: string;
}
const DEFAULT_CHOICE: DuplicateChoiceView = { carryProgress: true, cancelSubscription: true };
@Component({
  selector: 'app-duplicate-deck-dialog',
  imports: [Button, Sheet],
  templateUrl: './duplicate-deck-dialog.html',
})
export class DuplicateDeckDialog {
  readonly open = input(false);
  readonly subscribed = input(false);
  readonly busy = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly progressOptions = input.required<readonly DuplicateOptionView[]>();
  readonly subscriptionOptions = input.required<readonly DuplicateOptionView[]>();
  readonly notice = input.required<string>();
  readonly confirmed = output<DuplicateChoiceView>();
  readonly canceled = output<void>();
  protected readonly choice = signal<DuplicateChoiceView>(DEFAULT_CHOICE);

  protected onProgress(carryProgress: boolean): void {
    this.choice.update((current) => ({ ...current, carryProgress }));
  }

  protected onSubscription(cancelSubscription: boolean): void {
    this.choice.update((current) => ({ ...current, cancelSubscription }));
  }

  protected onConfirm(): void {
    const cancelSubscription = this.subscribed() && this.choice().cancelSubscription;
    this.confirmed.emit({ ...this.choice(), cancelSubscription });
  }
}
