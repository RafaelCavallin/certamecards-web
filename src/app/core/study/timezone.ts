export interface ZonedParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}
const HOURS_PER_DAY = 24;
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const map = Object.fromEntries(formatterFor(timeZone).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(map['year']),
    month: Number(map['month']),
    day: Number(map['day']),
    hour: Number(map['hour']) % HOURS_PER_DAY,
    minute: Number(map['minute']),
    second: Number(map['second']),
  };
}
function asUtcMs(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
export interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}
export function zonedTimeToUtc(wallClock: WallClock, timeZone: string): Date {
  const desiredAsUtcMs = Date.UTC(wallClock.year, wallClock.month - 1, wallClock.day, wallClock.hour, wallClock.minute, 0);
  const firstOffsetMs = asUtcMs(zonedParts(new Date(desiredAsUtcMs), timeZone)) - desiredAsUtcMs;
  const refinedMs = desiredAsUtcMs - firstOffsetMs;
  const secondOffsetMs = asUtcMs(zonedParts(new Date(refinedMs), timeZone)) - refinedMs;
  return new Date(desiredAsUtcMs - secondOffsetMs);
}
