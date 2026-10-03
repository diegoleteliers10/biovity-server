import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedCandidateEntity } from '../../infrastructure/database/orm/saved-candidate.entity';
import {
  parsePagination,
  paginated,
  type PaginatedResponse,
  type PaginationQuery,
} from '../../shared/pagination/pagination';

@Injectable()
export class SavedCandidateService {
  constructor(
    @InjectRepository(SavedCandidateEntity)
    private readonly repo: Repository<SavedCandidateEntity>,
  ) {}

  async findByOrganization(
    organizationId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<SavedCandidateEntity>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [items, total] = await Promise.all([
      this.repo.find({
        where: { organizationId },
        relations: { candidate: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      }),
      this.repo.count({ where: { organizationId } }),
    ]);
    return paginated(items, total, page, limit);
  }

  async save(
    organizationId: string,
    candidateId: string,
    note?: string,
  ): Promise<SavedCandidateEntity> {
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
    } catch {
      throw new ConflictException(
        'Candidato ya guardado para esta organización.',
      );
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
