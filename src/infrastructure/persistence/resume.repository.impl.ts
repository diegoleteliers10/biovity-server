import { IResumeRepository } from '../../core/repositories/resume.repository';
import { Injectable } from '@nestjs/common';
import { ResumeEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../../core/domain/entities/resume.entity';
import { ResumeDomainOrmMapper } from '../../shared/mappers/resume/resumeDomain-orm.mapper';
import {
  recordCandidateProfileChange,
  resumeSearchDataChanged,
} from './candidate-profile-change';

const DEFAULT_TAKE = 50;

@Injectable()
export class ResumeRepositoryImpl implements IResumeRepository {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepository: Repository<ResumeEntity>,
  ) {}

  async create(entity: Resume): Promise<Resume> {
    return this.resumeRepository.manager.transaction(async manager => {
      const savedResume = await manager
        .getRepository(ResumeEntity)
        .save(ResumeDomainOrmMapper.toOrm(entity));
      if (resumeSearchDataChanged(null, savedResume)) {
        await recordCandidateProfileChange(manager, savedResume.userId);
      }
      return ResumeDomainOrmMapper.toDomain(savedResume);
    });
  }

  async findById(id: string): Promise<Resume | null> {
    const resumeOrm = await this.resumeRepository.findOne({ where: { id } });
    return resumeOrm ? ResumeDomainOrmMapper.toDomain(resumeOrm) : null;
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    const resumeOrm = await this.resumeRepository.findOne({
      where: { userId },
      order: { updatedAt: 'DESC', createdAt: 'DESC', id: 'DESC' },
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

  async count(): Promise<number> {
    return this.resumeRepository.count();
  }

  async update(id: string, entity: Partial<Resume>): Promise<Resume | null> {
    return this.resumeRepository.manager.transaction(async manager => {
      const repository = manager.getRepository(ResumeEntity);
      const existingResume = await repository.findOne({ where: { id } });
      if (!existingResume) return null;

      const mappedResume = ResumeDomainOrmMapper.toOrm({
        ...ResumeDomainOrmMapper.toDomain(existingResume),
        ...entity,
      });
      const updatedResumeOrm = { ...existingResume };
      if (entity.summary !== undefined)
        updatedResumeOrm.summary = mappedResume.summary;
      if (entity.experiences !== undefined)
        updatedResumeOrm.experiences = mappedResume.experiences;
      if (entity.education !== undefined)
        updatedResumeOrm.education = mappedResume.education;
      if (entity.skills !== undefined) updatedResumeOrm.skills = mappedResume.skills;
      if (entity.certifications !== undefined)
        updatedResumeOrm.certifications = mappedResume.certifications;
      if (entity.languages !== undefined)
        updatedResumeOrm.languages = mappedResume.languages;
      if (entity.links !== undefined) updatedResumeOrm.links = mappedResume.links;
      if (entity.cvFile !== undefined) updatedResumeOrm.cvFile = mappedResume.cvFile;
      const savedResume = await repository.save(updatedResumeOrm);
      if (resumeSearchDataChanged(existingResume, savedResume)) {
        await recordCandidateProfileChange(manager, savedResume.userId);
      }
      return ResumeDomainOrmMapper.toDomain(savedResume);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.resumeRepository.manager.transaction(async manager => {
      const repository = manager.getRepository(ResumeEntity);
      const resume = await repository.findOne({ where: { id } });
      if (!resume) return false;

      await repository.delete(id);
      if (resumeSearchDataChanged(resume, null)) {
        await recordCandidateProfileChange(manager, resume.userId);
      }
      return true;
    });
  }
}
