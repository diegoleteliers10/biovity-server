import { DataSource } from 'typeorm';
import { OfferResponseEmailIntentRepositoryImpl } from './offer-response-email-intent.repository.impl';

describe('OfferResponseEmailIntentRepositoryImpl', () => {
  it('does not create intents for historical settled offers during reconciliation', async () => {
    const queries: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        return [];
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (managerArg: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    await repository.reconcilePendingRecipients();

    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('UPDATE offer_response_email_intent');
    expect(queries[0]).not.toContain('INSERT INTO offer_response_email_intent');
    expect(queries[0]).toContain("intent.status IN ('pending', 'retry')");
  });

  it('conditionally updates the offer and stores an eligible recipient in one transaction', async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      queries.push({ sql, parameters });
      if (sql.includes('UPDATE offer_letter'))
        return [
          {
            id: 'offer-1',
            application_id: 'application-1',
            organization_id: 'org-1',
            status: 'accepted',
            letter_data: {
              candidateName: 'Ana Candidate',
              jobTitle: 'Engineer',
            },
            chat_id: 'chat-1',
            message_id: 'message-1',
            title: 'Offer',
          },
        ];
      if (sql.includes('SELECT id, "jobId"'))
        return [
          {
            id: 'application-1',
            job_id: 'job-1',
            status: 'pendiente',
            pipeline_stage_id: 'pending-stage',
          },
        ];
      if (sql.includes('FROM pipeline_stage') && sql.includes('system_key'))
        return [
          {
            id: 'contracted-stage',
            name: 'Contratado',
            status_projection: 'contratado',
            is_archived: false,
          },
        ];
      if (sql.includes('FROM pipeline_stage') && sql.includes('id = $1'))
        return [
          {
            id: 'pending-stage',
            name: 'Pendiente',
          },
        ];
      if (sql.includes('SELECT preferred'))
        return [
          {
            id: 'recruiter-1',
            email: 'recruiter@example.com',
          },
        ];
      return [];
    });
    const manager = { query };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (managerArg: { query: typeof query }) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    const result = await repository.commitResponse({
      offerId: 'offer-1',
      candidateId: 'candidate-1',
      response: 'accepted',
    });

    expect(result.kind).toBe('committed');
    expect(result).toMatchObject({ recipientId: 'recruiter-1' });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(queries[0].sql).toContain(`AND status = 'sent'`);
    const recipientQuery =
      queries.find(({ sql }) => sql.includes('SELECT preferred'))?.sql ?? '';
    expect(recipientQuery).toContain('organization_member');
    expect(recipientQuery).toContain('isActive');
    expect(recipientQuery).toContain('preferred');
    expect(recipientQuery).toContain(
      'ORDER BY preferred.preference ASC, preferred."createdAt" ASC',
    );
    const intentInsert = queries.find(({ sql }) =>
      sql.includes('INSERT INTO offer_response_email_intent'),
    );
    expect(intentInsert?.sql).toContain('ON CONFLICT (offer_id) DO NOTHING');
    expect(intentInsert?.parameters).toContain('offer-response:offer-1');
  });

  it('does not create another intent when a competing response won', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const manager = { query };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (managerArg: { query: typeof query }) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    const result = await repository.commitResponse({
      offerId: 'offer-1',
      candidateId: 'candidate-1',
      response: 'rejected',
    });

    expect(result.kind).toBe('already_responded');
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['accepted', 'contratado'],
    ['rejected', 'rechazado'],
  ] as const)(
    'commits the %s offer, application history, message, and intent together',
    async (response, applicationStatus) => {
      const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
      const manager = {
        query: jest.fn(async (sql: string, parameters?: unknown[]) => {
          queries.push({ sql, parameters });
          if (sql.includes('UPDATE offer_letter')) {
            return [
              {
                id: 'offer-1',
                application_id: 'application-1',
                organization_id: 'org-1',
                status: response,
                letter_data: {
                  candidateName: 'Ana Candidate',
                  jobTitle: 'Engineer',
                },
                chat_id: 'chat-1',
                message_id: 'message-1',
                title: 'Offer',
              },
            ];
          }
          if (sql.includes('SELECT preferred')) {
            return [{ id: 'recruiter-1', email: 'recruiter@example.com' }];
          }
          if (sql.includes('SELECT id, "jobId"')) {
            return [
              {
                id: 'application-1',
                job_id: 'job-1',
                status: 'pendiente',
                pipeline_stage_id: 'pending-stage',
              },
            ];
          }
          if (
            sql.includes('FROM pipeline_stage') &&
            sql.includes('system_key')
          ) {
            return [
              {
                id: `${applicationStatus}-stage`,
                name: applicationStatus,
                status_projection: applicationStatus,
                is_archived: false,
              },
            ];
          }
          if (sql.includes('FROM pipeline_stage') && sql.includes('id = $1')) {
            return [{ id: 'pending-stage', name: 'Pendiente' }];
          }
          return [];
        }),
      };
      const dataSource = {
        transaction: jest.fn(
          async (operation: (managerArg: typeof manager) => unknown) =>
            operation(manager),
        ),
      };
      const repository = new OfferResponseEmailIntentRepositoryImpl(
        dataSource as unknown as DataSource,
      );

      const result = await repository.commitResponse({
        offerId: 'offer-1',
        candidateId: 'candidate-1',
        response,
      });

      expect(result).toMatchObject({
        kind: 'committed',
        recipientId: 'recruiter-1',
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(
        queries.some(({ sql }) => sql.includes('UPDATE application')),
      ).toBe(true);
      expect(
        queries.some(
          ({ sql, parameters }) =>
            sql.includes('INSERT INTO application_status_history') &&
            parameters?.includes(applicationStatus),
        ),
      ).toBe(true);
      expect(queries.some(({ sql }) => sql.includes('UPDATE message'))).toBe(
        true,
      );
      expect(
        queries.some(({ sql }) =>
          sql.includes('INSERT INTO offer_response_email_intent'),
        ),
      ).toBe(true);
      const messageUpdate = queries.find(({ sql }) =>
        sql.includes('UPDATE message'),
      );
      expect(messageUpdate?.parameters?.[1]).toBe(
        JSON.stringify({
          offerLetterId: 'offer-1',
          title: 'Offer',
          status: response,
        }),
      );
    },
  );

  it('rolls back every response write when the email intent insert fails', async () => {
    const queries: string[] = [];
    const intentFailure = new Error('intent insert failed');
    let transactionState: 'active' | 'committed' | 'rolled_back' = 'active';
    const manager = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('UPDATE offer_letter'))
          return [
            {
              id: 'offer-1',
              application_id: 'application-1',
              organization_id: 'org-1',
              status: 'accepted',
              letter_data: {},
              chat_id: null,
              message_id: 'message-1',
              title: 'Offer',
            },
          ];
        if (sql.includes('SELECT id, "jobId"'))
          return [
            {
              id: 'application-1',
              job_id: 'job-1',
              status: 'pendiente',
              pipeline_stage_id: 'pending-stage',
            },
          ];
        if (sql.includes('FROM pipeline_stage') && sql.includes('system_key'))
          return [
            {
              id: 'contracted-stage',
              name: 'Contratado',
              status_projection: 'contratado',
              is_archived: false,
            },
          ];
        if (sql.includes('FROM pipeline_stage') && sql.includes('id = $1'))
          return [
            {
              id: 'pending-stage',
              name: 'Pendiente',
            },
          ];
        if (sql.includes('SELECT preferred')) return [];
        if (sql.includes('INSERT INTO offer_response_email_intent')) {
          return Promise.reject(intentFailure);
        }
        return [];
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        (operation: (managerArg: typeof manager) => unknown) =>
          Promise.resolve(operation(manager)).then(
            value => {
              transactionState = 'committed';
              return value;
            },
            error => {
              transactionState = 'rolled_back';
              return Promise.reject(error);
            },
          ),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    await expect(
      repository.commitResponse({
        offerId: 'offer-1',
        candidateId: 'candidate-1',
        response: 'accepted',
      }),
    ).rejects.toBe(intentFailure);

    expect(transactionState).toBe('rolled_back');
    expect(queries.some(sql => sql.includes('UPDATE application'))).toBe(true);
    expect(
      queries.some(sql =>
        sql.includes('INSERT INTO application_status_history'),
      ),
    ).toBe(true);
    expect(queries.some(sql => sql.includes('UPDATE message'))).toBe(true);
    expect(
      queries.some(sql =>
        sql.includes('INSERT INTO offer_response_email_intent'),
      ),
    ).toBe(true);
  });

  it('allows only one concurrent response to write the application and intent', async () => {
    const queries: string[] = [];
    let offerStatus = 'sent';
    const manager = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('UPDATE offer_letter')) {
          if (offerStatus !== 'sent') return [];
          offerStatus = 'accepted';
          return [
            {
              id: 'offer-1',
              application_id: 'application-1',
              organization_id: 'org-1',
              status: 'accepted',
              letter_data: {},
              chat_id: null,
              message_id: null,
              title: 'Offer',
            },
          ];
        }
        if (sql.includes('SELECT preferred')) return [];
        if (sql.includes('SELECT id, "jobId"'))
          return [
            {
              id: 'application-1',
              job_id: 'job-1',
              status: 'pendiente',
              pipeline_stage_id: 'pending-stage',
            },
          ];
        if (sql.includes('FROM pipeline_stage') && sql.includes('system_key'))
          return [
            {
              id: 'contracted-stage',
              name: 'Contratado',
              status_projection: 'contratado',
              is_archived: false,
            },
          ];
        if (sql.includes('FROM pipeline_stage') && sql.includes('id = $1'))
          return [
            {
              id: 'pending-stage',
              name: 'Pendiente',
            },
          ];
        return [];
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (managerArg: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    const results = await Promise.all([
      repository.commitResponse({
        offerId: 'offer-1',
        candidateId: 'candidate-1',
        response: 'accepted',
      }),
      repository.commitResponse({
        offerId: 'offer-1',
        candidateId: 'candidate-1',
        response: 'rejected',
      }),
    ]);

    expect(results.filter(result => result.kind === 'committed')).toHaveLength(
      1,
    );
    expect(
      results.filter(result => result.kind === 'already_responded'),
    ).toHaveLength(1);
    expect(
      queries.filter(sql =>
        sql.includes('INSERT INTO offer_response_email_intent'),
      ),
    ).toHaveLength(1);
    expect(
      queries.filter(sql =>
        sql.includes('INSERT INTO application_status_history'),
      ),
    ).toHaveLength(1);
    expect(
      queries.filter(sql => sql.includes('UPDATE application')),
    ).toHaveLength(1);
  });

  it('rejects an offer response after the application reached a terminal status', async () => {
    const queries: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('UPDATE offer_letter')) {
          return [
            {
              id: 'offer-id',
              application_id: 'application-id',
              organization_id: 'organization-id',
              status: 'accepted',
              letter_data: {},
              chat_id: null,
              message_id: null,
              title: 'Offer',
            },
          ];
        }
        if (sql.includes('FROM application') && sql.includes('FOR UPDATE')) {
          return [
            {
              id: 'application-id',
              job_id: 'job-id',
              status: 'rechazado',
              pipeline_stage_id: 'rejected-stage',
            },
          ];
        }
        return [];
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (managerArg: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new OfferResponseEmailIntentRepositoryImpl(
      dataSource as unknown as DataSource,
    );

    await expect(
      repository.commitResponse({
        offerId: 'offer-id',
        candidateId: 'candidate-id',
        response: 'accepted',
      }),
    ).rejects.toThrow('The application is closed and cannot change stage');
    expect(queries.some(sql => sql.includes('UPDATE application'))).toBe(false);
  });
});
