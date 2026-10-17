import { Test } from '@nestjs/testing';
import { Organization } from '../domain/entities/organization.entity';
import { OrganizationService } from './organization.service';

describe('OrganizationService.updateOrganization', () => {
  it('preserves existing optional fields when it saves the onboarding profile', async () => {
    const organizationId = 'organization-1';
    const existing = new Organization(
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
    const findById = jest.fn().mockResolvedValue(existing);
    const update = jest.fn().mockResolvedValue(existing);
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: 'IOrganizationRepository', useValue: { findById, update } },
        { provide: 'IOrganizationMemberRepository', useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(OrganizationService);

    await service.updateOrganization(organizationId, {
      name: 'BioLab Chile',
      website: 'https://biolab.cl',
      description: 'Centro de investigación',
      industry: 'Biotecnología',
      size: '11-50',
      address: { city: 'Valparaíso', country: 'Chile' },
    });

    expect(update).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        name: 'BioLab Chile',
        website: 'https://biolab.cl',
        description: 'Centro de investigación',
        industry: 'Biotecnología',
        size: '11-50',
        address: { city: 'Valparaíso', country: 'Chile' },
        phone: '123456',
        logo: 'https://biolab.cl/logo.png',
      }),
    );
    await moduleRef.close();
  });
});
