const DATE_LOCALE = 'pt-BR';
const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
export function formatDatePtBr(isoDate: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALE, DATE_FORMAT).format(new Date(isoDate));
}
const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
export function formatDateTimePtBr(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALE, { ...DATE_TIME_FORMAT, timeZone }).format(new Date(isoDate));
}
