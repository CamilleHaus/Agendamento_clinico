import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { clinicDate } from './clinic-time.js';
import { appointments as seed } from '../data/seed.js';
import { PatientsService } from '../patients/patients.service.js';
import { ProfessionalsService } from '../professionals/professionals.service.js';

const makeService = () => new AppointmentsService(new PatientsService(), new ProfessionalsService());

// The clock is frozen so the tests do not depend on today's date. "Now" is
// Friday 13/11/2026 09:00 in Brasília, before every scheduled seed appointment.
const NOW = new Date('2026-11-13T12:00:00.000Z');

// Reference (seed times are UTC; Brasília = UTC-3):
//   pro-1 Profissional Teste A  08:00-17:00 BRT (11:00-20:00Z)
//   pro-2 Profissional Teste B  09:00-15:00 BRT (12:00-18:00Z)
//   pro-3 Profissional Teste C  13:00-19:00 BRT (16:00-22:00Z)
//   apt-1  pat-1  pro-1  16/11 11:00-11:30Z  scheduled
//   apt-11 pat-2  pro-1  16/11 12:00-12:30Z  scheduled
//   apt-12 pat-12 pro-1  16/11 13:30-14:00Z  scheduled
//   apt-13 pat-13 pro-1  16/11 17:00-17:30Z  cancelled
//   apt-14 pat-14 pro-2  16/11 13:00-13:20Z  scheduled
//   apt-23 pat-5  pro-3  17/11 20:00-20:40Z  cancelled
// 23/11/2026 (Monday) has no seed appointments and is used for the working-hours tests.

type NewAppointment = Partial<CreateAppointmentDto>;

const base = {
  patientId: 'pat-5',
  professionalId: 'pro-1',
  startsAt: '2026-11-23T11:00:00.000Z',
  durationMinutes: 30,
} satisfies CreateAppointmentDto;

