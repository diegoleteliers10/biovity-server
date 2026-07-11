import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateTagEntity } from '../../infrastructure/database/orm/candidate-tag.entity';
import { CandidateTagAssignmentEntity } from '../../infrastructure/database/orm/candidate-tag-assignment.entity';

@Injectable()
export class CandidateTagService {
  constructor(
    @InjectRepository(CandidateTagEntity)
    private readonly tagRepo: Repository<CandidateTagEntity>,
    @InjectRepository(CandidateTagAssignmentEntity)
    private readonly assignmentRepo: Repository<CandidateTagAssignmentEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<CandidateTagEntity[]> {
    return this.tagRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(organizationId: string, name: string, color?: string): Promise<CandidateTagEntity> {
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
    } catch (e) {
      throw new ConflictException('La etiqueta ya existe para esta organización.');
    }
  }

  async delete(tagId: string): Promise<boolean> {
    const result = await this.tagRepo.delete(tagId);
    return (result.affected ?? 0) > 0;
  }

  async assign(tagId: string, candidateId: string): Promise<CandidateTagAssignmentEntity> {
    const tag = await this.tagRepo.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('Etiqueta no encontrada');
    }

    const existing = await this.assignmentRepo.findOne({
      where: { tagId, candidateId },
    });

    if (existing) return existing;

    const assignment = this.assignmentRepo.create({
      tagId,
      candidateId,
    });

    try {
      return await this.assignmentRepo.save(assignment);
    } catch (e) {
      throw new ConflictException('Esta etiqueta ya está asignada a este candidato.');
    }
  }

  async unassign(tagId: string, candidateId: string): Promise<boolean> {
    const result = await this.assignmentRepo.delete({ tagId, candidateId });
    return (result.affected ?? 0) > 0;
  }

  async findByCandidate(candidateId: string, organizationId: string): Promise<CandidateTagEntity[]> {
    const assignments = await this.assignmentRepo.find({
      where: {
        candidateId,
        tag: { organizationId },
      },
      relations: ['tag'],
    });

    return assignments.map(a => a.tag);
  }
}
