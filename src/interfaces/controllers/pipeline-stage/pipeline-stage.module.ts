import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineStageEntity } from '../../../infrastructure/database/orm/pipeline-stage.entity';
import { JobEntity } from '../../../infrastructure/database/orm';
import { PipelineStageController } from './pipeline-stage.controller';
import { PipelineStageService } from '../../../core/services/pipeline-stage.service';
import { PipelineStageRepositoryImpl } from '../../../infrastructure/persistence/pipeline-stage.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineStageEntity, JobEntity])],
  controllers: [PipelineStageController],
  providers: [
    PipelineStageService,
    {
      provide: 'IPipelineStageRepository',
      useClass: PipelineStageRepositoryImpl,
    },
  ],
  exports: [PipelineStageService],
})
export class PipelineStageModule {}
