import { Module } from '@nestjs/common';
import { ProfessionalsModule } from './professionals/professionals.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';

@Module({
  imports: [ProfessionalsModule, PatientsModule, AppointmentsModule],
})
export class AppModule {}
