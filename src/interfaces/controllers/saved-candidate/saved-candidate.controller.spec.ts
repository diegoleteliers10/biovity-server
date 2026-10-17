import type { SavedCandidateService } from '../../../core/services/saved-candidate.service';
import type { SavedCandidateEntity } from '../../../infrastructure/database/orm/saved-candidate.entity';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { SavedCandidateController } from './saved-candidate.controller';

const organizationId = '55555555-5555-4555-8555-555555555555';
const candidateId = '22222222-2222-4222-8222-222222222222';

const candidate = {
  id: candidateId,
  type: 'professional',
  isActive: true,
  email: 'candidate@example.com',
  name: 'Candidate Name',
  isEmailVerified: true,
  organizationId: 'internal-organization-id',
  verificationToken: 'internal-token',
  avatar: 'https://example.com/avatar.png',
  profession: 'Biochemist',
  experienceLevel: 'senior',
  availability: 'immediate',
  birthday: '1990-01-01',
  phone: '+56912345678',
  location: {
    city: 'Santiago',
    country: 'Chile',
    street: 'Private street 123',
  },
  notificationPreferences: {
    digest: 'weekly',
    channels: { email: true, in_app: false },
    events: { application: false, interview: true },
  },
  profileViews: 42,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  resumes: [{ skills: [{ name: 'PCR' }] }],
};

const savedCandidate = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  organizationId,
  candidateId,
  candidate,
  note: 'Review for role',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
} as unknown as SavedCandidateEntity;

describe('SavedCandidateController', () => {
  const service = {
    findByOrganization: jest.fn(),
    save: jest.fn(),
  };
  const organizationAccess = {
    assertAccess: jest.fn(),
    hasAccess: jest.fn(),
  };
  const controller = new SavedCandidateController(
    service as unknown as SavedCandidateService,
    organizationAccess as unknown as OrganizationAccessService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    service.findByOrganization.mockResolvedValue({
      data: [savedCandidate],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('returns only directory fields to organization viewers', async () => {
    const viewer: AuthenticatedUser = {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'viewer@example.com',
      type: 'organization',
      organizationId,
      memberRole: 'viewer',
    };
    organizationAccess.hasAccess.mockResolvedValue(false);

    const result = await controller.findAll(organizationId, {}, viewer);
    const resultCandidate = JSON.parse(
      JSON.stringify(result.data[0].candidate),
    ) as Record<string, unknown>;

    expect(resultCandidate).toMatchObject({
      id: candidateId,
      name: 'Candidate Name',
      profession: 'Biochemist',
      location: { city: 'Santiago', country: 'Chile' },
    });
    for (const field of [
      'email',
      'phone',
      'birthday',
      'notificationPreferences',
      'verificationToken',
      'organizationId',
      'profileViews',
    ]) {
      expect(resultCandidate).not.toHaveProperty(field);
    }
    expect(resultCandidate.location).not.toHaveProperty('street');
  });

  it('returns recruiter contact fields without private profile fields', async () => {
    const recruiter: AuthenticatedUser = {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'recruiter@example.com',
      type: 'organization',
      organizationId,
      memberRole: 'recruiter',
    };
    organizationAccess.hasAccess.mockResolvedValue(true);

    const result = await controller.findAll(organizationId, {}, recruiter);
    const resultCandidate = JSON.parse(
      JSON.stringify(result.data[0].candidate),
    ) as Record<string, unknown>;

    expect(resultCandidate).toMatchObject({
      email: 'candidate@example.com',
      phone: '+56912345678',
    });
    for (const field of [
      'birthday',
      'notificationPreferences',
      'verificationToken',
      'organizationId',
      'profileViews',
    ]) {
      expect(resultCandidate).not.toHaveProperty(field);
    }
    expect(resultCandidate.location).not.toHaveProperty('street');
  });

  it('checks organization access before saving a candidate', async () => {
    const recruiter: AuthenticatedUser = {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'recruiter@example.com',
      type: 'organization',
      organizationId,
      memberRole: 'recruiter',
    };
    organizationAccess.assertAccess.mockRejectedValue(new Error('Forbidden'));

    await expect(
      controller.create({ organizationId, candidateId }, recruiter),
    ).rejects.toThrow('Forbidden');
    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      organizationId,
      recruiter,
      'recruit',
    );
    expect(service.save).not.toHaveBeenCalled();
  });
});
