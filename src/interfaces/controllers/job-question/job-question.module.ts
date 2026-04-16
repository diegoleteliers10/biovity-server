import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobQuestionEntity } from '../../../infrastructure/database/orm';
import { JobQuestionController } from './job-question.controller';
import { JobQuestionService } from '../../../core/services/job-question.service';
import { JobQuestionRepositoryImpl } from '../../../infrastructure/persistence/job-question.repository.impl';
import { JobQuestionDomainOrmMapper } from '../../../shared/mappers/job-question/jobQuestionDomain-orm.mapper';
import { JobQuestionDtoDomainMapper } from '../../../shared/mappers/job-question/jobQuestionDto-domain.mapper';
import { JobQuestionDomainDtoMapper } from '../../../shared/mappers/job-question/jobQuestionDomain-dto.mapper';
import { JobModule } from '../job/job.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobQuestionEntity]), JobModule],
  controllers: [JobQuestionController],
  providers: [
    JobQuestionService,
    {
      provide: 'IJobQuestionRepository',
      useClass: JobQuestionRepositoryImpl,
    },
    JobQuestionDomainOrmMapper,
    JobQuestionDtoDomainMapper,
    JobQuestionDomainDtoMapper,
  ],
  exports: [JobQuestionService],
})
export class JobQuestionModule {}
