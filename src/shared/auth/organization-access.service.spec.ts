import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { OrganizationAccessService } from './organization-access.service';
import type { AuthenticatedUser } from './better-auth-session.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const user: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'member@example.com',
  type: 'organization',
  organizationId: null,
};

describe('OrganizationAccessService', () => {
  it('requires a completed application-linked interview in the same organization', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValueOnce([
        {
          type: 'interview',
          status: 'scheduled',
          organizationId,
          applicationOrganizationId: organizationId,
          isInterviewer: true,
        },
      ]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertCompletedInterviewAccess('event-id', user, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit interviewer assignment to save an evaluation', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'interview',
            status: 'completed',
            organizationId,
            applicationOrganizationId: organizationId,
            isInterviewer: false,
          },
        ])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertCompletedInterviewAccess('event-id', user, true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('grants access to a completed interview only after recruiter and assignment checks', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'interview',
            status: 'completed',
            organizationId,
            applicationOrganizationId: organizationId,
            isInterviewer: true,
          },
        ])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }])
        .mockResolvedValueOnce([{ role: 'recruiter' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertCompletedInterviewAccess('event-id', user, true),
    ).resolves.toEqual({
      organizationId,
      isInterviewer: true,
      canViewHiringRecords: true,
    });
    expect(dataSource.query).toHaveBeenNthCalledWith(1, expect.any(String), [
      'event-id',
      user.id,
    ]);
    expect(dataSource.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      organizationId,
      user.id,
    ]);
  });

  it('allows a viewer member to decide an outcome without hiring-record access', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'interview',
            status: 'completed',
            organizationId,
            applicationOrganizationId: organizationId,
            isInterviewer: false,
            interviewerRoleId: null,
            interviewerRoleLabel: null,
          },
        ])
        .mockResolvedValueOnce([{ role: 'viewer' }])
        .mockResolvedValueOnce([{ role: 'viewer' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertCompletedInterviewAccess('event-id', user, false, 'read'),
    ).resolves.toMatchObject({
      organizationId,
      canViewHiringRecords: false,
    });
    expect(dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('checks chat creation against the organization ID in the request', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { recruiterType: 'organization', professionalType: 'professional' },
        ])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertChatCreation(
        user.id,
        '33333333-3333-4333-8333-333333333333',
        organizationId,
        user,
      ),
    ).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      organizationId,
      user.id,
    ]);
  });

  it('blocks organization sends when the chat has no stored organization', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ organizationId: null }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertChatOrganizationSend('chat-id', user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('checks organization send access and verification against the stored chat organization', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ organizationId }])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertChatOrganizationSend('chat-id', user),
    ).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      organizationId,
      user.id,
    ]);
    expect(dataSource.query).toHaveBeenNthCalledWith(3, expect.any(String), [
      organizationId,
    ]);
  });

  it('allows read access to a viewer membership', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ role: 'viewer' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'read'),
    ).resolves.toBeUndefined();
  });

  it('denies write access to a viewer membership', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ role: 'viewer' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'manage'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows recruiter access to recruitment actions', async () => {
    const access = new OrganizationAccessService({
      query: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }])
        .mockResolvedValue([]),
    } as unknown as DataSource);
    await expect(
      access.assertAccess(organizationId, user, 'recruit'),
    ).resolves.toBeUndefined();
    await expect(
      access.assertAccess(organizationId, user, 'manage'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks hiring actions for an unverified organization but allows profile reads', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'unverified' }])
        .mockResolvedValueOnce([{ role: 'recruiter' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'recruit'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      access.assertAccess(organizationId, user, 'read'),
    ).resolves.toBeUndefined();
  });

  it.each(['pending', 'rejected', 'suspended'] as const)(
    'blocks hiring actions when legal verification is %s',
    async verificationStatus => {
      const dataSource = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ role: 'recruiter' }])
          .mockResolvedValueOnce([{ verificationStatus }]),
      } as unknown as DataSource;
      const access = new OrganizationAccessService(dataSource);

      await expect(
        access.assertAccess(organizationId, user, 'recruit'),
      ).rejects.toMatchObject({
        response: {
          code: 'ORGANIZATION_VERIFICATION_REQUIRED',
          status: verificationStatus,
        },
      });
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    },
  );

  it('blocks hiring actions when the organization record is missing', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'recruit'),
    ).rejects.toMatchObject({
      response: {
        code: 'ORGANIZATION_VERIFICATION_REQUIRED',
        status: 'unverified',
      },
    });
    expect(dataSource.query).toHaveBeenCalledTimes(2);
  });

  it('denies CV reads to viewers', async () => {
    const viewer = { ...user, organizationId };
    const access = new OrganizationAccessService({
      query: jest
        .fn()
        .mockResolvedValueOnce([{ userId: 'candidate', type: 'professional' }])
        .mockResolvedValueOnce([{ role: 'viewer' }]),
    } as unknown as DataSource);
    await expect(
      access.assertResumeAccess('resume', viewer, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows CV reads to recruiters', async () => {
    const recruiter = { ...user, organizationId };
    const access = new OrganizationAccessService({
      query: jest
        .fn()
        .mockResolvedValueOnce([{ userId: 'candidate', type: 'professional' }])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }]),
    } as unknown as DataSource);
    await expect(
      access.assertResumeAccess('resume', recruiter, 'read'),
    ).resolves.toBeUndefined();
  });

  it('denies requests without a user identity', async () => {
    const access = new OrganizationAccessService({} as DataSource);

    await expect(
      access.assertAccess(organizationId, undefined, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an event participant to read the event and RSVP', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          organizerId: '33333333-3333-4333-8333-333333333333',
          candidateId: user.id,
          organizationId,
          isParticipant: true,
        },
      ]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventAccess('event-id', user, 'read'),
    ).resolves.toBeDefined();
    await expect(
      access.assertEventAccess('event-id', user, 'rsvp'),
    ).resolves.toBeDefined();
  });

  it('blocks an organization organizer from managing an existing event while unverified', async () => {
    const organizer = { ...user, organizationId };
    const access = new OrganizationAccessService({
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            organizerId: organizer.id,
            candidateId: null,
            organizationId,
            isParticipant: false,
          },
        ])
        .mockResolvedValueOnce([{ role: 'admin' }])
        .mockResolvedValueOnce([{ verificationStatus: 'unverified' }]),
    } as unknown as DataSource);

    await expect(
      access.assertEventAccess('event-id', organizer, 'manage'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows candidate RSVP for an event owned by an unverified organization', async () => {
    const candidate = { ...user, type: 'professional' as const };
    const access = new OrganizationAccessService({
      query: jest.fn().mockResolvedValue([
        {
          organizerId: '33333333-3333-4333-8333-333333333333',
          candidateId: candidate.id,
          organizationId,
          isParticipant: true,
        },
      ]),
    } as unknown as DataSource);

    await expect(
      access.assertEventAccess('event-id', candidate, 'rsvp'),
    ).resolves.toBeDefined();
  });

  it('denies a non-participant access to an event without an organization', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          organizerId: '33333333-3333-4333-8333-333333333333',
          candidateId: null,
          organizationId: null,
          isParticipant: false,
        },
      ]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventAccess('event-id', user, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrganizationAccessService.assertResumeAccess', () => {
  it('allows organization members to read a professional resume without a prior relationship', async () => {
    const recruiter: AuthenticatedUser = {
      ...user,
      organizationId,
    };
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            userId: '33333333-3333-4333-8333-333333333333',
            type: 'professional',
          },
        ])
        .mockResolvedValueOnce([{ role: 'recruiter' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertResumeAccess('resume-id', recruiter, 'read'),
    ).resolves.toBeUndefined();
  });
});

