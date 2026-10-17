import { NotificationType } from '../../core/domain/enums';
import { MessageNotificationDispatcherService } from './message-notification-dispatcher.service';

describe('MessageNotificationDispatcherService', () => {
  const intent = {
    id: 'intent-id',
    messageId: 'message-id',
    chatId: 'chat-id',
    recipientId: 'recipient-id',
  };
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let manager: { query: jest.Mock };
  let logger: { error: jest.Mock };
  let service: MessageNotificationDispatcherService;

  beforeEach(() => {
    manager = { query: jest.fn() };
    dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([intent]),
      transaction: jest.fn(
        (operation: (transactionManager: { query: jest.Mock }) => unknown) =>
          Promise.resolve(operation(manager)),
      ),
    };
    logger = { error: jest.fn() };
    service = new MessageNotificationDispatcherService(
      dataSource as never,
      logger as never,
    );
  });

  it('creates one deduplicated notice from the live message', async () => {
    manager.query
      .mockResolvedValueOnce([
        { notification_preferences: { channels: {}, events: {} } },
      ])
      .mockResolvedValueOnce([
        {
          content: '  Hello   from the team  ',
          type: 'text',
          contentType: { offerLetterId: 'invalid-uuid' },
          senderName: 'Recruiter',
          senderAvatar: null,
          offerLetterId: null,
          offerStatus: null,
          jobTitle: null,
          jobId: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO notification_deduplication'),
      [
        intent.recipientId,
        NotificationType.MESSAGE,
        'Nuevo mensaje',
        'Tienes un nuevo mensaje de Recruiter.',
        '/dashboard/messages?chat=chat-id',
        JSON.stringify({
          chatId: intent.chatId,
          messageId: intent.messageId,
          senderName: 'Recruiter',
          senderAvatar: null,
          preview: 'Hello from the team',
          dedupKey: 'message:message-id',
        }),
        'message:message-id',
      ],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('SET status = $2'),
      [intent.id, 'accepted'],
    );
  });

  it('suppresses notices when the recipient disables message alerts', async () => {
    manager.query
      .mockResolvedValueOnce([
        {
          notification_preferences: {
            channels: {},
            events: { message: false },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      [intent.id, 'suppressed'],
    );
  });

  it('suppresses a message that the recipient has already read', async () => {
    manager.query
      .mockResolvedValueOnce([
        { notification_preferences: { channels: {}, events: {} } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(3);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      [intent.id, 'suppressed'],
    );
  });

  it('uses offer copy and metadata while the offer is still sent', async () => {
    manager.query
      .mockResolvedValueOnce([
        { notification_preferences: { channels: {}, events: {} } },
      ])
      .mockResolvedValueOnce([
        {
          content: 'Oferta de trabajo',
          type: 'offer',
          contentType: {
            offerLetterId: '00000000-0000-0000-0000-000000000001',
          },
          senderName: 'Recruiter',
          senderAvatar: null,
        },
      ])
      .mockResolvedValueOnce([
        { status: 'sent', jobTitle: 'Bioquímico', jobId: 'job-id' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO notification_deduplication'),
      [
        intent.recipientId,
        NotificationType.MESSAGE,
        'Nueva carta de oferta',
        'Recibiste una carta de oferta para Bioquímico.',
        '/dashboard/messages?chat=chat-id',
        JSON.stringify({
          offerLetterId: '00000000-0000-0000-0000-000000000001',
          chatId: intent.chatId,
          jobId: 'job-id',
          dedupKey: 'offer:00000000-0000-0000-0000-000000000001:sent',
        }),
        'offer:00000000-0000-0000-0000-000000000001:sent',
      ],
    );
  });

  it('suppresses an offer after the candidate responds', async () => {
    manager.query
      .mockResolvedValueOnce([
        { notification_preferences: { channels: {}, events: {} } },
      ])
      .mockResolvedValueOnce([
        {
          content: 'Oferta de trabajo',
          type: 'offer',
          contentType: {
            offerLetterId: '00000000-0000-0000-0000-000000000001',
          },
          senderName: 'Recruiter',
          senderAvatar: null,
        },
      ])
      .mockResolvedValueOnce([
        { status: 'accepted', jobTitle: 'Bioquímico', jobId: 'job-id' },
      ])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(4);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      [intent.id, 'suppressed'],
    );
  });

  it('schedules a retry when notification delivery fails', async () => {
    dataSource.transaction.mockRejectedValueOnce(new Error('database down'));
    dataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([intent])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining("ELSE 'retry' END"),
      [intent.id],
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Message notification delivery failed for intent-id',
    );
  });
});
