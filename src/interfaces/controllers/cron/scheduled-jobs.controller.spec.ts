import { ScheduledJobsController } from './scheduled-jobs.controller';

describe('ScheduledJobsController', () => {
  it('delegates dispatch to the scheduled jobs service', async () => {
    const result = { ok: true, jobs: [] };
    const dispatcher = { dispatch: jest.fn().mockResolvedValue(result) };
    const systemBroadcast = { dispatchIntent: jest.fn() };
    const controller = new ScheduledJobsController(
      dispatcher as never,
      systemBroadcast as never,
    );

    await expect(controller.dispatch()).resolves.toEqual(result);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
    expect(systemBroadcast.dispatchIntent).not.toHaveBeenCalled();
  });

  it('dispatches only the requested system broadcast intent', async () => {
    const intentId = 'e3fb114c-3ce7-446a-a5b3-b48460be3543';
    const result = { intentId, status: 'accepted' };
    const dispatcher = { dispatch: jest.fn() };
    const systemBroadcast = {
      dispatchIntent: jest.fn().mockResolvedValue(result),
    };
    const controller = new ScheduledJobsController(
      dispatcher as never,
      systemBroadcast as never,
    );

    await expect(controller.dispatchSystemBroadcastIntent(intentId)).resolves.toEqual(
      result,
    );
    expect(systemBroadcast.dispatchIntent).toHaveBeenCalledWith(intentId);
    expect(systemBroadcast.dispatchIntent).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
});
