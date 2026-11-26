import { clinicDate } from './clinic-time.js';

describe('clinicDate (calendar day in Brasília)', () => {
  it.each([
    // [instant (UTC), Brasília wall clock, expected Brasília day]
    ['2026-11-19T23:59:59.999Z', '19/11 20:59:59.999', '2026-11-19'],
    ['2026-11-20T00:00:00.000Z', '19/11 21:00', '2026-11-19'], // UTC day already changed, Brasília's did not
    ['2026-11-20T01:30:00.000Z', '19/11 22:30', '2026-11-19'],
    ['2026-11-20T02:59:59.999Z', '19/11 23:59:59.999', '2026-11-19'], // last instant of 19/11 in Brasília
    ['2026-11-20T03:00:00.000Z', '20/11 00:00', '2026-11-20'], // Brasília midnight
    ['2026-12-01T01:00:00.000Z', '30/11 22:00', '2026-11-30'], // month rollover
    ['2027-01-01T02:30:00.000Z', '31/12 23:30', '2026-12-31'], // year rollover
  ])('%s (%s BRT) -> %s', (instant, _brt, expected) => {
    expect(clinicDate(new Date(instant))).toBe(expected);
  });
});
