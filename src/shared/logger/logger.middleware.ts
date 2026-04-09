import { Injectable, NestMiddleware, Inject, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppLogger, WideEvent, LOGGER_TOKEN } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Optional() @Inject(LOGGER_TOKEN) private readonly logger: AppLogger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;

    this.logger.setRequestId(requestId);
    this.logger.setCorrelationId(correlationId);

    const wideEvent = this.createWideEvent(req);
    const startTime = Date.now();

    // Clear business context from previous request
    this.logger.clearBusinessContext();

    // Add business context if user is authenticated (depends on your auth setup)
    // Example: this.logger.addUserContext(user.id, user.subscription);

    // Log request start
    this.logger.logWideEvent(wideEvent);

    // Capture response
    res.on('finish', () => {
      const completedEvent: WideEvent = {
        ...wideEvent,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
        outcome: res.statusCode >= 400 ? 'error' : 'success',
      };

      // Add error info if response indicates failure
      if (res.statusCode >= 400) {
        completedEvent.error = {
          message: `HTTP ${res.statusCode}`,
          type: 'HttpError',
        };
      }

      this.logger.logWideEvent(completedEvent);
    });

    next();
  }

  private createWideEvent(req: Request): WideEvent {
    const requestId = randomUUID();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;

    return {
      // HTTP Context (High Cardinality)
      method: req.method,
      path: req.url,
      query: req.query as Record<string, unknown>,
      requestId,
      correlationId,

      // Environment Characteristics (from logger defaults)
      version: process.env.APP_VERSION || 'unknown',
      commitHash: process.env.COMMIT_HASH || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ...(process.env.REGION && { region: process.env.REGION }),
      ...(process.env.INSTANCE_ID && { instanceId: process.env.INSTANCE_ID }),

      // Request Details
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      contentLength:
        parseInt(req.headers['content-length'] || '0', 10) || undefined,

      // Timestamp
      timestamp: new Date().toISOString(),
    };
  }
}
