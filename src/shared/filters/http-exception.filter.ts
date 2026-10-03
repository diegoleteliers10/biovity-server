import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  requestId: string;
}

function baseOf(exception: HttpException): {
  message?: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
} {
  const response = exception.getResponse();
  if (typeof response === 'string') return { message: response };
  if (response && typeof response === 'object') {
    return response;
  }
  return {};
}

const STATUS_ERROR_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

function errorCodeFor(status: number): string {
  return STATUS_ERROR_CODES[status] ?? `HTTP_${status}`;
}

/**
 * Formats every HttpException — including the DomainException family and
 * ValidationPipe rejections — into the shared error envelope. Registered
 * before AllExceptionsFilter so specific matches win.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    const base = baseOf(exception);
    const body: ErrorResponseBody = {
      statusCode: exception.getStatus(),
      message: base.message ?? exception.message,
      error: errorCodeFor(exception.getStatus()),
      path: base.path ?? request.url,
      timestamp: base.timestamp ?? new Date().toISOString(),
      requestId: request.requestId ?? 'unknown',
    };

    if (exception.getStatus() >= 500) {
      this.logger.error(
        `${exception.name} on ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(exception.getStatus()).json(body);
  }
}

/**
 * Last-resort filter for anything that is not an HttpException. Logs the full
 * error and answers with a generic 500 so internal details never leak.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const body: ErrorResponseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId ?? 'unknown',
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
