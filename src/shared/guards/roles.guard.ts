import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthenticatedUser,
  resolveUserRole,
  UserRole,
} from '../auth/better-auth-session.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authorization layer on top of SessionAuthGuard. Reads the @Roles metadata
 * and compares it against the resolved platform role of the authenticated
 * user. Rules:
 * - No @Roles metadata: any authenticated caller passes.
 * - No request.user: the caller authenticated with the shared internal key
 *   (server-to-server from the Next.js backend) and passes by design.
 * - Admins always pass.
 * - Role not listed: 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public routes skip SessionAuthGuard entirely, so request.user never
    // exists there and class-level @Roles metadata is inert for them.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;
    if (!user) return true;

    const role = resolveUserRole(user);
    if (role === 'admin' || requiredRoles.includes(role)) return true;

    throw new ForbiddenException(
      'No tienes permisos para realizar esta acción.',
    );
  }
}
