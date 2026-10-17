import { Test } from '@nestjs/testing';
import { Organization } from '../../../core/domain/entities/organization.entity';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationPublicService } from '../../../core/services/organization-public.service';
import { OrganizationController } from './organization.controller';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { EncryptionService } from '../../../shared/crypto/encryption.service';

describe('OrganizationController.updateOrganization', () => {
  const organizationId = 'organization-1';
  const requester = {
    id: 'owner-1',
    email: 'owner@biovity.cl',
    type: 'organization',
    organizationId,
  };
  const organization = new Organization(
    organizationId,
    'BioLab',
    'https://biolab.cl',
    '123456',
    { city: 'Santiago', country: 'Chile' },
    new Date('2026-01-01T00:00:00Z'),
    new Date('2026-01-02T00:00:00Z'),
    undefined,
    undefined,
    undefined,
    'https://biolab.cl/logo.png',
    'Laboratorio científico',
    'Biotecnología',
    '11-50',
  );

  it('passes the onboarding fields to the service and leaves phone and logo optional', async () => {
    const updateOrganization = jest.fn().mockResolvedValue(organization);
    const assertAccess = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: OrganizationService, useValue: { updateOrganization } },
        { provide: OrganizationAccessService, useValue: { assertAccess } },
        { provide: OrganizationPublicService, useValue: {} },
        {
          provide: EncryptionService,
          useValue: { constantTimeEqual: jest.fn() },
        },
      ],
    }).compile();
    const controller = moduleRef.get(OrganizationController);
    const dto = {
      name: 'BioLab',
      website: 'https://biolab.cl',
      description: 'Laboratorio científico',
      industry: 'Biotecnología',
      size: '11-50',
      address: { city: 'Santiago', country: 'Chile' },
    };

    const result = await controller.updateOrganization(
      organizationId,
      dto,
      requester,
    );

    expect(assertAccess).toHaveBeenCalledWith(
      organizationId,
      requester,
      'manage',
    );
    expect(updateOrganization).toHaveBeenCalledWith(organizationId, {
      ...dto,
      phone: undefined,
      integrations: undefined,
      logo: undefined,
      foundedYear: undefined,
      linkedinUrl: undefined,
      twitterUrl: undefined,
    });
    expect(result).toMatchObject({
      name: dto.name,
      website: dto.website,
      description: dto.description,
      industry: dto.industry,
      size: dto.size,
      address: dto.address,
    });
    await moduleRef.close();
  });
});
