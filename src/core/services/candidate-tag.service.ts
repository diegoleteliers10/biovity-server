import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CandidateTagEntity } from '../../infrastructure/database/orm/candidate-tag.entity';
import { CandidateTagAssignmentEntity } from '../../infrastructure/database/orm/candidate-tag-assignment.entity';
import { UserEntity } from '../../infrastructure/database/orm/user.entity';
import { UserType } from '../domain/enums';

@Injectable()
export class CandidateTagService {
  constructor(
    @InjectRepository(CandidateTagEntity)
    private readonly tagRepo: Repository<CandidateTagEntity>,
    @InjectRepository(CandidateTagAssignmentEntity)
    private readonly assignmentRepo: Repository<CandidateTagAssignmentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findByOrganization(
    organizationId: string,
  ): Promise<CandidateTagEntity[]> {
    return this.tagRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    organizationId: string,
    name: string,
    color?: string,
  ): Promise<CandidateTagEntity> {
    const existing = await this.tagRepo.findOne({
      where: { organizationId, name },
    });

    if (existing) {
      if (color) {
        existing.color = color;
        return this.tagRepo.save(existing);
      }
      return existing;
    }

    const tag = this.tagRepo.create({
      organizationId,
      name,
      color: color || '#6366f1',
    });

    try {
      return await this.tagRepo.save(tag);
    } catch {
      throw new ConflictException(
        'La etiqueta ya existe para esta organización.',
      );
    }
  }

  async delete(tagId: string): Promise<boolean> {
    const result = await this.tagRepo.delete(tagId);
    return (result.affected ?? 0) > 0;
  }

  async assign(
    tagId: string,
    candidateId: string,
  ): Promise<CandidateTagAssignmentEntity> {
    return this.dataSource.transaction(async manager => {
      const tag = await manager.getRepository(CandidateTagEntity).findOne({
        where: { id: tagId },
      });
      if (!tag) {
        throw new NotFoundException('Etiqueta no encontrada');
      }

      const candidate = await manager.getRepository(UserEntity).findOne({
        where: { id: candidateId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!candidate) {
        throw new NotFoundException('Candidato no encontrado');
      }
      if (candidate.type !== UserType.PROFESSIONAL || !candidate.isActive) {
        throw new BadRequestException(
          'La etiqueta solo se puede asignar a un profesional activo.',
        );
      }

      const assignments = manager.getRepository(CandidateTagAssignmentEntity);
      const existing = await assignments.findOne({
        where: { tagId, candidateId },
      });
      if (existing) return existing;

      return assignments.save(assignments.create({ tagId, candidateId }));
    });
  }

  async unassign(tagId: string, candidateId: string): Promise<boolean> {
    const result = await this.assignmentRepo.delete({ tagId, candidateId });
    return (result.affected ?? 0) > 0;
  }

  async findByCandidate(
    candidateId: string,
    organizationId: string,
  ): Promise<CandidateTagEntity[]> {
    const assignments = await this.assignmentRepo.find({
      where: {
        candidateId,
        tag: { organizationId },
      },
      relations: { tag: true },
    });

    return assignments.map(a => a.tag);
  }
}
