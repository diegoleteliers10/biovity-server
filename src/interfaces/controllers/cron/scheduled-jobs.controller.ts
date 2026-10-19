import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../shared/decorators/public.decorator';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { ScheduledJobsDispatcherService } from '../../../core/services/scheduled-jobs-dispatcher.service';
import { SystemBroadcastNotificationDispatcherService } from '../../../shared/notification/system-broadcast-notification-dispatcher.service';

@Public()
@UseGuards(InternalSecretGuard)
@Controller('internal/cron')
export class ScheduledJobsController {
  constructor(
    private readonly dispatcher: ScheduledJobsDispatcherService,
    private readonly systemBroadcast: SystemBroadcastNotificationDispatcherService,
  ) {}

  @Post('dispatch')
  dispatch() {
    return this.dispatcher.dispatch();
  }

  @Post('system-broadcast/:intentId/dispatch')
  dispatchSystemBroadcastIntent(
    @Param('intentId', ParseUUIDPipe) intentId: string,
  ) {
    return this.systemBroadcast.dispatchIntent(intentId);
  }
}
