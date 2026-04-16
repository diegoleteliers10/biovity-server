import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ApplicationEntity,
  JobEntity,
  UserEntity,
  JobQuestionEntity,
  ApplicationAnswerEntity,
} from '../../../infrastructure/database/orm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationRepositoryImpl } from '../../../infrastructure/persistence/application.repository.impl';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import { JobQuestionRepositoryImpl } from '../../../infrastructure/persistence/job-question.repository.impl';
import { ApplicationAnswerRepositoryImpl } from '../../../infrastructure/persistence/application-answer.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      JobEntity,
      UserEntity,
      JobQuestionEntity,
      ApplicationAnswerEntity,
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
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
