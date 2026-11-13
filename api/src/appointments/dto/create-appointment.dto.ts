import { IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsString() patientId: string;
  @IsString() professionalId: string;
  @IsISO8601() startsAt: string;
  @IsInt() @Min(5) durationMinutes: number;
  @IsOptional() @IsString() notes?: string;
}
