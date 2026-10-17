import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventEntity, EventParticipantEntity } from '../database/orm';
import { EventParticipantRepositoryImpl } from './event-participant.repository.impl';
import {
  EventStatus,
  ParticipantRole,
  ParticipantStatus,
} from '../../core/domain/enums';

type QueryMock = jest.MockedFunction<
  (sql: string, parameters?: unknown[]) => Promise<unknown>
>;

interface OrmMock {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
}

interface HistoryOrmMock {
  save: jest.Mock;
}

interface EventOrmMock {
  findOne: jest.Mock;
}

const buildManager = (): { query: QueryMock } => ({
  query: jest.fn().mockResolvedValue(undefined),
});

const sampleEntity = (
  overrides: Partial<EventParticipantEntity> = {},
): EventParticipantEntity =>
  ({
    id: 'p-1',
    eventId: 'e-1',
    userId: 'u-1',
    role: ParticipantRole.ATTENDEE,
    status: ParticipantStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }) as EventParticipantEntity;

describe('EventParticipantRepositoryImpl', () => {
  let repo: EventParticipantRepositoryImpl;
  let orm: OrmMock;
  let historyOrm: HistoryOrmMock;
  let eventOrm: EventOrmMock;
  let transaction: jest.Mock;
  let query: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    orm = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    historyOrm = { save: jest.fn() };
    eventOrm = { findOne: jest.fn() };
    eventOrm.findOne.mockResolvedValue({
      status: EventStatus.SCHEDULED,
      startAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    query = jest.fn();
    transaction = jest.fn(
      async <T>(operation: (manager: EntityManager) => Promise<T>) =>
        operation({
          query,
          getRepository: (entity: unknown) =>
            entity === EventEntity
              ? eventOrm
              : entity === EventParticipantEntity
                ? orm
                : historyOrm,
        } as unknown as EntityManager),
    );
    repo = new EventParticipantRepositoryImpl(
      orm as unknown as Repository<EventParticipantEntity>,
      { transaction, query } as unknown as DataSource,
    );
  });

  describe('seedParticipants', () => {
    it('inserts organizer (accepted) and candidate (pending) with ON CONFLICT DO NOTHING', async () => {
      const manager = buildManager();
      await repo.seedParticipants(
        manager as unknown as EntityManager,
        'e-1',
        'org-1',
        'cand-1',
      );

      expect(manager.query).toHaveBeenCalledTimes(2);
      const [sql, params] = manager.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT (event_id, user_id) DO NOTHING');
      expect(params?.[0]).toBe('e-1');
      expect(params?.[1]).toBe('org-1');
      expect(params?.[2]).toBe(ParticipantRole.ORGANIZER);
      expect(params?.[3]).toBe(ParticipantStatus.ACCEPTED);

      const candidateCall = manager.query.mock.calls[1];
      expect(candidateCall[1]?.[1]).toBe('cand-1');
      expect(candidateCall[1]?.[2]).toBe(ParticipantRole.ATTENDEE);
      expect(candidateCall[1]?.[3]).toBe(ParticipantStatus.PENDING);
    });

    it('skips candidate row when candidateId equals organizerId', async () => {
      const manager = buildManager();
      await repo.seedParticipants(
        manager as unknown as EntityManager,
        'e-1',
        'org-1',
        'org-1',
      );
      expect(manager.query).toHaveBeenCalledTimes(1);
    });

    it('skips candidate row when candidateId is null', async () => {
      const manager = buildManager();
      await repo.seedParticipants(
        manager as unknown as EntityManager,
        'e-1',
        'org-1',
        null,
      );
      expect(manager.query).toHaveBeenCalledTimes(1);
    });

    it('seeds unique interviewers as pending attendees', async () => {
      const manager = buildManager();
      await repo.seedParticipants(
        manager as unknown as EntityManager,
        'e-1',
        'org-1',
        'cand-1',
        ['interviewer-1', 'interviewer-1', 'org-1', 'cand-1', 'interviewer-2'],
        true,
      );

      expect(manager.query).toHaveBeenCalledTimes(7);
      expect(
        manager.query.mock.calls.slice(2, 4).map(([, params]) => params),
      ).toEqual([
        [
          'e-1',
          'interviewer-1',
          ParticipantRole.ATTENDEE,
          ParticipantStatus.PENDING,
        ],
        [
          'e-1',
          'interviewer-2',
          ParticipantRole.ATTENDEE,
          ParticipantStatus.PENDING,
        ],
      ]);
      expect(
        manager.query.mock.calls
          .slice(4)
          .map(([sql, params]) => [
            sql.includes('INSERT INTO event_interviewer'),
            params,
          ]),
      ).toEqual([
        [
          true,
          ['e-1', 'org-1', '00000000-0000-4000-8000-000000000001', 'General'],
        ],
        [
          true,
          [
            'e-1',
            'interviewer-1',
            'org-1',
            '00000000-0000-4000-8000-000000000001',
            'General',
          ],
        ],
        [
          true,
          [
            'e-1',
            'interviewer-2',
            'org-1',
            '00000000-0000-4000-8000-000000000001',
            'General',
          ],
        ],
      ]);
    });
  });

  describe('updateStatus', () => {
    it('returns null when the participant row does not exist', async () => {
      orm.findOne.mockResolvedValue(null);
      const result = await repo.updateStatus(
        'e-1',
        'u-1',
        ParticipantStatus.ACCEPTED,
        'u-1',
      );
      expect(result).toBeNull();
      expect(orm.save).not.toHaveBeenCalled();
      expect(historyOrm.save).not.toHaveBeenCalled();
    });

    it('updates and returns the domain participant', async () => {
      orm.findOne.mockResolvedValue(sampleEntity());
      orm.save.mockResolvedValue(
        sampleEntity({ status: ParticipantStatus.ACCEPTED }),
      );
      historyOrm.save.mockResolvedValue({
        id: 'history-1',
        changedAt: new Date('2026-10-10T00:00:00.000Z'),
      });

      const result = await repo.updateStatus(
        'e-1',
        'u-1',
        ParticipantStatus.ACCEPTED,
        'u-1',
      );

      expect(orm.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.ACCEPTED }),
      );
      expect(historyOrm.save).toHaveBeenCalledWith({
        participantId: 'p-1',
        eventId: 'e-1',
        userId: 'u-1',
        changedById: 'u-1',
        fromStatus: ParticipantStatus.PENDING,
        toStatus: ParticipantStatus.ACCEPTED,
      });
      expect(result).toEqual({
        kind: 'changed',
        fromStatus: ParticipantStatus.PENDING,
        toStatus: ParticipantStatus.ACCEPTED,
        changedAt: new Date('2026-10-10T00:00:00.000Z'),
      });
      expect(orm.findOne).toHaveBeenCalledWith({
        where: { eventId: 'e-1', userId: 'u-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO interview_reminder_notification_intent',
        ),
        ['e-1', 'p-1'],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO event_lifecycle_notification_intent',
        ),
        [
          'e-1',
          'p-1',
          ParticipantStatus.PENDING,
          ParticipantStatus.ACCEPTED,
          'history-1',
        ],
      );
    });

    it('propagates an audit insert failure', async () => {
      const failure = new Error('History insert failed');
      orm.findOne.mockResolvedValue(sampleEntity());
      orm.save.mockResolvedValue(
        sampleEntity({ status: ParticipantStatus.ACCEPTED }),
      );
      historyOrm.save.mockRejectedValue(failure);

      await expect(
        repo.updateStatus('e-1', 'u-1', ParticipantStatus.ACCEPTED, 'u-1'),
      ).rejects.toBe(failure);
    });

    it('does not write history when the status is unchanged', async () => {
      orm.findOne.mockResolvedValue(sampleEntity());

      const result = await repo.updateStatus(
        'e-1',
        'u-1',
        ParticipantStatus.PENDING,
        'u-1',
      );

      expect(orm.save).not.toHaveBeenCalled();
      expect(historyOrm.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        kind: 'unchanged',
        status: ParticipantStatus.PENDING,
      });
    });

    it.each([EventStatus.CANCELLED, EventStatus.COMPLETED])(
      'rejects a real status change when the event is %s',
      async status => {
        eventOrm.findOne.mockResolvedValue({
          status,
          startAt: new Date('2099-01-01T00:00:00.000Z'),
        });
        orm.findOne.mockResolvedValue(sampleEntity());

        await expect(
          repo.updateStatus('e-1', 'u-1', ParticipantStatus.ACCEPTED, 'u-1'),
        ).resolves.toEqual({ kind: 'closed' });
        expect(orm.save).not.toHaveBeenCalled();
        expect(historyOrm.save).not.toHaveBeenCalled();
      },
    );

    it('rejects a real status change at or after the event start', async () => {
      eventOrm.findOne.mockResolvedValue({
        status: EventStatus.SCHEDULED,
        startAt: new Date(Date.now() - 1),
      });
      orm.findOne.mockResolvedValue(sampleEntity());

      await expect(
        repo.updateStatus('e-1', 'u-1', ParticipantStatus.ACCEPTED, 'u-1'),
      ).resolves.toEqual({ kind: 'closed' });
      expect(orm.save).not.toHaveBeenCalled();
      expect(historyOrm.save).not.toHaveBeenCalled();
    });

    it('keeps a same-status retry idempotent after the event closes', async () => {
      eventOrm.findOne.mockResolvedValue({
        status: EventStatus.CANCELLED,
        startAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      orm.findOne.mockResolvedValue(sampleEntity());

      await expect(
        repo.updateStatus('e-1', 'u-1', ParticipantStatus.PENDING, 'u-1'),
      ).resolves.toEqual({
        kind: 'unchanged',
        status: ParticipantStatus.PENDING,
      });
      expect(historyOrm.save).not.toHaveBeenCalled();
    });
  });

  describe('findUserIdsByEventId', () => {
    it('returns user ids and applies status exclusion', async () => {
      const andWhere = jest.fn().mockReturnThis();
      orm.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere,
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]),
      });

      const result = await repo.findUserIdsByEventId('e-1', [
        ParticipantStatus.DECLINED,
      ]);

      const andWhereCalls = andWhere.mock.calls as unknown as [
        string,
        Record<string, unknown>,
      ][];
      expect(andWhereCalls[0][0]).toContain('NOT IN');
      expect(andWhereCalls[0][1]).toEqual({
        excludeStatuses: [ParticipantStatus.DECLINED],
      });
      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('findByEventAndUser', () => {
    it('maps the entity to domain when found', async () => {
      orm.findOne.mockResolvedValue(sampleEntity());
      const result = await repo.findByEventAndUser('e-1', 'u-1');
      expect(result?.id).toBe('p-1');
      expect(result?.role).toBe(ParticipantRole.ATTENDEE);
    });

    it('returns null when not found', async () => {
      orm.findOne.mockResolvedValue(null);
      expect(await repo.findByEventAndUser('e-1', 'missing')).toBeNull();
    });
  });

  describe('findStatusHistory', () => {
    it('returns transitions in stable chronological order scoped to the participant', async () => {
      const rows = [
        {
          id: 'h-1',
          fromStatus: ParticipantStatus.PENDING,
          toStatus: ParticipantStatus.ACCEPTED,
          changedAt: new Date('2026-10-10T10:00:00Z'),
        },
      ];
      query.mockResolvedValue(rows);

      await expect(repo.findStatusHistory('e-1', 'u-1')).resolves.toEqual(rows);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining(
          'ORDER BY history.changed_at ASC, history.id ASC',
        ),
        ['e-1', 'u-1'],
      );
    });
  });
});
