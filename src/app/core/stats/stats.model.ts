export interface DayReviewCount {
  readonly dateKey: string;
  readonly reviews: number;
}
export interface Last14DaysStats {
  readonly days: readonly DayReviewCount[];
  readonly totalReviews: number;
  readonly accuracyPercent: number;
  readonly focusMinutes: number;
}
