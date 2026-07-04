import { EntityManager, Repository } from 'typeorm';
import { EventParticipantEntity } from '../database/orm';
import { EventParticipantRepositoryImpl } from './event-participant.repository.impl';
import { ParticipantRole, ParticipantStatus } from '../../core/domain/enums';

type QueryMock = jest.MockedFunction<
  (sql: string, parameters?: unknown[]) => Promise<unknown>
>;

interface OrmMock {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
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

  beforeEach(() => {
    jest.clearAllMocks();
    orm = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    repo = new EventParticipantRepositoryImpl(
      orm as unknown as Repository<EventParticipantEntity>,
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
  });

  describe('updateStatus', () => {
    it('returns null when the participant row does not exist', async () => {
      orm.findOne.mockResolvedValue(null);
      const result = await repo.updateStatus(
        'e-1',
        'u-1',
        ParticipantStatus.ACCEPTED,
      );
      expect(result).toBeNull();
      expect(orm.save).not.toHaveBeenCalled();
    });

    it('updates and returns the domain participant', async () => {
      orm.findOne.mockResolvedValue(sampleEntity());
      orm.save.mockResolvedValue(
        sampleEntity({ status: ParticipantStatus.ACCEPTED }),
      );

      const result = await repo.updateStatus(
        'e-1',
        'u-1',
        ParticipantStatus.ACCEPTED,
      );

      expect(orm.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.ACCEPTED }),
      );
      expect(result?.status).toBe(ParticipantStatus.ACCEPTED);
      expect(result?.userId).toBe('u-1');
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
});
