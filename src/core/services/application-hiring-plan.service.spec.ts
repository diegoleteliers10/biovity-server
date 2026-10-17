import { BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';

describe('ApplicationService.updateHiringPlan', () => {
  it('trims the next action and delegates the patch', async () => {
    const updateHiringPlan = jest
      .fn()
      .mockResolvedValue({ id: 'application-id' });
    const service = new ApplicationService(
      { updateHiringPlan } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.updateHiringPlan({
      applicationId: 'application-id',
      nextAction: '  Llamar al candidato  ',
      targetDate: '2026-11-30',
    });

    expect(updateHiringPlan).toHaveBeenCalledWith({
      id: 'application-id',
      assigneeId: undefined,
      nextAction: 'Llamar al candidato',
      targetDate: '2026-11-30',
    });
  });

  it('rejects an empty update', async () => {
    const service = new ApplicationService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateHiringPlan({ applicationId: 'application-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
