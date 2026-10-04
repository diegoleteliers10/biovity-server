import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChatEntity,
  MessageEntity,
} from '../../../infrastructure/database/orm';
import { ChatController } from './chat.controller';
import { ChatService } from '../../../core/services/chat.service';
import { ChatRepositoryImpl } from '../../../infrastructure/persistence/chat.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([ChatEntity, MessageEntity])],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: 'IChatRepository',
      useClass: ChatRepositoryImpl,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
