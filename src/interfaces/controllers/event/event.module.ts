import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventController } from './event.controller';
import { EventService } from '../../../core/services/event.service';
import { EventRepositoryImpl } from '../../../infrastructure/persistence/event.repository.impl';
import { EventParticipantRepositoryImpl } from '../../../infrastructure/persistence/event-participant.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import {
  EventEntity,
  EventNoteEntity,
  EventParticipantEntity,
  UserEntity,
} from '../../../infrastructure/database/orm';
import { EVENT_PARTICIPANT_REPOSITORY } from '../../../core/repositories/event-participant.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventNoteEntity,
      EventParticipantEntity,
      UserEntity,
    ]),
  ],
  controllers: [EventController],
  providers: [
    EventService,
    {
      provide: 'IEventRepository',
      useClass: EventRepositoryImpl,
    },
    {
      provide: EVENT_PARTICIPANT_REPOSITORY,
      useClass: EventParticipantRepositoryImpl,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [EventService],
})
export class EventModule {}
