import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, route } = request;
    const handlerName = route?.path || 'HTTP';
    const startTime = Date.now();

    // Log request
    this.logger.log(`${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          this.logger.log(`${method} ${url} ${response.statusCode} - ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`${method} ${url} - ${error.message} - ${duration}ms`, error.stack);
        },
      }),
    );
  }
}
