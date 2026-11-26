import { clinicDateISO, clinicDateTimeToUTC, formatClinicTime } from './clinic-time';
import { describeInEachTimeZone } from '@/test/time-zones';

describeInEachTimeZone('clinic-time', () => {
  describe('formatClinicTime', () => {
    it.each([
      ['2026-11-19T12:30:00.000Z', '09:30'], // Paciente Teste 11 with Profissional Teste A (seed apt-30)
      ['2026-11-19T11:00:00.000Z', '08:00'],
      ['2026-11-20T00:00:00.000Z', '21:00'], // UTC is already on 20/11
      ['2026-11-20T01:30:00.000Z', '22:30'],
      ['2026-11-20T02:59:00.000Z', '23:59'],
      ['2026-11-20T03:00:00.000Z', '00:00'], // Brasília midnight is "00:00", not "24:00"
      ['2026-11-19T09:30:00-03:00', '09:30'], // an explicit offset is honoured as well
    ])('%s -> %s', (iso, expected) => {
      expect(formatClinicTime(iso)).toBe(expected);
    });
  });

  describe('clinicDateISO', () => {
    it('returns the Brasília day of the given instant', () => {
      expect(clinicDateISO(new Date('2026-11-20T01:30:00.000Z'))).toBe('2026-11-19'); // 22:30 BRT
    });

    describe('"today" (no argument) follows the Brasília calendar near midnight', () => {
      // Only Date is faked, so the result never depends on the day the suite runs.
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it.each([
        ['2026-11-19T23:59:59.999Z', '2026-11-19'], // 20:59 BRT
        ['2026-11-20T00:00:00.000Z', '2026-11-19'], // 21:00 BRT: UTC is already on 20/11
        ['2026-11-20T01:30:00.000Z', '2026-11-19'], // 22:30 BRT
        ['2026-11-20T02:59:59.999Z', '2026-11-19'], // last instant of 19/11 in Brasília
        ['2026-11-20T03:00:00.000Z', '2026-11-20'], // Brasília midnight
        ['2027-01-01T02:30:00.000Z', '2026-12-31'], // 23:30 BRT on New Year's Eve
      ])('at %s it is %s', (now, expected) => {
        vi.setSystemTime(new Date(now));
        expect(clinicDateISO()).toBe(expected);
      });
    });
  });

  describe('clinicDateTimeToUTC', () => {
    it.each([
      ['2026-11-19', '09:40', '2026-11-19T12:40:00.000Z'], // typed in the form by a browser on UTC
      ['2026-11-19', '08:00', '2026-11-19T11:00:00.000Z'],
      ['2026-11-19', '00:00', '2026-11-19T03:00:00.000Z'], // Brasília midnight
      ['2026-11-19', '20:59', '2026-11-19T23:59:00.000Z'],
      ['2026-11-19', '21:00', '2026-11-20T00:00:00.000Z'], // already 20/11 in UTC
      ['2026-11-19', '22:30', '2026-11-20T01:30:00.000Z'],
      ['2026-11-19', '23:59', '2026-11-20T02:59:00.000Z'],
      ['2026-02-28', '22:00', '2026-03-01T01:00:00.000Z'], // month rollover
      ['2026-12-31', '23:30', '2027-01-01T02:30:00.000Z'], // year rollover
    ])('%s %s BRT -> %s', (date, time, expected) => {
      expect(clinicDateTimeToUTC(date, time).toISOString()).toBe(expected);
    });

    it('is the inverse of formatClinicTime + clinicDateISO for every minute of a day', () => {
      const date = '2026-11-19';
      const mismatches: string[] = [];
      for (let minute = 0; minute < 24 * 60; minute++) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const instant = clinicDateTimeToUTC(date, time);
        const back = `${clinicDateISO(instant)} ${formatClinicTime(instant.toISOString())}`;
        if (back !== `${date} ${time}`) mismatches.push(`${date} ${time} -> ${instant.toISOString()} -> ${back}`);
      }
      expect(mismatches).toEqual([]);
    });
  });
});
