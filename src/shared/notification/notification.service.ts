import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { LOGGER_TOKEN } from '../logger/logger.service';
import { CreateNotificationInput } from './notification.types';

const DEDUP_WINDOW = '1 hour';

@Injectable()
export class NotificationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    try {
      const dataJson = JSON.stringify(this.mergeDedupKey(input));
      if (input.dedupKey) {
        await this.dataSource.query(
          `INSERT INTO notification (user_id, type, title, body, link, data)
           SELECT $1, $2, $3, $4, $5, $6
           WHERE NOT EXISTS (
             SELECT 1 FROM notification
             WHERE user_id = $1
               AND type = $2
               AND data->>'dedupKey' = $7
               AND created_at > now() - ($8)::interval
           )`,
          [
            input.userId,
            input.type,
            input.title,
            input.body ?? null,
            input.link ?? null,
            dataJson,
            input.dedupKey,
            DEDUP_WINDOW,
          ],
        );
        return;
      }
      await this.dataSource.query(
        `INSERT INTO notification (user_id, type, title, body, link, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId,
          input.type,
          input.title,
          input.body ?? null,
          input.link ?? null,
          dataJson,
        ],
      );
    } catch (error) {
      // EXCEPTION. REASON: notification creation is a best-effort, post-commit
      // side-effect. It must never break the primary domain operation that
      // already succeeded. The insert is performed after the domain change is
      // confirmed, so swallowing here cannot produce orphan notifications.
      this.logger.error(
        `notification insert failed: ${(error as Error).message}`,
        (error as Error).stack,
        'NotificationService',
      );
    }
  }

  async createMany(inputs: readonly CreateNotificationInput[]): Promise<void> {
    await Promise.all(inputs.map(input => this.create(input)));
  }

  private mergeDedupKey(
    input: CreateNotificationInput,
  ): Record<string, unknown> {
    if (!input.dedupKey) {
      return input.data ?? {};
    }
    return { ...(input.data ?? {}), dedupKey: input.dedupKey };
  }
}
