import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedCandidateEntity } from '../../infrastructure/database/orm/saved-candidate.entity';

@Injectable()
export class SavedCandidateService {
  constructor(
    @InjectRepository(SavedCandidateEntity)
    private readonly repo: Repository<SavedCandidateEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<SavedCandidateEntity[]> {
    return this.repo.find({
      where: { organizationId },
      relations: ['candidate'],
      order: { createdAt: 'DESC' },
    });
  }

  async save(organizationId: string, candidateId: string, note?: string): Promise<SavedCandidateEntity> {
    const existing = await this.repo.findOne({
      where: { organizationId, candidateId },
    });

    if (existing) {
      if (note !== undefined) {
        existing.note = note;
        return this.repo.save(existing);
      }
      return existing;
    }

    const entity = this.repo.create({
      organizationId,
      candidateId,
      note,
    });

    try {
      return await this.repo.save(entity);
    } catch (e) {
      throw new ConflictException('Candidato ya guardado para esta organización.');
    }
  }

  async unsave(organizationId: string, candidateId: string): Promise<boolean> {
    const result = await this.repo.delete({ organizationId, candidateId });
    return (result.affected ?? 0) > 0;
  }

  async isSaved(organizationId: string, candidateId: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { organizationId, candidateId },
    });
    return count > 0;
  }
}
