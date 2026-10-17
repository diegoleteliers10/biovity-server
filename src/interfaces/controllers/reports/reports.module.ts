import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrganizationEntity,
  JobEntity,
  ApplicationEntity,
  EventEntity,
  OrganizationMemberEntity,
} from '../../../infrastructure/database/orm';
import { MetricsReportService } from '../../../core/services/metrics-report.service';
import { EmailOutboxDispatcherService } from '../../../core/services/email-outbox-dispatcher.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      OrganizationEntity,
      JobEntity,
      ApplicationEntity,
      EventEntity,
      OrganizationMemberEntity,
    ]),
  ],
  providers: [MetricsReportService, EmailOutboxDispatcherService],
  exports: [MetricsReportService, EmailOutboxDispatcherService],
})
export class ReportsModule {}
