import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationAnswerEntity } from '../database/orm';
import { ApplicationAnswer } from '../../core/domain/entities/application.entity';
import { IApplicationAnswerRepository } from '../../core/repositories/application-answer.repository';

@Injectable()
export class ApplicationAnswerRepositoryImpl implements IApplicationAnswerRepository {
  constructor(
    @InjectRepository(ApplicationAnswerEntity)
    private readonly repository: Repository<ApplicationAnswerEntity>,
  ) {}

  async findById(id: string): Promise<ApplicationAnswer | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByApplicationId(
    applicationId: string,
  ): Promise<ApplicationAnswer[]> {
    const entities = await this.repository.find({ where: { applicationId } });
    return entities.map(e => this.toDomain(e));
  }

  async findByApplicationIds(
    applicationIds: string[],
  ): Promise<ApplicationAnswer[]> {
    if (applicationIds.length === 0) return [];
    const entities = await this.repository
      .createQueryBuilder('aa')
      .where('aa.application_id IN (:...ids)', { ids: applicationIds })
      .getMany();
    return entities.map(e => this.toDomain(e));
  }

  async create(answer: ApplicationAnswer): Promise<ApplicationAnswer> {
    const entity = this.toEntity(answer);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async bulkCreate(answers: ApplicationAnswer[]): Promise<ApplicationAnswer[]> {
    const entities = answers.map(a => this.toEntity(a));
    const saved = await this.repository.save(entities);
    return saved.map(e => this.toDomain(e));
  }

  async deleteByApplicationId(applicationId: string): Promise<boolean> {
    const result = await this.repository.delete({ applicationId });
    return (result.affected ?? 0) > 0;
  }

  async existsByQuestionId(questionId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { questionId } });
    return count > 0;
  }

  private toDomain(entity: ApplicationAnswerEntity): ApplicationAnswer {
    return new ApplicationAnswer(
      entity.id,
      entity.applicationId,
      entity.questionId,
      entity.value,
      entity.createdAt,
    );
  }

  private toEntity(domain: ApplicationAnswer): ApplicationAnswerEntity {
    const entity = new ApplicationAnswerEntity();
    entity.id = domain.id;
    entity.applicationId = domain.applicationId;
    entity.questionId = domain.questionId;
    entity.value = domain.value;
    entity.createdAt = domain.createdAt;
    return entity;
  }
}
