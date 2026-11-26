import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { appointments as seed } from '../data/seed.js';
import { Appointment } from './appointment.entity.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { PatientsService } from '../patients/patients.service.js';
import { ProfessionalsService } from '../professionals/professionals.service.js';
import { clinicDate, clinicMinutesOfDay, formatClinicTime, parseHHMM } from './clinic-time.js';

const MINUTE_MS = 60_000;

function startOf(a: Pick<Appointment, 'startsAt'>): Date {
  return new Date(a.startsAt);
}

function endOf(a: Pick<Appointment, 'startsAt' | 'durationMinutes'>): Date {
  return new Date(startOf(a).getTime() + a.durationMinutes * MINUTE_MS);
}

/** Half-open intervals [start, end): back-to-back appointments do not overlap. */
function overlaps(a: Appointment, start: Date, end: Date): boolean {
  return startOf(a) < end && start < endOf(a);
}

function timeRange(a: Appointment): string {
  return `das ${formatClinicTime(startOf(a))} às ${formatClinicTime(endOf(a))}`;
}

@Injectable()
export class AppointmentsService {
  private items: Appointment[] = seed.map((a) => ({ ...a }));

  constructor(
    private readonly patients: PatientsService,
    private readonly professionals: ProfessionalsService,
  ) {}

  findAll(filter: { professionalId?: string; date?: string }) {
    return this.items
      .filter((a) => !filter.professionalId || a.professionalId === filter.professionalId)
      // `date` is a calendar day in Brasília, not in UTC: 22:30 BRT on 19/11 is
      // already 01:30Z on 20/11, but belongs to the clinic's 19/11.
      .filter((a) => !filter.date || clinicDate(startOf(a)) === filter.date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  findOne(id: string) {
    const found = this.items.find((a) => a.id === id);
    if (!found) throw new NotFoundException('Consulta não encontrada.');
    return found;
  }

  create(dto: CreateAppointmentDto) {
    const patient = this.patients.findById(dto.patientId);
    if (!patient) throw new BadRequestException('Paciente não encontrado.');

    const professional = this.professionals.findById(dto.professionalId);
    if (!professional) throw new BadRequestException('Profissional não encontrado.');

    const start = new Date(dto.startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Data e hora da consulta inválidas.');
    }
    const end = new Date(start.getTime() + dto.durationMinutes * MINUTE_MS);

    if (start.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Não é possível agendar uma consulta em data ou horário que já passou.',
      );
    }

    // Working hours are wall-clock Brasília time. Checking start + duration
    // against workEnd also rejects appointments that would cross midnight.
    const startMinutes = clinicMinutesOfDay(start);
    if (
      startMinutes < parseHHMM(professional.workStart) ||
      startMinutes + dto.durationMinutes > parseHHMM(professional.workEnd)
    ) {
      throw new BadRequestException(
        `${professional.name} atende das ${professional.workStart} às ${professional.workEnd} ` +
          `(horário de Brasília). A consulta precisa começar e terminar dentro desse horário.`,
      );
    }

    // Cancelled appointments free up their slot.
    const active = this.items.filter((a) => a.status !== 'cancelled' && overlaps(a, start, end));

    const professionalClash = active.find((a) => a.professionalId === professional.id);
    if (professionalClash) {
      throw new ConflictException(
        `${professional.name} já tem uma consulta ${timeRange(professionalClash)} ` +
          `(horário de Brasília) nesse dia. Escolha outro horário.`,
      );
    }

    const patientClash = active.find((a) => a.patientId === patient.id);
    if (patientClash) {
      const other = this.professionals.findById(patientClash.professionalId);
      throw new ConflictException(
        `${patient.name} já tem uma consulta${other ? ` com ${other.name}` : ''} ` +
          `${timeRange(patientClash)} (horário de Brasília) nesse dia. Escolha outro horário.`,
      );
    }

    const appointment: Appointment = {
      id: randomUUID(),
      ...dto,
      // Normalised to UTC like the seed, so date filtering and sorting by string keep working.
      startsAt: start.toISOString(),
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
