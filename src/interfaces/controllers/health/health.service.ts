import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<{ status: string; timestamp: string; checks: HealthCheckResult }> {
    const checks = await this.performHealthChecks();

    const isHealthy = Object.values(checks).every((check) => check.status === 'up');

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
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        error: error.message,
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

export interface HealthCheckResult {
  database: HealthCheckResponse;
}

export interface HealthCheckResponse {
  status: 'up' | 'down';
  message?: string;
  error?: string;
}
