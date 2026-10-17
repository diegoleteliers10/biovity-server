import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
@Injectable()
export class EmailOutboxDispatcherService {
  private readonly logger = new Logger(EmailOutboxDispatcherService.name);

  @Cron(CronExpression.EVERY_5_MINUTES, {
    disabled: process.env.VERCEL === '1',
  })
  async dispatch(): Promise<void> {
    const url = process.env.EMAIL_OUTBOX_DISPATCH_URL;
    const secret = process.env.EMAIL_OUTBOX_SECRET;
    if (!url || !secret) {
      const error = new Error('Email outbox dispatch is not configured');
      this.logger.error(error.message);
      return Promise.reject(error);
    }

    const result = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(55_000),
    }).then(
      response => ({ kind: 'response' as const, response }),
      (error: unknown) => ({ kind: 'error' as const, error }),
    );

    if (result.kind === 'error') {
      const error = new Error(
        `Email outbox dispatch request failed: ${String(result.error)}`,
      );
      this.logger.error(error.message);
      return Promise.reject(error);
    }
    if (!result.response.ok) {
      const error = new Error(
        `Email outbox dispatch returned HTTP ${result.response.status}`,
      );
      this.logger.error(error.message);
      return Promise.reject(error);
    }
  }
}
