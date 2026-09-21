import { pluralize } from '../../shared/i18n/plural';
import {
  DAY_MS,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  DAYS_PER_YEAR_TENTH,
  HOUR_MS,
  MINUTE_MS,
  MONTH_THRESHOLD_DAYS,
} from './scheduler-constants';

function formatYears(days: number): string {
  const years = Math.round(days / DAYS_PER_YEAR_TENTH) / 10;
  const label = Math.floor(years) === 1 ? 'ano' : 'anos';
  return `${String(years).replace('.', ',')} ${label}`;
}
export function formatInterval(from: Date, due: Date): string {
  const ms = due.getTime() - from.getTime();
  if (ms < HOUR_MS) {
    return `${Math.max(1, Math.round(ms / MINUTE_MS))} min`;
  }
  if (ms < DAY_MS) {
    return `${Math.round(ms / HOUR_MS)} h`;
  }
  const days = Math.round(ms / DAY_MS);
  if (days < MONTH_THRESHOLD_DAYS) {
    return `${days} d`;
  }
  if (days < DAYS_PER_YEAR) {
    return pluralize(Math.round(days / DAYS_PER_MONTH), 'mês', 'meses');
  }
  return formatYears(days);
}
