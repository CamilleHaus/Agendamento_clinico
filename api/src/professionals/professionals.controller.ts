import { Controller, Get, Param } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service.js';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  findAll() {
    return this.professionals.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.professionals.findOne(id);
  }
}
