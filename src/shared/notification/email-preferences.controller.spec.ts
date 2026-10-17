import { BadRequestException } from '@nestjs/common';
import { EmailPreferencesController } from './email-preferences.controller';

describe('EmailPreferencesController', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('returns enabled when preference keys are absent', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([{ id: userId, notification_preferences: {} }]),
    };
    const controller = new EmailPreferencesController(dataSource as never);

    await expect(
      controller.emailPreferences('application', { userIds: [userId] }),
    ).resolves.toEqual({
      decisions: { [userId]: 'enabled' },
    });
  });

  it('disables email when either preference is false', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: userId,
          notification_preferences: { channels: { email: false } },
        },
      ]),
    };
    const controller = new EmailPreferencesController(dataSource as never);

    await expect(
      controller.emailPreferences('application', { userIds: [userId] }),
    ).resolves.toEqual({
      decisions: { [userId]: 'disabled' },
    });
  });

  it('disables offer email when the application event is false', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: userId,
          notification_preferences: { events: { application: false } },
        },
      ]),
    };
    const controller = new EmailPreferencesController(dataSource as never);

    await expect(
      controller.emailPreferences('application', { userIds: [userId] }),
    ).resolves.toEqual({
      decisions: { [userId]: 'disabled' },
    });
  });

  it('uses the requested event preference', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: userId,
          notification_preferences: {
            channels: { email: true },
            events: { application: true, interview: false },
          },
        },
      ]),
    };
    const controller = new EmailPreferencesController(dataSource as never);

    await expect(
      controller.emailPreferences('interview', { userIds: [userId] }),
    ).resolves.toEqual({ decisions: { [userId]: 'disabled' } });
  });

  it('marks unknown users as missing', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([]) };
    const controller = new EmailPreferencesController(dataSource as never);

    await expect(
      controller.emailPreferences('application', { userIds: [userId] }),
    ).resolves.toEqual({
      decisions: { [userId]: 'user_missing' },
    });
  });

  it('rejects invalid or oversized batches', async () => {
    const controller = new EmailPreferencesController({
      query: jest.fn(),
    } as never);

    await expect(
      controller.emailPreferences('application', { userIds: ['bad'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.emailPreferences('application', {
        userIds: Array.from({ length: 21 }, () => userId),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown notification events', async () => {
    const controller = new EmailPreferencesController({
      query: jest.fn(),
    } as never);

    await expect(
      controller.emailPreferences('password_reset', { userIds: [userId] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
