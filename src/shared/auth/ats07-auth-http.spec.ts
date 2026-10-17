import { ForbiddenException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createHmac } from 'crypto';
import { ApplicationService } from '../../core/services/application.service';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeCvLifecycleService } from '../../core/services/resume-cv-lifecycle.service';
import { AdminService } from '../../core/services/admin.service';
import { CandidateDataLifecycleService } from '../../core/services/candidate-data-lifecycle.service';
import { HealthService } from '../../interfaces/controllers/health/health.service';
import { SalarySubmissionService } from '../../core/services/salary-submission.service';
import { ApplicationController } from '../../interfaces/controllers/application/application.controller';
import { ResumeController } from '../../interfaces/controllers/resume/resume.controller';
import { AdminController } from '../../interfaces/controllers/admin/admin.controller';
import { AdminCandidateDataController } from '../../interfaces/controllers/admin/admin-candidate-data.controller';
import { AdminCvCleanupController } from '../../interfaces/controllers/admin/admin-cv-cleanup.controller';
import { HealthController } from '../../interfaces/controllers/health/health.controller';
import { SalaryController } from '../../interfaces/controllers/salary/salary.controller';
import { OrganizationAccessService } from './organization-access.service';
import { BetterAuthSessionService } from './better-auth-session.service';
import { RolesGuard } from '../guards/roles.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { InternalSecretGuard } from '../guards/internal-secret.guard';
import { EncryptionService } from '../crypto/encryption.service';

const secret = 'ats07-http-test-secret';
const candidateId = '11111111-1111-4111-8111-111111111111';
const organizationId = '22222222-2222-4222-8222-222222222222';
const otherUserId = '33333333-3333-4333-8333-333333333333';
const adminId = '55555555-5555-4555-8555-555555555555';

const signedCookie = (token: string): string => {
  const signature = createHmac('sha256', secret).update(token).digest('base64');
  return encodeURIComponent(`${token}.${signature}`);
};

