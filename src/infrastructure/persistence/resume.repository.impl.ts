import { IResumeRepository } from '../../core/repositories/resume.repository';
import { Injectable } from '@nestjs/common';
import { ResumeEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../../core/domain/entities/resume.entity';
import { ResumeDomainOrmMapper } from '../../shared/mappers/resume/resumeDomain-orm.mapper';

const DEFAULT_TAKE = 50;

@Injectable()
export class ResumeRepositoryImpl implements IResumeRepository {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepository: Repository<ResumeEntity>,
  ) {}

  async create(entity: Resume): Promise<Resume> {
    const resumeOrm = ResumeDomainOrmMapper.toOrm(entity);
    const savedResume = await this.resumeRepository.save(resumeOrm);
    return ResumeDomainOrmMapper.toDomain(savedResume);
  }

  async findById(id: string): Promise<Resume | null> {
    const resumeOrm = await this.resumeRepository.findOne({ where: { id } });
    return resumeOrm ? ResumeDomainOrmMapper.toDomain(resumeOrm) : null;
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    const resumeOrm = await this.resumeRepository.findOne({
      where: { userId },
    });
    return resumeOrm ? ResumeDomainOrmMapper.toDomain(resumeOrm) : null;
  }

  async findAll(pagination?: {
    take?: number;
    skip?: number;
  }): Promise<Resume[]> {
    const resumesOrm = await this.resumeRepository.find({
      take: pagination?.take ?? DEFAULT_TAKE,
      skip: pagination?.skip ?? 0,
    });
    return resumesOrm.map(resumeOrm =>
      ResumeDomainOrmMapper.toDomain(resumeOrm),
    );
  }

  async update(id: string, entity: Partial<Resume>): Promise<Resume | null> {
    const existingResume = await this.resumeRepository.findOne({
      where: { id },
    });
    if (!existingResume) return null;

    const updatedResumeOrm = {
      ...existingResume,
      ...ResumeDomainOrmMapper.toOrm(entity as Resume),
    };
    const savedResume = await this.resumeRepository.save(updatedResumeOrm);
    return ResumeDomainOrmMapper.toDomain(savedResume);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.resumeRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}
