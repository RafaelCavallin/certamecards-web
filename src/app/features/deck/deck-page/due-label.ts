const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30;
export function dueLabel(dueIso: string | undefined, now: Date): string {
  if (dueIso === undefined) {
    return 'novo';
  }
  const daysUntilDue = calendarDaysBetween(now, new Date(dueIso));
  if (daysUntilDue <= 0) {
    return 'hoje';
  }
  if (daysUntilDue === 1) {
    return 'amanhã';
  }
  if (daysUntilDue < DAYS_PER_MONTH) {
    return `em ${daysUntilDue} d`;
  }
  return `em ${Math.round(daysUntilDue / DAYS_PER_MONTH)} meses`;
}
function calendarDaysBetween(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay.getTime() - fromDay.getTime()) / MS_PER_DAY);
}
