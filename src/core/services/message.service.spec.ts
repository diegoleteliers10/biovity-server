import type { DataSource } from 'typeorm';
import type { IMessageRepository } from '../repositories/message.repository';
import { MessageType } from '../domain/enums';
import { MessageEntity } from '../../infrastructure/database/orm/message.entity';
import { MessageService } from './message.service';

const input = {
  chatId: 'chat-id',
  senderId: 'recruiter-id',
  content: 'Hello there',
};

function makeService(options?: {
  intentError?: Error;
  persistenceError?: Error;
}) {
  const savedMessage = Object.assign(new MessageEntity(), {
    id: 'message-id',
    chatId: input.chatId,
    senderId: input.senderId,
    content: input.content,
    type: MessageType.TEXT,
    contentType: null,
    isRead: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  const manager = {
    query: jest
      .fn()
      .mockResolvedValueOnce([
        { recruiterId: input.senderId, professionalId: 'professional-id' },
      ])
      .mockResolvedValueOnce([]),
    save: jest.fn().mockResolvedValue(savedMessage),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  if (options?.persistenceError) {
    manager.save.mockRejectedValue(options.persistenceError);
  }
  if (options?.intentError) {
    manager.query
      .mockReset()
      .mockResolvedValueOnce([
        { recruiterId: input.senderId, professionalId: 'professional-id' },
      ]);
    manager.query.mockRejectedValueOnce(options.intentError);
  }
  const queryRunner = {
    manager,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
  };
  const service = new MessageService(
    {} as unknown as IMessageRepository,
    dataSource as unknown as DataSource,
  );

  return { service, manager, queryRunner };
}

describe('MessageService.createMessage', () => {
  it('saves a notification intent in the message transaction', async () => {
    const { service, manager, queryRunner } = makeService();

    await expect(service.createMessage(input)).resolves.toMatchObject({
      id: 'message-id',
      chatId: input.chatId,
      senderId: input.senderId,
      content: input.content,
    });

    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO message_notification_intent'),
      [expect.any(String), input.chatId, 'professional-id'],
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('rolls back the message when intent persistence fails', async () => {
    const intentError = new Error('intent insert failed');
    const { service, queryRunner } = makeService({ intentError });

    await expect(service.createMessage(input)).rejects.toBe(intentError);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects a sender who is not a chat participant', async () => {
    const { service, manager, queryRunner } = makeService();

    await expect(
      service.createMessage({ ...input, senderId: 'outsider-id' }),
    ).rejects.toThrow('Sender is not a chat participant');

    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back when message persistence fails', async () => {
    const persistenceError = new Error('message insert failed');
    const { service, queryRunner } = makeService({ persistenceError });

    await expect(service.createMessage(input)).rejects.toBe(persistenceError);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});
