import { ForbiddenException } from '@nestjs/common';
import type { Resume } from '../../../core/domain/entities/resume.entity';
import type { ResumeService } from '../../../core/services/resume.service';
import type { ResumeCvLifecycleService } from '../../../core/services/resume-cv-lifecycle.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ResumeController } from './resume.controller';

const owner: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner@example.com',
  type: 'professional',
  organizationId: null,
};

const otherProfessional: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'other@example.com',
  type: 'professional',
  organizationId: null,
};

const admin: AuthenticatedUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'admin@example.com',
  type: 'admin',
  organizationId: null,
};

const recruiter: AuthenticatedUser = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'recruiter@example.com',
  type: 'organization',
  organizationId: '55555555-5555-4555-8555-555555555555',
  memberRole: 'recruiter',
};

const resumeId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const resume = {
  id: resumeId,
  userId: owner.id,
  summary: 'Resume summary',
  experiences: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  links: [],
  cvFile: null,
  cvVersion: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} as Resume;

describe('ResumeController authorization', () => {
  const resumeService = {
    createResume: jest.fn(),
    getResumeById: jest.fn(),
    getResumeByUserId: jest.fn(),
    getAllResumes: jest.fn(),
    updateResume: jest.fn(),
  };
  const organizationAccess = {
    assertResumeAccess: jest.fn(),
  };
  const cvLifecycle = {
    reserve: jest.fn(),
    finalize: jest.fn(),
    delete: jest.fn(),
    deleteResume: jest.fn(),
  };
  const controller = new ResumeController(
    resumeService as unknown as ResumeService,
    organizationAccess as unknown as OrganizationAccessService,
    cvLifecycle as unknown as ResumeCvLifecycleService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    organizationAccess.assertResumeAccess.mockResolvedValue(undefined);
    resumeService.createResume.mockResolvedValue(resume);
    resumeService.getResumeById.mockResolvedValue(resume);
    resumeService.getResumeByUserId.mockResolvedValue(resume);
    resumeService.getAllResumes.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    resumeService.updateResume.mockResolvedValue(resume);
    cvLifecycle.reserve.mockResolvedValue({
      reservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      path: 'cv/user/file.pdf',
      version: 0,
    });
    cvLifecycle.finalize.mockResolvedValue(resume);
    cvLifecycle.delete.mockResolvedValue(resume);
    cvLifecycle.deleteResume.mockResolvedValue(undefined);
  });

  it('allows only a professional to create their own resume', async () => {
    await expect(
      controller.createResume({ userId: owner.id } as never, owner),
    ).resolves.toMatchObject({ id: resumeId });
    expect(resumeService.createResume).toHaveBeenCalledTimes(1);

    await expect(
      controller.createResume({ userId: owner.id } as never, otherProfessional),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.createResume({ userId: owner.id } as never, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.createResume({ userId: owner.id } as never, undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(resumeService.createResume).toHaveBeenCalledTimes(1);
  });

  it('allows owner and admin resume updates, then stops denied writes', async () => {
    await expect(
      controller.updateResume(resumeId, { summary: 'Updated' } as never, owner),
    ).resolves.toMatchObject({ id: resumeId });
    expect(resumeService.updateResume).toHaveBeenCalledTimes(1);

    await expect(
      controller.updateResume(resumeId, { summary: 'Updated' } as never, admin),
    ).resolves.toMatchObject({ id: resumeId });
    expect(organizationAccess.assertResumeAccess).toHaveBeenLastCalledWith(
      resumeId,
      admin,
      'manage',
    );

    organizationAccess.assertResumeAccess.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      controller.updateResume(
        resumeId,
        { summary: 'Denied' } as never,
        recruiter,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(resumeService.updateResume).toHaveBeenCalledTimes(2);
  });

  it('allows owners and admins to write CV lifecycle data and blocks recruiters', async () => {
    organizationAccess.assertResumeAccess.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      controller.reserveCvUpload(resumeId, { expectedVersion: 0 }, recruiter),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.finalizeCvUpload(
        resumeId,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        { url: 'https://files.example/cv.pdf' },
        recruiter,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.deleteCv(
        resumeId,
        { expectedPath: 'cv/user/file.pdf', expectedVersion: 0 },
        recruiter,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.deleteResume(resumeId, recruiter),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(cvLifecycle.reserve).not.toHaveBeenCalled();
    expect(cvLifecycle.finalize).not.toHaveBeenCalled();
    expect(cvLifecycle.delete).not.toHaveBeenCalled();
    expect(cvLifecycle.deleteResume).not.toHaveBeenCalled();

    organizationAccess.assertResumeAccess.mockResolvedValue(undefined);
    await controller.reserveCvUpload(resumeId, { expectedVersion: 0 }, owner);
    await controller.finalizeCvUpload(
      resumeId,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      { url: 'https://files.example/cv.pdf' },
      admin,
    );
    await controller.deleteCv(
      resumeId,
      { expectedPath: 'cv/user/file.pdf', expectedVersion: 0 },
      owner,
    );
    await controller.deleteResume(resumeId, admin);
    expect(cvLifecycle.reserve).toHaveBeenCalledTimes(1);
    expect(cvLifecycle.finalize).toHaveBeenCalledTimes(1);
    expect(cvLifecycle.delete).toHaveBeenCalledTimes(1);
    expect(cvLifecycle.deleteResume).toHaveBeenCalledTimes(1);
    expect(organizationAccess.assertResumeAccess).toHaveBeenLastCalledWith(
      resumeId,
      admin,
      'manage',
    );
  });

  it('requests read access for owner and recruiter resume reads', async () => {
    await controller.getResumeById(resumeId, owner);
    expect(organizationAccess.assertResumeAccess).toHaveBeenLastCalledWith(
      resumeId,
      owner,
      'read',
    );

    await controller.getResumeByUserId(owner.id, recruiter);
    expect(organizationAccess.assertResumeAccess).toHaveBeenLastCalledWith(
      resumeId,
      recruiter,
      'read',
    );

    organizationAccess.assertResumeAccess.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      controller.getResumeById(resumeId, recruiter),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows only admins to list resumes', async () => {
    await expect(controller.getAllResumes({}, admin)).resolves.toMatchObject({
      data: [],
      total: 0,
    });
    await expect(
      controller.getAllResumes({}, recruiter),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getAllResumes({}, owner)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.getAllResumes({}, undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(resumeService.getAllResumes).toHaveBeenCalledTimes(1);
  });
});
