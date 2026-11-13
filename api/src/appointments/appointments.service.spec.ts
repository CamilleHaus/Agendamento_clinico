import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { appointments as seed } from '../data/seed.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    service = new AppointmentsService();
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
    expect(result.every((a) => a.startsAt.startsWith('2026-11-16') && a.professionalId === 'pro-1')).toBe(true);
    expect(result.map((a) => a.id)).toContain('apt-1');
  });

  it('cancels an appointment and throws 404 for unknown ids', () => {
    expect(service.cancel('apt-1').status).toBe('cancelled');
    expect(service.findOne('apt-1').status).toBe('cancelled');
    expect(() => service.cancel('nope')).toThrow(NotFoundException);
  });

  it('does not mutate the shared seed', () => {
    service.cancel('apt-2');
    expect(new AppointmentsService().findOne('apt-2').status).toBe('scheduled');
  });
});
