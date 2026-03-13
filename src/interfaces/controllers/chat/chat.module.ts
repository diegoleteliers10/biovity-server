import { Module } from '@nestjs/common';
import { ConditionalDatabaseModule } from '../../../infrastructure/config/conditional-database.module';
import { ChatEntity } from '../../../infrastructure/database/orm';
import { ChatController } from './chat.controller';
import { ChatService } from '../../../core/services/chat.service';
import { ChatRepositoryImpl } from '../../../infrastructure/persistence/chat.repository.impl';

@Module({
  imports: [ConditionalDatabaseModule.forFeature([ChatEntity])],
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
