import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineStageEntity } from '../../../infrastructure/database/orm/pipeline-stage.entity';
import { JobEntity } from '../../../infrastructure/database/orm';
import { PipelineStageController } from './pipeline-stage.controller';
import { PipelineStageService } from '../../../core/services/pipeline-stage.service';
import { PipelineStageRepositoryImpl } from '../../../infrastructure/persistence/pipeline-stage.repository.impl';
import { PipelineStageRubricController } from './pipeline-stage-rubric.controller';
import { PipelineStageRubricService } from '../../../core/services/pipeline-stage-rubric.service';
import { PipelineStageRubricRepositoryImpl } from '../../../infrastructure/persistence/pipeline-stage-rubric.repository.impl';
import { PIPELINE_STAGE_RUBRIC_REPOSITORY } from '../../../core/repositories/pipeline-stage-rubric.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineStageEntity, JobEntity])],
  controllers: [PipelineStageController, PipelineStageRubricController],
  providers: [
    PipelineStageService,
    {
      provide: 'IPipelineStageRepository',
      useClass: PipelineStageRepositoryImpl,
    },
    PipelineStageRubricService,
    {
      provide: PIPELINE_STAGE_RUBRIC_REPOSITORY,
      useClass: PipelineStageRubricRepositoryImpl,
    },
  ],
  exports: [PipelineStageService],
})
export class PipelineStageModule {}
