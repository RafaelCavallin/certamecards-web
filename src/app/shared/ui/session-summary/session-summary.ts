import { Component, computed, input, output } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'app-session-summary',
  imports: [Button],
  templateUrl: './session-summary.html',
})
export class SessionSummary {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly reviewed = input.required<number>();
  readonly correct = input.required<number>();
  readonly minutes = input.required<number>();
  readonly showContinue = input(false);

  readonly back = output<void>();
  readonly continueStudying = output<void>();

  protected readonly accuracyPercent = computed(() =>
    this.reviewed() === 0 ? 0 : Math.round((this.correct() / this.reviewed()) * 100),
  );

  protected onBack(): void {
    this.back.emit();
  }

  protected onContinue(): void {
    this.continueStudying.emit();
  }
}
