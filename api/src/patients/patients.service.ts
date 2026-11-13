import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { patients as seed } from '../data/seed.js';
import { Patient } from './patient.entity.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';

@Injectable()
export class PatientsService {
  private items: Patient[] = seed.map((p) => ({ ...p }));

  findAll(q?: string) {
    const term = q?.trim().toLowerCase();
    return this.items
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  findOne(id: string) {
    const found = this.items.find((p) => p.id === id);
    if (!found) throw new NotFoundException(`Patient ${id} not found`);
    return found;
  }

  create(dto: CreatePatientDto) {
    const patient: Patient = { id: randomUUID(), ...dto };
    this.items.push(patient);
    return patient;
  }
}
