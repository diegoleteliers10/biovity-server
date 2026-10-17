import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../auth/better-auth-session.service';
import { SessionAuthGuard } from './session-auth.guard';

const requester: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  type: 'professional',
  organizationId: null,
};

const contextOf = (
  headers: Record<string, unknown> = {},
  cookies: Record<string, string> = {},
): ExecutionContext => {
  const request = { headers, cookies };
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('SessionAuthGuard', () => {
  let isPublic: boolean;
  const reflector = {
    getAllAndOverride: jest.fn(() => isPublic),
  } as unknown as Reflector;
  const validateSessionCookie = jest.fn();
  const guard = new SessionAuthGuard(
    { validateSessionCookie } as never,
    reflector,
  );

  beforeEach(() => {
    isPublic = false;
    validateSessionCookie.mockReset();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it('rejects a valid internal key on a private route', async () => {
    process.env.INTERNAL_API_KEY = 'internal-secret';
    validateSessionCookie.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextOf({ 'x-internal-key': 'internal-secret' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(validateSessionCookie).toHaveBeenCalledWith(undefined);
  });

  it('accepts a valid session and sets the user on the request', async () => {
    validateSessionCookie.mockResolvedValue(requester);
    const context = contextOf({}, { 'better-auth.session_token': 'session' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest()).toEqual({
      headers: {},
      cookies: { 'better-auth.session_token': 'session' },
      user: requester,
    });
  });

  it('skips session validation for a public route', async () => {
    isPublic = true;

    await expect(guard.canActivate(contextOf())).resolves.toBe(true);
    expect(validateSessionCookie).not.toHaveBeenCalled();
  });
});
