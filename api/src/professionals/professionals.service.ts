import { Injectable, NotFoundException } from '@nestjs/common';
import { professionals as seed } from '../data/seed.js';
import { Professional } from './professional.entity.js';

@Injectable()
export class ProfessionalsService {
  private items: Professional[] = seed.map((p) => ({ ...p }));

  findAll() {
    return this.items;
  }

  findOne(id: string) {
    const found = this.items.find((p) => p.id === id);
    if (!found) throw new NotFoundException(`Professional ${id} not found`);
    return found;
  }
}
