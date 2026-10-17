import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { AdminOperationsQueueController } from './admin-operations-queue.controller';

describe('AdminOperationsQueueController', () => {
  const queue = {
    list: jest.fn(),
    updateOnboardingAssignment: jest.fn(),
    updateAdminTaskAssignment: jest.fn(),
    retryDeadOfferResponseEmail: jest.fn(),
    retryDeadApplicationStatusNotification: jest.fn(),
    retryDeadApplicationCreatedNotification: jest.fn(),
    retryDeadEventLifecycleNotification: jest.fn(),
    retryDeadInterviewReminderNotification: jest.fn(),
    retryFailedAiExplanation: jest.fn(),
  };
  const controller = new AdminOperationsQueueController(queue as never);
  const admin: AuthenticatedUser = {
    id: 'admin-id',
    email: 'admin@biovity.cl',
    type: 'admin',
    organizationId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the authenticated admin identity to the queue query', async () => {
    const query = { page: 2 } as never;
    queue.list.mockResolvedValue({ data: [], total: 0 });

    await controller.list(query, admin);

    expect(queue.list).toHaveBeenCalledWith(query, admin.id);
  });

  it('rejects a missing actor before reading the queue', async () => {
    await expect(
      controller.list({} as never, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(queue.list).not.toHaveBeenCalled();
  });

  it('rejects a non-admin before reading the queue', async () => {
    await expect(
      controller.list({} as never, { ...admin, type: 'organization' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.list).not.toHaveBeenCalled();
  });

  it('passes the admin identity to the AI explanation retry', async () => {
    queue.retryFailedAiExplanation.mockResolvedValue('requeued');

    await expect(
      controller.retryAiExplanation('revision-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryFailedAiExplanation).toHaveBeenCalledWith(
      'revision-id',
      admin.id,
    );
  });

  it('rejects non-admin AI explanation retries', async () => {
    await expect(
      controller.retryAiExplanation('revision-id', {
        ...admin,
        type: 'organization',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.retryFailedAiExplanation).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated AI explanation retry', async () => {
    await expect(
      controller.retryAiExplanation('revision-id', undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(queue.retryFailedAiExplanation).not.toHaveBeenCalled();
  });

  it('uses the signed-in admin ID and email for assignment', async () => {
    const input = {
      action: 'claim' as const,
      nextAction: 'Revisar antecedentes legales',
      targetDate: '2026-10-20',
    };
    queue.updateOnboardingAssignment.mockResolvedValue({ status: 'claimed' });

    await controller.updateAssignment('organization-id', input, admin);

    expect(queue.updateOnboardingAssignment).toHaveBeenCalledWith({
      organizationId: 'organization-id',
      adminUserId: admin.id,
      actorEmail: admin.email,
      action: 'claim',
      nextAction: 'Revisar antecedentes legales',
      targetDate: '2026-10-20',
    });
  });

  it('passes only approved operational task kinds to the service', async () => {
    const input = {
      action: 'claim' as const,
      nextAction: 'Revisar vigencia',
      targetDate: '2026-10-20',
    };
    queue.updateAdminTaskAssignment.mockResolvedValue({ status: 'claimed' });

    await controller.updateTaskAssignment(
      'expired_job',
      'job-id',
      input,
      admin,
    );

    expect(queue.updateAdminTaskAssignment).toHaveBeenCalledWith({
      kind: 'expired_job',
      sourceId: 'job-id',
      adminUserId: admin.id,
      actorEmail: admin.email,
      ...input,
    });
  });

  it('rejects task assignment requests from non-admin users', async () => {
    await expect(
      controller.updateTaskAssignment(
        'expired_job',
        'job-id',
        { action: 'release' },
        { ...admin, type: 'organization' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.updateAdminTaskAssignment).not.toHaveBeenCalled();
  });

  it('rejects task kinds outside the admin-owned alert set', async () => {
    await expect(
      controller.updateTaskAssignment(
        'application_follow_up',
        'application-id',
        { action: 'release' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.updateAdminTaskAssignment).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated assignment request', async () => {
    await expect(
      controller.updateAssignment(
        'organization-id',
        { action: 'release' },
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(queue.updateOnboardingAssignment).not.toHaveBeenCalled();
  });

  it('rejects a non-admin assignment request', async () => {
    await expect(
      controller.updateAssignment(
        'organization-id',
        { action: 'claim' },
        { ...admin, type: 'professional' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.updateOnboardingAssignment).not.toHaveBeenCalled();
  });

  it('retries an email intent with the authenticated admin identity', async () => {
    queue.retryDeadOfferResponseEmail.mockResolvedValue('requeued');

    await expect(
      controller.retryOfferResponseEmail('intent-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryDeadOfferResponseEmail).toHaveBeenCalledWith(
      'intent-id',
      admin.id,
    );
  });

  it('rejects an unauthenticated email retry', async () => {
    await expect(
      controller.retryOfferResponseEmail('intent-id', undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(queue.retryDeadOfferResponseEmail).not.toHaveBeenCalled();
  });

  it('rejects a non-admin email retry', async () => {
    await expect(
      controller.retryOfferResponseEmail('intent-id', {
        ...admin,
        type: 'organization',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.retryDeadOfferResponseEmail).not.toHaveBeenCalled();
  });

  it('retries a dead application status notice as the signed-in admin', async () => {
    queue.retryDeadApplicationStatusNotification.mockResolvedValue('requeued');

    await expect(
      controller.retryApplicationStatusNotification('intent-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryDeadApplicationStatusNotification).toHaveBeenCalledWith(
      'intent-id',
      admin.id,
    );
  });

  it('rejects application status retries from a non-admin', async () => {
    await expect(
      controller.retryApplicationStatusNotification('intent-id', {
        ...admin,
        type: 'organization',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.retryDeadApplicationStatusNotification).not.toHaveBeenCalled();
  });

  it('passes the authenticated admin identity when retrying a new-application notice', async () => {
    queue.retryDeadApplicationCreatedNotification.mockResolvedValue('requeued');

    await expect(
      controller.retryApplicationCreatedNotification('intent-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryDeadApplicationCreatedNotification).toHaveBeenCalledWith(
      'intent-id',
      admin.id,
    );
  });

  it('retries an interview reminder with the authenticated admin identity', async () => {
    queue.retryDeadInterviewReminderNotification.mockResolvedValue('requeued');

    await expect(
      controller.retryInterviewReminderNotification('intent-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryDeadInterviewReminderNotification).toHaveBeenCalledWith(
      'intent-id',
      admin.id,
    );
  });

  it('rejects interview reminder retries from a non-admin user', async () => {
    await expect(
      controller.retryInterviewReminderNotification('intent-id', {
        ...admin,
        type: 'organization',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.retryDeadInterviewReminderNotification).not.toHaveBeenCalled();
  });

  it('passes the authenticated admin identity when retrying an event notice', async () => {
    queue.retryDeadEventLifecycleNotification.mockResolvedValue('requeued');

    await expect(
      controller.retryEventLifecycleNotification('intent-id', admin),
    ).resolves.toEqual({ status: 'requeued' });
    expect(queue.retryDeadEventLifecycleNotification).toHaveBeenCalledWith(
      'intent-id',
      admin.id,
    );
  });

  it('rejects event notice retries from a non-admin user', async () => {
    await expect(
      controller.retryEventLifecycleNotification('intent-id', {
        ...admin,
        type: 'organization',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queue.retryDeadEventLifecycleNotification).not.toHaveBeenCalled();
  });
});