describe('OrganizationAccessService.assertEventCreation interviewers', () => {
  const interviewerId = '55555555-5555-4555-8555-555555555555';
  const eventInput = {
    type: 'interview',
    organizerId: user.id,
    organizationId,
    interviewerIds: [interviewerId],
  };

  it('allows active recruiters from the event organization', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'admin' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }])
        .mockResolvedValueOnce([{ id: interviewerId }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventCreation(user, eventInput),
    ).resolves.toBeUndefined();
    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining("member.role IN ('admin', 'recruiter')"),
      [organizationId, [interviewerId]],
    );
  });

  it('rejects a selected user without active recruiting access', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'admin' }])
        .mockResolvedValueOnce([{ verificationStatus: 'verified' }])
        .mockResolvedValueOnce([]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventCreation(user, eventInput),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrganizationAccessService.assertEventAccess interviewer membership', () => {
  it.each(['read', 'rsvp'] as const)(
    'blocks a removed interview participant from %s access',
    async permission => {
      const access = new OrganizationAccessService({
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              organizerId: '33333333-3333-4333-8333-333333333333',
              candidateId: '44444444-4444-4444-8444-444444444444',
              organizationId,
              eventType: 'interview',
              isParticipant: true,
            },
          ])
          .mockResolvedValueOnce([]),
      } as unknown as DataSource);

      await expect(
        access.assertEventAccess('event-id', user, permission),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});
