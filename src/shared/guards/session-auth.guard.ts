import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
 * Authenticates private routes with a Better Auth session cookie and sets
 * `request.user = { id, type, organizationId }`.
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
      cookies?: Record<string, string>;
      user?: AuthenticatedUser;
    }>();

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
}
