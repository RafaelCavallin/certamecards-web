const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
export function dayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return DAY_LABEL_FORMAT.format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1));
}
export function barHeightPercent(reviews: number, maxReviews: number): number {
  const MIN_PERCENT = 4;
  if (maxReviews === 0) {
    return MIN_PERCENT;
  }
  return Math.max(MIN_PERCENT, Math.round((reviews / maxReviews) * 100));
}
