import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailPreferencesController } from './email-preferences.controller';
import { InternalSecretGuard } from '../guards/internal-secret.guard';
import { EventChangeNotificationDispatcherService } from './event-change-notification-dispatcher.service';
import { MessageNotificationDispatcherService } from './message-notification-dispatcher.service';
import { ApplicationCreatedNotificationDispatcherService } from './application-created-notification-dispatcher.service';
import { InterviewReminderNotificationDispatcherService } from './interview-reminder-notification-dispatcher.service';
import { EventLifecycleNotificationDispatcherService } from './event-lifecycle-notification-dispatcher.service';
import { SystemBroadcastNotificationDispatcherService } from './system-broadcast-notification-dispatcher.service';
import { SavedSearchAlertDispatcherService } from './saved-search-alert-dispatcher.service';

@Global()
@Module({
  imports: [LoggerModule],
  controllers: [NotificationController, EmailPreferencesController],
  providers: [
    NotificationService,
    EventChangeNotificationDispatcherService,
    MessageNotificationDispatcherService,
    ApplicationCreatedNotificationDispatcherService,
    InterviewReminderNotificationDispatcherService,
    EventLifecycleNotificationDispatcherService,
    SystemBroadcastNotificationDispatcherService,
    SavedSearchAlertDispatcherService,
    InternalSecretGuard,
  ],
  exports: [
    NotificationService,
    EventChangeNotificationDispatcherService,
    MessageNotificationDispatcherService,
    ApplicationCreatedNotificationDispatcherService,
    InterviewReminderNotificationDispatcherService,
    EventLifecycleNotificationDispatcherService,
    SystemBroadcastNotificationDispatcherService,
    SavedSearchAlertDispatcherService,
  ],
})
export class NotificationModule {}
