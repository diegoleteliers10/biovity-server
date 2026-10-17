import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  EventEntity,
  EventParticipantEntity,
  EventParticipantStatusHistoryEntity,
} from '../database/orm';
import { EventParticipant } from '../../core/domain/entities/event-participant.entity';
import {
  EventStatus,
  ParticipantRole,
  ParticipantStatus,
} from '../../core/domain/enums';
import {
  IEventParticipantRepository,
  EventParticipantStatusHistory,
  ParticipantStatusUpdate,
} from '../../core/repositories/event-participant.repository';
import { GENERAL_INTERVIEW_ROLE } from '../../core/domain/entities/pipeline-stage-rubric';

@Injectable()
export class EventParticipantRepositoryImpl implements IEventParticipantRepository {
  constructor(
    @InjectRepository(EventParticipantEntity)
    private readonly participantRepository: Repository<EventParticipantEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async seedParticipants(
    manager: EntityManager,
    eventId: string,
    organizerId: string,
    candidateId?: string | null,
    interviewerIds: readonly string[] = [],
    isInterview = false,
    interviewerAssignments: readonly {
      userId: string;
      roleId: string;
      roleLabel: string;
    }[] = [],
  ): Promise<void> {
    const assignments =
      interviewerAssignments.length > 0
        ? interviewerAssignments
        : interviewerIds.map(userId => ({
            userId,
            roleId: GENERAL_INTERVIEW_ROLE.id,
            roleLabel: GENERAL_INTERVIEW_ROLE.label,
          }));
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

    const existingIds = new Set([organizerId, candidateId].filter(Boolean));
    for (const { userId } of assignments) {
      if (existingIds.has(userId)) continue;
      existingIds.add(userId);
      rows.push({
        userId,
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

    if (isInterview) {
      const organizerAssignment = assignments.find(
        assignment => assignment.userId === organizerId,
      );
      await manager.query(
        `INSERT INTO event_interviewer
           (event_id, user_id, assigned_by_id, role_id, role_label_snapshot)
         VALUES ($1, $2, $2, $3, $4)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [
          eventId,
          organizerId,
          organizerAssignment?.roleId ?? GENERAL_INTERVIEW_ROLE.id,
          organizerAssignment?.roleLabel ?? GENERAL_INTERVIEW_ROLE.label,
        ],
      );
    }

    const assignedInterviewerIds = new Set(
      [organizerId, candidateId].filter(Boolean),
    );
    for (const assignment of assignments) {
      const { userId } = assignment;
      if (assignedInterviewerIds.has(userId)) continue;
      assignedInterviewerIds.add(userId);
      await manager.query(
        `INSERT INTO event_interviewer
           (event_id, user_id, assigned_by_id, role_id, role_label_snapshot)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [eventId, userId, organizerId, assignment.roleId, assignment.roleLabel],
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
    changedById: string,
  ): Promise<ParticipantStatusUpdate | null> {
    return this.dataSource.transaction(async manager => {
      const event = await manager.getRepository(EventEntity).findOne({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) {
        return { kind: 'closed' };
      }

      const participantRepository = manager.getRepository(
        EventParticipantEntity,
      );
      const existing = await participantRepository.findOne({
        where: { eventId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) return null;

      const fromStatus = existing.status;
      if (fromStatus === status) {
        return { kind: 'unchanged', status };
      }

      if (
        event.status !== EventStatus.SCHEDULED ||
        event.startAt.getTime() <= Date.now()
      ) {
        return { kind: 'closed' };
      }
      const historyRepository = manager.getRepository(
        EventParticipantStatusHistoryEntity,
      );

      existing.status = status;
      const saved = await participantRepository.save(existing);
      const history = await historyRepository.save({
        participantId: saved.id,
        eventId,
        userId,
        changedById,
        fromStatus,
        toStatus: status,
      });
      if (status === ParticipantStatus.DECLINED) {
        await manager.query(
          `UPDATE interview_reminder_notification_intent
           SET status = 'suppressed', locked_at = NULL, updated_at = now()
           WHERE event_id = $1::uuid AND participant_id = $2::uuid
             AND status IN ('pending', 'retry')`,
          [eventId, saved.id],
        );
      } else {
        await manager.query(
          `INSERT INTO interview_reminder_notification_intent
            (event_id, participant_id, scheduled_start_at, available_at)
           SELECT event.id, participant.id, event."startAt",
                  event."startAt" - interval '24 hours'
           FROM event
           JOIN event_participant participant ON participant.event_id = event.id
           WHERE event.id = $1::uuid AND participant.id = $2::uuid
             AND event.type = 'interview' AND event.status = 'scheduled'
             AND event."startAt" > now()
           ON CONFLICT (event_id, participant_id, scheduled_start_at) DO UPDATE
           SET status = 'pending', attempt_count = 0,
               available_at = EXCLUDED.available_at, locked_at = NULL,
               last_error_code = NULL, updated_at = now()
           WHERE interview_reminder_notification_intent.status IN ('cancelled', 'suppressed')`,
          [eventId, saved.id],
        );
      }
      await manager.query(
        `INSERT INTO event_lifecycle_notification_intent
          (kind, event_id, participant_id, recipient_id, event_title, event_type,
           event_start_at, event_time_zone, actor_user_id, actor_name, from_status, to_status,
           dedup_key)
         SELECT 'rsvp', event.id, participant.id, event."organizerId",
                event.title, event.type, event."startAt", event."timeZone",
                participant.user_id, actor.name, $3, $4,
                'event:' || event.id::text || ':rsvp:' || $5::text
         FROM event
         JOIN event_participant participant ON participant.event_id = event.id
         JOIN "user" actor ON actor.id = participant.user_id
         WHERE event.id = $1::uuid AND participant.id = $2::uuid
           AND participant.user_id <> event."organizerId"
         ON CONFLICT (dedup_key) DO NOTHING`,
        [eventId, saved.id, fromStatus, status, history.id],
      );

      return {
        kind: 'changed',
        fromStatus,
        toStatus: status,
        changedAt: history.changedAt,
      };
    });
  }

  async findStatusHistory(
    eventId: string,
    userId: string,
  ): Promise<EventParticipantStatusHistory[]> {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        fromStatus: ParticipantStatus;
        toStatus: ParticipantStatus;
        changedAt: Date;
      }>
    >(
      `SELECT history.id,
              history.from_status AS "fromStatus",
              history.to_status AS "toStatus",
              history.changed_at AS "changedAt"
       FROM event_participant_status_history history
       JOIN event_participant participant ON participant.id = history.participant_id
       WHERE history.event_id = $1::uuid
         AND history.user_id = $2::uuid
         AND participant.event_id = $1::uuid
         AND participant.user_id = $2::uuid
       ORDER BY history.changed_at ASC, history.id ASC`,
      [eventId, userId],
    );
    return rows;
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
