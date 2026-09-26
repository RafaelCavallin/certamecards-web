import { studyDayBounds } from '../study/study-day';
import type { ReviewLogRow } from '../db/account-db.model';
import type { DayReviewCount, Last14DaysStats } from './stats.model';

const WINDOW_DAYS = 14;
const MS_PER_DAY = 86_400_000;
const MINUTE_MS = 60_000;
const CORRECT_RATING_THRESHOLD = 3;
function isCorrect(rating: number | null): boolean {
  return (rating ?? 0) >= CORRECT_RATING_THRESHOLD;
}
function windowStart(now: Date, timeZone: string): Date {
  const oldestDay = studyDayBounds(new Date(now.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY), timeZone);
  return oldestDay.start;
}
function buildDayKeys(now: Date, timeZone: string): readonly string[] {
  const keys: string[] = [];
  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    keys.push(studyDayBounds(new Date(now.getTime() - offset * MS_PER_DAY), timeZone).key);
  }
  return keys;
}
export function computeLast14Days(
  logs: readonly ReviewLogRow[],
  now: Date,
  timeZone: string,
): Last14DaysStats {
  const start = windowStart(now, timeZone);
  const { end } = studyDayBounds(now, timeZone);
  const relevant = logs.filter(
    (log) => log.kind === 'review' && !log.voided && isWithinWindow(log, start, end),
  );
  const dayKeys = buildDayKeys(now, timeZone);
  const days: DayReviewCount[] = dayKeys.map((dateKey) => ({
    dateKey,
    reviews: relevant.filter((log) => studyDayBounds(new Date(log.reviewedAt), timeZone).key === dateKey).length,
  }));
  const correct = relevant.filter((log) => isCorrect(log.rating)).length;
  const focusMs = relevant.reduce((sum, log) => sum + log.durationMs, 0);
  return {
    days,
    totalReviews: relevant.length,
    accuracyPercent: relevant.length === 0 ? 0 : Math.round((correct / relevant.length) * 100),
    focusMinutes: Math.round(focusMs / MINUTE_MS),
  };
}
function isWithinWindow(log: ReviewLogRow, start: Date, end: Date): boolean {
  const reviewedAt = new Date(log.reviewedAt).getTime();
  return reviewedAt >= start.getTime() && reviewedAt < end.getTime();
}
