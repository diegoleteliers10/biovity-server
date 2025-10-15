import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IResumeRepository } from '../../core/repositories/resume.repository';
import { Resume } from '../../core/domain/entities/resume.entity';
import { ResumeEntity } from '../database/orm/resume.entity';
import { ResumeMapper } from '../../shared/mappers/resume.mapper';

@Injectable()
export class ResumeRepositoryImpl implements IResumeRepository {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepository: Repository<ResumeEntity>,
  ) {}

  async create(entity: Resume): Promise<Resume> {
    const resumeEntity = ResumeMapper.toEntity(entity);
    const savedEntity = await this.resumeRepository.save(resumeEntity);
    return ResumeMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Resume | null> {
    const resumeEntity = await this.resumeRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    return resumeEntity ? ResumeMapper.toDomain(resumeEntity) : null;
  }

  async findAll(): Promise<Resume[]> {
    const resumeEntities = await this.resumeRepository.find({
      relations: ['user'],
    });
    return resumeEntities.map(entity => ResumeMapper.toDomain(entity));
  }

  async update(id: string, entity: Partial<Resume>): Promise<Resume | null> {
    const existingEntity = await this.resumeRepository.findOne({
      where: { id },
    });

    if (!existingEntity) {
      return null;
    }

    const updatedEntity = { ...existingEntity, ...entity };
    const savedEntity = await this.resumeRepository.save(updatedEntity);
    return ResumeMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.resumeRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
