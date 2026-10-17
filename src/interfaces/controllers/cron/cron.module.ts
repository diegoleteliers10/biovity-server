import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OfferLetterModule } from '../offer-letter/offer-letter.module';
import { OrganizationModule } from '../organization/organization.module';
import { ReportsModule } from '../reports/reports.module';
import { NotificationModule } from '../../../shared/notification';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { ScheduledJobsDispatcherService } from '../../../core/services/scheduled-jobs-dispatcher.service';
import { ScheduledJobsController } from './scheduled-jobs.controller';

@Module({
  imports: [
    AdminModule,
    NotificationModule,
    OfferLetterModule,
    OrganizationModule,
    ReportsModule,
  ],
  controllers: [ScheduledJobsController],
  providers: [InternalSecretGuard, ScheduledJobsDispatcherService],
})
export class CronModule {}
