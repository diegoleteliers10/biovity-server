import { ScheduledJobsDispatcherService } from './scheduled-jobs-dispatcher.service';

describe('ScheduledJobsDispatcherService', () => {
  it('invokes each non-calendar scheduled workflow once', async () => {
    const calls = Array.from({ length: 15 }, () =>
      jest.fn().mockResolvedValue(undefined),
    );
    const dispatcher = new ScheduledJobsDispatcherService(
      {
        dispatchApplicationStatusNotifications: calls[0],
        sendHiringPlanReminders: calls[12],
        deleteExpiredDeduplicationKeys: calls[13],
      } as never,
      { dispatch: calls[1] } as never,
      { dispatch: calls[2] } as never,
      { dispatch: calls[3] } as never,
      { dispatch: calls[4] } as never,
      { dispatch: calls[5] } as never,
      { dispatch: calls[6] } as never,
      { dispatch: calls[7] } as never,
      { dispatch: calls[8] } as never,
      { expireDueOffers: calls[9] } as never,
      { dispatch: calls[10] } as never,
      { dispatch: calls[11] } as never,
      { processExpiredCandidates: calls[14] } as never,
    );

    const result = await dispatcher.dispatch();

    expect(calls).toHaveLength(15);
    for (const call of calls) expect(call).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.jobs).toHaveLength(15);
    expect(result.jobs.every(job => job.status === 'fulfilled')).toBe(true);
    expect(result.jobs.some(job => job.job.includes('calendar'))).toBe(false);
  });

  it('reports a failed job and continues to invoke the other jobs', async () => {
    const calls = Array.from({ length: 15 }, () =>
      jest.fn().mockResolvedValue(undefined),
    );
    calls[0].mockRejectedValue(new Error('dispatch failed'));
    const dispatcher = new ScheduledJobsDispatcherService(
      {
        dispatchApplicationStatusNotifications: calls[0],
        sendHiringPlanReminders: calls[12],
        deleteExpiredDeduplicationKeys: calls[13],
      } as never,
      { dispatch: calls[1] } as never,
      { dispatch: calls[2] } as never,
      { dispatch: calls[3] } as never,
      { dispatch: calls[4] } as never,
      { dispatch: calls[5] } as never,
      { dispatch: calls[6] } as never,
      { dispatch: calls[7] } as never,
      { dispatch: calls[8] } as never,
      { expireDueOffers: calls[9] } as never,
      { dispatch: calls[10] } as never,
      { dispatch: calls[11] } as never,
      { processExpiredCandidates: calls[14] } as never,
    );

    const result = await dispatcher.dispatch();

    expect(result.ok).toBe(false);
    expect(result.jobs[0]).toEqual({
      job: 'application_status_notifications',
      status: 'rejected',
    });
    for (const call of calls) expect(call).toHaveBeenCalledTimes(1);
  });

  it('reports an email outbox failure and continues to invoke the other jobs', async () => {
    const calls = Array.from({ length: 15 }, () =>
      jest.fn().mockResolvedValue(undefined),
    );
    calls[8].mockRejectedValue(new Error('email dispatch failed'));
    const dispatcher = new ScheduledJobsDispatcherService(
      {
        dispatchApplicationStatusNotifications: calls[0],
        sendHiringPlanReminders: calls[12],
        deleteExpiredDeduplicationKeys: calls[13],
      } as never,
      { dispatch: calls[1] } as never,
      { dispatch: calls[2] } as never,
      { dispatch: calls[3] } as never,
      { dispatch: calls[4] } as never,
      { dispatch: calls[5] } as never,
      { dispatch: calls[6] } as never,
      { dispatch: calls[7] } as never,
      { dispatch: calls[8] } as never,
      { expireDueOffers: calls[9] } as never,
      { dispatch: calls[10] } as never,
      { dispatch: calls[11] } as never,
      { processExpiredCandidates: calls[14] } as never,
    );

    const result = await dispatcher.dispatch();

    expect(result.ok).toBe(false);
    expect(result.jobs[8]).toEqual({
      job: 'email_outbox',
      status: 'rejected',
    });
    for (const call of calls) expect(call).toHaveBeenCalledTimes(1);
  });
});
