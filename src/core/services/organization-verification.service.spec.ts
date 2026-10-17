import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { OrganizationVerificationService } from './organization-verification.service';

const request = {
  id: 'request-id',
  organizationId: 'organization-id',
  legalName: 'Example SpA',
  countryCode: 'CL',
  registrationNumber: '76.123.456-7',
  registryUrl: 'https://registro.example/empresa/123',
  status: 'pending' as const,
  reviewerUserId: null,
  reviewedAt: null,
  reviewReason: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const readyOrganization = {
  name: 'Example',
  website: 'https://www.example.com',
  description: 'Scientific company',
  industry: 'Biotechnology',
  size: '11-50',
  city: 'Santiago',
  country: 'Chile',
  ownerEmail: 'owner@example.com',
  ownerEmailVerified: true,
};

const notifications = {
  createForAdmins: jest.fn().mockResolvedValue(undefined),
  createMany: jest.fn().mockResolvedValue(undefined),
};

const makeService = (dataSource: DataSource) =>
  new OrganizationVerificationService(dataSource, notifications as never);

function makeDataSource(responses: unknown[]) {
  const query = jest.fn();
  responses.forEach(response => query.mockResolvedValueOnce(response));
  const transaction = jest.fn(
    <T>(operation: (manager: EntityManager) => Promise<T>) =>
      operation({ query } as unknown as EntityManager),
  );
  return {
    dataSource: { transaction } as unknown as DataSource,
    query,
    transaction,
  };
}

describe('OrganizationVerificationService', () => {
  beforeEach(() => {
    notifications.createForAdmins.mockClear();
    notifications.createMany.mockClear();
  });

  it('submits legal details and moves the organization to pending in one transaction', async () => {
    const { dataSource, query, transaction } = makeDataSource([
      [{ verificationStatus: 'unverified' }],
      [],
      [readyOrganization],
      [],
      [],
      [request],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.submit('organization-id', {
        legalName: ' Example SpA ',
        countryCode: 'cl',
        registrationNumber: ' 76.123.456-7 ',
        registryUrl: ' https://registro.example/empresa/123 ',
      }),
    ).resolves.toEqual(request);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(notifications.createForAdmins).toHaveBeenCalledWith({
      type: 'system',
      title: 'Nueva solicitud de verificación',
      body: 'Solicitud de Example SpA',
      link: '/dashboard/organizations',
      data: { organizationId: 'organization-id', requestId: 'request-id' },
      dedupKey: 'organization-verification:request-id',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "UPDATE organization SET verification_status = 'pending'",
      ),
      ['organization-id'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organization_verification_request'),
      [
        'organization-id',
        'Example SpA',
        'cl',
        '76.123.456-7',
        'https://registro.example/empresa/123',
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO organization_verification_email_intent',
      ),
      ['request-id', expect.any(Array)],
    );
  });

  it('does not notify admins when the submission transaction fails', async () => {
    const service = makeService({
      transaction: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    } as unknown as DataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).rejects.toThrow('database unavailable');

    expect(notifications.createForAdmins).not.toHaveBeenCalled();
  });

  it('does not create a second active request', async () => {
    const { dataSource, query } = makeDataSource([
      [{ verificationStatus: 'pending' }],
      [],
      [readyOrganization],
      [{ id: 'existing-request' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('blocks legal submission until profile and corporate email are ready', async () => {
    const { dataSource, query } = makeDataSource([
      [{ verificationStatus: 'unverified' }],
      [],
      [{ ...readyOrganization, ownerEmail: 'owner@personal.example' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).rejects.toThrow('correo corporativo confirmado con dominio coincidente');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it.each(['verified', 'suspended'] as const)(
    'does not accept a new request when the organization is %s',
    async verificationStatus => {
      const { dataSource, query, transaction } = makeDataSource([
        [{ verificationStatus }],
      ]);
      const service = makeService(dataSource);

      await expect(
        service.submit('organization-id', {
          legalName: 'Example SpA',
          countryCode: 'CL',
          registrationNumber: '76.123.456-7',
          registryUrl: 'https://registro.example/empresa/123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledTimes(1);
    },
  );

  it('allows a rejected organization to submit a new request', async () => {
    const { dataSource, query } = makeDataSource([
      [{ verificationStatus: 'rejected' }],
      [],
      [readyOrganization],
      [],
      [],
      [request],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).resolves.toEqual(request);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organization_verification_request'),
      [
        'organization-id',
        'Example SpA',
        'CL',
        '76.123.456-7',
        'https://registro.example/empresa/123',
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO organization_verification_email_intent',
      ),
      ['request-id', expect.any(Array)],
    );
  });

  it('rolls back the submission if the durable admin alert cannot be saved', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ verificationStatus: 'unverified' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([readyOrganization])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([request])
      .mockRejectedValueOnce(new Error('intent insert failed'));
    const transaction = jest.fn(
      <T>(operation: (manager: EntityManager) => Promise<T>) =>
        operation({ query } as unknown as EntityManager),
    );
    const service = makeService({ transaction } as unknown as DataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).rejects.toThrow('intent insert failed');
    expect(notifications.createForAdmins).not.toHaveBeenCalled();
  });

  it('rejects submission when the organization does not exist', async () => {
    const { dataSource, query } = makeDataSource([[]]);
    const service = makeService(dataSource);

    await expect(
      service.submit('organization-id', {
        legalName: 'Example SpA',
        countryCode: 'CL',
        registrationNumber: '76.123.456-7',
        registryUrl: 'https://registro.example/empresa/123',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('records the admin decision and company status in one transaction', async () => {
    const { dataSource, query, transaction } = makeDataSource([
      [{ organizationId: 'organization-id', status: 'pending' }],
      [{ verificationStatus: 'pending' }],
      [],
      [readyOrganization],
      [],
      [],
      [{ id: 'company-user-id' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.review(
        'request-id',
        'admin-id',
        'approved',
        'Registro confirmado',
      ),
    ).resolves.toBeUndefined();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('reviewer_user_id = $3::uuid'),
      ['request-id', 'approved', 'admin-id', 'Registro confirmado'],
    );
    expect(query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("verification_status = 'pending'"),
      ['organization-id', 'verified'],
    );
    expect(query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining('organization_member membership'),
      ['organization-id'],
    );
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'company-user-id',
        title: 'Empresa verificada',
        dedupKey: 'organization-verification-review:request-id',
      }),
    ]);
  });

  it('records a rejection reason and notifies company members', async () => {
    const { dataSource, query } = makeDataSource([
      [{ organizationId: 'organization-id', status: 'pending' }],
      [{ verificationStatus: 'pending' }],
      [],
      [],
      [{ id: 'company-user-id' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.review(
        'request-id',
        'admin-id',
        'rejected',
        '  Registry record did not match.  ',
      ),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('reviewer_user_id = $3::uuid'),
      ['request-id', 'rejected', 'admin-id', 'Registry record did not match.'],
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("verification_status = 'pending'"),
      ['organization-id', 'rejected'],
    );
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'company-user-id',
        title: 'Solicitud de verificación rechazada',
        body: 'Motivo: Registry record did not match.',
      }),
    ]);
  });

  it('blocks approval when onboarding readiness changes after submission', async () => {
    const { dataSource, query } = makeDataSource([
      [{ organizationId: 'organization-id', status: 'pending' }],
      [{ verificationStatus: 'pending' }],
      [],
      [{ ...readyOrganization, description: '' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.review(
        'request-id',
        'admin-id',
        'approved',
        'Registro confirmado',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('does not write when an already reviewed request is reviewed again', async () => {
    const { dataSource, query, transaction } = makeDataSource([
      [{ organizationId: 'organization-id', status: 'rejected' }],
    ]);
    const service = makeService(dataSource);

    await expect(
      service.review('request-id', 'admin-id', 'approved', 'Confirmed'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
