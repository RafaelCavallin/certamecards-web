import { STUDY_DAY_CUTOFF_HOUR } from './study-constants';
import { zonedParts, zonedTimeToUtc, type ZonedParts } from './timezone';

const MS_PER_DAY = 86_400_000;
export interface StudyDayBounds {
  readonly start: Date;
  readonly end: Date;
  readonly key: string;
}
function addCalendarDays(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>, days: number): Pick<ZonedParts, 'year' | 'month' | 'day'> {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + days * MS_PER_DAY);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}
function pad(value: number): string {
  return String(value).padStart(2, '0');
}
function dayKey(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
export function studyDayBounds(now: Date, timeZone: string): StudyDayBounds {
  const local = zonedParts(now, timeZone);
  const dayDate = local.hour < STUDY_DAY_CUTOFF_HOUR ? addCalendarDays(local, -1) : local;
  const nextDayDate = addCalendarDays(dayDate, 1);
  const start = zonedTimeToUtc({ ...dayDate, hour: STUDY_DAY_CUTOFF_HOUR, minute: 0 }, timeZone);
  const end = zonedTimeToUtc({ ...nextDayDate, hour: STUDY_DAY_CUTOFF_HOUR, minute: 0 }, timeZone);
  return { start, end, key: dayKey(dayDate) };
}
