import { Module } from '@nestjs/common';
import { HealthController } from './interfaces/controllers/health.controller';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
