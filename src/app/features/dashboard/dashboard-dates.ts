const MS_PER_DAY = 86_400_000;
export function daysUntil(examDate: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, month, day] = examDate.split('-').map(Number);
  const target = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}
export function examDaysUntil(examDate: string | null): number | null {
  return examDate === null ? null : daysUntil(examDate);
}
