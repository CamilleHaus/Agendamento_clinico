// The clinic works in Brasília time, while the API stores appointment instants
// in UTC. These helpers always render in the clinic's timezone, regardless of
// the timezone of the machine running the code (Next server or browser), using
// the built-in Intl API so DST rule changes come from the runtime's tz database.

export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

const clinicTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const clinicDate = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Wall-clock time in Brasília for the given ISO instant, e.g. "09:30". */
export function formatClinicTime(iso: string): string {
  return clinicTime.format(new Date(iso));
}

/** Calendar date in Brasília for the given instant (default: now), as "YYYY-MM-DD". */
export function clinicDateISO(instant: Date = new Date()): string {
  const parts = clinicDate.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const offsetProbe = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** UTC offset (in minutes) in effect for `timeZone` around the given instant, e.g. -180 for "UTC-03:00". */
function utcOffsetMinutes(instant: Date): number {
  const parts = offsetProbe.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  // Reading the zone's wall-clock numbers as if they were UTC and comparing them to the
  // (actually UTC) instant gives how far ahead/behind the zone is.
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return (wallClockAsUtc - instant.getTime()) / 60_000;
}

/**
 * Converts a wall-clock date/time *in Brasília time* (e.g. from `<input type="date">` +
 * `<input type="time">`) to the matching UTC instant, regardless of the browser's own
 * timezone. This is the inverse of `formatClinicTime`/`clinicDateISO`.
 */
export function clinicDateTimeToUTC(date: string, time: string): Date {
  // First guess: treat the typed wall-clock numbers as if they were already UTC.
  const guess = new Date(`${date}T${time}:00.000Z`);
  // Brasília is a fixed offset behind UTC (no DST since 2019), so a single correction suffices.
  const offset = utcOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60_000);
}
