import { CARD_STATE_NEW } from '../api/card-state.model';
import type { ReviewLogRow } from '../db/account-db.model';
import type { StudyDayWindow } from './queue.model';

const MIN_CORRECT_RATING = 3;
export interface DailyCounts {
  readonly reviews: number;
  readonly newCards: number;
  readonly correct: number;
}
function isWithinDay(log: ReviewLogRow, day: StudyDayWindow): boolean {
  const reviewedAt = new Date(log.reviewedAt).getTime();
  return reviewedAt >= day.start.getTime() && reviewedAt < day.end.getTime();
}
function isNewCardLog(log: ReviewLogRow): boolean {
  if (log.stateBefore === null) {
    return true;
  }
  const stateBefore = log.stateBefore as { state?: number };
  return stateBefore.state === CARD_STATE_NEW;
}
export function dailyCounts(logs: readonly ReviewLogRow[], day: StudyDayWindow): DailyCounts {
  const relevant = logs.filter((log) => log.kind === 'review' && !log.voided && isWithinDay(log, day));
  const newCards = relevant.filter(isNewCardLog).length;
  const correct = relevant.filter((log) => (log.rating ?? 0) >= MIN_CORRECT_RATING).length;
  return { reviews: relevant.length, newCards, correct };
}
