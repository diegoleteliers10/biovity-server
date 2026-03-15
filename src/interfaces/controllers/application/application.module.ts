import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ApplicationEntity,
  JobEntity,
  UserEntity,
} from '../../../infrastructure/database/orm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationRepositoryImpl } from '../../../infrastructure/persistence/application.repository.impl';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationEntity, JobEntity, UserEntity]),
  ],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    {
      provide: 'IApplicationRepository',
      useClass: ApplicationRepositoryImpl,
    },
    {
      provide: 'IJobRepository',
      useClass: JobRepositoryImpl,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
