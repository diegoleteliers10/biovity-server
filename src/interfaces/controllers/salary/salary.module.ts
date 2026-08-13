import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalarySubmissionEntity } from '../../../infrastructure/database/orm/salary-submission.entity';
import { SalaryController } from './salary.controller';
import { SalarySubmissionService } from '../../../core/services/salary-submission.service';
import { SalarySubmissionRepositoryImpl } from '../../../infrastructure/persistence/salary-submission.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([SalarySubmissionEntity])],
  controllers: [SalaryController],
  providers: [
    SalarySubmissionService,
    {
      provide: 'ISalarySubmissionRepository',
      useClass: SalarySubmissionRepositoryImpl,
    },
  ],
  exports: [SalarySubmissionService],
})
export class SalaryModule {}
