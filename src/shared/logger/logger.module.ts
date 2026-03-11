import { Module, Global, Provider } from '@nestjs/common';
import { AppLogger, LOGGER_TOKEN } from './logger.service';

const loggerProvider: Provider = {
  provide: LOGGER_TOKEN,
  useClass: AppLogger,
};

@Global()
@Module({
  providers: [loggerProvider],
  exports: [loggerProvider],
})
export class LoggerModule {}
