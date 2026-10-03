import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class ErrorFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url: string }>();

    return next.handle().pipe(
      catchError((error: unknown) => {
        const timestamp = new Date().toISOString();
        const path = request.url;

        if (error instanceof HttpException) {
          const response = error.getResponse();
          const status = error.getStatus();

          const message =
            typeof response === 'object' && response !== null
              ? (response as Record<string, unknown>).message
              : error.message;

          const errorResponse: ApiError = {
            statusCode: status,
            message: Array.isArray(message)
              ? message.join(', ')
              : String(message),
            error: HttpStatus[status] || 'Error',
            timestamp,
            path,
          };

          return throwError(() => new HttpException(errorResponse, status));
        }

        // Handle unknown errors
        const errorResponse: ApiError = {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'InternalServerError',
          timestamp,
          path,
        };

        return throwError(
          () =>
            new HttpException(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR),
        );
      }),
    );
  }
}
