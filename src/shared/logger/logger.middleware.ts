import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppLogger, LOGGER_TOKEN } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    this.logger.setCorrelationId(correlationId);
    this.logger.logRequest(req);

    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.logResponse(req, res.statusCode, duration);
    });

    next();
  }
}
