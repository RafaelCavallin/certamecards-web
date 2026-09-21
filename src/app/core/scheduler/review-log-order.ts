import type { ReviewLogRow } from '../db/local-db.model';

export function compareReviewLogs(a: ReviewLogRow, b: ReviewLogRow): number {
  if (a.reviewedAt !== b.reviewedAt) {
    return a.reviewedAt < b.reviewedAt ? -1 : 1;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}
