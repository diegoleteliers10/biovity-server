import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobTemplateEntity } from '../../../infrastructure/database/orm/job-template.entity';
import { JobTemplateController } from './job-template.controller';
import { JobTemplateService } from '../../../core/services/job-template.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobTemplateEntity])],
  controllers: [JobTemplateController],
  providers: [JobTemplateService],
  exports: [JobTemplateService],
})
export class JobTemplateModule {}
