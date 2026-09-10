import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../auth/better-auth-session.service';

const userOf = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  id: 'user-1',
  email: 'user@example.com',
  type: 'professional',
  organizationId: null,
  ...overrides,
});

const contextOf = (user?: AuthenticatedUser): ExecutionContext => {
  const request = { user };
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let isPublicMetadata: boolean;
  let rolesMetadata: string[] | undefined;
  const reflector = {
    getAllAndOverride: jest.fn(
      (key: string) =>
        (key === 'isPublic' ? isPublicMetadata : rolesMetadata) as never,
    ),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const metadata = (roles?: string[]) => {
    rolesMetadata = roles;
  };

  beforeEach(() => {
    isPublicMetadata = false;
    rolesMetadata = undefined;
  });

  it('passes a @Public route before checking roles', () => {
    metadata(['admin']);
    isPublicMetadata = true;

    expect(guard.canActivate(contextOf())).toBe(true);
  });

  it('passes when the route has no @Roles metadata', () => {
    metadata(undefined);

    expect(guard.canActivate(contextOf())).toBe(true);
  });

  it('passes for empty @Roles metadata', () => {
    metadata([]);

    expect(guard.canActivate(contextOf())).toBe(true);
  });

  it('passes when there is no request.user (internal-key server-to-server)', () => {
    metadata(['admin']);

    expect(guard.canActivate(contextOf(undefined))).toBe(true);
  });

  it('passes for an admin regardless of the required roles', () => {
    metadata(['organization']);

    expect(
      guard.canActivate(
        contextOf(userOf({ type: 'organization', organizationId: 'org-1' })),
      ),
    ).toBe(true);
  });

  it('passes for an env-listed admin email', () => {
    process.env.ADMIN_EMAILS = 'admin@biovity.cl';
    metadata(['organization']);

    expect(
      guard.canActivate(
        contextOf(userOf({ email: 'admin@biovity.cl', type: 'professional' })),
      ),
    ).toBe(true);
    delete process.env.ADMIN_EMAILS;
  });

  it('passes when the resolved role is listed', () => {
    metadata(['professional']);

    expect(guard.canActivate(contextOf(userOf()))).toBe(true);
  });

  it('passes for an organization member resolved through organization_member', () => {
    metadata(['organization']);

    expect(
      guard.canActivate(
        contextOf(
          userOf({
            type: 'organization',
            organizationId: 'org-1',
            memberRole: 'recruiter',
          }),
        ),
      ),
    ).toBe(true);
  });

  it('rejects a role mismatch with 403', () => {
    metadata(['organization']);

    expect(() => guard.canActivate(contextOf(userOf()))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an organization-typed user without any membership', () => {
    metadata(['organization']);

    expect(() =>
      guard.canActivate(
        contextOf(userOf({ type: 'organization', organizationId: null })),
      ),
    ).toThrow(ForbiddenException);
  });
});
