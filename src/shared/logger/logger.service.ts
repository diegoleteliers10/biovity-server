import {
  Logger,
  LoggerService,
  Injectable,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request } from 'express';

export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

@Injectable()
export class AppLogger implements LoggerService {
  private context?: string;
  private correlationId?: string;

  constructor(@Optional() @Inject('CONTEXT') context?: string) {
    this.context = context;
  }

  setContext(context: string): void {
    this.context = context;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  log(message: string, context?: string): void {
    const ctx = context || this.context || 'App';
    const logger = new Logger(ctx);
    logger.log(this.formatMessage(message));
  }

  error(message: string, trace?: string, context?: string): void {
    const ctx = context || this.context || 'App';
    const logger = new Logger(ctx);
    logger.error(this.formatMessage(message), trace);
  }

  warn(message: string, context?: string): void {
    const ctx = context || this.context || 'App';
    const logger = new Logger(ctx);
    logger.warn(this.formatMessage(message));
  }

  debug(message: string, context?: string): void {
    const ctx = context || this.context || 'App';
    const logger = new Logger(ctx);
    logger.debug(this.formatMessage(message));
  }

  verbose(message: string, context?: string): void {
    const ctx = context || this.context || 'App';
    const logger = new Logger(ctx);
    logger.verbose(this.formatMessage(message));
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    const correlation = this.correlationId
      ? ` [corr:${this.correlationId}]`
      : '';
    return `${timestamp}${correlation} ${message}`;
  }

  logRequest(request: Request): void {
    const logger = new Logger('HTTP');
    const message = `${request.method} ${request.url}`;
    logger.log(message);
  }

  logResponse(request: Request, statusCode: number, duration: number): void {
    const logger = new Logger('HTTP');
    const message = `${request.method} ${request.url} ${statusCode} ${duration}ms`;

    if (statusCode >= 400) {
      logger.error(message);
    } else {
      logger.log(message);
    }
  }
}

export const LOGGER_TOKEN = 'APP_LOGGER';
