import { Injectable } from '@nestjs/common';
import { CandidateDataLifecycleService } from './candidate-data-lifecycle.service';
import { EmailOutboxDispatcherService } from './email-outbox-dispatcher.service';
import { OfferLetterService } from './offer-letter.service';
import { OfferResponseEmailBridgeService } from './offer-response-email-bridge.service';
import { OrganizationVerificationEmailBridgeService } from './organization-verification-email-bridge.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ApplicationCreatedNotificationDispatcherService } from '../../shared/notification/application-created-notification-dispatcher.service';
import { EventChangeNotificationDispatcherService } from '../../shared/notification/event-change-notification-dispatcher.service';
import { EventLifecycleNotificationDispatcherService } from '../../shared/notification/event-lifecycle-notification-dispatcher.service';
import { InterviewReminderNotificationDispatcherService } from '../../shared/notification/interview-reminder-notification-dispatcher.service';
import { MessageNotificationDispatcherService } from '../../shared/notification/message-notification-dispatcher.service';
import { SavedSearchAlertDispatcherService } from '../../shared/notification/saved-search-alert-dispatcher.service';
import { SystemBroadcastNotificationDispatcherService } from '../../shared/notification/system-broadcast-notification-dispatcher.service';

type JobResult = {
  job: string;
  status: 'fulfilled' | 'rejected';
  details?: unknown;
};

type Job = {
  name: string;
  run: () => Promise<unknown>;
  includeResult?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

@Injectable()
export class ScheduledJobsDispatcherService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly applicationCreated: ApplicationCreatedNotificationDispatcherService,
    private readonly eventChange: EventChangeNotificationDispatcherService,
    private readonly eventLifecycle: EventLifecycleNotificationDispatcherService,
    private readonly interviewReminder: InterviewReminderNotificationDispatcherService,
    private readonly message: MessageNotificationDispatcherService,
    private readonly savedSearch: SavedSearchAlertDispatcherService,
    private readonly systemBroadcast: SystemBroadcastNotificationDispatcherService,
    private readonly emailOutbox: EmailOutboxDispatcherService,
    private readonly offerLetter: OfferLetterService,
    private readonly offerResponseEmail: OfferResponseEmailBridgeService,
    private readonly organizationVerificationEmail: OrganizationVerificationEmailBridgeService,
    private readonly candidateDataLifecycle: CandidateDataLifecycleService,
  ) {}

  async dispatch(): Promise<{ ok: boolean; jobs: JobResult[] }> {
    const jobs: Job[] = [
      {
        name: 'application_status_notifications',
        run: () => this.notificationService.dispatchApplicationStatusNotifications(),
      },
      {
        name: 'application_created_notifications',
        run: () => this.applicationCreated.dispatch(),
      },
      { name: 'event_change_notifications', run: () => this.eventChange.dispatch() },
      {
        name: 'event_lifecycle_notifications',
        run: () => this.eventLifecycle.dispatch(),
      },
      { name: 'interview_reminders', run: () => this.interviewReminder.dispatch() },
      { name: 'message_notifications', run: () => this.message.dispatch() },
      { name: 'saved_search_alerts', run: () => this.savedSearch.dispatch() },
      {
        name: 'system_broadcast_notifications',
        run: () => this.systemBroadcast.dispatch(),
        includeResult: true,
      },
      { name: 'email_outbox', run: () => this.emailOutbox.dispatch() },
      { name: 'offer_expiry', run: () => this.offerLetter.expireDueOffers() },
      {
        name: 'offer_response_emails',
        run: () => this.offerResponseEmail.dispatch(),
      },
      {
        name: 'organization_verification_emails',
        run: () => this.organizationVerificationEmail.dispatch(),
      },
      {
        name: 'hiring_plan_reminders',
        run: () => this.notificationService.sendHiringPlanReminders(),
      },
      {
        name: 'notification_deduplication_cleanup',
        run: () => this.notificationService.deleteExpiredDeduplicationKeys(),
      },
      {
        name: 'candidate_retention',
        run: () => this.candidateDataLifecycle.processExpiredCandidates(),
      },
    ];

    const results = await Promise.allSettled(jobs.map(job => job.run()));
    const jobResults = results.map((result, index): JobResult => {
      const job = jobs[index];
      if (result.status === 'rejected') {
        return { job: job.name, status: 'rejected' };
      }
      const details = job.includeResult ? result.value : undefined;
      const failedBroadcast =
        job.name === 'system_broadcast_notifications' &&
        isRecord(details) &&
        details.ok === false;
      return {
        job: job.name,
        status: failedBroadcast ? 'rejected' : 'fulfilled',
        ...(details === undefined ? {} : { details }),
      };
    });

    return {
      ok: jobResults.every(result => result.status === 'fulfilled'),
      jobs: jobResults,
    };
  }
}
