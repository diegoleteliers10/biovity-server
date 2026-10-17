import { DataSource, EntityManager } from 'typeorm';
import { AdminOperationsQueueService } from './admin-operations-queue.service';
import { OperationsQueueQueryDto } from '../../interfaces/dtos/admin/operations-queue.dto';

describe('AdminOperationsQueueService', () => {
  const calls: Array<{ sql: string; parameters: unknown[] }> = [];
  const query = jest.fn((sql: string, parameters: unknown[] = []) => {
    calls.push({ sql, parameters });
    return Promise.resolve([] as unknown[]);
  });
  const transaction = jest.fn(
    async (callback: (manager: EntityManager) => Promise<unknown>) =>
      callback({ query } as unknown as EntityManager),
  );
  const service = new AdminOperationsQueueService({
    query,
    transaction,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
    transaction.mockClear();
    calls.length = 0;
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([] as unknown[]);
      },
    );
  });

  it('returns bounded, paged, typed queue rows for the selected type', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'application-id',
            kind: 'application_follow_up',
            reason: 'missing_action',
            title: 'Analista',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'candidate-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'pendiente',
            stageName: 'Entrevista',
            nextAction: null,
            targetDate: null,
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      page: 3,
      limit: 200,
      type: 'application_follow_up' as const,
      search: ' Ada ',
    });

    const result = await service.list(input);

    expect(result).toMatchObject({
      page: 3,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
    expect(result.data[0]).toMatchObject({
      id: 'application-id',
      kind: 'application_follow_up',
      reason: 'missing_action',
    });
    expect(calls[0]?.sql).toContain(
      `job.status = 'active' AND job."expiresAt"::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date`,
    );
    expect(calls[0]?.sql).toContain(
      "application.status NOT IN ('rechazado', 'contratado', 'desistido')",
    );
    expect(calls[0]?.sql).toContain('application.next_action IS NULL');
    expect(calls[0]?.sql).toContain(
      "application.target_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date",
    );
    expect(calls[0]?.sql).toContain(
      "THEN 'missing_action' ELSE 'overdue_action' END::text AS reason",
    );
    expect(calls[0]?.sql).toContain(
      "application.status NOT IN ('rechazado', 'contratado', 'desistido')",
    );
    expect(calls[1]?.parameters).toEqual([
      'application_follow_up',
      '%Ada%',
      'all',
      null,
      50,
      100,
    ]);
    expect(calls[1]?.sql).toContain(
      'COALESCE(task_assignment.assigned_admin_id = $4::uuid, assignment.admin_user_id = $4::uuid, FALSE) AS "isAssignedToMe"',
    );
    expect(calls[1]?.sql).toContain('LIMIT $5 OFFSET $6');
  });

  it('lists dead event lifecycle notices with the current recipient and actor', async () => {
    await service.list(
      Object.assign(new OperationsQueueQueryDto(), {
        type: 'event_lifecycle_notification' as const,
      }),
    );

    expect(calls[0]?.sql).toContain(
      "'event_lifecycle_notification'::text AS kind",
    );
    expect(calls[0]?.sql).toContain('intent.actor_user_id');
    expect(calls[0]?.sql).toContain("intent.status = 'dead'");
    expect(calls[1]?.parameters).toEqual([
      'event_lifecycle_notification',
      null,
      'all',
      null,
      20,
      0,
    ]);
  });

  it('labels overdue actions when the action exists and the Chile date has passed', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'application-id',
            kind: 'application_follow_up',
            reason: 'overdue_action',
            title: 'Analista',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'candidate-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'pendiente',
            stageName: 'Entrevista',
            nextAction: 'Agendar llamada',
            targetDate: '2026-10-08',
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });

    const result = await service.list(new OperationsQueueQueryDto());

    expect(result.data[0]).toMatchObject({
      reason: 'overdue_action',
      nextAction: 'Agendar llamada',
      targetDate: '2026-10-08',
    });
    expect(calls[0]?.sql).toContain(
      "application.target_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date",
    );
  });

  it('lists only failed explanations for completed assessments', async () => {
    await service.list(
      Object.assign(new OperationsQueueQueryDto(), {
        type: 'ai_explanation' as const,
      }),
    );

    expect(calls[0]?.sql).toContain("score.explanation_status = 'failed'");
    expect(calls[0]?.sql).toContain(
      "score.status IN ('ready', 'insufficient')",
    );
    expect(calls[0]?.sql).toContain("score.candidate_snapshot <> '{}'::jsonb");
    expect(calls[0]?.sql).toContain(
      'score.candidate_snapshot_expires_at > now()',
    );
    expect(calls[0]?.sql).toContain('application_ai_score');
  });

  it('requeues and audits a failed explanation without changing its score status', async () => {
    query
      .mockResolvedValueOnce([
        { id: 'revision-id', errorCode: 'model_timeout' },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      service.retryFailedAiExplanation('revision-id', 'admin-id'),
    ).resolves.toBe('requeued');
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("explanation_status = 'failed'"),
      ['revision-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        'INSERT INTO application_ai_explanation_admin_retry',
      ),
      ['revision-id', 'admin-id', 'model_timeout'],
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "status IN ('ready', 'insufficient')",
    );
    expect(query.mock.calls[0]?.[0]).toContain("explanation_status = 'failed'");
    expect(query.mock.calls[0]?.[0]).toContain(
      "candidate_snapshot <> '{}'::jsonb",
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      'candidate_snapshot_expires_at > now()',
    );
    expect(query.mock.calls[0]?.[0]).not.toContain("SET status = 'pending'");
  });

  it('does not audit an explanation that is no longer failed', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.retryFailedAiExplanation('revision-id', 'admin-id'),
    ).resolves.toBe('not_retryable');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('audits an admin retry for a dead message notification', async () => {
    query
      .mockResolvedValueOnce([{ attemptCount: 8 }])
      .mockResolvedValueOnce([{ id: 'intent-id' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.retryDeadMessageNotification('intent-id', 'admin-id'),
    ).resolves.toBe('requeued');

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("status = 'dead'"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET status = 'pending'"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO message_notification_admin_retry'),
      ['intent-id', 'admin-id', 8],
    );
  });

  it('requeues and audits a dead system broadcast notice', async () => {
    query
      .mockResolvedValueOnce([{ attemptCount: 8 }])
      .mockResolvedValueOnce([{ id: 'intent-id' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.retryDeadSystemBroadcastNotification('intent-id', 'admin-id'),
    ).resolves.toBe('requeued');

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("intent.status = 'dead'"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET status = 'pending'"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        'INSERT INTO system_notification_broadcast_admin_retry',
      ),
      ['intent-id', 'admin-id', 8],
    );
  });

  it('requeues and audits a future reminder for the same scheduled interview', async () => {
    const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    query
      .mockResolvedValueOnce([{ eventId: 'event-id' }])
      .mockResolvedValueOnce([
        { id: 'event-id', startAt, type: 'interview', status: 'scheduled' },
      ])
      .mockResolvedValueOnce([
        {
          eventId: 'event-id',
          participantId: 'participant-id',
          scheduledStartAt: startAt,
          attemptCount: 8,
        },
      ])
      .mockResolvedValueOnce([
        {
          status: 'accepted',
          isActive: true,
          inAppEnabled: true,
          interviewEnabled: true,
        },
      ])
      .mockResolvedValueOnce([{ id: 'intent-id' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.retryDeadInterviewReminderNotification('intent-id', 'admin-id'),
    ).resolves.toBe('requeued');

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM event WHERE id = $1::uuid FOR SHARE'),
      ['event-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("SET status = 'pending', attempt_count = 0"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining(
        'INSERT INTO interview_reminder_notification_admin_retry',
      ),
      ['intent-id', 'admin-id', 8],
    );
  });

  it('requeues and audits an eligible RSVP notice under event and participant locks', async () => {
    query
      .mockResolvedValueOnce([
        {
          eventId: 'event-id',
          participantId: 'participant-id',
          recipientId: 'organizer-id',
          actorUserId: 'candidate-id',
          kind: 'rsvp',
          toStatus: 'accepted',
        },
      ])
      .mockResolvedValueOnce([{ status: 'scheduled' }])
      .mockResolvedValueOnce([
        {
          status: 'accepted',
          isActive: true,
          inAppEnabled: true,
          interviewEnabled: true,
        },
      ])
      .mockResolvedValueOnce([{ attemptCount: 8 }])
      .mockResolvedValueOnce([{ id: 'intent-id' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.retryDeadEventLifecycleNotification('intent-id', 'admin-id'),
    ).resolves.toBe('requeued');

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"startAt" > now()'),
      ['event-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        "participant.user_id = CASE WHEN $3::text = 'rsvp'",
      ),
      ['participant-id', 'event-id', 'rsvp', 'organizer-id', 'candidate-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("SET status = 'pending', attempt_count = 0"),
      ['intent-id'],
    );
    expect(query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining(
        'INSERT INTO event_lifecycle_notification_admin_retry',
      ),
      ['intent-id', 'admin-id', 8],
    );
  });

  it('does not requeue a stale RSVP or lock the intent before event rows', async () => {
    query
      .mockResolvedValueOnce([
        {
          eventId: 'event-id',
          participantId: 'participant-id',
          recipientId: 'organizer-id',
          actorUserId: 'candidate-id',
          kind: 'rsvp',
          toStatus: 'accepted',
        },
      ])
      .mockResolvedValueOnce([{ status: 'scheduled' }])
      .mockResolvedValueOnce([
        {
          status: 'declined',
          isActive: true,
          inAppEnabled: true,
          interviewEnabled: true,
        },
      ]);

    await expect(
      service.retryDeadEventLifecycleNotification('intent-id', 'admin-id'),
    ).resolves.toBe('not_retryable');
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1]?.[0]).toContain('FROM event');
    expect(query.mock.calls[2]?.[0]).toContain('FROM event_participant');
  });

  it('does not retry a reminder after the participant declines', async () => {
    const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    query
      .mockResolvedValueOnce([{ eventId: 'event-id' }])
      .mockResolvedValueOnce([
        { id: 'event-id', startAt, type: 'interview', status: 'scheduled' },
      ])
      .mockResolvedValueOnce([
        {
          eventId: 'event-id',
          participantId: 'participant-id',
          scheduledStartAt: startAt,
          attemptCount: 8,
        },
      ])
      .mockResolvedValueOnce([{ status: 'declined', isActive: true }]);

    await expect(
      service.retryDeadInterviewReminderNotification('intent-id', 'admin-id'),
    ).resolves.toBe('not_retryable');
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('lists dead message notices without selecting message content or email fields', async () => {
    await service.list(
      Object.assign(new OperationsQueueQueryDto(), {
        type: 'message_notification' as const,
      }),
    );

    const sql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';
    const messageQueue = sql
      .split("SELECT 'message_notification'::text")[1]
      ?.split(') queue')[0];

    expect(messageQueue).toContain('FROM message_notification_intent intent');
    expect(messageQueue).toContain("WHERE intent.status = 'dead'");
    expect(messageQueue).not.toContain('recipient_email');
    expect(messageQueue).not.toContain('message.content');
  });

  it('lists only reminders whose interview and RSVP still allow delivery', async () => {
    await service.list(
      Object.assign(new OperationsQueueQueryDto(), {
        type: 'interview_reminder_notification' as const,
      }),
    );

    const sql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';
    const reminderQueue = sql
      .split("SELECT 'interview_reminder_notification'::text")[1]
      ?.split(') queue')[0];

    expect(reminderQueue).toContain("intent.status = 'dead'");
    expect(reminderQueue).toContain("event.status::text = 'scheduled'");
    expect(reminderQueue).toContain(
      'event."startAt" = intent.scheduled_start_at',
    );
    expect(reminderQueue).toContain("participant.status::text <> 'declined'");
    expect(reminderQueue).toContain('recipient."isActive" IS TRUE');
    expect(reminderQueue).toContain(
      "'{channels,in_app}' IS DISTINCT FROM 'false'",
    );
    expect(reminderQueue).toContain(
      "'{events,interview}' IS DISTINCT FROM 'false'",
    );
    expect(reminderQueue).not.toContain('meeting_url');
  });

  it('uses bounded default pagination and reports an empty page', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 0 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      });

    const result = await service.list(new OperationsQueueQueryDto());

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('lists dead offer-response email intents with a valid retry recipient', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'intent-id',
            kind: 'offer_response_email',
            reason: 'offer_response_email_dead',
            title: 'Investigador',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: null,
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'dead',
            nextAction: 'network_error',
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'offer_response_email' as const,
    });

    const result = await service.list(input);
    const querySql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';

    expect(result.data[0]).toMatchObject({
      id: 'intent-id',
      kind: 'offer_response_email',
      reason: 'offer_response_email_dead',
      status: 'dead',
      nextAction: 'network_error',
    });
    expect(querySql).toContain('FROM offer_response_email_intent intent');
    expect(querySql).toContain("WHERE intent.status = 'dead'");
    expect(querySql).toContain('intent.recipient_id IS NOT NULL');
    expect(calls[1]?.parameters[0]).toBe('offer_response_email');
  });

  it('lists only dead application status notices without exposing recipient email', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'intent-id',
            kind: 'application_status_notification',
            reason: 'application_status_notification_dead',
            title: 'Investigador',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'candidate-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'dead',
            statusLabel: 'En revisión',
            attemptCount: 8,
            nextAction: 'notification_insert_failed',
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'application_status_notification' as const,
      assignment: 'unassigned' as const,
    });

    const result = await service.list(input, 'admin-id');
    const querySql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';

    expect(result.data[0]).toMatchObject({
      id: 'intent-id',
      kind: 'application_status_notification',
      status: 'dead',
      statusLabel: 'En revisión',
      attemptCount: 8,
      candidateName: 'Ada',
    });
    expect(querySql).toContain(
      'FROM application_status_notification_intent intent',
    );
    expect(querySql).toContain("WHERE intent.status = 'dead'");
    expect(calls[1]?.sql).toContain('queue.attempt_count AS "attemptCount"');
    expect(
      calls[1]?.sql
        .replace(/\s+/g, ' ')
        .split("SELECT 'application_status_notification'::text")[1]
        ?.split(') queue')[0],
    ).not.toContain('recipient_email');
    expect(calls[1]?.parameters).toEqual([
      'application_status_notification',
      null,
      'unassigned',
      'admin-id',
      20,
      0,
    ]);
  });

  it('lists only dead new-application notices without exposing email', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'intent-id',
            kind: 'application_created_notification',
            reason: 'application_created_notification_dead',
            title: 'Investigador',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'recruiter-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'dead',
            statusLabel: 'Nueva postulación',
            attemptCount: 8,
            nextAction: 'delivery_failed',
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'application_created_notification' as const,
      assignment: 'unassigned' as const,
    });

    const result = await service.list(input, 'admin-id');
    const querySql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';

    expect(result.data[0]).toMatchObject({
      kind: 'application_created_notification',
      status: 'dead',
      statusLabel: 'Nueva postulación',
      attemptCount: 8,
      candidateName: 'Ada',
    });
    expect(querySql).toContain(
      'FROM application_created_notification_intent intent',
    );
    expect(querySql).toContain("WHERE intent.status = 'dead'");
    expect(calls[1]?.parameters).toEqual([
      'application_created_notification',
      null,
      'unassigned',
      'admin-id',
      20,
      0,
    ]);
  });

  it('requeues a dead intent and records the admin and previous attempt count atomically', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ attemptCount: 8 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ id: 'intent-id' }]);
      });

    const result = await service.retryDeadOfferResponseEmail(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('requeued');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.sql).toContain("WHERE id = $1::uuid AND status = 'dead'");
    expect(calls[0]?.sql).toContain('recipient_email IS NOT NULL');
    expect(calls[1]?.sql).toContain(
      "SET status = 'pending', attempt_count = 0",
    );
    expect(calls[2]?.sql).toContain('offer_response_email_admin_retry');
    expect(calls[2]?.parameters).toEqual(['intent-id', 'admin-id', 8]);
  });

  it('does not retry a non-dead intent or one without a recipient', async () => {
    const result = await service.retryDeadOfferResponseEmail(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('not_retryable');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain("WHERE id = $1::uuid AND status = 'dead'");
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('requeues a dead application status notice and records the admin atomically', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ attemptCount: 8 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ id: 'intent-id' }]);
      });

    const result = await service.retryDeadApplicationStatusNotification(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('requeued');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.sql).toContain(
      'FROM application_status_notification_intent intent',
    );
    expect(calls[0]?.sql).toContain(
      "intent.id = $1::uuid AND intent.status = 'dead'",
    );
    expect(calls[0]?.sql).toContain('recipient.id = intent.recipient_id');
    expect(calls[0]?.sql).toContain('FOR UPDATE');
    expect(calls[1]?.sql).toContain(
      "SET status = 'pending', attempt_count = 0",
    );
    expect(calls[1]?.sql).toContain('locked_at = NULL');
    expect(calls[1]?.sql).toContain('last_error_code = NULL');
    expect(calls[1]?.sql).not.toContain('status_history_id');
    expect(calls[2]?.sql).toContain(
      'application_status_notification_admin_retry',
    );
    expect(calls[2]?.parameters).toEqual(['intent-id', 'admin-id', 8]);
  });

  it('does not retry an application status notice that is no longer dead', async () => {
    const result = await service.retryDeadApplicationStatusNotification(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('not_retryable');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain(
      "intent.id = $1::uuid AND intent.status = 'dead'",
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('does not write an audit record when the requeue update affects no intent', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ attemptCount: 8 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      });

    const result = await service.retryDeadApplicationStatusNotification(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('not_retryable');
    expect(calls).toHaveLength(2);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('requeues a dead new-application notice and records the admin atomically', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ attemptCount: 8 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ id: 'intent-id' }]);
      });

    const result = await service.retryDeadApplicationCreatedNotification(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('requeued');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.sql).toContain(
      'FROM application_created_notification_intent',
    );
    expect(calls[0]?.sql).toContain("id = $1::uuid AND status = 'dead'");
    expect(calls[0]?.sql).toContain('FOR UPDATE');
    expect(calls[1]?.sql).toContain(
      "SET status = 'pending', attempt_count = 0",
    );
    expect(calls[2]?.sql).toContain(
      'application_created_notification_admin_retry',
    );
    expect(calls[2]?.parameters).toEqual(['intent-id', 'admin-id', 8]);
  });

  it('requeues a dead event notice and records the admin in one transaction', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ attemptCount: 8 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ id: 'intent-id' }]);
      });

    const result = await service.retryDeadEventChangeNotification(
      'intent-id',
      'admin-id',
    );

    expect(result).toBe('requeued');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.sql).toContain('FROM event_change_notification_intent');
    expect(calls[0]?.sql).toContain("status = 'dead'");
    expect(calls[0]?.sql).toContain('FOR UPDATE');
    expect(calls[1]?.sql).toContain(
      "SET status = 'pending', attempt_count = 0",
    );
    expect(calls[2]?.sql).toContain('event_change_notification_admin_retry');
    expect(calls[2]?.parameters).toEqual(['intent-id', 'admin-id', 8]);
  });

  it('lists organizations without active jobs through the read-only queue query', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'organization-id',
            kind: 'organization_without_active_jobs',
            reason: 'no_active_jobs',
            title: 'BioVity',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: null,
            candidateName: null,
            applicationId: null,
            status: 'none',
            stageName: null,
            nextAction: null,
            targetDate: null,
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'organization_without_active_jobs',
      page: 2,
      limit: 10,
      search: 'BioVity',
    });

    const result = await service.list(input);

    expect(result.data[0]).toMatchObject({
      id: 'organization-id',
      kind: 'organization_without_active_jobs',
      reason: 'no_active_jobs',
      organizationName: 'BioVity',
    });
    expect(calls[0]?.sql.replace(/\s+/g, ' ')).toContain(
      `FROM organization organization WHERE NOT EXISTS ( SELECT 1 FROM job active_job WHERE active_job."organizationId" = organization.id AND active_job.status = 'active' )`,
    );
    expect(calls[1]?.parameters).toEqual([
      'organization_without_active_jobs',
      '%BioVity%',
      'all',
      null,
      10,
      10,
    ]);
  });

  it('lists organizations with pending onboarding milestones and missing profile fields', async () => {
    const onboardingSteps = {
      corporateEmailVerified: true,
      profileComplete: false,
      legalReviewApproved: false,
      firstJobCreated: false,
    };
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'organization-id',
            kind: 'organization_onboarding',
            reason: 'incomplete_onboarding',
            title: 'BioVity',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: null,
            candidateName: null,
            applicationId: null,
            status: 'unverified',
            stageName: null,
            nextAction: null,
            targetDate: null,
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
            onboardingSteps,
            missingProfileFields: ['description', 'city', 'country'],
            assignedAdminId: 'admin-id',
            assignedAdminName: 'Ariel Admin',
            assignedAdminEmail: 'admin@biovity.cl',
            assignedAt: '2026-10-10T12:00:00.000Z',
            isAssignedToMe: true,
            assignmentActivityAction: 'claimed',
            assignmentActivityEmail: 'admin@biovity.cl',
            assignmentActivityAt: '2026-10-10T12:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'organization_onboarding',
      page: 2,
      limit: 10,
      search: ' BioVity ',
      assignment: 'assigned',
    });

    const result = await service.list(input, 'admin-id');
    const querySql = calls[0]?.sql.replace(/\s+/g, ' ') ?? '';

    expect(result.data[0]).toMatchObject({
      id: 'organization-id',
      kind: 'organization_onboarding',
      reason: 'incomplete_onboarding',
      onboardingSteps,
      missingProfileFields: ['description', 'city', 'country'],
      assignedAdminId: 'admin-id',
      isAssignedToMe: true,
      assignmentActivityAction: 'claimed',
    });
    expect(querySql).toContain('SELECT COUNT(*) = 1 AND BOOL_OR(');
    expect(querySql).not.toContain(
      'LEFT JOIN "user" owner ON owner."organizationId" = organization.id',
    );
    expect(querySql).toContain('FROM "user" owner');
    expect(querySql).toContain(
      'WHERE owner."organizationId" = organization.id',
    );
    expect(querySql).toContain('owner."isEmailVerified" IS TRUE');
    expect(querySql).toContain(
      'WHERE onboarding.corporate_email_verified IS NOT TRUE',
    );
    expect(querySql).toContain("SPLIT_PART(BTRIM(owner.email), '@', 2)");
    expect(querySql).toContain(
      "REGEXP_REPLACE(BTRIM(organization.website), '^https?://', '', 'i')",
    );
    expect(querySql).toContain('REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(');
    expect(querySql).toContain("':[0-9]+$'");
    expect(querySql).toContain('SELECT COUNT(*) = 1 AND BOOL_OR(');
    expect(querySql).toContain(
      "LOWER(REGEXP_REPLACE(SPLIT_PART(BTRIM(owner.email), '@', 2), '\\.$', '')) =",
    );
    expect(querySql).toContain(
      "organization.verification_status IS NOT DISTINCT FROM 'verified'",
    );
    expect(querySql).toContain('organization_onboarding_assignment_audit');
    expect(querySql).toContain(
      "$3 = 'assigned' AND assignment.admin_user_id IS NOT NULL",
    );
    expect(querySql).toContain(
      'WHERE first_job."organizationId" = organization.id',
    );
    expect(querySql).toContain("BTRIM(organization.address ->> 'city')");
    expect(querySql).toContain("BTRIM(organization.address ->> 'country')");
    expect(querySql).not.toContain('organization.phone');
    expect(querySql).not.toContain('organization.logo');
    expect(calls[1]?.parameters).toEqual([
      'organization_onboarding',
      '%BioVity%',
      'assigned',
      'admin-id',
      10,
      10,
    ]);
  });

  it('claims an open onboarding case and records the admin action atomically', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FOR UPDATE OF organization'))
          return [{ id: 'organization-id' }];
        if (sql.includes('INSERT INTO organization_onboarding_assignment\n')) {
          return [{ assignedAt: '2026-10-11T12:00:00.000Z' }];
        }
        return [];
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
      nextAction: 'Revisar antecedentes legales',
      targetDate: '2026-10-20',
    });

    expect(result).toEqual({
      status: 'claimed',
      assignedAt: '2026-10-11T12:00:00.000Z',
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]?.sql).toContain('FOR UPDATE OF organization');
    expect(calls[1]?.sql).toContain('ON CONFLICT (organization_id) DO UPDATE');
    expect(calls[1]?.sql).toContain(
      'WHERE organization_onboarding_assignment.admin_user_id IS NULL',
    );
    expect(calls[2]?.parameters).toEqual([
      'organization-id',
      'admin-id',
      'admin@biovity.cl',
      'Revisar antecedentes legales',
      '2026-10-20',
    ]);
    expect(calls[2]?.sql).toContain(
      "VALUES ($1, $2, $3, 'claimed', $4, $5::date)",
    );
  });

  it('does not replace another admin assignment or add a second audit row', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FOR UPDATE OF organization'))
          return [{ id: 'organization-id' }];
        if (sql.includes('INSERT INTO organization_onboarding_assignment\n'))
          return [];
        if (sql.includes('SELECT admin_user_id')) {
          return [{ adminUserId: 'another-admin' }];
        }
        return [];
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
      nextAction: 'Revisar antecedentes legales',
      targetDate: '2026-10-20',
    });

    expect(result).toEqual({ status: 'assigned_elsewhere' });
    expect(calls).toHaveLength(3);
    expect(calls.every(call => !call.sql.includes('assignment_audit'))).toBe(
      true,
    );
  });

  it('releases only the current admin assignment and audits the release', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FOR UPDATE OF organization'))
          return [{ id: 'organization-id' }];
        if (sql.includes('UPDATE organization_onboarding_assignment')) {
          return [
            {
              organizationId: 'organization-id',
              nextAction: 'Contactar empresa',
              targetDate: '2026-10-20',
            },
          ];
        }
        return [];
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'release',
    });

    expect(result).toEqual({ status: 'released' });
    expect(calls[1]?.parameters).toEqual(['organization-id', 'admin-id']);
    expect(calls[1]?.sql).toContain(
      'WHERE organization_id = $1 AND admin_user_id = $2',
    );
    expect(calls[2]?.sql).toContain(
      "VALUES ($1, $2, $3, 'released', $4, $5::date)",
    );
  });

  it('updates a follow-up only for its assigned admin and records the previous plan', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FOR UPDATE OF organization'))
          return [{ id: 'organization-id' }];
        if (sql.includes('UPDATE organization_onboarding_assignment')) {
          return [
            {
              previousNextAction: 'Revisar antecedentes',
              previousTargetDate: '2026-10-20',
            },
          ];
        }
        return [];
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'schedule_follow_up',
      nextAction: 'Solicitar documento legal',
      targetDate: '2026-10-22',
    });

    expect(result).toEqual({ status: 'follow_up_scheduled' });
    expect(calls[1]?.parameters).toEqual([
      'organization-id',
      'admin-id',
      'Solicitar documento legal',
      '2026-10-22',
    ]);
    expect(calls[2]?.parameters).toEqual([
      'organization-id',
      'admin-id',
      'admin@biovity.cl',
      'Revisar antecedentes',
      '2026-10-20',
      'Solicitar documento legal',
      '2026-10-22',
    ]);
  });

  it('rejects blank or missing follow-up data before writing an assignment', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ id: 'organization-id' }]);
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
      nextAction: '   ',
      targetDate: '2026-10-22',
    });

    expect(result).toEqual({ status: 'invalid_follow_up' });
    expect(calls).toHaveLength(1);
  });

  it('does not assign a case that no longer meets onboarding criteria', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      },
    );

    const result = await service.updateOnboardingAssignment({
      organizationId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
    });

    expect(result).toEqual({ status: 'case_closed' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain(
      "organization.verification_status IS DISTINCT FROM 'verified'",
    );
    expect(calls[0]?.sql).toContain(
      "BTRIM(organization.address ->> 'country')",
    );
  });

  it('claims an expired job only while source facts keep it eligible and audits the plan', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FROM job WHERE id')) return [{ id: 'job-id' }];
        if (sql.includes('INSERT INTO admin_operations_queue_assignment\n')) {
          return [{ assignedAt: '2026-10-11T12:00:00.000Z' }];
        }
        return [];
      },
    );

    const result = await service.updateAdminTaskAssignment({
      kind: 'expired_job',
      sourceId: 'job-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
      nextAction: 'Confirmar renovación con la empresa',
      targetDate: '2026-10-20',
    });

    expect(result).toEqual({
      status: 'claimed',
      assignedAt: '2026-10-11T12:00:00.000Z',
    });
    expect(calls[0]?.sql).toContain("status = 'active'");
    expect(calls[0]?.sql).toContain(
      '"expiresAt"::date < (CURRENT_TIMESTAMP AT TIME ZONE',
    );
    expect(calls[0]?.sql).toContain('FOR UPDATE');
    expect(calls[1]?.sql).toContain('ON CONFLICT (kind, source_id) DO UPDATE');
    expect(calls[2]?.sql).toContain(
      'INSERT INTO admin_operations_queue_assignment_audit',
    );
    expect(calls[2]?.parameters).toContain(
      'Confirmar renovación con la empresa',
    );
  });

  it('does not write when an organization without active jobs becomes ineligible', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return [];
      },
    );

    const result = await service.updateAdminTaskAssignment({
      kind: 'organization_without_active_jobs',
      sourceId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'claim',
      nextAction: 'Revisar vacantes',
      targetDate: '2026-10-20',
    });

    expect(result).toEqual({ status: 'case_closed' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('NOT EXISTS');
    expect(calls[0]?.sql).toContain("active_job.status = 'active'");
  });

  it('keeps an admin task visible when its owner schedules a follow-up', async () => {
    query.mockImplementation(
      async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        if (sql.includes('FROM organization organization'))
          return [{ id: 'organization-id' }];
        if (sql.includes('FROM admin_operations_queue_assignment WHERE')) {
          return [
            {
              adminUserId: 'admin-id',
              nextAction: 'Llamar',
              targetDate: '2026-10-20',
            },
          ];
        }
        return [];
      },
    );

    const result = await service.updateAdminTaskAssignment({
      kind: 'organization_without_active_jobs',
      sourceId: 'organization-id',
      adminUserId: 'admin-id',
      actorEmail: 'admin@biovity.cl',
      action: 'schedule_follow_up',
      nextAction: 'Solicitar plan de contratación',
      targetDate: '2026-10-24',
    });

    expect(result).toEqual({ status: 'follow_up_scheduled' });
    expect(calls[1]?.sql).toContain('FOR UPDATE');
    expect(calls[2]?.sql).toContain(
      'SET next_action = $3, target_date = $4::date',
    );
    expect(calls[3]?.parameters).toEqual([
      'organization_without_active_jobs',
      'organization-id',
      'admin-id',
      'admin@biovity.cl',
      'follow_up_scheduled',
      'Llamar',
      '2026-10-20',
      'Solicitar plan de contratación',
      '2026-10-24',
    ]);
  });
});
