import { Module } from '@nestjs/common';
import { ConditionalDatabaseModule } from '../../../infrastructure/config/conditional-database.module';
import {
  JobEntity,
  OrganizationEntity,
  ApplicationEntity,
} from '../../../infrastructure/database/orm';
import { JobController } from './job.controller';
import { JobService } from '../../../core/services/job.service';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [
    ConditionalDatabaseModule.forFeature([
      JobEntity,
      OrganizationEntity,
      ApplicationEntity,
    ]),
  ],
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
