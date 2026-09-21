import { Component, computed, input } from '@angular/core';
import type { DayReviewCount } from '../../../../core/stats/stats.model';
import { reviewsLabel } from '../../../../shared/i18n/plural';
import { barHeightPercent, dayLabel } from './day-label';

@Component({
  selector: 'app-reviews-chart',
  imports: [],
  templateUrl: './reviews-chart.html',
})
export class ReviewsChart {
  readonly days = input.required<readonly DayReviewCount[]>();

  protected readonly maxReviews = computed(() => Math.max(0, ...this.days().map((day) => day.reviews)));
  protected readonly todayKey = computed(() => this.days().at(-1)?.dateKey ?? '');

  protected isToday(dateKey: string): boolean {
    return dateKey === this.todayKey();
  }

  protected heightPercent(reviews: number): number {
    return barHeightPercent(reviews, this.maxReviews());
  }

  protected label(day: DayReviewCount): string {
    return `${dayLabel(day.dateKey)}: ${reviewsLabel(day.reviews)}`;
  }
}
