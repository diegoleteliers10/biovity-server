import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  path: string;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | PaginatedApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{ url: string }>();
    const url = request.url;

    return next.handle().pipe(
      map(data => {
        // Check if data is a paginated response (has data array + pagination info)
        const hasData =
          data !== null && typeof data === 'object' && 'data' in data;
        const hasTotal =
          hasData && 'total' in (data as Record<string, unknown>);

        const isPaginated =
          hasData &&
          hasTotal &&
          Array.isArray((data as Record<string, unknown>).data);

        if (isPaginated) {
          const d = data as Record<string, unknown>;
          return {
            data: d.data as T[],
            total: Number(d.total),
            page: Number(d.page),
            limit: Number(d.limit),
            totalPages: Number(d.totalPages),
            timestamp: new Date().toISOString(),
            path: url,
          };
        }

        // Default: wrap in standard response
        return {
          data: data as T,
          timestamp: new Date().toISOString(),
          path: url,
        };
      }),
    );
  }
}
