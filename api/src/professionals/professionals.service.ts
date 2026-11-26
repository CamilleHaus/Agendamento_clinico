import { Injectable, NotFoundException } from '@nestjs/common';
import { professionals as seed } from '../data/seed.js';
import { Professional } from './professional.entity.js';

@Injectable()
export class ProfessionalsService {
  private items: Professional[] = seed.map((p) => ({ ...p }));

  findAll() {
    return this.items;
  }

  findById(id: string): Professional | undefined {
    return this.items.find((p) => p.id === id);
  }

  findOne(id: string) {
    const found = this.findById(id);
    if (!found) throw new NotFoundException('Profissional não encontrado.');
    return found;
  }
}
