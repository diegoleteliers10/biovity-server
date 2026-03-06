import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from '../../../infrastructure/database/orm';
import { MessageController } from './message.controller';
import { MessageService } from '../../../core/services/message.service';
import { MessageRepositoryImpl } from '../../../infrastructure/persistence/message.repository.impl';
import { ChatRepositoryImpl } from '../../../infrastructure/persistence/chat.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MessageController],
  providers: [
    MessageService,
    {
      provide: 'IMessageRepository',
      useClass: MessageRepositoryImpl,
    },
    {
      provide: 'IChatRepository',
      useClass: ChatRepositoryImpl,
    },
  ],
  exports: [MessageService],
})
export class MessageModule {}
