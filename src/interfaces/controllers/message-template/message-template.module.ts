import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplateEntity } from '../../../infrastructure/database/orm/message-template.entity';
import { MessageTemplateController } from './message-template.controller';
import { MessageTemplateService } from '../../../core/services/message-template.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageTemplateEntity])],
  controllers: [MessageTemplateController],
  providers: [MessageTemplateService],
  exports: [MessageTemplateService],
})
export class MessageTemplateModule {}
