// Professionals' working hours (workStart/workEnd) are wall-clock times in
// Brasília time, while appointment instants are stored in UTC. These helpers
// convert between the two using the built-in Intl API, so DST rule changes are
// handled by the runtime's timezone database instead of a hard-coded offset.

export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

const clinicClock = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Minutes since local midnight (Brasília time) for the given instant, including fractions. */
export function clinicMinutesOfDay(instant: Date): number {
  const parts = clinicClock.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return (
    part('hour') * 60 +
    part('minute') +
    part('second') / 60 +
    instant.getUTCMilliseconds() / 60_000
  );
}

/** Wall-clock time in Brasília for the given instant, e.g. "08:30". */
export function formatClinicTime(instant: Date): string {
  return instant.toLocaleTimeString('pt-BR', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

const clinicCalendar = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Calendar day in Brasília for the given instant, as "YYYY-MM-DD".
 * E.g. 2026-11-20T01:30:00Z is 22:30 on 19/11 in Brasília -> "2026-11-19".
 */
export function clinicDate(instant: Date): string {
  const parts = clinicCalendar.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** "08:30" -> 510 */
export function parseHHMM(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
