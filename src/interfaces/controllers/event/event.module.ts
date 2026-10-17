import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventController } from './event.controller';
import { EventInterviewController } from './event-interview.controller';
import { GoogleCalendarController } from './google-calendar.controller';
import { EventService } from '../../../core/services/event.service';
import { EventInterviewService } from '../../../core/services/event-interview.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { EventRepositoryImpl } from '../../../infrastructure/persistence/event.repository.impl';
import { EventInterviewRepositoryImpl } from '../../../infrastructure/persistence/event-interview.repository.impl';
import { EventParticipantRepositoryImpl } from '../../../infrastructure/persistence/event-participant.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import {
  EventEntity,
  EventNoteEntity,
  EventParticipantEntity,
  EventChangeHistoryEntity,
  UserEntity,
} from '../../../infrastructure/database/orm';
import { EVENT_PARTICIPANT_REPOSITORY } from '../../../core/repositories/event-participant.repository';
import { EVENT_INTERVIEW_REPOSITORY } from '../../../core/repositories/event-interview.repository';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventNoteEntity,
      EventParticipantEntity,
      EventChangeHistoryEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    EventController,
    EventInterviewController,
    GoogleCalendarController,
  ],
  providers: [
    EventService,
    EventInterviewService,
    GoogleCalendarService,
    InternalSecretGuard,
    {
      provide: EVENT_INTERVIEW_REPOSITORY,
      useClass: EventInterviewRepositoryImpl,
    },
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
