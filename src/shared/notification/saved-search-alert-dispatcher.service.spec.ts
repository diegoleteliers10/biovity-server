import type { DataSource, EntityManager } from 'typeorm';
import type { LoggerService } from '@nestjs/common';
import { SavedSearchAlertDispatcherService } from './saved-search-alert-dispatcher.service';

describe('SavedSearchAlertDispatcherService', () => {
  const managerQuery = jest.fn();
  const manager = { query: managerQuery } as unknown as EntityManager;
  const query = jest.fn();
  const transaction = jest.fn(
    async (callback: (transactionManager: EntityManager) => Promise<unknown>) =>
      callback(manager),
  );
  const logger = { error: jest.fn() } as unknown as LoggerService;
  const service = new SavedSearchAlertDispatcherService(
    { query, transaction } as unknown as DataSource,
    logger,
  );

  beforeEach(() => {
    query.mockReset();
    managerQuery.mockReset();
    transaction.mockClear();
    jest.mocked(logger.error).mockClear();
  });

  it('suppresses delivery when the recipient account is no longer an organization', async () => {
    managerQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'bucket-id', recipientId: 'recipient-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { type: 'professional', active: true, preferences: {} },
      ])
      .mockResolvedValueOnce([]);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'bucket-id' }]);

    await service.dispatch();

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(managerQuery).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('SET status = $2'),
      ['bucket-id', 'suppressed'],
    );
    expect(managerQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notification'),
      expect.anything(),
    );
  });

  it('marks only the profile changes from the failed matching batch', async () => {
    transaction.mockImplementationOnce(async callback => {
      managerQuery.mockResolvedValueOnce([
        { id: 'failed-change-id', candidateId: 'candidate-id', snapshot: {} },
        {
          id: 'other-change-id',
          candidateId: 'other-candidate-id',
          snapshot: {},
        },
      ]);
      managerQuery.mockRejectedValueOnce(new Error('search lookup failed'));
      return callback(manager);
    });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await service.dispatch();

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("'matching_transaction_failed'"),
      [['failed-change-id', 'other-change-id']],
    );
  });
});
