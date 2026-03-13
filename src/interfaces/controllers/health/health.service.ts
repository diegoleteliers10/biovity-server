import { Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  database: HealthCheckResponse;
}

export interface HealthCheckResponse {
  status: 'up' | 'down' | 'unknown';
  message?: string;
  error?: string;
}

@Injectable()
export class HealthService {
  constructor(
    @Optional()
    private readonly dataSource: DataSource,
  ) {}

  async check(): Promise<{
    status: string;
    timestamp: string;
    checks: HealthCheckResult;
  }> {
    const checks = await this.performHealthChecks();

    const isHealthy = Object.values(checks).every(check => check.status === 'up');

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async checkDatabase(): Promise<HealthCheckResponse> {
    if (!this.dataSource) {
      return {
        status: 'unknown',
        message: 'Database connection not configured or not available',
      };
    }

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        message: 'Database connection is healthy',
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async performHealthChecks(): Promise<HealthCheckResult> {
    const database = await this.checkDatabase();

    return {
      database,
    };
  }
}