/** Runs fn, asserting it throws an HttpException of the given type and status. */
function expectHttpError(
  fn: () => unknown,
  type: typeof BadRequestException | typeof ConflictException,
  status: number,
): HttpException {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(type);
  expect((error as HttpException).getStatus()).toBe(status);
  return error as HttpException;
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    service = makeService();
  });

  it('lists all appointments sorted by start time', () => {
    const all = service.findAll({});
    expect(all).toHaveLength(seed.length);
    const starts = all.map((a) => a.startsAt);
    expect(starts).toEqual([...starts].sort());
  });

  it('filters by date and professional', () => {
    const result = service.findAll({ date: '2026-11-16', professionalId: 'pro-1' });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((a) => clinicDate(new Date(a.startsAt)) === '2026-11-16' && a.professionalId === 'pro-1'),
    ).toBe(true);
    expect(result.map((a) => a.id)).toContain('apt-1');
  });

  describe('filter by date uses the Brasília calendar day, not the UTC one', () => {
    // No seed professional works after 19:00 BRT, so these tests give Profissional Teste C
    // (pro-3) round-the-clock hours, as if the working-hours rules changed, and book the
    // late-night appointments through create() like the API would.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
      const professionals = new ProfessionalsService();
      Object.assign(professionals.findById('pro-3')!, { workStart: '00:00', workEnd: '24:00' });
      service = new AppointmentsService(new PatientsService(), professionals);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const book = (startsAt: string) =>
      service.create({ patientId: 'pat-5', professionalId: 'pro-3', startsAt, durationMinutes: 5 });
    const idsOn = (date: string) => service.findAll({ date }).map((a) => a.id);
    const seedIdsOn = (utcDay: string) =>
      seed
        .filter((a) => a.startsAt.startsWith(utcDay))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((a) => a.id);

    it('lists a 22:30 BRT appointment on the same day, although it is already the next day in UTC', () => {
      const late = book('2026-11-19T22:30:00-03:00');
      expect(late.startsAt).toBe('2026-11-20T01:30:00.000Z');

      expect(idsOn('2026-11-19')).toContain(late.id);
      expect(idsOn('2026-11-20')).not.toContain(late.id);
    });

    it('splits the days exactly at Brasília midnight', () => {
      const at2055 = book('2026-11-19T20:55:00-03:00'); //   23:55Z, UTC still on 19/11
      const at2100 = book('2026-11-19T21:00:00-03:00'); //   00:00Z, UTC already on 20/11
      const at2355 = book('2026-11-19T23:55:00-03:00'); //   02:55Z, last slot of 19/11 in Brasília
      const midnight = book('2026-11-20T00:00:00-03:00'); // 03:00Z, first instant of 20/11 in Brasília

      const day19 = idsOn('2026-11-19');
      const day20 = idsOn('2026-11-20');
      for (const { id } of [at2055, at2100, at2355]) {
        expect(day19).toContain(id);
        expect(day20).not.toContain(id);
      }
      expect(day19).not.toContain(midnight.id);
      expect(day20).toContain(midnight.id);
    });

    it('keeps the day sorted by start time, with the late-night appointments last', () => {
      const at2100 = book('2026-11-19T21:00:00-03:00');
      const at2230 = book('2026-11-19T22:30:00-03:00');

      expect(idsOn('2026-11-19')).toEqual([...seedIdsOn('2026-11-19'), at2100.id, at2230.id]);
    });

    it('returns the same seed appointments as before for every seed day', () => {
      // Every seed appointment is between 08:00 and 19:00 BRT, so its UTC and Brasília days match.
      for (let day = 10; day <= 20; day++) {
        const date = `2026-11-${day}`;
        expect(idsOn(date)).toEqual(seedIdsOn(date));
      }
    });
  });

  it('cancels an appointment and throws 404 for unknown ids', () => {
    expect(service.cancel('apt-1').status).toBe('cancelled');
    expect(service.findOne('apt-1').status).toBe('cancelled');
    expect(() => service.cancel('nope')).toThrow(NotFoundException);
  });

  it('does not mutate the shared seed', () => {
    service.cancel('apt-2');
    expect(makeService().findOne('apt-2').status).toBe('scheduled');
  });

  describe('create', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const create = (overrides: NewAppointment = {}) => service.create({ ...base, ...overrides });
    const expectBadRequest = (overrides: NewAppointment) =>
      expectHttpError(() => create(overrides), BadRequestException, 400);
    const expectConflict = (overrides: NewAppointment) =>
      expectHttpError(() => create(overrides), ConflictException, 409);

    it('creates a scheduled appointment and stores startsAt in UTC', () => {
      const created = create({ startsAt: '2026-11-23T08:00:00-03:00', notes: 'Primeira consulta' });

      expect(created).toMatchObject({
        patientId: 'pat-5',
        professionalId: 'pro-1',
        startsAt: '2026-11-23T11:00:00.000Z',
        durationMinutes: 30,
        status: 'scheduled',
        notes: 'Primeira consulta',
        createdAt: NOW.toISOString(),
      });
      expect(service.findOne(created.id)).toBe(created);
    });

    it('does not store the appointment when a rule rejects it', () => {
      const before = service.findAll({}).length;
      expectConflict({ startsAt: '2026-11-16T11:00:00.000Z' });
      expect(service.findAll({})).toHaveLength(before);
    });

    describe('patient and professional must exist', () => {
      it('rejects an unknown patient with 400', () => {
        const error = expectBadRequest({ patientId: 'pat-999' });
        expect(error.message).toBe('Paciente não encontrado.');
      });

      it('rejects an unknown professional with 400', () => {
        const error = expectBadRequest({ professionalId: 'pro-999' });
        expect(error.message).toBe('Profissional não encontrado.');
      });
    });

    describe('date in the past', () => {
      it('rejects an appointment on a previous day', () => {
        const error = expectBadRequest({ startsAt: '2026-11-12T12:00:00.000Z' });
        expect(error.message).toBe('Não é possível agendar uma consulta em data ou horário que já passou.');
      });

      it('rejects an appointment earlier today and one starting right now', () => {
        expectBadRequest({ startsAt: '2026-11-13T11:30:00.000Z' });
        expectBadRequest({ startsAt: NOW.toISOString() });
      });

      it('accepts an appointment later today', () => {
        expect(create({ startsAt: '2026-11-13T12:30:00.000Z' }).status).toBe('scheduled');
      });

      it('compares against the current clock, not a fixed date', () => {
        vi.setSystemTime(new Date('2026-11-24T12:00:00.000Z'));
        expectBadRequest({ startsAt: '2026-11-23T11:00:00.000Z' });
      });
    });

    describe('working hours (Brasília time)', () => {
      it('rejects a start before workStart', () => {
        const error = expectBadRequest({ startsAt: '2026-11-23T10:30:00.000Z' }); // 07:30 BRT
        expect(error.message).toBe(
          'Profissional Teste A atende das 08:00 às 17:00 (horário de Brasília). ' +
            'A consulta precisa começar e terminar dentro desse horário.',
        );
      });

      it('accepts a start exactly at workStart', () => {
        expect(create({ startsAt: '2026-11-23T11:00:00.000Z' }).status).toBe('scheduled'); // 08:00 BRT
      });

      it('accepts an appointment ending exactly at workEnd', () => {
        expect(create({ startsAt: '2026-11-23T19:30:00.000Z' }).status).toBe('scheduled'); // 16:30-17:00 BRT
      });

      it('rejects an appointment that starts inside but ends after workEnd', () => {
        expectBadRequest({ startsAt: '2026-11-23T19:45:00.000Z' }); // 16:45-17:15 BRT
        expectBadRequest({ startsAt: '2026-11-23T19:30:30.000Z' }); // ends 30 seconds late
      });

      it('rejects a start at or after workEnd', () => {
        expectBadRequest({ startsAt: '2026-11-23T20:00:00.000Z', durationMinutes: 5 }); // 17:00 BRT
      });

      it('interprets workStart/workEnd in Brasília time, not UTC', () => {
        // 09:00Z is inside 08:00-17:00 if read as UTC, but it is 06:00 in Brasília.
        expectBadRequest({ startsAt: '2026-11-23T09:00:00.000Z' });
        // 19:00Z is outside 08:00-17:00 if read as UTC, but it is 16:00 in Brasília.
        expect(create({ startsAt: '2026-11-23T19:00:00.000Z' }).status).toBe('scheduled');
      });

      it('uses each professional own hours', () => {
        // Profissional Teste C works 13:00-19:00 BRT: 18:20 + 40 min ends exactly at 19:00.
        expect(
          create({ professionalId: 'pro-3', startsAt: '2026-11-23T21:20:00.000Z', durationMinutes: 40 }).status,
        ).toBe('scheduled');
        const error = expectBadRequest({ professionalId: 'pro-3', startsAt: '2026-11-23T15:00:00.000Z' }); // 12:00 BRT
        expect(error.message).toContain('Profissional Teste C atende das 13:00 às 19:00');
      });
    });

    describe('professional conflict', () => {
      it('rejects the exact same slot with 409', () => {
        const error = expectConflict({ startsAt: '2026-11-16T11:00:00.000Z' }); // apt-1
        expect(error.message).toBe(
          'Profissional Teste A já tem uma consulta das 08:00 às 08:30 (horário de Brasília) nesse dia. Escolha outro horário.',
        );
      });

      it('rejects a partial overlap', () => {
        expectConflict({ startsAt: '2026-11-16T11:15:00.000Z' }); // starts inside apt-1
        expectConflict({ startsAt: '2026-11-16T13:15:00.000Z' }); // ends inside apt-12
      });

      it('rejects an appointment that fully contains another', () => {
        // 12:45-14:15Z wraps apt-12 (13:30-14:00Z).
        expectConflict({ startsAt: '2026-11-16T12:45:00.000Z', durationMinutes: 90 });
      });

      it('does not treat touching appointments as a conflict', () => {
        // 11:30-12:00Z starts when apt-1 ends and ends when apt-11 starts.
        expect(create({ startsAt: '2026-11-16T11:30:00.000Z' }).status).toBe('scheduled');
      });

      it('does not block other professionals at the same time', () => {
        expect(create({ professionalId: 'pro-2', startsAt: '2026-11-16T12:00:00.000Z', durationMinutes: 20 }).status).toBe(
          'scheduled',
        );
      });

      it('is blocked by appointments created through the API as well', () => {
        create({ startsAt: '2026-11-23T14:00:00.000Z' });
        expectConflict({ patientId: 'pat-6', startsAt: '2026-11-23T14:00:00.000Z' });
      });
    });

    describe('patient conflict', () => {
      it('rejects a patient already booked with another professional', () => {
        // pat-12 is with Profissional Teste A 13:30-14:00Z; Profissional Teste B is free at 13:40Z.
        const error = expectConflict({
          patientId: 'pat-12',
          professionalId: 'pro-2',
          startsAt: '2026-11-16T13:40:00.000Z',
          durationMinutes: 20,
        });
        expect(error.message).toBe(
          'Paciente Teste 12 já tem uma consulta com Profissional Teste A das 10:30 às 11:00 ' +
            '(horário de Brasília) nesse dia. Escolha outro horário.',
        );
      });

      it('does not treat touching appointments of the same patient as a conflict', () => {
        const created = create({
          patientId: 'pat-12',
          professionalId: 'pro-2',
          startsAt: '2026-11-16T14:00:00.000Z', // right after apt-12 ends
          durationMinutes: 20,
        });
        expect(created.status).toBe('scheduled');
      });
    });

    describe('cancelled appointments free the slot', () => {
      it('allows booking the slot of a cancelled seed appointment', () => {
        // apt-13 (pro-1, 17:00Z) is cancelled in the seed.
        expect(create({ startsAt: '2026-11-16T17:00:00.000Z' }).status).toBe('scheduled');
      });

      it('does not block the patient of a cancelled seed appointment', () => {
        // apt-23 (pat-5 with pro-3, 17/11 20:00Z) is cancelled; same patient, same professional, same time.
        const created = create({ professionalId: 'pro-3', startsAt: '2026-11-17T20:00:00.000Z', durationMinutes: 40 });
        expect(created.status).toBe('scheduled');
      });

      it('frees the slot after cancelling (PATCH /appointments/:id/cancel)', () => {
        const first = create({ startsAt: '2026-11-23T14:00:00.000Z' });
        const rebook = { patientId: 'pat-6', startsAt: '2026-11-23T14:00:00.000Z' };
        expectConflict(rebook);

        service.cancel(first.id);

        expect(create(rebook).status).toBe('scheduled');
      });

      it('frees the patient after cancelling', () => {
        // pat-1 has apt-19 with pro-1 on 17/11 18:00-18:30Z; pro-3 is free at 18:00Z.
        const withProfessionalC = { patientId: 'pat-1', professionalId: 'pro-3', startsAt: '2026-11-17T18:00:00.000Z' };
        expectConflict(withProfessionalC);

        service.cancel('apt-19');

        expect(create(withProfessionalC).status).toBe('scheduled');
      });
    });
  });

  describe('CreateAppointmentDto startsAt validation', () => {
    const startsAtErrors = (startsAt: string) => {
      const dto = plainToInstance(CreateAppointmentDto, { ...base, startsAt });
      const errors = validateSync(dto).filter((e) => e.property === 'startsAt');
      return errors.flatMap((e) => Object.values(e.constraints ?? {}));
    };

    it('accepts UTC and explicit offsets', () => {
      expect(startsAtErrors('2026-11-16T11:00:00.000Z')).toEqual([]);
      expect(startsAtErrors('2026-11-16T11:00Z')).toEqual([]);
      expect(startsAtErrors('2026-11-16T08:00:00-03:00')).toEqual([]);
    });

    it('rejects a date-time without timezone', () => {
      expect(startsAtErrors('2026-11-16T08:00:00')).toEqual([
        'A data e hora da consulta (startsAt) deve incluir data, hora e fuso horário (ex.: 2026-11-16T11:00:00.000Z).',
      ]);
    });

    it('rejects a date without time', () => {
      expect(startsAtErrors('2026-11-16')).toHaveLength(1);
    });

    it('rejects an impossible date instead of rolling it over', () => {
      expect(startsAtErrors('2027-02-30T12:00:00Z')).toEqual([
        'A data e hora da consulta (startsAt) não é uma data válida.',
      ]);
    });
  });
});
