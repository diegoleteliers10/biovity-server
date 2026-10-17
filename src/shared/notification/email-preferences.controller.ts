import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InternalSecretGuard } from '../guards/internal-secret.guard';
import { Public } from '../decorators/public.decorator';

type PreferenceRow = {
  id: string;
  notification_preferences: unknown;
};

type RequestBody = { userIds: unknown };
type Decision = 'enabled' | 'disabled' | 'user_missing';
const NOTIFICATION_EVENTS = [
  'application',
  'interview',
  'message',
  'job_alert',
  'system',
] as const;
type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNotificationEvent(value: string): value is NotificationEvent {
  return NOTIFICATION_EVENTS.includes(value as NotificationEvent);
}

function isEmailEnabled(
  preferences: unknown,
  event: NotificationEvent,
): boolean {
  if (!isRecord(preferences)) return true;
  const channels = isRecord(preferences.channels)
    ? preferences.channels
    : undefined;
  const events = isRecord(preferences.events) ? preferences.events : undefined;
  return channels?.email !== false && events?.[event] !== false;
}

@Controller('internal/email-preferences')
@Public()
@UseGuards(InternalSecretGuard)
export class EmailPreferencesController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Post(':event')
  async emailPreferences(
    @Param('event') event: string,
    @Body() body: RequestBody,
  ): Promise<{
    decisions: Record<string, Decision>;
  }> {
    if (!isNotificationEvent(event)) {
      return Promise.reject(new BadRequestException('event is not supported'));
    }
    if (
      !Array.isArray(body?.userIds) ||
      body.userIds.length < 1 ||
      body.userIds.length > 20 ||
      !body.userIds.every(isUserId)
    ) {
      return Promise.reject(
        new BadRequestException('userIds must contain 1 to 20 UUIDs'),
      );
    }

    const userIds = [...new Set(body.userIds)];
    const rows = await this.dataSource.query<PreferenceRow[]>(
      'SELECT id, notification_preferences FROM "user" WHERE id = ANY($1::uuid[])',
      [userIds],
    );
    const preferencesById = new Map(
      rows.map(row => [row.id, row.notification_preferences]),
    );
    const decisions = Object.fromEntries(
      userIds.map(userId => {
        const preferences = preferencesById.get(userId);
        const decision: Decision = !preferencesById.has(userId)
          ? 'user_missing'
          : isEmailEnabled(preferences, event)
            ? 'enabled'
            : 'disabled';
        return [userId, decision];
      }),
    );

    return { decisions };
  }
}
