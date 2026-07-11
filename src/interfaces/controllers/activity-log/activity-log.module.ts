import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogEntity } from '../../../infrastructure/database/orm/activity-log.entity';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from '../../../core/services/activity-log.service';

@Global() // Make it Global so other modules can inject ActivityLogService to log actions easily
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogEntity])],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
