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
});
