import { Repository } from 'typeorm';
import { ChatEntity, MessageEntity } from '../database/orm';
import { ChatRepositoryImpl } from './chat.repository.impl';

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
