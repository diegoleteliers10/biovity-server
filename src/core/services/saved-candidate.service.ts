import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SavedCandidateEntity } from '../../infrastructure/database/orm/saved-candidate.entity';
import { UserEntity } from '../../infrastructure/database/orm/user.entity';
import { UserType } from '../domain/enums';
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
    private readonly dataSource: DataSource,
  ) {}

  async findByOrganization(
    organizationId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<SavedCandidateEntity>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where = {
      organizationId,
      candidate: { type: UserType.PROFESSIONAL, isActive: true },
    };
    const [items, total] = await Promise.all([
      this.repo.find({
        where,
        relations: { candidate: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      }),
      this.repo.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async save(
    organizationId: string,
    candidateId: string,
    note?: string,
  ): Promise<SavedCandidateEntity> {
    return this.dataSource.transaction(async manager => {
      const candidate = await manager.getRepository(UserEntity).findOne({
        where: { id: candidateId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!candidate) {
        throw new NotFoundException('Candidato no encontrado');
      }
      if (candidate.type !== UserType.PROFESSIONAL || !candidate.isActive) {
        throw new BadRequestException(
          'Solo se pueden guardar profesionales activos.',
        );
      }

      const savedCandidates = manager.getRepository(SavedCandidateEntity);
      const existing = await savedCandidates.findOne({
        where: { organizationId, candidateId },
      });

      if (existing) {
        if (note !== undefined) {
          existing.note = note;
          return savedCandidates.save(existing);
        }
        return existing;
      }

      await savedCandidates
        .createQueryBuilder()
        .insert()
        .values({ organizationId, candidateId, note })
        .orIgnore()
        .execute();

      const savedCandidate = await savedCandidates.findOne({
        where: { organizationId, candidateId },
      });
      if (!savedCandidate) {
        return Promise.reject(
          new ConflictException(
            'No se pudo guardar el candidato para esta organización.',
          ),
        );
      }
      return savedCandidate;
    });
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
