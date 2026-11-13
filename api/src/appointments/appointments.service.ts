import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { appointments as seed } from '../data/seed.js';
import { Appointment } from './appointment.entity.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  private items: Appointment[] = seed.map((a) => ({ ...a }));

  findAll(filter: { professionalId?: string; date?: string }) {
    return this.items
      .filter((a) => !filter.professionalId || a.professionalId === filter.professionalId)
      .filter((a) => !filter.date || a.startsAt.startsWith(filter.date))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  findOne(id: string) {
    const found = this.items.find((a) => a.id === id);
    if (!found) throw new NotFoundException(`Appointment ${id} not found`);
    return found;
  }

  create(dto: CreateAppointmentDto) {
    const appointment: Appointment = {
      id: randomUUID(),
      ...dto,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    this.items.push(appointment);
    return appointment;
  }

  cancel(id: string) {
    const appointment = this.findOne(id);
    appointment.status = 'cancelled';
    return appointment;
  }
}
