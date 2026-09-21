import { Component, input } from '@angular/core';
import { reviewsLabel } from '../../../../shared/i18n/plural';

@Component({
  selector: 'app-stats-totals',
  imports: [],
  templateUrl: './stats-totals.html',
})
export class StatsTotals {
  readonly totalReviews = input.required<number>();
  readonly accuracyPercent = input.required<number>();
  readonly focusMinutes = input.required<number>();

  protected label(): string {
    return reviewsLabel(this.totalReviews());
  }
}
