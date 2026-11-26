import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /professionals', () => request(app.getHttpServer()).get('/professionals').expect(200));

  it('GET /appointments?date= filters by day', async () => {
    const res = await request(app.getHttpServer()).get('/appointments?date=2026-11-16').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /appointments rejects invalid payload', () =>
    request(app.getHttpServer()).post('/appointments').send({ patientId: 'pat-1' }).expect(400));

  describe('POST /appointments business rules', () => {
    // Frozen clock (13/11/2026 09:00 BRT) so the tests do not depend on today's date.
    // Only Date is faked; real timers keep the HTTP server working.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-13T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const post = (body: object) => request(app.getHttpServer()).post('/appointments').send(body);
    const valid = {
      patientId: 'pat-5',
      professionalId: 'pro-1',
      startsAt: '2026-11-23T11:00:00.000Z', // Monday 08:00 BRT, no seed appointments that day
      durationMinutes: 30,
    };

    it('201 for a valid appointment', async () => {
      const res = await post(valid).expect(201);
      expect(res.body).toMatchObject({ ...valid, status: 'scheduled' });
    });

    it('400 with a message for an appointment outside working hours', async () => {
      const res = await post({ ...valid, startsAt: '2026-11-23T19:45:00.000Z' }).expect(400); // 16:45-17:15 BRT
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Profissional Teste A atende das 08:00 às 17:00 (horário de Brasília). ' +
          'A consulta precisa começar e terminar dentro desse horário.',
      });
    });

    it('400 for a date in the past', async () => {
      const res = await post({ ...valid, startsAt: '2026-11-12T12:00:00.000Z' }).expect(400);
      expect(res.body.message).toBe('Não é possível agendar uma consulta em data ou horário que já passou.');
    });

    it('400 for unknown patient or professional', async () => {
      expect((await post({ ...valid, patientId: 'pat-999' }).expect(400)).body.message).toBe('Paciente não encontrado.');
      expect((await post({ ...valid, professionalId: 'pro-999' }).expect(400)).body.message).toBe(
        'Profissional não encontrado.',
      );
    });

    it('400 from validation for startsAt without timezone or with an impossible date', async () => {
      const noTz = await post({ ...valid, startsAt: '2026-11-23T08:00:00' }).expect(400);
      expect(noTz.body.message).toEqual([
        'A data e hora da consulta (startsAt) deve incluir data, hora e fuso horário (ex.: 2026-11-16T11:00:00.000Z).',
      ]);
      const impossible = await post({ ...valid, startsAt: '2027-02-30T12:00:00Z' }).expect(400);
      expect(impossible.body.message).toEqual(['A data e hora da consulta (startsAt) não é uma data válida.']);
    });

    it('409 when the professional is already booked', async () => {
      const res = await post({ ...valid, startsAt: '2026-11-16T11:15:00.000Z' }).expect(409); // overlaps apt-1
      expect(res.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message:
          'Profissional Teste A já tem uma consulta das 08:00 às 08:30 (horário de Brasília) nesse dia. Escolha outro horário.',
      });
    });

    it('409 when the patient is already booked with another professional', async () => {
      // pat-12 is with Profissional Teste A on 16/11 13:30-14:00Z; Profissional Teste B is free at 13:40Z.
      const res = await post({
        patientId: 'pat-12',
        professionalId: 'pro-2',
        startsAt: '2026-11-16T13:40:00.000Z',
        durationMinutes: 20,
      }).expect(409);
      expect(res.body.message).toContain('Paciente Teste 12 já tem uma consulta com Profissional Teste A');
    });

    it('201 for back-to-back appointments', () =>
      post({ ...valid, startsAt: '2026-11-16T11:30:00.000Z' }).expect(201)); // between apt-1 and apt-11

    it('PATCH /appointments/:id/cancel frees the slot', async () => {
      const first = await post(valid).expect(201);
      await post({ ...valid, patientId: 'pat-6' }).expect(409);

      await request(app.getHttpServer()).patch(`/appointments/${first.body.id}/cancel`).expect(200);

      await post({ ...valid, patientId: 'pat-6' }).expect(201);
    });
  });
});
