import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsISO8601({ strict: true }) birthDate: string;
}
