import { BadRequestException } from '@nestjs/common';
import { OrganizationMetricsController } from './organization-metrics.controller';

describe('OrganizationMetricsController stage visits', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const jobId = '22222222-2222-4222-8222-222222222222';
  const stageId = '33333333-3333-4333-8333-333333333333';

  it('checks organization access before it reads source visits', async () => {
    const getStageDurationVisits = jest.fn().mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const assertAccess = jest.fn().mockResolvedValue(undefined);
    const controller = new OrganizationMetricsController(
      { getStageDurationVisits } as never,
      { assertAccess } as never,
    );

    await controller.getStageVisits(
      organizationId,
      jobId,
      stageId,
      '2026-01-01',
      '2026-01-31',
      1,
      20,
    );

    expect(assertAccess).toHaveBeenCalledWith(
      organizationId,
      undefined,
      'read',
    );
    expect(getStageDurationVisits).toHaveBeenCalledWith(
      organizationId,
      jobId,
      stageId,
      '2026-01-01',
      '2026-01-31',
      1,
      20,
    );
    expect(assertAccess.mock.invocationCallOrder[0]).toBeLessThan(
      getStageDurationVisits.mock.invocationCallOrder[0],
    );
  });

  it('rejects page sizes above the API limit', async () => {
    const getStageDurationVisits = jest.fn();
    const controller = new OrganizationMetricsController(
      { getStageDurationVisits } as never,
      { assertAccess: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      controller.getStageVisits(
        organizationId,
        jobId,
        stageId,
        undefined,
        undefined,
        1,
        51,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getStageDurationVisits).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-02-31', undefined],
    ['2026-03-02', '2026-03-01'],
  ])('rejects invalid date ranges %s to %s', async (startDate, endDate) => {
    const getStageDurationVisits = jest.fn();
    const controller = new OrganizationMetricsController(
      { getStageDurationVisits } as never,
      { assertAccess: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      controller.getStageVisits(
        organizationId,
        jobId,
        stageId,
        startDate,
        endDate,
        1,
        20,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getStageDurationVisits).not.toHaveBeenCalled();
  });

  it('does not read visits when organization access fails', async () => {
    const getStageDurationVisits = jest.fn();
    const controller = new OrganizationMetricsController(
      { getStageDurationVisits } as never,
      {
        assertAccess: jest.fn().mockRejectedValue(new Error('Access denied')),
      } as never,
    );

    await expect(
      controller.getStageVisits(
        organizationId,
        jobId,
        stageId,
        undefined,
        undefined,
        1,
        20,
      ),
    ).rejects.toThrow('Access denied');
    expect(getStageDurationVisits).not.toHaveBeenCalled();
  });
});

describe('OrganizationMetricsController source application drilldown', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';

  it('checks organization read access before it queries source applications', async () => {
    const getSourceApplications = jest.fn().mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const assertAccess = jest.fn().mockResolvedValue(undefined);
    const controller = new OrganizationMetricsController(
      { getSourceApplications } as never,
      { assertAccess } as never,
    );

    await controller.getSourceApplications(
      organizationId,
      'linkedin',
      'tracked_link',
      'custom',
      '2026-03-01',
      '2026-03-31',
      2,
      20,
    );

    expect(assertAccess).toHaveBeenCalledWith(
      organizationId,
      undefined,
      'read',
    );
    expect(getSourceApplications).toHaveBeenCalledWith(
      organizationId,
      'linkedin',
      'tracked_link',
      'custom',
      '2026-03-01',
      '2026-03-31',
      2,
      20,
    );
    expect(assertAccess.mock.invocationCallOrder[0]).toBeLessThan(
      getSourceApplications.mock.invocationCallOrder[0],
    );
  });

  it('rejects an unsupported source method', async () => {
    const getSourceApplications = jest.fn();
    const controller = new OrganizationMetricsController(
      { getSourceApplications } as never,
      { assertAccess: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      controller.getSourceApplications(
        organizationId,
        'linkedin',
        'query_string',
        'month',
        undefined,
        undefined,
        1,
        20,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getSourceApplications).not.toHaveBeenCalled();
  });
});

describe('OrganizationMetricsController response visits', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';

  it('checks organization access before it reads response visits', async () => {
    const getResponseTimeVisits = jest
      .fn()
      .mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20 });
    const assertAccess = jest.fn().mockResolvedValue(undefined);
    const controller = new OrganizationMetricsController(
      { getResponseTimeVisits } as never,
      { assertAccess } as never,
    );

    await controller.getResponseVisits(
      organizationId,
      'unanswered',
      'month',
      undefined,
      undefined,
      1,
      20,
    );

    expect(assertAccess).toHaveBeenCalledWith(
      organizationId,
      undefined,
      'read',
    );
    expect(getResponseTimeVisits).toHaveBeenCalledWith(
      organizationId,
      'unanswered',
      'month',
      undefined,
      undefined,
      1,
      20,
    );
    expect(assertAccess.mock.invocationCallOrder[0]).toBeLessThan(
      getResponseTimeVisits.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['invalid', 'month', undefined, undefined, 1, 20],
    ['unanswered', 'custom', undefined, undefined, 1, 20],
    ['unanswered', 'month', undefined, undefined, 1, 51],
  ])(
    'rejects invalid response filters',
    async (bucket, period, startDate, endDate, page, pageSize) => {
      const getResponseTimeVisits = jest.fn();
      const controller = new OrganizationMetricsController(
        { getResponseTimeVisits } as never,
        { assertAccess: jest.fn().mockResolvedValue(undefined) } as never,
      );

      await expect(
        controller.getResponseVisits(
          organizationId,
          bucket,
          period,
          startDate,
          endDate,
          page,
          pageSize,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getResponseTimeVisits).not.toHaveBeenCalled();
    },
  );
});

describe('OrganizationMetricsController custom stage applications', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const jobId = '22222222-2222-4222-8222-222222222222';
  const stageId = '33333333-3333-4333-8333-333333333333';

  it('checks organization access before reading the paged stage cohort', async () => {
    const getCustomStageApplications = jest.fn().mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const assertAccess = jest.fn().mockResolvedValue(undefined);
    const controller = new OrganizationMetricsController(
      { getCustomStageApplications } as never,
      { assertAccess } as never,
    );

    await controller.getCustomStageApplications(
      organizationId,
      jobId,
      stageId,
      'custom',
      '2026-01-01',
      '2026-01-31',
      1,
      20,
    );

    expect(assertAccess).toHaveBeenCalledWith(
      organizationId,
      undefined,
      'read',
    );
    expect(getCustomStageApplications).toHaveBeenCalledWith(
      organizationId,
      jobId,
      stageId,
      '2026-01-01',
      '2026-01-31',
      1,
      20,
      'custom',
    );
    expect(assertAccess.mock.invocationCallOrder[0]).toBeLessThan(
      getCustomStageApplications.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['invalid', undefined, undefined, 1, 20],
    ['custom', undefined, undefined, 1, 20],
    ['month', '2026-02-31', undefined, 1, 20],
    ['month', undefined, undefined, 1, 51],
  ])(
    'rejects invalid stage cohort filters',
    async (period, startDate, endDate, page, pageSize) => {
      const getCustomStageApplications = jest.fn();
      const controller = new OrganizationMetricsController(
        { getCustomStageApplications } as never,
        { assertAccess: jest.fn().mockResolvedValue(undefined) } as never,
      );

      await expect(
        controller.getCustomStageApplications(
          organizationId,
          jobId,
          stageId,
          period,
          startDate,
          endDate,
          page,
          pageSize,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getCustomStageApplications).not.toHaveBeenCalled();
    },
  );
});
