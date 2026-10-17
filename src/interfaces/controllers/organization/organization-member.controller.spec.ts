import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { OrganizationMemberService } from '../../../core/services/organization-member.service';
import { OrganizationMemberRole } from '../../../core/domain/entities/organization-member.entity';
import { OrganizationMemberController } from './organization-member.controller';

const requester: AuthenticatedUser = {
  id: 'user-id',
  email: 'user@example.com',
  type: 'organization',
  organizationId: 'other-org',
};

const makeController = () => {
  const memberService = {
    getMembers: jest.fn(),
    getMemberById: jest
      .fn()
      .mockResolvedValue({ organizationId: 'target-org' }),
    addMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
  } as unknown as OrganizationMemberService;
  const organizationAccess = {
    assertAccess: jest.fn().mockRejectedValue(new ForbiddenException()),
    assertOrganizationMemberUser: jest.fn(),
    getOrganizationOwner: jest.fn(),
  } as unknown as OrganizationAccessService;
  return {
    controller: new OrganizationMemberController(
      memberService,
      organizationAccess,
    ),
    memberService,
    organizationAccess,
  };
};

describe('OrganizationMemberController authorization', () => {
  it('denies member reads for an organization without read access', async () => {
    const { controller, memberService, organizationAccess } = makeController();

    await expect(
      controller.getMembers('target-org', {}, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'read',
    );
    expect(memberService.getMembers).not.toHaveBeenCalled();
  });

  it('denies add before validation or mutation when manage access fails', async () => {
    const { controller, memberService, organizationAccess } = makeController();

    await expect(
      controller.addMember(
        'target-org',
        { userId: 'new-user', role: OrganizationMemberRole.VIEWER },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(
      organizationAccess.assertOrganizationMemberUser,
    ).not.toHaveBeenCalled();
    expect(memberService.addMember).not.toHaveBeenCalled();
  });

  it('denies changing a member in another organization before mutation', async () => {
    const { controller, memberService, organizationAccess } = makeController();

    await expect(
      controller.updateMemberRole(
        'member-id',
        { role: OrganizationMemberRole.RECRUITER },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(memberService.updateMemberRole).not.toHaveBeenCalled();
  });

  it('denies removing a member in another organization before mutation', async () => {
    const { controller, memberService, organizationAccess } = makeController();

    await expect(
      controller.removeMember('member-id', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(memberService.removeMember).not.toHaveBeenCalled();
  });
});
