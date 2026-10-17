import { BadRequestException } from '@nestjs/common';
import { OrganizationRejectionReasonService } from './organization-rejection-reason.service';

describe('OrganizationRejectionReasonService', () => {
  it('rejects reactivation when an active reason has the same label', async () => {
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'reason-id',
          organizationId: 'organization-id',
          label: 'Experiencia',
          active: false,
        })
        .mockResolvedValueOnce({
          id: 'other-reason-id',
          organizationId: 'organization-id',
          label: 'Experiencia',
          active: true,
        }),
      save: jest.fn(),
    };
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 'organization-id' }),
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          await operation(manager),
      ),
    };
    const service = new OrganizationRejectionReasonService(
      {} as never,
      dataSource as never,
    );

    await expect(
      service.update('organization-id', 'reason-id', { active: true }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        where: { id: 'organization-id' },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
