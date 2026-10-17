import { Repository } from 'typeorm';
import { ChatEntity, MessageEntity } from '../database/orm';
import { ChatRepositoryImpl } from './chat.repository.impl';

describe('Chat organization scope', () => {
  it('finds a chat only for the requested organization', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = new ChatRepositoryImpl(
      { findOne } as unknown as Repository<ChatEntity>,
      {} as Repository<MessageEntity>,
    );

    await repository.findByRecruiterAndProfessional(
      'recruiter-1',
      'professional-1',
      'organization-1',
    );

    expect(findOne).toHaveBeenCalledWith({
      where: {
        recruiterId: 'recruiter-1',
        professionalId: 'professional-1',
        organizationId: 'organization-1',
      },
      relations: { recruiter: true, professional: true },
    });
  });
});

describe('Chat unread state', () => {
  it('counts incoming messages for each participant instead of stale stored counters', async () => {
    const chat = {
      id: 'chat-1',
      recruiterId: 'recruiter-1',
      professionalId: 'professional-1',
      unreadCountRecruiter: 99,
      unreadCountProfessional: 99,
      createdAt: new Date(),
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { chatId: 'chat-1', senderId: 'professional-1', count: 2 },
        { chatId: 'chat-1', senderId: 'recruiter-1', count: 3 },
        { chatId: 'other-chat', senderId: 'professional-1', count: 7 },
      ]),
    };
    const repository = new ChatRepositoryImpl(
      {
        find: jest.fn().mockResolvedValue([chat]),
      } as unknown as Repository<ChatEntity>,
      {
        createQueryBuilder: jest.fn().mockReturnValue(query),
      } as unknown as Repository<MessageEntity>,
    );
    const [result] = await repository.findByRecruiterId('recruiter-1');
    expect(result.unreadCountRecruiter).toBe(2);
    expect(result.unreadCountProfessional).toBe(3);
    expect(query.where).toHaveBeenCalledWith(
      'message.chatId IN (:...chatIds)',
      { chatIds: ['chat-1'] },
    );
    expect(query.andWhere).toHaveBeenCalledWith('message.isRead = false');
  });
});

describe('Legacy chat review repository', () => {
  it('limits the review queue to chats with no organization', async () => {
    const query = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new ChatRepositoryImpl(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as unknown as Repository<ChatEntity>,
      {} as Repository<MessageEntity>,
    );

    await repository.findUnassignedForReview({ take: 25, skip: 0 });

    expect(query.where).toHaveBeenCalledWith('chat.organizationId IS NULL');
    expect(query.getManyAndCount).toHaveBeenCalledTimes(1);
  });

  it('shows only verified organizations as assignment choices', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([{ id: 'org-1', name: 'Verified Labs' }]);
    const repository = new ChatRepositoryImpl(
      { manager: { query } } as unknown as Repository<ChatEntity>,
      {} as Repository<MessageEntity>,
    );

    const result = await repository.findVerifiedOrganizationsForReview({
      take: 20,
      skip: 0,
      search: 'Verified',
    });

    expect(result).toEqual({
      data: [{ id: 'org-1', name: 'Verified Labs' }],
      total: 1,
    });
    expect(query.mock.calls[0]?.[0]).toContain("verification_status = 'verified'");
    expect(query.mock.calls[0]?.[1]).toEqual(['%Verified%']);
    expect(query.mock.calls[1]?.[1]).toEqual(['%Verified%', 20, 0]);
  });

  it('returns only unassigned chat participants and message text for review', async () => {
    const chatQuery = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'chat-1',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        updatedAt: new Date('2026-10-02T00:00:00.000Z'),
        recruiter: { id: 'recruiter-1', name: 'Recruiter', email: 'r@example.test' },
        professional: { id: 'professional-1', name: 'Professional', email: 'p@example.test' },
      }),
    };
    const messageQuery = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'message-1',
          senderId: 'recruiter-1',
          sender: { name: 'Recruiter' },
          content: 'Please review my application.',
          createdAt: new Date('2026-10-02T00:00:00.000Z'),
        },
      ]),
    };
    const repository = new ChatRepositoryImpl(
      { createQueryBuilder: jest.fn().mockReturnValue(chatQuery) } as unknown as Repository<ChatEntity>,
      { createQueryBuilder: jest.fn().mockReturnValue(messageQuery) } as unknown as Repository<MessageEntity>,
    );

    const result = await repository.findUnassignedForReviewById('chat-1');

    expect(result?.messages[0]?.content).toBe('Please review my application.');
    expect(chatQuery.andWhere).toHaveBeenCalledWith('chat.organizationId IS NULL');
    expect(messageQuery.select).toHaveBeenCalledWith([
      'message.id',
      'message.senderId',
      'message.content',
      'message.createdAt',
      'sender.id',
      'sender.name',
    ]);
  });

  it('writes organization and audit data only while the chat remains unassigned', async () => {
    const assignedAt = new Date('2026-10-09T12:00:00.000Z');
    const query = jest.fn()
      .mockResolvedValueOnce([{ id: 'org-1', verificationStatus: 'verified' }])
      .mockResolvedValueOnce([{ id: 'chat-1' }]);
    const transaction = jest.fn(async (operation: (manager: { query: typeof query }) => unknown) =>
      operation({ query }),
    );
    const repository = new ChatRepositoryImpl(
      { manager: { transaction } } as unknown as Repository<ChatEntity>,
      {} as Repository<MessageEntity>,
    );

    const result = await repository.assignVerifiedOrganizationToUnassignedChat({
      chatId: 'chat-1',
      organizationId: 'org-1',
      actorId: 'admin-1',
      assignedAt,
    });

    expect(result).toEqual({ kind: 'assigned' });
    expect(query.mock.calls[1]?.[0]).toContain('"organizationId" IS NULL');
    expect(query.mock.calls[1]?.[1]).toEqual([
      'chat-1',
      'org-1',
      'admin-1',
      assignedAt,
    ]);
  });

  it('rejects a concurrent assignment without overwriting its organization', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ id: 'org-1', verificationStatus: 'verified' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'chat-1', organizationId: 'org-2' }]);
    const transaction = jest.fn(async (operation: (manager: { query: typeof query }) => unknown) =>
      operation({ query }),
    );
    const repository = new ChatRepositoryImpl(
      { manager: { transaction } } as unknown as Repository<ChatEntity>,
      {} as Repository<MessageEntity>,
    );

    const result = await repository.assignVerifiedOrganizationToUnassignedChat({
      chatId: 'chat-1',
      organizationId: 'org-1',
      actorId: 'admin-1',
      assignedAt: new Date('2026-10-09T12:00:00.000Z'),
    });

    expect(result).toEqual({ kind: 'already_assigned' });
    expect(query.mock.calls[1]?.[0]).toContain('"organizationId" IS NULL');
  });
});
