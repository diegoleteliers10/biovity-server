import { Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../shared/decorators/public.decorator';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { ScheduledJobsDispatcherService } from '../../../core/services/scheduled-jobs-dispatcher.service';

@Public()
@UseGuards(InternalSecretGuard)
@Controller('internal/cron')
export class ScheduledJobsController {
  constructor(private readonly dispatcher: ScheduledJobsDispatcherService) {}

  @Post('dispatch')
  dispatch() {
    return this.dispatcher.dispatch();
  }
}
