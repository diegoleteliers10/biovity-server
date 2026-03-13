import { Module } from '@nestjs/common';
import { ConditionalDatabaseModule } from '../../../infrastructure/config/conditional-database.module';
import { MessageEntity, ChatEntity } from '../../../infrastructure/database/orm';
import { MessageController } from './message.controller';
import { MessageService } from '../../../core/services/message.service';
import { MessageRepositoryImpl } from '../../../infrastructure/persistence/message.repository.impl';
import { ChatRepositoryImpl } from '../../../infrastructure/persistence/chat.repository.impl';

@Module({
  imports: [ConditionalDatabaseModule.forFeature([MessageEntity, ChatEntity])],
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
