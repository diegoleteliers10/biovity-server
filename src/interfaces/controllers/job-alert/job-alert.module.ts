import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JobAlertEntity,
  UserEntity,
} from '../../../infrastructure/database/orm';
import { JobAlertController } from './job-alert.controller';
import { JobAlertService } from '../../../core/services/job-alert.service';
import { JobAlertRepositoryImpl } from '../../../infrastructure/persistence/job-alert.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([JobAlertEntity, UserEntity])],
  controllers: [JobAlertController],
  providers: [
    JobAlertService,
    {
      provide: 'IJobAlertRepository',
      useClass: JobAlertRepositoryImpl,
    },
  ],
  exports: [JobAlertService],
})
export class JobAlertModule {}
