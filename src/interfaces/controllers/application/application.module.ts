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
  ApplicationEvaluationEntity,
  ApplicationNoteEntity,
  PipelineStageEntity,
  OrganizationRejectionReasonEntity,
} from '../../../infrastructure/database/orm';
import { ApplicationController } from './application.controller';
import { ApplicationHiringRecordController } from './application-hiring-record.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationHiringRecordService } from '../../../core/services/application-hiring-record.service';
import { ApplicationRepositoryImpl } from '../../../infrastructure/persistence/application.repository.impl';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import { JobQuestionRepositoryImpl } from '../../../infrastructure/persistence/job-question.repository.impl';
import { ApplicationAnswerRepositoryImpl } from '../../../infrastructure/persistence/application-answer.repository.impl';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';
import { ApplicationEvaluationRepositoryImpl } from '../../../infrastructure/persistence/application-evaluation.repository.impl';
import { ApplicationNoteRepositoryImpl } from '../../../infrastructure/persistence/application-note.repository.impl';
import { ApplicationRejectionReasonController } from './application-rejection-reason.controller';
import { OrganizationRejectionReasonService } from '../../../core/services/organization-rejection-reason.service';

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
      ApplicationEvaluationEntity,
      ApplicationNoteEntity,
      PipelineStageEntity,
      OrganizationRejectionReasonEntity,
    ]),
  ],
  controllers: [ApplicationController, ApplicationHiringRecordController, ApplicationRejectionReasonController],
  providers: [
    OrganizationRejectionReasonService,
    ApplicationService,
    ApplicationHiringRecordService,
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
    {
      provide: 'IApplicationEvaluationRepository',
      useClass: ApplicationEvaluationRepositoryImpl,
    },
    {
      provide: 'IApplicationNoteRepository',
      useClass: ApplicationNoteRepositoryImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
