import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/better-auth-session.service';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
};

type UnreadCountRow = { count: string };

type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

const MAX_PAGE_SIZE = 100;

function toNotificationResponse(row: NotificationRow): NotificationResponse {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? undefined,
    link: row.link ?? undefined,
    data: row.data ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at.toISOString(),
  };
}

@Controller('notifications')
export class NotificationController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async list(
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    if (!requester) {
      return Promise.reject(new ForbiddenException('Se requiere una sesión.'));
    }

    const pageSize = Math.min(
      Math.max(Number.parseInt(limit ?? '', 10) || 50, 1),
      MAX_PAGE_SIZE,
    );
    const rows = await this.dataSource.query<NotificationRow[]>(
      `SELECT id, user_id, type, title, body, link, data, is_read, read_at, created_at
       FROM notification
       WHERE user_id = $1 AND ($2::boolean = false OR is_read = false)
       ORDER BY created_at DESC
       LIMIT $3`,
      [requester.id, unreadOnly === 'true', pageSize],
    );
    const unreadCount = await this.dataSource.query<UnreadCountRow[]>(
      `SELECT COUNT(*)::text AS count
       FROM notification
       WHERE user_id = $1 AND is_read = false`,
      [requester.id],
    );

    return {
      data: rows.map(toNotificationResponse),
      unreadCount: Number(unreadCount[0]?.count ?? 0),
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester) {
      return Promise.reject(new ForbiddenException('Se requiere una sesión.'));
    }

    await this.dataSource.query(
      `UPDATE notification
       SET is_read = true, read_at = COALESCE(read_at, now())
       WHERE id = $1 AND user_id = $2`,
      [id, requester.id],
    );
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester) {
      return Promise.reject(new ForbiddenException('Se requiere una sesión.'));
    }

    await this.dataSource.query(
      `UPDATE notification
       SET is_read = true, read_at = COALESCE(read_at, now())
       WHERE user_id = $1 AND is_read = false`,
      [requester.id],
    );
  }
}
