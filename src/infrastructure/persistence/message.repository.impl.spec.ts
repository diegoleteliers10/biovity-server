import { Not, Repository } from 'typeorm';
import { MessageEntity } from '../database/orm';
import { MessageRepositoryImpl } from './message.repository.impl';

describe('Message read state', () => {
  it('marks only incoming unread messages in the selected chat', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 2 });
    const repository = new MessageRepositoryImpl({
      update,
    } as unknown as Repository<MessageEntity>);
    await repository.markAllAsReadByChatId('chat-1', 'recipient-1');
    expect(update).toHaveBeenCalledWith(
      { chatId: 'chat-1', senderId: Not('recipient-1'), isRead: false },
      { isRead: true },
    );
  });
});
