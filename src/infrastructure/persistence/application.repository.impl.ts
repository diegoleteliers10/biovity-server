import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IApplicationRepository } from '../../core/repositories/application.respository';
import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationEntity } from '../database/orm/application.entity';
import { ApplicationMapper } from '../../shared/mappers/application.mapper';

@Injectable()
export class ApplicationRepositoryImpl implements IApplicationRepository {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}

  async create(entity: Application): Promise<Application> {
    const applicationEntity = ApplicationMapper.toEntity(entity);
    const savedEntity =
      await this.applicationRepository.save(applicationEntity);
    return ApplicationMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Application | null> {
    const applicationEntity = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'candidate'],
    });
    return applicationEntity
      ? ApplicationMapper.toDomain(applicationEntity)
      : null;
  }

  async findAll(): Promise<Application[]> {
    const applicationEntities = await this.applicationRepository.find({
      relations: ['job', 'candidate'],
    });
    return applicationEntities.map(entity =>
      ApplicationMapper.toDomain(entity),
    );
  }

  async update(
    id: string,
    entity: Partial<Application>,
  ): Promise<Application | null> {
    const existingEntity = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!existingEntity) {
      return null;
    }

    const updatedEntity = { ...existingEntity, ...entity };
    const savedEntity = await this.applicationRepository.save(updatedEntity);
    return ApplicationMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.applicationRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
