import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  JobEntity,
  UserEntity,
  JobQuestionEntity,
  ApplicationAnswerEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationRepositoryImpl } from '../../../infrastructure/persistence/application.repository.impl';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import { JobQuestionRepositoryImpl } from '../../../infrastructure/persistence/job-question.repository.impl';
import { ApplicationAnswerRepositoryImpl } from '../../../infrastructure/persistence/application-answer.repository.impl';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      ApplicationStatusHistoryEntity,
      JobEntity,
      UserEntity,
      JobQuestionEntity,
      ApplicationAnswerEntity,
      OrganizationEntity,
    ]),
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
    {
      provide: 'IJobQuestionRepository',
      useClass: JobQuestionRepositoryImpl,
    },
    {
      provide: 'IApplicationAnswerRepository',
      useClass: ApplicationAnswerRepositoryImpl,
    },
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
