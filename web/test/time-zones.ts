// The timezone bugs these tests guard against only show up when the code runs on a
// machine that is NOT on Brasília time (a UTC server, a browser abroad). A suite that
// simply used the timezone of whoever runs `npm test` would pass in Brazil even with
// the bugs back. So the suites switch the process timezone themselves: Node applies a
// runtime change of process.env.TZ to both Date and the Intl default timezone.
export const TIME_ZONES = [
  'UTC', // typical hosting
  'America/Sao_Paulo', // the clinic itself
  'America/Los_Angeles', // behind Brasília
  'Asia/Tokyo', // ahead of Brasília, already on the next day for most of the clinic's afternoon
  'Pacific/Kiritimati', // UTC+14, furthest ahead
  'Pacific/Pago_Pago', // UTC-11, furthest behind
] as const;

/** Declares the same tests once per timezone in TIME_ZONES, with the process switched to it. */
export function describeInEachTimeZone(name: string, tests: () => void) {
  describe.each(TIME_ZONES)(`${name} [process TZ=%s]`, (timeZone) => {
    let previous: string | undefined;

    beforeAll(() => {
      previous = process.env.TZ;
      process.env.TZ = timeZone;
    });

    afterAll(() => {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    });

    // Guards the guard: if switching stopped working (e.g. another Vitest pool), fail
    // loudly instead of silently running every case in the machine's own timezone.
    it('runs with the process switched to this timezone', () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
    });

    tests();
  });
}
