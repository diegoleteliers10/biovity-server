import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OfferLetterService } from './offer-letter.service';
import { OfferLetterRepositoryImpl } from '../../infrastructure/persistence/offer-letter.repository.impl';

const offer = {
  id: 'offer-1',
  applicationId: 'application-1',
  jobId: 'job-1',
  organizationId: 'org-1',
  candidateId: 'candidate-1',
  status: 'sent' as const,
  letterData: {
    candidateName: 'Ana Candidate',
    jobTitle: 'Engineer',
  },
  chatId: 'chat-1',
  messageId: 'message-1',
  title: 'Offer',
};

function setup() {
  const offerLetterRepository = {
    findById: jest.fn().mockResolvedValue(offer),
  };
  const intentRepository = {
    commitResponse: jest.fn().mockResolvedValue({
      kind: 'committed',
      recipientId: 'recruiter-1',
    }),
  };
  const notificationService = {
    create: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = { query: jest.fn().mockResolvedValue([]) };
  const service = new OfferLetterService(
    offerLetterRepository as never,
    intentRepository as never,
    notificationService as never,
    dataSource as never,
  );
  return {
    service,
    offerLetterRepository,
    intentRepository,
    notificationService,
    dataSource,
  };
}

describe('OfferLetterService.respond', () => {
  it('commits the response with a durable email intent and returns the saved response', async () => {
    const context = setup();

    const result = await context.service.respond(
      'offer-1',
      'accepted',
      'candidate-1',
    );

    expect(context.intentRepository.commitResponse).toHaveBeenCalledWith({
      offerId: 'offer-1',
      candidateId: 'candidate-1',
      response: 'accepted',
    });
    expect(context.notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'recruiter-1' }),
    );
    expect(context.dataSource.query).not.toHaveBeenCalled();
    expect(result.status).toBe('accepted');
  });

  it('rejects a candidate who does not own the offer before creating an intent', async () => {
    const context = setup();

    await expect(
      context.service.respond('offer-1', 'accepted', 'other-candidate'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(context.intentRepository.commitResponse).not.toHaveBeenCalled();
  });

  it('rejects a response when another request already changed the offer', async () => {
    const context = setup();
    context.intentRepository.commitResponse.mockResolvedValue({
      kind: 'already_responded',
    });

    await expect(
      context.service.respond('offer-1', 'accepted', 'candidate-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('OfferLetterService.createAndSend', () => {
  const input = {
    applicationId: 'application-1',
    title: 'Offer',
    letterData: {
      candidateName: 'Ana Candidate',
      companyName: 'Biovity',
      jobTitle: 'Engineer',
    },
    pdfPath: 'offers/offer-1.pdf',
  };
  const application = {
    id: 'application-1',
    jobId: 'job-1',
    candidateId: 'candidate-1',
    organizationId: 'org-1',
    jobTitle: 'Engineer',
  };

  it.each(['chat', 'message', 'notification intent'] as const)(
    'rolls back the offer when the atomic write fails during %s creation',
    async failurePoint => {
      const failure = new Error(`${failurePoint} write failed`);
      let transactionRejected = false;
      const manager = {
        save: jest.fn().mockResolvedValue({ id: 'offer-1' }),
        update: jest.fn().mockResolvedValue(undefined),
        query: jest.fn((sql: string) => {
          if (sql.includes('SELECT id FROM chat')) return Promise.resolve([]);
          if (sql.includes('INSERT INTO chat')) {
            return failurePoint === 'chat'
              ? Promise.reject(failure)
              : Promise.resolve([{ id: 'chat-1' }]);
          }
          if (sql.includes('INSERT INTO message_notification_intent')) {
            return failurePoint === 'notification intent'
              ? Promise.reject(failure)
              : Promise.resolve([]);
          }
          if (sql.includes('INSERT INTO message')) {
            return failurePoint === 'message'
              ? Promise.reject(failure)
              : Promise.resolve([{ id: 'message-1' }]);
          }
          return Promise.resolve([]);
        }),
      };
      const transaction = jest.fn(
        async (work: (tx: typeof manager) => Promise<unknown>) =>
          work(manager).then(
            value => value,
            error => {
              transactionRejected = true;
              return Promise.reject(error);
            },
          ),
      );
      const repository = new OfferLetterRepositoryImpl({
        manager: { transaction },
      } as never);
      const context = setup();
      context.dataSource.query.mockResolvedValueOnce([application]);
      const service = new OfferLetterService(
        repository as never,
        context.intentRepository as never,
        context.notificationService as never,
        context.dataSource as never,
      );

      await expect(service.createAndSend(input, 'recruiter-1')).rejects.toBe(
        failure,
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(transactionRejected).toBe(true);
      expect(context.notificationService.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    'offer save',
    'chat last-message update',
    'offer link update',
  ] as const)(
    'does not send a notification when the atomic write fails during %s',
    async failurePoint => {
      const failure = new Error(`${failurePoint} failed`);
      let transactionRejected = false;
      const manager = {
        save: jest.fn(() =>
          failurePoint === 'offer save'
            ? Promise.reject(failure)
            : Promise.resolve({ id: 'offer-1' }),
        ),
        update: jest.fn(() =>
          failurePoint === 'offer link update'
            ? Promise.reject(failure)
            : Promise.resolve(undefined),
        ),
        query: jest.fn((sql: string) => {
          if (sql.includes('SELECT id FROM chat')) return Promise.resolve([]);
          if (sql.includes('INSERT INTO chat'))
            return Promise.resolve([{ id: 'chat-1' }]);
          if (sql.includes('INSERT INTO message'))
            return Promise.resolve([{ id: 'message-1' }]);
          if (sql.includes('UPDATE chat')) {
            return failurePoint === 'chat last-message update'
              ? Promise.reject(failure)
              : Promise.resolve([]);
          }
          return Promise.resolve([]);
        }),
      };
      const transaction = jest.fn(
        async (work: (tx: typeof manager) => Promise<unknown>) =>
          work(manager).then(
            value => value,
            error => {
              transactionRejected = true;
              return Promise.reject(error);
            },
          ),
      );
      const repository = new OfferLetterRepositoryImpl({
        manager: { transaction },
      } as never);
      const context = setup();
      context.dataSource.query.mockResolvedValueOnce([application]);
      const service = new OfferLetterService(
        repository as never,
        context.intentRepository as never,
        context.notificationService as never,
        context.dataSource as never,
      );

      await expect(service.createAndSend(input, 'recruiter-1')).rejects.toBe(
        failure,
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(transactionRejected).toBe(true);
      expect(context.notificationService.create).not.toHaveBeenCalled();
    },
  );

  it('commits the offer, chat, message, and link before notifying the candidate', async () => {
    let committed = false;
    const queries: string[] = [];
    const manager = {
      save: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      update: jest.fn().mockResolvedValue(undefined),
      query: jest.fn((sql: string) => {
        queries.push(sql);
        if (sql.includes('SELECT id FROM chat')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO chat'))
          return Promise.resolve([{ id: 'chat-1' }]);
        if (sql.includes('INSERT INTO message'))
          return Promise.resolve([{ id: 'message-1' }]);
        return Promise.resolve([]);
      }),
    };
    const transaction = jest.fn(
      async (work: (tx: typeof manager) => Promise<unknown>) => {
        const result = await work(manager);
        committed = true;
        return result;
      },
    );
    const repository = new OfferLetterRepositoryImpl({
      manager: { transaction },
    } as never);
    const context = setup();
    context.dataSource.query.mockResolvedValueOnce([application]);
    const service = new OfferLetterService(
      repository as never,
      context.intentRepository as never,
      {
        create: jest.fn().mockImplementation(async () => {
          expect(committed).toBe(true);
        }),
      } as never,
      context.dataSource as never,
    );

    const result = await service.createAndSend(input, 'recruiter-1');

    expect(result).toMatchObject({
      chatId: 'chat-1',
      offerLetter: { id: 'offer-1', chatId: 'chat-1', messageId: 'message-1' },
    });
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'offer-1' },
      expect.objectContaining({ chatId: 'chat-1', messageId: 'message-1' }),
    );
    expect(queries.some(sql => sql.includes('INSERT INTO message'))).toBe(true);
  });
});
