import { DataSource, EntityManager } from 'typeorm';
import { CandidateDataLifecycleService } from './candidate-data-lifecycle.service';

describe('CandidateDataLifecycleService', () => {
  const candidateId = 'b46ce33f-b80e-4fe8-812d-28c9415a1840';
  const applicationId = '22142303-8ddf-46b3-a314-a0f94460f624';
  const manager = {
    query: jest.fn<
      Promise<unknown[]>,
      [sql: string, ...parameters: unknown[]]
    >(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };
  const service = new CandidateDataLifecycleService(
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource.transaction.mockImplementation(
      (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation(manager as unknown as EntityManager),
    );
  });

  it('deletes expired application data once and queues CV files', async () => {
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('WITH application_closures')) {
        return Promise.resolve([
          {
            id: candidateId,
            email: 'candidate@example.cl',
            application_count: 1,
          },
        ]);
      }
      if (sql.includes('SELECT id FROM public.application')) {
        return Promise.resolve([{ id: applicationId }]);
      }
      if (sql.includes('AS eligible'))
        return Promise.resolve([{ eligible: true }]);
      if (sql.includes('INSERT INTO public.resume_cv_cleanup')) {
        return Promise.resolve([{ id: 'cleanup-id' }]);
      }
      if (sql.includes('SELECT id FROM public.event'))
        return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await expect(service.processExpiredCandidates(10)).resolves.toEqual({
      processed: 1,
      applicationsDeleted: 1,
      filesQueued: 1,
    });
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM public.application'),
      [candidateId],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("'deleted+' || id::text"),
      [candidateId],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("VALUES ($1, 'purged'"),
      expect.any(Array),
    );
    const eligibilityQuery = manager.query.mock.calls.find(([sql]) =>
      sql.includes('WITH application_closures'),
    )?.[0];
    expect(eligibilityQuery).not.toContain('u."isActive" = true');
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("offer.pdf_path LIKE 'offer-letters/%'"),
      [candidateId, 'biovity_cv', 'biovity_bucket'],
    );
    for (const table of [
      'email_outbox_admin_retry',
      'application_status_notification_admin_retry',
      'event_change_notification_admin_retry',
      'event_lifecycle_notification_admin_retry',
      'interview_reminder_notification_admin_retry',
      'message_notification_admin_retry',
      'email_outbox WHERE id',
      'activity_log',
      'ai_interaction_logs',
      'capsule_progress',
      'capsule_module_progress',
      'certificates',
      'google_calendar_connection',
      'google_calendar_oauth_state',
      'application_status_notification_intent',
      'application_created_notification_intent',
      'message_notification_intent',
      'system_notification_broadcast_intent',
      'verification',
    ]) {
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining(`DELETE FROM public.${table}`),
        expect.any(Array),
      );
    }
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('OR "organizerId" = $1'),
      [candidateId, [applicationId]],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('outbox.idempotency_key = ANY($4::text[])'),
      [candidateId, 'candidate@example.cl', [applicationId], []],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM public.email_outbox_admin_retry'),
      expect.any(Array),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('event_participant participant'),
      [candidateId, [applicationId]],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('event_interviewer interviewer'),
      [candidateId, [applicationId]],
    );
  });

  it('skips a candidate when an application reopened before deletion', async () => {
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('WITH application_closures')) {
        return Promise.resolve([{ id: candidateId, application_count: 1 }]);
      }
      if (sql.includes('SELECT id FROM public.application')) {
        return Promise.resolve([{ id: applicationId }]);
      }
      if (sql.includes('AS eligible'))
        return Promise.resolve([{ eligible: false }]);
      return Promise.resolve([]);
    });

    await expect(service.processExpiredCandidates()).resolves.toEqual({
      processed: 0,
      applicationsDeleted: 0,
      filesQueued: 0,
    });

    expect(manager.query).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM public.application'),
      expect.any(Array),
    );
  });
});
