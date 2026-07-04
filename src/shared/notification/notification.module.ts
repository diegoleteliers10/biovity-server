import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { NotificationService } from './notification.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
