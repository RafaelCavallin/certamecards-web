import { Component, inject } from '@angular/core';
import { StatsService } from '../../../core/stats/stats-service';
import { ReviewsChart } from './reviews-chart/reviews-chart';
import { StatsTotals } from './stats-totals/stats-totals';

@Component({
  selector: 'app-last-14-days',
  imports: [ReviewsChart, StatsTotals],
  templateUrl: './last-14-days.html',
})
export class Last14Days {
  protected readonly statsService = inject(StatsService);
}
