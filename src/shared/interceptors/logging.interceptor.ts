import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const headers = request.headers;

    // Get or generate correlation ID
    const correlationId =
      (headers['x-correlation-id'] as string) || randomUUID();
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`--> ${method} ${url} [corr:${correlationId}]`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `<-- ${method} ${url} ${statusCode} ${duration}ms [corr:${correlationId}]`,
          );
        },
        error: (error: { status?: number; stack?: string }) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.logger.error(
            `<-- ${method} ${url} ${statusCode} ${duration}ms [corr:${correlationId}]`,
            error.stack,
          );
        },
      }),
    );
  }
}
