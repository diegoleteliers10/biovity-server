import { LoggerService, Injectable, Optional, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface WideEvent {
  // HTTP Context (High Cardinality)
  method: string;
  path: string;
  query?: Record<string, unknown>;
  requestId: string;
  correlationId: string;

  // Environment Characteristics
  version: string;
  commitHash: string;
  region?: string;
  instanceId?: string;
  environment: string;

  // Request Details
  userAgent?: string;
  ip?: string;
  contentLength?: number;

  // Response Details
  statusCode?: number;
  outcome?: 'success' | 'error';
  error?: {
    message: string;
    type: string;
    stack?: string;
  };

  // Timing
  timestamp: string;
  durationMs?: number;

  // Business Context (to be added by handlers)
  user?: {
    id: string;
    subscription?: string;
  };
  [key: string]: unknown;
}

@Injectable()
export class AppLogger implements LoggerService {
  private context?: string;
  private correlationId?: string;
  private requestId?: string;
  private businessContext: Record<string, unknown> = {};

  // Environment characteristics
  private readonly version: string;
  private readonly commitHash: string;
  private readonly environment: string;
  private readonly region?: string;
  private readonly instanceId?: string;

  constructor(
    @Optional() @Inject('CONTEXT') context?: string,
    @Optional() @Inject('APP_VERSION') version?: string,
    @Optional() @Inject('COMMIT_HASH') commitHash?: string,
    @Optional() @Inject('ENVIRONMENT') environment?: string,
    @Optional() @Inject('REGION') region?: string,
    @Optional() @Inject('INSTANCE_ID') instanceId?: string,
  ) {
    this.context = context;
    this.version = version || process.env.APP_VERSION || 'unknown';
    this.commitHash = commitHash || process.env.COMMIT_HASH || 'unknown';
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.region = region || process.env.REGION;
    this.instanceId = instanceId || process.env.INSTANCE_ID;
  }

  setContext(context: string): void {
    this.context = context;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  addBusinessContext(key: string, value: unknown): void {
    this.businessContext[key] = value;
  }

  addUserContext(userId: string, subscription?: string): void {
    this.businessContext['user'] = { id: userId, subscription };
  }

  clearBusinessContext(): void {
    this.businessContext = {};
  }

  /**
   * Creates a wide event object with all context
   */
  private createWideEvent(
    method: string,
    path: string,
    request: Request,
  ): WideEvent {
    return {
      // HTTP Context
      method,
      path,
      query: request.query as Record<string, unknown>,
      requestId: this.requestId || randomUUID(),
      correlationId: this.correlationId || '',

      // Environment Characteristics
      version: this.version,
      commitHash: this.commitHash,
      environment: this.environment,
      ...(this.region && { region: this.region }),
      ...(this.instanceId && { instanceId: this.instanceId }),

      // Request Details
      userAgent: request.headers['user-agent'],
      ip:
        (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        request.ip,
      contentLength:
        parseInt(request.headers['content-length'] || '0', 10) || undefined,

      // Timestamp
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Logs a wide event - the core of the logging strategy
   * Emits one structured JSON event per request
   */
  logWideEvent(wideEvent: WideEvent): void {
    console.log(JSON.stringify(wideEvent));
  }

  /**
   * Start request tracking - call at beginning of request
   * Returns a function to complete the wide event
   */
  startRequest(
    method: string,
    path: string,
    request: Request,
  ): (
    outcome: 'success' | 'error',
    statusCode?: number,
    error?: Error,
  ) => void {
    const startTime = Date.now();
    const wideEvent = this.createWideEvent(method, path, request);

    // Merge business context
    Object.assign(wideEvent, this.businessContext);

    return (
      outcome: 'success' | 'error',
      statusCode?: number,
      error?: Error,
    ) => {
      wideEvent.durationMs = Date.now() - startTime;
      wideEvent.outcome = outcome;
      wideEvent.statusCode = statusCode;

      if (error) {
        wideEvent.error = {
          message: error.message,
          type: error.name,
          stack: error.stack,
        };
      }

      this.logWideEvent(wideEvent);
    };
  }

  // Standard logger methods - use structured JSON
  log(message: string, context?: string): void {
    this.logStructured('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logStructured('error', message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.logStructured('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.logStructured('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.logStructured('verbose', message, context);
  }

  private logStructured(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
    trace?: string,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || this.context || 'App',
      requestId: this.requestId,
      correlationId: this.correlationId,
      ...(trace && { trace }),
      ...(Object.keys(this.businessContext).length > 0 && {
        business: this.businessContext,
      }),
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  // Legacy methods for backward compatibility
  logRequest(request: Request, extraContext?: LogContext): void {
    this.requestId = randomUUID();
    this.correlationId =
      (request.headers['x-correlation-id'] as string) || this.requestId;

    const wideEvent = this.createWideEvent(
      request.method,
      request.url,
      request,
    );
    if (extraContext) {
      Object.assign(wideEvent, extraContext);
    }

    this.logWideEvent(wideEvent);
  }

  logResponse(
    request: Request,
    statusCode: number,
    duration: number,
    extraContext?: LogContext,
  ): void {
    const wideEvent = this.createWideEvent(
      request.method,
      request.url,
      request,
    );
    wideEvent.statusCode = statusCode;
    wideEvent.durationMs = duration;
    wideEvent.outcome = statusCode >= 400 ? 'error' : 'success';

    if (extraContext) {
      Object.assign(wideEvent, extraContext);
    }

    this.logWideEvent(wideEvent);
  }
}

export const LOGGER_TOKEN = 'APP_LOGGER';
