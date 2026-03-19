import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';
import { ErrorFormatInterceptor } from './error-format.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';
import { CacheInterceptor } from './cache.interceptor';
import { AppLogger } from '../logger/logger.service';

@Global()
@Module({
  providers: [
    AppLogger,
    LoggingInterceptor,
    TransformInterceptor,
    ErrorFormatInterceptor,
    TimeoutInterceptor,
    CacheInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorFormatInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
  exports: [
    LoggingInterceptor,
    TransformInterceptor,
    ErrorFormatInterceptor,
    TimeoutInterceptor,
    CacheInterceptor,
    AppLogger,
  ],
})
export class InterceptorsModule {}
