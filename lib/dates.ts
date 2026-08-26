/**
 * Date helpers for the PO tracker.
 *
 * Every date in the app is an ISO calendar date ('YYYY-MM-DD') with no time and
 * no zone. Two rules keep it that way:
 *
 * 1. Parsing goes through `toUtcMillis`, which reads the string as UTC midnight.
 * 2. Formatting hard-codes the locale and the time zone.
 */

const MS_PER_DAY = 86_400_000;

function toUtcMillis(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

const fullFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const shortFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

/** '2026-08-19' -> 'Aug 19, 2026' */
export function formatDate(iso: string): string {
  return fullFormat.format(toUtcMillis(iso));
}

/** '2026-08-19' -> 'Aug 19'. For table cells where the year is ambient. */
export function formatDateShort(iso: string): string {
  return shortFormat.format(toUtcMillis(iso));
}

/**
 * Whether `value` is a well-formed ISO calendar date.
 *
 * The round-trip catches the dates that pass the shape test and are still not
 * real, for example, '2026-02-30' parses to March 2nd.
 */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(toUtcMillis(value)).toISOString().slice(0, 10) === value;
}

/** Whole days from `fromIso` to `toIso`. Negative when `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return (toUtcMillis(toIso) - toUtcMillis(fromIso)) / MS_PER_DAY;
}

/** A signed day count as a phrase: 'in 24d', '16d ago', 'today'. */
export function formatDayOffset(days: number): string {
  if (days === 0) return 'today';
  if (days > 0) return `in ${days}d`;
  return `${-days}d ago`;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUsd(amount: number): string {
  return usd.format(amount);
}

const units = new Intl.NumberFormat('en-US');

export function formatUnits(count: number): string {
  return units.format(count);
}
