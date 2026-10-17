import { randomUUID } from 'node:crypto';
import { DataSource, EntitySchema } from 'typeorm';
import {
  EventStatus,
  EventType,
  ParticipantRole,
  ParticipantStatus,
} from '../../core/domain/enums';
import { EventEntity } from '../database/orm/event.entity';
import { EventParticipantEntity } from '../database/orm/event-participant.entity';
import { EventParticipantStatusHistoryEntity } from '../database/orm/event-participant-status-history.entity';
import { EventParticipantRepositoryImpl } from './event-participant.repository.impl';

const localPostgresUrl = process.env.ATS07_LOCAL_POSTGRES_URL;
const isLocalPostgresUrl = (value?: string): value is string => {
  if (
    !value ||
    !/^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(
      value,
    )
  )
    return false;
  const query = value.split('?')[1]?.split('#')[0] ?? '';
  for (const [key] of new URLSearchParams(query)) {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'hostaddr')
      return false;
  }
  return true;
};
const describeLocalPostgres = isLocalPostgresUrl(localPostgresUrl)
  ? describe
  : describe.skip;

describeLocalPostgres(
  'EventParticipantRepositoryImpl with local PostgreSQL',
  () => {
    const schema = `ats07_${randomUUID().replaceAll('-', '')}`;
    let adminDataSource: DataSource;
    let dataSource: DataSource;
    let repository: EventParticipantRepositoryImpl;

    beforeAll(async () => {
      adminDataSource = new DataSource({
        type: 'postgres',
        url: localPostgresUrl,
        entities: [],
        synchronize: false,
      });
      await adminDataSource.initialize();
      await adminDataSource.query(`CREATE SCHEMA "${schema}"`);
      dataSource = new DataSource({
        type: 'postgres',
        url: localPostgresUrl,
        schema,
        extra: { options: `-c search_path=${schema},public` },
        entities: [
          new EntitySchema<EventEntity>({
            target: EventEntity,
            name: 'EventEntity',
            tableName: 'event',
            columns: {
              id: { type: 'uuid', primary: true },
              title: { type: 'text' },
              type: { type: 'text' },
              timeZone: { name: 'timeZone', type: 'text' },
              startAt: { name: 'startAt', type: 'timestamptz' },
              status: { type: 'text' },
              organizerId: { name: 'organizerId', type: 'uuid' },
            },
          }),
          new EntitySchema<EventParticipantEntity>({
            target: EventParticipantEntity,
            name: 'EventParticipantEntity',
            tableName: 'event_participant',
            columns: {
              id: { type: 'uuid', primary: true, generated: 'uuid' },
              eventId: { name: 'event_id', type: 'uuid' },
              userId: { name: 'user_id', type: 'uuid' },
              role: {
                type: 'enum',
                enum: ParticipantRole,
                enumName: 'event_participant_role_enum',
              },
              status: {
                type: 'enum',
                enum: ParticipantStatus,
                enumName: 'event_participant_status_enum',
              },
              createdAt: {
                name: 'created_at',
                type: 'timestamptz',
                createDate: true,
              },
            },
            uniques: [{ columns: ['eventId', 'userId'] }],
          }),
          new EntitySchema<EventParticipantStatusHistoryEntity>({
            target: EventParticipantStatusHistoryEntity,
            name: 'EventParticipantStatusHistoryEntity',
            tableName: 'event_participant_status_history',
            columns: {
              id: { type: 'uuid', primary: true, generated: 'uuid' },
              participantId: { name: 'participant_id', type: 'uuid' },
              eventId: { name: 'event_id', type: 'uuid' },
              userId: { name: 'user_id', type: 'uuid' },
              changedById: { name: 'changed_by_id', type: 'uuid' },
              fromStatus: {
                name: 'from_status',
                type: 'enum',
                enum: ParticipantStatus,
                enumName: 'event_participant_status_enum',
              },
              toStatus: {
                name: 'to_status',
                type: 'enum',
                enum: ParticipantStatus,
                enumName: 'event_participant_status_enum',
              },
              changedAt: {
                name: 'changed_at',
                type: 'timestamptz',
                createDate: true,
              },
            },
          }),
        ],
        synchronize: true,
        dropSchema: false,
      });
      await dataSource.initialize();
      await dataSource.query(`
      CREATE TABLE "${schema}"."user" (
        id uuid PRIMARY KEY,
        name text NOT NULL
      );
      CREATE TABLE "${schema}".interview_reminder_notification_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL,
        participant_id uuid NOT NULL,
        scheduled_start_at timestamptz NOT NULL,
        available_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        attempt_count integer NOT NULL DEFAULT 0,
        locked_at timestamptz,
        last_error_code text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (event_id, participant_id, scheduled_start_at)
      );
      CREATE TABLE "${schema}".event_lifecycle_notification_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kind text NOT NULL,
        event_id uuid NOT NULL,
        participant_id uuid NOT NULL,
        recipient_id uuid NOT NULL,
        event_title text NOT NULL,
        event_type text NOT NULL,
        event_start_at timestamptz NOT NULL,
        event_time_zone text NOT NULL,
        actor_user_id uuid NOT NULL,
        actor_name text NOT NULL,
        from_status text NOT NULL,
        to_status text NOT NULL,
        dedup_key text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'pending',
        locked_at timestamptz,
        last_error_code text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
      repository = new EventParticipantRepositoryImpl(
        dataSource.getRepository(EventParticipantEntity),
        dataSource,
      );
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
      if (adminDataSource?.isInitialized) {
        await adminDataSource.query(
          `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
        );
        await adminDataSource.destroy();
      }
    });

    const seedInterview = async () => {
      const eventId = randomUUID();
      const organizerId = randomUUID();
      const candidateId = randomUUID();
      const participantId = randomUUID();
      const startAt = new Date(Date.now() + 86_400_000);
      await dataSource.query(
        `INSERT INTO "${schema}".event
       (id, title, type, "timeZone", "startAt", status, "organizerId")
       VALUES ($1, 'Interview', $2, 'America/Santiago', $3, $4, $5)`,
        [
          eventId,
          EventType.INTERVIEW,
          startAt,
          EventStatus.SCHEDULED,
          organizerId,
        ],
      );
      await dataSource.query(
        `INSERT INTO "${schema}"."user" (id, name) VALUES ($1, 'Candidate')`,
        [candidateId],
      );
      await dataSource.query(
        `INSERT INTO "${schema}".event_participant
       (id, event_id, user_id, role, status)
       VALUES ($1, $2, $3, $4, $5)`,
        [
          participantId,
          eventId,
          candidateId,
          ParticipantRole.ATTENDEE,
          ParticipantStatus.PENDING,
        ],
      );
      return { eventId, candidateId, participantId, organizerId, startAt };
    };

    it('persists RSVP, history, reminder, and lifecycle notice in one transaction', async () => {
      const { eventId, candidateId, participantId, organizerId, startAt } =
        await seedInterview();

      await expect(
        repository.updateStatus(
          eventId,
          candidateId,
          ParticipantStatus.ACCEPTED,
          candidateId,
        ),
      ).resolves.toMatchObject({
        kind: 'changed',
        fromStatus: ParticipantStatus.PENDING,
        toStatus: ParticipantStatus.ACCEPTED,
      });
      await expect(
        dataSource.query(
          `SELECT participant.status, history.from_status, history.to_status,
                reminder.scheduled_start_at, notice.recipient_id
         FROM "${schema}".event_participant participant
         JOIN "${schema}".event_participant_status_history history
           ON history.participant_id = participant.id
         JOIN "${schema}".interview_reminder_notification_intent reminder
           ON reminder.event_id = participant.event_id
          AND reminder.participant_id = participant.id
         JOIN "${schema}".event_lifecycle_notification_intent notice
           ON notice.event_id = participant.event_id
          AND notice.participant_id = participant.id
         WHERE participant.id = $1`,
          [participantId],
        ),
      ).resolves.toEqual([
        {
          status: ParticipantStatus.ACCEPTED,
          from_status: ParticipantStatus.PENDING,
          to_status: ParticipantStatus.ACCEPTED,
          scheduled_start_at: startAt,
          recipient_id: organizerId,
        },
      ]);
    });

    it('rolls back RSVP history and reminder when lifecycle notice insert fails', async () => {
      const { eventId, candidateId, participantId } = await seedInterview();
      await dataSource.query(
        `ALTER TABLE "${schema}".event_lifecycle_notification_intent
       ADD CONSTRAINT ats07_reject_lifecycle_notice
       CHECK (kind <> 'rsvp') NOT VALID`,
      );

      await expect(
        repository.updateStatus(
          eventId,
          candidateId,
          ParticipantStatus.ACCEPTED,
          candidateId,
        ),
      ).rejects.toBeDefined();
      await expect(
        dataSource.query(
          `SELECT participant.status,
                (SELECT count(*) FROM "${schema}".event_participant_status_history WHERE participant_id = $1) AS history_count,
                (SELECT count(*) FROM "${schema}".interview_reminder_notification_intent WHERE participant_id = $1) AS reminder_count,
                (SELECT count(*) FROM "${schema}".event_lifecycle_notification_intent WHERE participant_id = $1) AS notice_count
         FROM "${schema}".event_participant participant
         WHERE participant.id = $1`,
          [participantId],
        ),
      ).resolves.toEqual([
        {
          status: ParticipantStatus.PENDING,
          history_count: '0',
          reminder_count: '0',
          notice_count: '0',
        },
      ]);
      await dataSource.query(
        `ALTER TABLE "${schema}".event_lifecycle_notification_intent
       DROP CONSTRAINT ats07_reject_lifecycle_notice`,
      );
    });

    it('serializes duplicate concurrent RSVP writes', async () => {
      const { eventId, candidateId, participantId } = await seedInterview();
      await dataSource.query(`
        CREATE FUNCTION "${schema}".ats07_delay_participant_update()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM pg_sleep(0.15);
          RETURN NEW;
        END;
        $$;
        CREATE TRIGGER ats07_delay_participant_update
        BEFORE UPDATE OF status ON "${schema}".event_participant
        FOR EACH ROW EXECUTE FUNCTION "${schema}".ats07_delay_participant_update();
      `);
      const outcomes = await Promise.all([
        repository.updateStatus(
          eventId,
          candidateId,
          ParticipantStatus.ACCEPTED,
          candidateId,
        ),
        repository.updateStatus(
          eventId,
          candidateId,
          ParticipantStatus.ACCEPTED,
          candidateId,
        ),
      ]);
      const history = await dataSource.query(
        `SELECT id FROM "${schema}".event_participant_status_history
       WHERE participant_id = $1`,
        [participantId],
      );
      const notices = await dataSource.query(
        `SELECT id FROM "${schema}".event_lifecycle_notification_intent
       WHERE participant_id = $1`,
        [participantId],
      );

      expect(outcomes.map(outcome => outcome?.kind).sort()).toEqual([
        'changed',
        'unchanged',
      ]);
      expect(history).toHaveLength(1);
      expect(notices).toHaveLength(1);
    });
  },
);
