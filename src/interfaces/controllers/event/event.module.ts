import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventController } from './event.controller';
import { EventService } from '../../../core/services/event.service';
import { EventRepositoryImpl } from '../../../infrastructure/persistence/event.repository.impl';
import { EventEntity, EventNoteEntity } from '../../../infrastructure/database/orm';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity, EventNoteEntity]),
  ],
  controllers: [EventController],
  providers: [
    EventService,
    {
      provide: 'IEventRepository',
      useClass: EventRepositoryImpl,
    },
  ],
  exports: [EventService],
})
export class EventModule {}
