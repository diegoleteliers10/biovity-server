import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../auth/better-auth-session.service';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given platform roles. Checked by the global
 * RolesGuard after SessionAuthGuard. Routes without @Roles stay open to any
 * authenticated caller; admins always pass.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
