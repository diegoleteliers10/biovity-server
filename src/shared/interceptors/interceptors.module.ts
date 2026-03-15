import { Global, Module } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';
import { CacheInterceptor } from './cache.interceptor';

@Global()
@Module({
  providers: [LoggingInterceptor, TransformInterceptor, CacheInterceptor],
  exports: [LoggingInterceptor, TransformInterceptor, CacheInterceptor],
})
export class InterceptorsModule {}
