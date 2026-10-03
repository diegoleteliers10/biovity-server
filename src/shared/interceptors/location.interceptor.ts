import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * REST convention: a 201 Created response points to the new resource through
 * the Location header. Applies to every POST whose response body carries an
 * id; other requests pass through untouched.
 */
@Injectable()
export class LocationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (request.method !== 'POST') return next.handle();

    return next.handle().pipe(
      tap(body => {
        if (response.statusCode !== 201) return;
        const payload =
          body && typeof body === 'object' && 'data' in body ? body.data : body;
        const id =
          payload && typeof payload === 'object' && 'id' in payload
            ? payload.id
            : undefined;
        if (typeof id !== 'string' || id.length === 0) return;
        response.setHeader(
          'Location',
          `${request.baseUrl}${request.path}/${id}`,
        );
      }),
    );
  }
}
