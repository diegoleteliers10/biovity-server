import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';
import { ErrorFormatInterceptor } from './error-format.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';
import { AppLogger } from '../logger/logger.service';

@Module({
  providers: [
    AppLogger,
    LoggingInterceptor,
    TransformInterceptor,
    ErrorFormatInterceptor,
    TimeoutInterceptor,
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
    AppLogger,
  ],
})
export class InterceptorsModule {}
