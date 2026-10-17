import { ScheduledJobsController } from './scheduled-jobs.controller';

describe('ScheduledJobsController', () => {
  it('delegates dispatch to the scheduled jobs service', async () => {
    const result = { ok: true, jobs: [] };
    const dispatcher = { dispatch: jest.fn().mockResolvedValue(result) };
    const controller = new ScheduledJobsController(dispatcher as never);

    await expect(controller.dispatch()).resolves.toEqual(result);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
  });
});
