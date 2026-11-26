import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString({ message: 'O nome (name) deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome (name) é obrigatório.' })
  name: string;

  @IsString({ message: 'O telefone (phone) deve ser um texto.' })
  @IsNotEmpty({ message: 'O telefone (phone) é obrigatório.' })
  phone: string;

  @IsISO8601({ strict: true }, { message: 'A data de nascimento (birthDate) deve ser uma data válida (ex.: 1990-05-12).' })
  birthDate: string;
}
