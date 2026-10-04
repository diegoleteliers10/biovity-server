import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<{
    status: string;
    timestamp: string;
    checks: HealthCheckResult;
  }> {
    const checks = await this.performHealthChecks();

    const isHealthy = Object.values(checks).every(
      (check: HealthCheckResponse) => check.status === 'up',
    );

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async checkDatabase(): Promise<HealthCheckResponse> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        message: 'Database connection is healthy',
      };
    } catch {
      return {
        status: 'down',
        message: 'Database connection failed',
        error: 'Database connection failed',
      };
    }
  }

  private async performHealthChecks(): Promise<HealthCheckResult> {
    const database = await this.checkDatabase();
    const realtime = await this.checkRealtimeOutbox();

    return {
      database,
      realtime,
    };
  }

  /**
   * Reports the realtime outbox backlog. Status stays `up` while the pipeline
   * is reachable: a dead-lettered event is a delivery failure, not an outage,
   * and must not flip the aggregate to `degraded` for uptime monitors. The
   * counts are the alerting signal.
   */
  private async checkRealtimeOutbox(): Promise<HealthCheckResponse> {
    try {
      const result = await this.dataSource.query<
        Array<{
          pending: string;
          dead_lettered: string;
          oldest_pending_age_seconds: string | null;
        }>
      >(
        `SELECT
           count(*) FILTER (WHERE delivered_at IS NULL AND dead_lettered_at IS NULL) AS pending,
           count(*) FILTER (WHERE dead_lettered_at IS NOT NULL) AS dead_lettered,
           EXTRACT(EPOCH FROM now() - min(created_at) FILTER (
             WHERE delivered_at IS NULL AND dead_lettered_at IS NULL
           )) AS oldest_pending_age_seconds
         FROM private.realtime_outbox`,
      );
      const row = result[0];
      const pending = Number(row?.pending ?? 0);
      const deadLettered = Number(row?.dead_lettered ?? 0);
      const oldest = row?.oldest_pending_age_seconds;

      const parts = [`pending=${pending}`, `dead_lettered=${deadLettered}`];
      if (oldest != null && pending > 0) {
        parts.push(`oldest_pending_seconds=${Math.round(Number(oldest))}`);
      }

      return {
        status: 'up',
        message: parts.join(' '),
      };
    } catch (error) {
      // Postgres undefined_table. The realtime outbox is provisioned by the
      // database functions, not by this repo, so an environment that never ran
      // them has no table. That is a missing feature, not an outage, and must
      // not flip the aggregate for an uptime monitor.
      if ((error as { code?: string }).code === '42P01') {
        return {
          status: 'up',
          message: 'Realtime outbox is not provisioned in this database',
        };
      }
      return {
        status: 'down',
        message: 'Realtime outbox could not be read',
        error: (error as Error).message,
      };
    }
  }
}

export interface HealthCheckResult {
  database: HealthCheckResponse;
  realtime: HealthCheckResponse;
}

export interface HealthCheckResponse {
  status: 'up' | 'down';
  message?: string;
  error?: string;
}
