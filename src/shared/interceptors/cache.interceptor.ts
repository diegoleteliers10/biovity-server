import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';

export interface CacheOptions {
  ttl?: number;
  key?: string;
}

interface CacheEntry {
  data: unknown;
  expiry: number;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTtl = 60;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap(data => {
        const ttl = this.defaultTtl * 1000;
        this.cache.set(cacheKey, {
          data,
          expiry: Date.now() + ttl,
        });

        this.cleanup();
      }),
    );
  }

  private getCacheKey(request: Request): string {
    const url = request.url;
    const query = request.query;
    const params = new URLSearchParams();

    for (const key of Object.keys(query).sort()) {
      const val = query[key];
      if (val === undefined || val === null) {
        params.append(key, '');
      } else if (Array.isArray(val)) {
        for (const arrayVal of val) {
          const safeVal =
            typeof arrayVal === 'object'
              ? JSON.stringify(arrayVal)
              : String(arrayVal);
          params.append(key, safeVal);
        }
      } else {
        const safeVal =
          typeof val === 'object' ? JSON.stringify(val) : String(val);
        params.append(key, safeVal);
      }
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
