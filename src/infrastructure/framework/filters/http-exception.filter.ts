import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../../../shared/errors/domain.exception';

// Type definitions for better type safety
interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  message?: string;
  value?: unknown;
}

interface DatabaseError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  message?: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp?: string;
  path?: string;
  method?: string;
  name?: string;
  details?: unknown;
  errors?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  stack?: string;
}

/**
 * Global HTTP exception filter that catches and formats all exceptions
 * Provides consistent error response format across the application
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error for debugging
    this.logError(exception, request);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Build standardized error response based on exception type
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle Domain Exceptions (our custom exceptions)
    if (exception instanceof DomainException) {
      const domainResponse = exception.toJSON();
      return {
        ...domainResponse,
        timestamp: domainResponse.timestamp as string,
        path: domainResponse.path as string,
        method,
      } as ErrorResponse;
    }

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        statusCode: status,
        message: this.extractMessage(exceptionResponse),
        timestamp,
        path,
        method,
        name: exception.constructor.name,
        ...(typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? { details: exceptionResponse }
          : {}),
      };
    }

    // Handle Validation Errors (class-validator)
    if (this.isValidationError(exception)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        timestamp,
        path,
        method,
        name: 'ValidationError',
        errors: this.formatValidationErrors(exception.message),
      };
    }

    // Handle TypeORM/Database errors
    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception, timestamp, path, method);
    }

    // Handle generic errors
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : exception.message,
        timestamp,
        path,
        method,
        name: exception.constructor.name,
        ...(process.env.NODE_ENV !== 'production' && {
          stack: exception.stack,
        }),
      };
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp,
      path,
      method,
      name: 'UnknownError',
    };
  }

  /**
   * Extract message from exception response
   */
  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, unknown>;

      // Handle class-validator error format
      if (response.message && Array.isArray(response.message)) {
        return response.message.join(', ');
      }

      // Handle standard error object
      if (response.message && typeof response.message === 'string') {
        return response.message;
      }

      // Handle error array
      if (Array.isArray(response.message)) {
        return response.message.join(', ');
      }
    }

    return 'An error occurred';
  }

  /**
   * Check if exception is a validation error from class-validator
   */
  private isValidationError(
    exception: unknown,
  ): exception is { message: ValidationError[]; statusCode: number } {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'message' in exception &&
      Array.isArray((exception as Record<string, unknown>).message) &&
      'statusCode' in exception &&
      (exception as Record<string, unknown>).statusCode === 400
    );
  }

  /**
   * Format validation errors for consistent response
   */
  private formatValidationErrors(exception: ValidationError[]): Array<{
    field: string;
    message: string;
    value?: unknown;
  }> {
    return exception.map(error => ({
      field: error.property || 'unknown',
      message: error.constraints
        ? Object.values(error.constraints).join(', ')
        : error.message || 'Validation failed',
      value: error.value,
    }));
  }

  /**
   * Check if exception is a database error
   */
  private isDatabaseError(exception: unknown): exception is DatabaseError {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      ('code' in exception || 'errno' in exception || 'sqlMessage' in exception)
    );
  }

  /**
   * Handle database-specific errors
   */
  private handleDatabaseError(
    exception: DatabaseError,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    // Handle unique constraint violations
    if (exception.code === 'ER_DUP_ENTRY' || exception.code === '23505') {
      const message = this.extractDuplicateEntryMessage(exception);
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        timestamp,
        path,
        method,
        name: 'DuplicateEntryError',
        details:
          process.env.NODE_ENV !== 'production' ? { original: message } : {},
      };
    }

    // Handle foreign key constraint violations
    if (
      exception.code === 'ER_NO_REFERENCED_ROW_2' ||
      exception.code === '23503'
    ) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referenced resource does not exist',
        timestamp,
        path,
        method,
        name: 'ForeignKeyConstraintError',
      };
    }

    // Handle connection errors
    if (exception.code === 'ECONNREFUSED' || exception.code === 'ETIMEDOUT') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection error',
        timestamp,
        path,
        method,
        name: 'DatabaseConnectionError',
      };
    }

    // Handle generic database errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred',
      timestamp,
      path,
      method,
      name: 'DatabaseError',
      ...(process.env.NODE_ENV !== 'production' && {
        details: {
          code: exception.code,
          message: exception.message,
        },
      }),
    };
  }

  /**
   * Extract meaningful message from duplicate entry error
   */
  private extractDuplicateEntryMessage(exception: DatabaseError): string {
    if (exception.sqlMessage) {
      // Extract field name from MySQL error message
      const match = exception.sqlMessage.match(/for key '(.+?)'/);
      if (match && match[1]) {
        return `Duplicate entry for ${match[1]}`;
      }
    }

    return 'Duplicate entry';
  }

  /**
   * Log error with appropriate level based on status code
   */
  private logError(exception: unknown, request: Request): void {
    const statusCode = this.getStatusCode(exception);
    const message = this.getErrorMessage(exception);
    const context = `${request.method} ${request.url}`;

    if (statusCode >= 500) {
      // Server errors - log as error
      this.logger.error(
        `${context} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(`${context} - ${message}`);
    } else {
      // Other errors - log as debug
      this.logger.debug(`${context} - ${message}`);
    }
  }

  /**
   * Get status code from exception
   */
  private getStatusCode(exception: unknown): number {
    if (exception instanceof DomainException) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (this.isValidationError(exception)) {
      return HttpStatus.BAD_REQUEST;
    }

    if (this.isDatabaseError(exception)) {
      if (exception.code === 'ER_DUP_ENTRY' || exception.code === '23505') {
        return HttpStatus.CONFLICT;
      }
      if (
        exception.code === 'ER_NO_REFERENCED_ROW_2' ||
        exception.code === '23503'
      ) {
        return HttpStatus.BAD_REQUEST;
      }
      if (exception.code === 'ECONNREFUSED' || exception.code === 'ETIMEDOUT') {
        return HttpStatus.SERVICE_UNAVAILABLE;
      }
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Get error message from exception
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof DomainException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      return this.extractMessage(exception.getResponse());
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unknown error';
  }
}
