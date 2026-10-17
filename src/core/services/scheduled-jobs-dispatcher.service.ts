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
};

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
    const jobs = [
      [
        'application_status_notifications',
        () => this.notificationService.dispatchApplicationStatusNotifications(),
      ],
      [
        'application_created_notifications',
        () => this.applicationCreated.dispatch(),
      ],
      ['event_change_notifications', () => this.eventChange.dispatch()],
      ['event_lifecycle_notifications', () => this.eventLifecycle.dispatch()],
      ['interview_reminders', () => this.interviewReminder.dispatch()],
      ['message_notifications', () => this.message.dispatch()],
      ['saved_search_alerts', () => this.savedSearch.dispatch()],
      ['system_broadcast_notifications', () => this.systemBroadcast.dispatch()],
      ['email_outbox', () => this.emailOutbox.dispatch()],
      ['offer_expiry', () => this.offerLetter.expireDueOffers()],
      ['offer_response_emails', () => this.offerResponseEmail.dispatch()],
      [
        'organization_verification_emails',
        () => this.organizationVerificationEmail.dispatch(),
      ],
      [
        'hiring_plan_reminders',
        () => this.notificationService.sendHiringPlanReminders(),
      ],
      [
        'notification_deduplication_cleanup',
        () => this.notificationService.deleteExpiredDeduplicationKeys(),
      ],
      [
        'candidate_retention',
        () => this.candidateDataLifecycle.processExpiredCandidates(),
      ],
    ] as const;

    const results = await Promise.allSettled(jobs.map(([, run]) => run()));
    const jobResults = results.map((result, index): JobResult => ({
      job: jobs[index][0],
      status: result.status,
    }));

    return {
      ok: jobResults.every(result => result.status === 'fulfilled'),
      jobs: jobResults,
    };
  }
}
