import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { PatientsModule } from '../patients/patients.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';

@Module({
  imports: [PatientsModule, ProfessionalsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
