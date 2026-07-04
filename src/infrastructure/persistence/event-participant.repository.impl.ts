import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EventParticipantEntity } from '../database/orm';
import { EventParticipant } from '../../core/domain/entities/event-participant.entity';
import { ParticipantRole, ParticipantStatus } from '../../core/domain/enums';
import { IEventParticipantRepository } from '../../core/repositories/event-participant.repository';

@Injectable()
export class EventParticipantRepositoryImpl implements IEventParticipantRepository {
  constructor(
    @InjectRepository(EventParticipantEntity)
    private readonly participantRepository: Repository<EventParticipantEntity>,
  ) {}

  async seedParticipants(
    manager: EntityManager,
    eventId: string,
    organizerId: string,
    candidateId?: string | null,
  ): Promise<void> {
    const rows: Array<{
      userId: string;
      role: ParticipantRole;
      status: ParticipantStatus;
    }> = [
      {
        userId: organizerId,
        role: ParticipantRole.ORGANIZER,
        status: ParticipantStatus.ACCEPTED,
      },
    ];

    if (candidateId && candidateId !== organizerId) {
      rows.push({
        userId: candidateId,
        role: ParticipantRole.ATTENDEE,
        status: ParticipantStatus.PENDING,
      });
    }

    for (const row of rows) {
      await manager.query(
        `INSERT INTO event_participant (event_id, user_id, role, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [eventId, row.userId, row.role, row.status],
      );
    }
  }

  async findByEventId(eventId: string): Promise<EventParticipant[]> {
    const entities = await this.participantRepository.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findUserIdsByEventId(
    eventId: string,
    excludeStatuses: ParticipantStatus[] = [],
  ): Promise<string[]> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .where('p.eventId = :eventId', { eventId });

    if (excludeStatuses.length > 0) {
      queryBuilder.andWhere('p.status NOT IN (:...excludeStatuses)', {
        excludeStatuses,
      });
    }

    const rows = await queryBuilder.getRawMany<{ userId: string }>();
    return rows.map(row => row.userId);
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<EventParticipant | null> {
    const entity = await this.participantRepository.findOne({
      where: { eventId, userId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async updateStatus(
    eventId: string,
    userId: string,
    status: ParticipantStatus,
  ): Promise<EventParticipant | null> {
    const existing = await this.participantRepository.findOne({
      where: { eventId, userId },
    });
    if (!existing) {
      return null;
    }

    existing.status = status;
    const saved = await this.participantRepository.save(existing);
    return this.toDomain(saved);
  }

  private toDomain(entity: EventParticipantEntity): EventParticipant {
    return new EventParticipant(
      entity.id,
      entity.eventId,
      entity.userId,
      entity.role,
      entity.status,
      entity.createdAt,
    );
  }
}
