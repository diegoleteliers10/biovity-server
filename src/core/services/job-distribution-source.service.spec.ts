import { DataSource } from 'typeorm';
import { JobDistributionSourceService } from './job-distribution-source.service';

describe('JobDistributionSourceService', () => {
  const query = jest.fn();
  const service = new JobDistributionSourceService({
    query,
  } as unknown as DataSource);

  beforeEach(() => jest.resetAllMocks());

  it('creates an opaque source token for a job and channel', async () => {
    query.mockResolvedValue([
      {
        id: 'source-id',
        jobId: 'job-id',
        sourceChannel: 'linkedin',
        createdAt: new Date(),
        disabledAt: null,
      },
    ]);

    await expect(service.create('job-id', 'linkedin')).resolves.toEqual(
      expect.objectContaining({
        id: 'source-id',
        jobId: 'job-id',
        sourceChannel: 'linkedin',
        disabledAt: null,
      }),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO job_distribution_source'),
      [expect.any(String), 'job-id', 'linkedin'],
    );
  });

  it('only disables an active token that belongs to the given job', async () => {
    query.mockResolvedValueOnce([{ id: 'source-id' }]);
    await expect(service.disable('job-id', 'source-id')).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('job_id = $2::uuid AND disabled_at IS NULL'),
      ['source-id', 'job-id'],
    );

    query.mockResolvedValueOnce([]);
    await expect(service.disable('other-job', 'source-id')).resolves.toBe(
      false,
    );
  });
});
