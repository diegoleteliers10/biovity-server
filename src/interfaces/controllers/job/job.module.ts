import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JobEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { JobController } from './job.controller';
import { JobService } from '../../../core/services/job.service';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity, OrganizationEntity])],
  controllers: [JobController],
  providers: [
    JobService,
    {
      provide: 'IJobRepository',
      useClass: JobRepositoryImpl,
    },
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
  ],
  exports: [JobService],
})
export class JobModule {}
