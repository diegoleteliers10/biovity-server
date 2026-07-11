import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTemplateEntity } from '../../infrastructure/database/orm/job-template.entity';

export interface JobTemplateData {
  id: string;
  organizationId: string;
  name: string;
  title: string;
  description: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: Record<string, unknown>;
  location?: Record<string, unknown>;
  benefits?: Array<{ tipo: string; title: string }>;
  requiredSkills?: string[];
  minExperience?: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateJobTemplateInput = Omit<
  JobTemplateData,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateJobTemplateInput = Partial<
  Omit<JobTemplateData, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
>;

@Injectable()
export class JobTemplateService {
  constructor(
    @InjectRepository(JobTemplateEntity)
    private readonly repo: Repository<JobTemplateEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<JobTemplateData[]> {
    const entities = await this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(this.toData);
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<JobTemplateData | null> {
    const entity = await this.repo.findOne({ where: { id, organizationId } });
    return entity ? this.toData(entity) : null;
  }

  async create(input: CreateJobTemplateInput): Promise<JobTemplateData> {
    const entity = this.repo.create({
      organizationId: input.organizationId,
      name: input.name,
      title: input.title,
      description: input.description,
      employmentType: input.employmentType,
      experienceLevel: input.experienceLevel,
      salary: input.salary as JobTemplateEntity['salary'],
      location: input.location as JobTemplateEntity['location'],
      benefits: input.benefits as JobTemplateEntity['benefits'],
      requiredSkills: input.requiredSkills,
      minExperience: input.minExperience,
      category: input.category,
    });
    const saved = await this.repo.save(entity);
    return this.toData(saved);
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateJobTemplateInput,
  ): Promise<JobTemplateData | null> {
    const existing = await this.repo.findOne({ where: { id, organizationId } });
    if (!existing) return null;
    Object.assign(existing, input);
    const saved = await this.repo.save(existing);
    return this.toData(saved);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, organizationId });
    return (result.affected ?? 0) > 0;
  }

  private toData(entity: JobTemplateEntity): JobTemplateData {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      title: entity.title,
      description: entity.description,
      employmentType: entity.employmentType,
      experienceLevel: entity.experienceLevel,
      salary: entity.salary as Record<string, unknown> | undefined,
      location: entity.location as Record<string, unknown> | undefined,
      benefits: entity.benefits as
        | Array<{ tipo: string; title: string }>
        | undefined,
      requiredSkills: entity.requiredSkills,
      minExperience: entity.minExperience,
      category: entity.category,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