describe('ATS-07 HTTP authorization', () => {
  let app: INestApplication;
  const applicationService = {
    createApplication: jest.fn(),
    getApplicationsByJobId: jest.fn(),
  };
  const resumeService = {
    createResume: jest.fn(),
    getAllResumes: jest.fn(),
  };
  const cvLifecycle = {
    claim: jest.fn(),
    deleteCv: jest.fn(),
    reserveUpload: jest.fn(),
    finalizeUpload: jest.fn(),
  };
  const adminService = { getAdminStats: jest.fn() };
  const candidateDataLifecycle = { exportCandidateData: jest.fn() };
  const healthService = { check: jest.fn(), checkDatabase: jest.fn() };
  const salaryService = { getStats: jest.fn() };
  const organizationAccess = {
    assertJobAccess: jest.fn(),
    assertResumeAccess: jest.fn(),
    hasAccess: jest.fn(),
  };
  const sessionRows: Record<string, Record<string, unknown>> = {
    'candidate-session': {
      userId: candidateId,
      email: 'candidate@example.com',
      type: 'professional',
      isActive: true,
      organizationId: null,
      memberOrganizationId: null,
      memberRole: null,
    },
    'organization-session': {
      userId: organizationId,
      email: 'recruiter@example.com',
      type: 'organization',
      isActive: true,
      organizationId,
      memberOrganizationId: null,
      memberRole: null,
    },
    'admin-session': {
      userId: adminId,
      email: 'admin@example.com',
      type: 'admin',
      isActive: true,
      organizationId: null,
      memberOrganizationId: null,
      memberRole: null,
    },
  };
  const dataSource = {
    query: jest.fn(async (_query: string, parameters: string[]) => {
      const row = sessionRows[parameters[0]];
      return row ? [row] : [];
    }),
  };

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = secret;
    process.env.INTERNAL_API_KEY = 'ats07-internal-test-secret';
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ApplicationController,
        ResumeController,
        AdminController,
        AdminCandidateDataController,
        AdminCvCleanupController,
        HealthController,
        SalaryController,
      ],
      providers: [
        { provide: DataSource, useValue: dataSource },
        { provide: ApplicationService, useValue: applicationService },
        { provide: ResumeService, useValue: resumeService },
        { provide: ResumeCvLifecycleService, useValue: cvLifecycle },
        { provide: AdminService, useValue: adminService },
        {
          provide: CandidateDataLifecycleService,
          useValue: candidateDataLifecycle,
        },
        { provide: HealthService, useValue: healthService },
        { provide: SalarySubmissionService, useValue: salaryService },
        {
          provide: EncryptionService,
          useValue: {
            constantTimeEqual: (provided: string, expected: string) =>
              provided === expected,
          },
        },
        { provide: OrganizationAccessService, useValue: organizationAccess },
        BetterAuthSessionService,
        SessionAuthGuard,
        RolesGuard,
        InternalSecretGuard,
        { provide: APP_GUARD, useExisting: SessionAuthGuard },
        { provide: APP_GUARD, useExisting: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.INTERNAL_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    organizationAccess.assertJobAccess.mockResolvedValue(undefined);
    organizationAccess.assertResumeAccess.mockResolvedValue(undefined);
    adminService.getAdminStats.mockResolvedValue({
      users: {},
      waitlist: {},
      platform: {},
    });
    candidateDataLifecycle.exportCandidateData.mockResolvedValue({
      candidateId,
    });
    healthService.check.mockResolvedValue({ status: 'ok' });
    healthService.checkDatabase.mockResolvedValue({ status: 'ok' });
    salaryService.getStats.mockResolvedValue({ data: [] });
    cvLifecycle.claim.mockResolvedValue([]);
  });

  it('rejects a private ATS route without a session cookie', async () => {
    await request(app.getHttpServer()).post('/api/v1/applications').expect(401);
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it('rejects a forged Better Auth session cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Cookie', 'better-auth.session_token=invalid.signature')
      .expect(401);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('rejects an organization session on the professional application route', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('organization-session')}`,
      )
      .send({ candidateId, jobId: otherUserId })
      .expect(403);
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it('rejects a professional who tries to create another candidate application', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('candidate-session')}`,
      )
      .send({ candidateId: otherUserId, jobId: otherUserId })
      .expect(403);
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it('rejects a professional who lists all resumes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/resumes')
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('candidate-session')}`,
      )
      .expect(403);
    expect(resumeService.getAllResumes).not.toHaveBeenCalled();
  });

  it('rejects an organization read when the organization access check denies it', async () => {
    organizationAccess.assertJobAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await request(app.getHttpServer())
      .get(`/api/v1/applications/job/${otherUserId}`)
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('organization-session')}`,
      )
      .expect(403);

    expect(organizationAccess.assertJobAccess).toHaveBeenCalledWith(
      otherUserId,
      expect.objectContaining({ id: organizationId }),
      'read',
    );
    expect(applicationService.getApplicationsByJobId).not.toHaveBeenCalled();
  });

  it('rejects a professional on admin routes and accepts an admin session', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('candidate-session')}`,
      )
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('admin-session')}`,
      )
      .expect(200);

    expect(adminService.getAdminStats).toHaveBeenCalledTimes(1);
  });

  it('passes the authenticated admin to candidate data export', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/candidate-data/${candidateId}/export`)
      .set(
        'Cookie',
        `better-auth.session_token=${signedCookie('admin-session')}`,
      )
      .expect(200);

    expect(candidateDataLifecycle.exportCandidateData).toHaveBeenCalledWith(
      candidateId,
      adminId,
    );
  });

  it('keeps health and salary aggregate routes public', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/salaries/stats')
      .expect(200);

    expect(healthService.check).toHaveBeenCalledTimes(1);
    expect(salaryService.getStats).toHaveBeenCalledTimes(1);
  });

  it('protects CV cleanup routes with the internal secret', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cv-cleanup/claim')
      .send({ limit: 5 })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/admin/cv-cleanup/claim')
      .set('x-internal-key', 'ats07-internal-test-secret')
      .send({ limit: 5 })
      .expect(200);

    expect(cvLifecycle.claim).toHaveBeenCalledWith(5);
  });
});
