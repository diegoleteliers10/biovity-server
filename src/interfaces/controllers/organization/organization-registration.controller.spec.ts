import {
  ConflictException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Organization } from '../../../core/domain/entities/organization.entity';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationPublicService } from '../../../core/services/organization-public.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { EncryptionService } from '../../../shared/crypto/encryption.service';
import { OrganizationController } from './organization.controller';

const internalApiKey = 'organization-registration-test-key';
const ownerUserId = '11111111-1111-4111-8111-111111111111';

describe('Organization internal registration HTTP', () => {
  let app: INestApplication;
  const createOrganization = jest.fn();
  const originalInternalApiKey = process.env.INTERNAL_API_KEY;
  const originalEncryptionKey = process.env.AI_ENCRYPTION_KEY;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = internalApiKey;
    process.env.AI_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: OrganizationService, useValue: { createOrganization } },
        { provide: OrganizationAccessService, useValue: {} },
        { provide: OrganizationPublicService, useValue: {} },
        EncryptionService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (originalInternalApiKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalInternalApiKey;
    }
    if (originalEncryptionKey === undefined) {
      delete process.env.AI_ENCRYPTION_KEY;
    } else {
      process.env.AI_ENCRYPTION_KEY = originalEncryptionKey;
    }
  });

  beforeEach(() => {
    createOrganization.mockReset();
  });

  it('rejects a missing key before creating an organization', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organizations/internal/register')
      .send({ ownerUserId, name: 'BioLab', website: 'https://biolab.cl' })
      .expect(401);

    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('rejects a wrong key before creating an organization', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organizations/internal/register')
      .set('x-internal-key', 'incorrect-key')
      .send({ ownerUserId, name: 'BioLab', website: 'https://biolab.cl' })
      .expect(401);

    expect(createOrganization).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an invalid owner UUID',
      {
        ownerUserId: 'not-a-uuid',
        name: 'BioLab',
        website: 'https://biolab.cl',
      },
    ],
    [
      'a non-string website value',
      { ownerUserId, name: 'BioLab', website: 42 },
    ],
  ])(
    'rejects %s with a valid key before creating an organization',
    async (_case, body) => {
      await request(app.getHttpServer())
        .post('/api/v1/organizations/internal/register')
        .set('x-internal-key', internalApiKey)
        .send(body)
        .expect(400);

      expect(createOrganization).not.toHaveBeenCalled();
    },
  );

  it('creates and returns the mapped organization with a valid key', async () => {
    const organization = new Organization(
      '22222222-2222-4222-8222-222222222222',
      'BioLab',
      'https://biolab.cl',
      undefined,
      undefined,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
      undefined,
      undefined,
      undefined,
      undefined,
      'Biotechnology research',
    );
    createOrganization.mockResolvedValue(organization);

    await request(app.getHttpServer())
      .post('/api/v1/organizations/internal/register')
      .set('x-internal-key', internalApiKey)
      .send({ ownerUserId, name: 'BioLab', website: 'https://biolab.cl' })
      .expect(201)
      .expect({
        id: organization.id,
        name: organization.name,
        website: organization.website,
        description: organization.description,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
      });

    expect(createOrganization).toHaveBeenCalledWith(
      { name: 'BioLab', website: 'https://biolab.cl' },
      ownerUserId,
    );
  });

  it('propagates service errors as their corresponding HTTP response', async () => {
    createOrganization.mockRejectedValue(
      new ConflictException('Organization already exists'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/organizations/internal/register')
      .set('x-internal-key', internalApiKey)
      .send({ ownerUserId, name: 'BioLab', website: 'https://biolab.cl' })
      .expect(409)
      .expect({
        statusCode: 409,
        message: 'Organization already exists',
        error: 'Conflict',
      });

    expect(createOrganization).toHaveBeenCalledWith(
      { name: 'BioLab', website: 'https://biolab.cl' },
      ownerUserId,
    );
  });
});
