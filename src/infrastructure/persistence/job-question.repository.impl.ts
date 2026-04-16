import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobQuestionEntity, QuestionStatus } from '../database/orm';
import { JobQuestion } from '../../core/domain/entities/job-question.entity';
import { IJobQuestionRepository } from '../../core/repositories/job-question.repository';

@Injectable()
export class JobQuestionRepositoryImpl implements IJobQuestionRepository {
  constructor(
    @InjectRepository(JobQuestionEntity)
    private readonly repository: Repository<JobQuestionEntity>,
  ) {}

  async findById(id: string): Promise<JobQuestion | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByJobId(
    jobId: string,
    status?: QuestionStatus,
  ): Promise<JobQuestion[]> {
    const query = this.repository
      .createQueryBuilder('q')
      .where('q.job_id = :jobId', { jobId })
      .orderBy('q.order_index', 'ASC');

    if (status) {
      query.andWhere('q.status = :status', { status });
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganizationId(organizationId: string): Promise<JobQuestion[]> {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { orderIndex: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async create(question: JobQuestion): Promise<JobQuestion> {
    const entity = this.toEntity(question);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(
    id: string,
    data: Partial<JobQuestion>,
  ): Promise<JobQuestion | null> {
    await this.repository.update(id, data as Partial<JobQuestionEntity>);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getMaxOrderIndex(jobId: string): Promise<number> {
    const result: { maxOrder: number | null } | undefined =
      await this.repository
        .createQueryBuilder('q')
        .where('q.job_id = :jobId', { jobId })
        .select('MAX(q.order_index)', 'maxOrder')
        .getRawOne();
    return result?.maxOrder ?? -1;
  }

  async updateOrderIndex(id: string, orderIndex: number): Promise<void> {
    await this.repository.update(id, {
      orderIndex,
    } as Partial<JobQuestionEntity>);
  }

  async bulkUpdateOrder(
    items: { id: string; orderIndex: number }[],
  ): Promise<void> {
    for (const item of items) {
      await this.updateOrderIndex(item.id, item.orderIndex);
    }
  }

  async findByIdAndJobId(
    id: string,
    jobId: string,
  ): Promise<JobQuestion | null> {
    const entity = await this.repository.findOne({ where: { id, jobId } });
    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: JobQuestionEntity): JobQuestion {
    return new JobQuestion(
      entity.id,
      entity.jobId,
      entity.organizationId,
      entity.label,
      entity.type,
      entity.required,
      entity.orderIndex,
      entity.status,
      entity.placeholder,
      entity.helperText,
      entity.options,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toEntity(domain: JobQuestion): JobQuestionEntity {
    const entity = new JobQuestionEntity();
    entity.id = domain.id;
    entity.jobId = domain.jobId;
    entity.organizationId = domain.organizationId;
    entity.label = domain.label;
    entity.type = domain.type;
    entity.required = domain.required;
    entity.orderIndex = domain.orderIndex;
    entity.status = domain.status;
    entity.placeholder = domain.placeholder;
    entity.helperText = domain.helperText;
    entity.options = domain.options;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
