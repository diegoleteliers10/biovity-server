import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import {
  BetterAuthSessionService,
  AuthenticatedUser,
} from '../auth/better-auth-session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

/**
 * Authenticates requests either with a Better Auth session cookie (browser,
 * same-origin through the Next.js /api/v1 rewrite) or with the shared
 * `x-internal-key` header (server-to-server calls from the Next.js backend).
 * Sets `request.user = { id, type, organizationId }` for session requests.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: BetterAuthSessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      cookies?: Record<string, string>;
      user?: AuthenticatedUser;
    }>();

    if (this.hasValidInternalKey(request)) {
      return true;
    }

    const cookies = request.cookies ?? {};
    const cookieValue = SESSION_COOKIE_NAMES.map(name => cookies[name]).find(
      Boolean,
    );
    const user = await this.sessionService.validateSessionCookie(cookieValue);
    if (!user) {
      throw new UnauthorizedException('Se requiere una sesión válida.');
    }
    request.user = user;
    return true;
  }

  private hasValidInternalKey(request: {
    headers: Record<string, unknown>;
  }): boolean {
    const expected = process.env.INTERNAL_API_KEY;
    const provided = request.headers['x-internal-key'];
    if (!expected || typeof provided !== 'string' || provided.length === 0) {
      return false;
    }
    const given = Buffer.from(provided);
    const wanted = Buffer.from(expected);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  }
}
