import { IsISO8601, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

// Full date-time with an explicit offset ("Z" or "-03:00"). Without an offset,
// "2026-11-16T08:00" would be interpreted in the server's own timezone.
const DATE_TIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export class CreateAppointmentDto {
  @IsString({ message: 'Informe o paciente (patientId).' })
  patientId: string;

  @IsString({ message: 'Informe o profissional (professionalId).' })
  professionalId: string;

  @IsISO8601({ strict: true }, { message: 'A data e hora da consulta (startsAt) não é uma data válida.' })
  @Matches(DATE_TIME_WITH_OFFSET, {
    message:
      'A data e hora da consulta (startsAt) deve incluir data, hora e fuso horário (ex.: 2026-11-16T11:00:00.000Z).',
  })
  startsAt: string;

  @IsInt({ message: 'A duração (durationMinutes) deve ser um número inteiro de minutos.' })
  @Min(5, { message: 'A duração (durationMinutes) deve ser de no mínimo 5 minutos.' })
  durationMinutes: number;

  @IsOptional()
  @IsString({ message: 'As observações (notes) devem ser um texto.' })
  notes?: string;
}
