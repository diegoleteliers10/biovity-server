import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './better-auth-session.service';
import { isAdminUser } from './better-auth-session.service';

export type UserAccessLevel = 'full' | 'basic' | 'chat' | 'denied';

export const AccessLevel = {
  FULL: 'full' as const,
  BASIC: 'basic' as const,
  CHAT: 'chat' as const,
  DENIED: 'denied' as const,
};

/**
 * Access to a professional user's profile is limited to organizations.
 * User-to-user (professional-to-professional) and organization-to-organization
 * reads are forbidden. Organization users keep a chat-level view so
 * professionals can see recruiter name, avatar and profession.
 */
export function resolveUserReadAccess(
  requester: AuthenticatedUser | undefined,
  targetType: string,
  targetId: string,
): UserAccessLevel {
  if (!requester) return 'full';
  if (requester.id === targetId) return 'full';
  if (isAdminUser(requester)) return 'basic';
  if (requester.type === 'organization' && targetType === 'professional') {
    return 'full';
  }
  if (requester.type === 'professional' && targetType === 'organization') {
    return 'chat';
  }
  return 'denied';
}

export function assertCanReadUser(
  requester: AuthenticatedUser | undefined,
  targetType: string,
  targetId: string,
): UserAccessLevel {
  const level = resolveUserReadAccess(requester, targetType, targetId);
  if (level === 'denied') {
    throw new ForbiddenException('No tienes permisos para ver este usuario');
  }
  return level;
}
