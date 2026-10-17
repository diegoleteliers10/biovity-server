import type { DataSource } from 'typeorm';
import { OrganizationVerificationEmailIntentRepositoryImpl } from './organization-verification-email-intent.repository.impl';

describe('OrganizationVerificationEmailIntentRepositoryImpl', () => {
  it('claims due intents with a lease and returns the saved recipient snapshot', async () => {
    const rows = [
      {
        id: 'intent-id',
        eventKey: 'organization-verification:intent-id',
        requestId: 'request-id',
        legalName: 'Example SpA',
        recipientEmail: 'admin@example.com',
        attemptCount: 1,
      },
    ];
    const query = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(rows);
    const repository = new OrganizationVerificationEmailIntentRepositoryImpl({
      query,
    } as unknown as DataSource);

    await expect(repository.claimDue(20)).resolves.toEqual(rows);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      [20],
    );
  });

  it('records bounded retries with a stable error code', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const repository = new OrganizationVerificationEmailIntentRepositoryImpl({
      query,
    } as unknown as DataSource);

    await repository.markRetry('intent-id', 'http_503');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("CASE WHEN attempt_count >= 8 THEN 'dead'"),
      ['intent-id', 'http_503'],
    );
  });
});
